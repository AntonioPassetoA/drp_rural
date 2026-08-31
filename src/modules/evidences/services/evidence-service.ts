import { prisma } from '@/lib/prisma'
import { Prisma, EvidenceStatus } from '@prisma/client'
import crypto from 'crypto'
import { AuthContext, isSuperadmin, requirePermission } from '@/lib/authz'
import { AuthzError } from '@/lib/errors'
import { recordAudit, recordAuditInTx } from '@/lib/audit'
import { AuditAction } from '@/lib/audit-actions'
import {
  getStorage,
  buildPendingPath,
  type StorageProvider,
  type RemoveResult,
} from '@/lib/storage'
import {
  validateAuthorizeIntent,
  validateContent,
  MAGIC_BYTES_CAP,
} from '@/lib/file-validation'

// ---------------------------------------------------------------------------
// Constantes de ciclo de vida
// ---------------------------------------------------------------------------
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000       // ~2h (duração real do token — P1, a comprovar)
const SAFETY_MS = 30 * 60 * 1000              // margem antes de reconciliar
const UPLOAD_WINDOW_MS = TOKEN_TTL_MS + SAFETY_MS
const SIGNED_URL_TTL_S = 60
const RECONCILE_LOCK_TTL_MS = 10 * 60 * 1000

export type ReqMeta = { ip?: string | null; userAgent?: string | null }
export type Clock = () => Date
const defaultNow: Clock = () => new Date()

export type AuthorizeInput = {
  projectId: string
  requestedKind: string   // 'photo' | 'document' — declarado, não confiável
  declaredSize: number
  taskId?: string
  diagnosticId?: string
  localityId?: string
  latitude?: number
  longitude?: number
  capturedAt?: Date
}

// Metadados de auditoria SEGUROS (nunca storagePath/nome/URL/PII).
function safeMeta(ev: {
  id: string; ext?: string | null; mimeType?: string | null; fileSize?: number | null;
  category?: string | null; projectId?: string | null
}) {
  return {
    evidenceId: ev.id,
    mime: ev.mimeType ?? undefined,
    fileSize: ev.fileSize ?? undefined,
    category: ev.category ?? undefined,
    projectId: ev.projectId ?? undefined,
  }
}

/** Uma remoção só é "limpeza concluída" se o objeto foi removido OU confirmado ausente. */
function cleanupSucceeded(res: RemoveResult): boolean {
  return res === 'removed' || res === 'not_found'
}

type Actor = { userId: string | null; actorType: 'user' | 'system' }
type EvCore = { id: string; organizationId: string; projectId: string; storagePath: string }

/**
 * Transição atômica e CONDICIONAL para CLEANING + auditoria de INÍCIO na mesma tx.
 * Só quem conseguir esta transição (count === 1) pode remover o objeto. Devolve true
 * se adquiriu. `where` traz as pré-condições (status esperado, lock, expiração).
 */
async function acquireCleaning(
  ev: EvCore, where: Prisma.EvidenceWhereInput, reason: string, actor: Actor, meta: ReqMeta
): Promise<boolean> {
  let acquired = false
  await prisma.$transaction(async (tx) => {
    const upd = await tx.evidence.updateMany({ where: { ...where, id: ev.id }, data: { status: 'CLEANING' } })
    if (upd.count === 0) return // perdeu a corrida → NÃO audita, NÃO conta
    acquired = true
    await recordAuditInTx(tx, {
      action: AuditAction.FILE_CLEANUP_START, userId: actor.userId, organizationId: ev.organizationId,
      entityType: 'Evidence', entityId: ev.id, ip: meta.ip, userAgent: meta.userAgent,
      metadata: { evidenceId: ev.id, projectId: ev.projectId, reason, actorType: actor.actorType },
    })
  })
  return acquired
}

/**
 * Remove o objeto (a evidência JÁ está em CLEANING e é nossa) e transita:
 *  - removed/not_found -> FAILED (limpeza concluída);
 *  - falha             -> CLEANUP_FAILED (re-elegível).
 * A transição final é CONDICIONAL (status='CLEANING' + `ownWhere`) e a auditoria só é
 * gravada se count === 1 (mesma tx). NUNCA registra storagePath.
 */
async function finalizeCleaning(
  ev: EvCore, ownWhere: Prisma.EvidenceWhereInput, actor: Actor, meta: ReqMeta, storage: StorageProvider
): Promise<'FAILED' | 'CLEANUP_FAILED' | 'lost'> {
  const res = await storage.remove(ev.storagePath)
  const cleaned = cleanupSucceeded(res)
  const target: EvidenceStatus = cleaned ? 'FAILED' : 'CLEANUP_FAILED'
  let applied = false
  await prisma.$transaction(async (tx) => {
    const upd = await tx.evidence.updateMany({
      where: { ...ownWhere, id: ev.id, status: 'CLEANING' },
      data: { status: target, reconcileLockedAt: null, reconcileLockId: null },
    })
    if (upd.count === 0) return // não alterou → NÃO audita, NÃO conta
    applied = true
    await recordAuditInTx(tx, {
      action: cleaned ? AuditAction.FILE_CLEANUP_DONE : AuditAction.FILE_CLEANUP_FAILURE,
      result: cleaned ? 'success' : 'failure',
      userId: actor.userId, organizationId: ev.organizationId, entityType: 'Evidence', entityId: ev.id,
      ip: meta.ip, userAgent: meta.userAgent,
      metadata: { evidenceId: ev.id, projectId: ev.projectId, removeResult: res, actorType: actor.actorType },
    })
  })
  return applied ? target : 'lost'
}

/**
 * QUARENTENA: rejeição ANTES da expiração. UPLOADING → QUARANTINED (condicional +
 * auditoria na mesma tx). Faz uma tentativa antecipada de remoção (best-effort) só
 * para reduzir exposição, MAS permanece QUARANTINED independentemente do resultado —
 * pois o token pode continuar válido e reusar o path. A limpeza DEFINITIVA (→ FAILED)
 * só ocorre no reconciliador, após uploadExpiresAt.
 */
async function quarantine(
  ev: EvCore, reason: string, actor: Actor, meta: ReqMeta, storage: StorageProvider
): Promise<boolean> {
  let acquired = false
  await prisma.$transaction(async (tx) => {
    const upd = await tx.evidence.updateMany({
      where: { id: ev.id, status: 'UPLOADING' },
      data: { status: 'QUARANTINED' },
    })
    if (upd.count === 0) return // perdeu a corrida → NÃO audita
    acquired = true
    await recordAuditInTx(tx, {
      action: AuditAction.FILE_QUARANTINE, result: 'failure',
      userId: actor.userId, organizationId: ev.organizationId, entityType: 'Evidence', entityId: ev.id,
      ip: meta.ip, userAgent: meta.userAgent,
      metadata: { evidenceId: ev.id, projectId: ev.projectId, reason, actorType: actor.actorType },
    })
  })
  if (!acquired) return false

  // Tentativa antecipada de remoção (best-effort). NÃO altera o status: continua
  // QUARANTINED até a expiração + reconciliação (a remoção agora NÃO prova que o
  // path ficará vazio até o token expirar).
  const res = await storage.remove(ev.storagePath)
  await recordAudit({
    action: AuditAction.FILE_QUARANTINE_REMOVE, result: cleanupSucceeded(res) ? 'success' : 'failure',
    userId: actor.userId, organizationId: ev.organizationId, entityType: 'Evidence', entityId: ev.id,
    ip: meta.ip, userAgent: meta.userAgent,
    metadata: { evidenceId: ev.id, projectId: ev.projectId, removeResult: res, actorType: actor.actorType },
  })
  return true
}

/**
 * Valida que TODOS os vínculos pertencem à mesma organização/projeto.
 * organizationId e projectId vêm SEMPRE das entidades validadas, nunca do front.
 */
export async function assertLinksInOrg(
  ctx: AuthContext,
  input: { projectId: string; taskId?: string; diagnosticId?: string; localityId?: string }
): Promise<{ organizationId: string; projectId: string }> {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } })
  if (!project) throw new AuthzError('Recurso não encontrado', 404)
  if (!isSuperadmin(ctx) && project.organizationId !== ctx.organizationId) {
    throw new AuthzError('Recurso não encontrado', 404)
  }
  if (!project.organizationId) throw new AuthzError('Projeto sem organização', 409)

  if (input.taskId) {
    const task = await prisma.task.findUnique({ where: { id: input.taskId }, select: { projectId: true } })
    if (!task || task.projectId !== project.id) throw new AuthzError('Recurso não encontrado', 404)
  }
  if (input.diagnosticId) {
    const d = await prisma.diagnostic.findUnique({
      where: { id: input.diagnosticId },
      select: { municipality: { select: { projectId: true } } },
    })
    if (!d || d.municipality.projectId !== project.id) throw new AuthzError('Recurso não encontrado', 404)
  }
  if (input.localityId) {
    const l = await prisma.locality.findUnique({
      where: { id: input.localityId },
      select: { microregion: { select: { municipality: { select: { projectId: true } } } } },
    })
    if (!l || l.microregion.municipality.projectId !== project.id) {
      throw new AuthzError('Recurso não encontrado', 404)
    }
  }
  return { organizationId: project.organizationId, projectId: project.id }
}

// ---------------------------------------------------------------------------
// 1) AUTHORIZE — cria Evidence(UPLOADING) + signed upload URL
// ---------------------------------------------------------------------------
export async function authorizeUpload(
  ctx: AuthContext,
  input: AuthorizeInput,
  meta: ReqMeta = {},
  now: Clock = defaultNow,
  storage: StorageProvider = getStorage()
) {
  requirePermission(ctx, 'evidences:create')

  const intent = validateAuthorizeIntent(input.requestedKind, input.declaredSize)
  if (!intent.ok) throw new AuthzError('Requisição inválida', 400)

  const { organizationId, projectId } = await assertLinksInOrg(ctx, input)

  const uuid = crypto.randomUUID()
  const storagePath = buildPendingPath(organizationId, projectId, uuid)
  const uploadExpiresAt = new Date(now().getTime() + UPLOAD_WINDOW_MS)

  const evidence = await prisma.evidence.create({
    data: {
      organizationId,
      projectId,
      status: 'UPLOADING',
      storagePath,
      declaredSize: input.declaredSize,
      uploadExpiresAt,
      uploadedById: ctx.userId,
      taskId: input.taskId,
      diagnosticId: input.diagnosticId,
      localityId: input.localityId,
      latitude: input.latitude != null ? new Prisma.Decimal(input.latitude) : null,
      longitude: input.longitude != null ? new Prisma.Decimal(input.longitude) : null,
      capturedAt: input.capturedAt,
    },
  })

  let signed
  try {
    signed = await storage.createSignedUploadUrl(storagePath)
  } catch {
    // Falha antes de qualquer objeto existir → remove o registro pendente órfão.
    await prisma.evidence.delete({ where: { id: evidence.id } }).catch(() => {})
    await recordAudit({
      action: AuditAction.FILE_UPLOAD_FAILURE, result: 'failure',
      userId: ctx.userId, organizationId, entityType: 'Evidence', entityId: evidence.id,
      ip: meta.ip, userAgent: meta.userAgent, metadata: { stage: 'authorize' },
    })
    throw new AuthzError('Falha ao autorizar upload', 502)
  }

  await recordAudit({
    action: AuditAction.FILE_UPLOAD_START,
    userId: ctx.userId, organizationId, entityType: 'Evidence', entityId: evidence.id,
    ip: meta.ip, userAgent: meta.userAgent, metadata: { projectId, category: input.requestedKind },
  })

  // `path` só aqui (o SDK do cliente precisa dele para uploadToSignedUrl).
  return { evidenceId: evidence.id, uploadUrl: signed.uploadUrl, token: signed.token, path: signed.path }
}

// ---------------------------------------------------------------------------
// 2) FINALIZE — valida conteúdo e transita UPLOADING → READY (crítico, idempotente)
// ---------------------------------------------------------------------------
export async function finalizeUpload(
  ctx: AuthContext,
  evidenceId: string,
  meta: ReqMeta = {},
  now: Clock = defaultNow,
  storage: StorageProvider = getStorage()
) {
  requirePermission(ctx, 'evidences:create')
  const ev = await prisma.evidence.findUnique({ where: { id: evidenceId } })
  if (!ev) throw new AuthzError('Recurso não encontrado', 404)

  // Política de finalização por usuário.
  const crossOrg = isSuperadmin(ctx)
  if (!crossOrg) {
    if (ev.organizationId !== ctx.organizationId) throw new AuthzError('Recurso não encontrado', 404)
    const isGestor = ctx.role === 'gestor'
    const isUploader = ev.uploadedById === ctx.userId
    if (!isGestor && !isUploader) {
      await recordAudit({
        action: AuditAction.AUTHZ_DENIED, result: 'failure', userId: ctx.userId,
        organizationId: ctx.organizationId, entityType: 'Evidence', entityId: ev.id,
        ip: meta.ip, userAgent: meta.userAgent, metadata: { attempted: 'file.finalize', reason: 'not_uploader' },
      })
      throw new AuthzError('Recurso não encontrado', 404)
    }
  } else if (ev.organizationId) {
    await recordAudit({
      action: AuditAction.SUPERADMIN_CROSS_ORG_FILE_ACCESS, crossOrg: true, userId: ctx.userId,
      organizationId: ev.organizationId, entityType: 'Evidence', entityId: ev.id,
      ip: meta.ip, userAgent: meta.userAgent, metadata: { via: 'finalize' },
    })
  }

  // Idempotência / estados não finalizáveis.
  if (ev.status === 'READY') return { status: 'READY' as const }
  // QUARANTINED/CLEANING/CLEANUP_FAILED/FAILED/DELET* → limpeza/terminal: não finaliza.
  if (ev.status !== 'UPLOADING') throw new AuthzError('Upload não pode mais ser finalizado', 410)

  const actor: Actor = { userId: ctx.userId, actorType: 'user' }
  const finalizedAt = now()

  // EXPIRAÇÃO (now >= uploadExpiresAt): a janela conservadora do token já passou →
  // limpeza DEFINITIVA. NUNCA remove enquanto UPLOADING: adquire CLEANING primeiro.
  if (ev.uploadExpiresAt && ev.uploadExpiresAt.getTime() <= finalizedAt.getTime()) {
    const acquired = await acquireCleaning(
      ev,
      { status: 'UPLOADING', reconcileLockId: null, reconcileLockedAt: null, uploadExpiresAt: { lte: finalizedAt } },
      'upload_expired', actor, meta
    )
    if (acquired) await finalizeCleaning(ev, { reconcileLockId: null }, actor, meta, storage)
    throw new AuthzError('Autorização de upload expirada', 410)
  }

  // REJEIÇÃO ANTES DA EXPIRAÇÃO: conteúdo/MIME/tamanho inválido ou não confirmável.
  // Como o token pode continuar válido (P1/P5), NÃO marca FAILED: coloca em QUARANTINED
  // (com remoção antecipada best-effort). A limpeza definitiva ocorre após a expiração.
  const head = await storage.readHeadAndSize(ev.storagePath, MAGIC_BYTES_CAP)
  const invalidReason =
    head.totalSize == null ? 'unknown_size'
      : await (async () => { const v = await validateContent(head.header, head.totalSize!); return v.ok ? null : v.reason })()
  if (invalidReason) {
    await quarantine(ev, invalidReason, actor, meta, storage)
    throw new AuthzError(invalidReason === 'unknown_size' ? 'Não foi possível validar o arquivo' : 'Arquivo inválido', invalidReason === 'unknown_size' ? 422 : 400)
  }
  const validation = await validateContent(head.header, head.totalSize!)
  if (!validation.ok) throw new AuthzError('Arquivo inválido', 400) // (defensivo; já tratado acima)

  // Transição CRÍTICA UPLOADING → READY num ÚNICO update condicional:
  // status=UPLOADING E sem lock de reconciliação E ainda não expirado. Isso impede
  // que uma limpeza concorrente já iniciada (lock/CLEANING/expiração) vire READY.
  let applied = false
  await prisma.$transaction(async (tx) => {
    const res = await tx.evidence.updateMany({
      where: {
        id: ev.id, status: 'UPLOADING',
        reconcileLockId: null, reconcileLockedAt: null,
        uploadExpiresAt: { gt: finalizedAt },
      },
      data: {
        status: 'READY', mimeType: validation.mime, fileSize: head.totalSize!,
        category: validation.category, evidenceType: validation.evidenceType, readyAt: finalizedAt,
      },
    })
    if (res.count === 0) return
    applied = true
    await recordAuditInTx(tx, {
      action: AuditAction.FILE_UPLOAD_SUCCESS, userId: ctx.userId, organizationId: ev.organizationId,
      entityType: 'Evidence', entityId: ev.id, ip: meta.ip, userAgent: meta.userAgent,
      metadata: safeMeta({ id: ev.id, mimeType: validation.mime, fileSize: head.totalSize, category: validation.category, projectId: ev.projectId }),
    })
  })
  if (applied) return { status: 'READY' as const }

  // count === 0: NÃO devolve READY automaticamente. Recarrega só o estado e responde.
  const cur = await prisma.evidence.findUnique({ where: { id: ev.id }, select: { status: true } })
  if (cur?.status === 'READY') return { status: 'READY' as const } // outra finalização venceu
  if (cur?.status === 'UPLOADING') throw new AuthzError('Finalização em conflito, tente novamente', 409) // travado por reconciliador
  // CLEANING/CLEANUP_FAILED/FAILED/DELET* → limpeza/expiração já começou
  throw new AuthzError('Upload não pode mais ser finalizado', 410)
}

// ---------------------------------------------------------------------------
// 3) LISTAGEM (isolada por organização, paginação por cursor createdAt/id)
// ---------------------------------------------------------------------------
export type EvidenceCursor = { createdAt: string; id: string } | null
const MAX_LIMIT = 100

export async function listEvidences(
  ctx: AuthContext,
  filters: { projectId?: string; status?: EvidenceStatus } = {},
  cursor: EvidenceCursor = null,
  limit = 50
) {
  requirePermission(ctx, 'evidences:read')
  const take = Math.min(Math.max(Math.trunc(limit) || 50, 1), MAX_LIMIT)
  const and: Prisma.EvidenceWhereInput[] = [{ deletedAt: null }]
  if (!isSuperadmin(ctx)) and.push({ organizationId: ctx.organizationId ?? '__none__' })
  if (filters.projectId) and.push({ projectId: filters.projectId })
  if (filters.status) and.push({ status: filters.status })
  if (cursor) {
    // Validação ESTRUTURAL.
    if (typeof cursor.createdAt !== 'string' || typeof cursor.id !== 'string' || cursor.id === '') {
      throw new AuthzError('Cursor inválido', 400)
    }
    const c = new Date(cursor.createdAt)
    if (isNaN(c.getTime())) throw new AuthzError('Cursor inválido', 400)
    // Validação de ESCOPO por registro-âncora: o cursor tem que apontar para um
    // registro EXISTENTE, do MESMO escopo consultado (organização + projectId +
    // status + não excluído) e com createdAt COINCIDENTE. Isso impede reutilizar
    // cursor de outra organização/projeto/filtro — sem introduzir nova chave HMAC.
    const anchor = await prisma.evidence.findFirst({
      where: { AND: [...and, { id: cursor.id }] },
      select: { createdAt: true },
    })
    if (!anchor || anchor.createdAt.toISOString() !== cursor.createdAt) {
      throw new AuthzError('Cursor inválido', 400)
    }
    and.push({ OR: [{ createdAt: { lt: c } }, { AND: [{ createdAt: c }, { id: { lt: cursor.id } }] }] })
  }
  const rows = await prisma.evidence.findMany({
    where: { AND: and },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    // storagePath NUNCA é selecionado para respostas comuns.
    select: {
      id: true, organizationId: true, projectId: true, status: true, category: true,
      mimeType: true, fileSize: true, evidenceType: true, taskId: true, diagnosticId: true,
      localityId: true, uploadedById: true, createdAt: true, readyAt: true,
    },
  })
  let nextCursor: EvidenceCursor = null
  if (rows.length > take) {
    const last = rows[take - 1]
    nextCursor = { createdAt: last.createdAt.toISOString(), id: last.id }
    rows.length = take
  }
  return { items: rows, nextCursor }
}

// ---------------------------------------------------------------------------
// 4) SIGNED URL (só READY; sem storagePath na resposta; cross-org auditado)
// ---------------------------------------------------------------------------
export async function getEvidenceSignedUrl(
  ctx: AuthContext,
  evidenceId: string,
  meta: ReqMeta = {},
  storage: StorageProvider = getStorage()
): Promise<{ url: string }> {
  requirePermission(ctx, 'evidences:read')
  const ev = await prisma.evidence.findUnique({ where: { id: evidenceId } })
  if (!ev) throw new AuthzError('Recurso não encontrado', 404)

  if (isSuperadmin(ctx)) {
    if (ev.organizationId) {
      await recordAudit({
        action: AuditAction.SUPERADMIN_CROSS_ORG_FILE_ACCESS, crossOrg: true, userId: ctx.userId,
        organizationId: ev.organizationId, entityType: 'Evidence', entityId: ev.id,
        ip: meta.ip, userAgent: meta.userAgent, metadata: { via: 'access' },
      })
    }
  } else if (ev.organizationId !== ctx.organizationId) {
    throw new AuthzError('Recurso não encontrado', 404)
  }

  // Nenhuma URL para arquivo que não esteja READY (inclui DELETING/DELETED/etc.).
  if (ev.status !== 'READY') throw new AuthzError('Arquivo indisponível', 409)

  // PDF -> download com Content-Disposition: attachment (evita render ativo).
  // Imagem -> inline (pode ser exibida na interface).
  const attachment = ev.category === 'document'
  const url = await storage.createSignedDownloadUrl(ev.storagePath, SIGNED_URL_TTL_S, { attachment })
  await recordAudit({
    action: AuditAction.FILE_ACCESS, userId: ctx.userId, organizationId: ev.organizationId,
    entityType: 'Evidence', entityId: ev.id, ip: meta.ip, userAgent: meta.userAgent,
    metadata: safeMeta({ id: ev.id, mimeType: ev.mimeType, fileSize: ev.fileSize, category: ev.category, projectId: ev.projectId }),
  })
  return { url } // NUNCA storagePath
}

// ---------------------------------------------------------------------------
// 5) EXCLUSÃO LÓGICA (soft-delete + compensação + idempotência)
// ---------------------------------------------------------------------------
export async function deleteEvidence(
  ctx: AuthContext,
  evidenceId: string,
  meta: ReqMeta = {},
  now: Clock = defaultNow,
  storage: StorageProvider = getStorage()
): Promise<{ status: 'DELETED' }> {
  requirePermission(ctx, 'evidences:delete') // colaborador não tem → 403
  const ev = await prisma.evidence.findUnique({ where: { id: evidenceId } })
  if (!ev) throw new AuthzError('Recurso não encontrado', 404)

  if (isSuperadmin(ctx)) {
    if (ev.organizationId) {
      await recordAudit({
        action: AuditAction.SUPERADMIN_CROSS_ORG_FILE_ACCESS, crossOrg: true, userId: ctx.userId,
        organizationId: ev.organizationId, entityType: 'Evidence', entityId: ev.id,
        ip: meta.ip, userAgent: meta.userAgent, metadata: { via: 'delete' },
      })
    }
  } else if (ev.organizationId !== ctx.organizationId) {
    throw new AuthzError('Recurso não encontrado', 404)
  }

  if (ev.status === 'DELETED') return { status: 'DELETED' } // idempotente

  // (a) CRÍTICO: READY/DELETE_FAILED/DELETING → DELETING + auditoria (mesma tx).
  await prisma.$transaction(async (tx) => {
    const res = await tx.evidence.updateMany({
      where: { id: ev.id, status: { in: ['READY', 'DELETE_FAILED', 'DELETING'] } },
      data: { status: 'DELETING' },
    })
    if (res.count === 0) throw new AuthzError('Estado inválido para exclusão', 409)
    await recordAuditInTx(tx, {
      action: AuditAction.FILE_DELETE_START, userId: ctx.userId, organizationId: ev.organizationId,
      entityType: 'Evidence', entityId: ev.id, ip: meta.ip, userAgent: meta.userAgent,
      metadata: safeMeta({ id: ev.id, projectId: ev.projectId }),
    })
  })

  // (b) Remove do Storage (fora da tx). Resultado TIPADO — falha desconhecida NÃO é
  //     "removido". Só concluímos DELETED se removido OU confirmado ausente.
  const res = await storage.remove(ev.storagePath)
  if (!cleanupSucceeded(res)) {
    // Mantém DELETE_FAILED (sem deletedAt), re-elegível ao reconciliador.
    await prisma.evidence.updateMany({ where: { id: ev.id, status: 'DELETING' }, data: { status: 'DELETE_FAILED' } })
    await recordAudit({
      action: AuditAction.FILE_DELETE_FAILURE, result: 'failure', userId: ctx.userId,
      organizationId: ev.organizationId, entityType: 'Evidence', entityId: ev.id,
      ip: meta.ip, userAgent: meta.userAgent,
      metadata: { evidenceId: ev.id, projectId: ev.projectId, removeResult: res },
    })
    throw new AuthzError('Falha ao remover arquivo; será reprocessado', 502)
  }

  // (c) CRÍTICO: DELETING → DELETED + deletedAt + auditoria (mesma tx). Linha preservada.
  await prisma.$transaction(async (tx) => {
    await tx.evidence.updateMany({ where: { id: ev.id, status: 'DELETING' }, data: { status: 'DELETED', deletedAt: now() } })
    await recordAuditInTx(tx, {
      action: AuditAction.FILE_DELETE_DONE, userId: ctx.userId, organizationId: ev.organizationId,
      entityType: 'Evidence', entityId: ev.id, ip: meta.ip, userAgent: meta.userAgent,
      metadata: { evidenceId: ev.id, projectId: ev.projectId, removeResult: res },
    })
  })
  return { status: 'DELETED' }
}

// ---------------------------------------------------------------------------
// 6) RECONCILIADOR (serviço interno testável — sem rota pública, sem cron)
// ---------------------------------------------------------------------------
// Trata: UPLOADING expirado, CLEANUP_FAILED, DELETING, DELETE_FAILED.
// Cada transição:
//  - reivindica (claim) atomicamente com lockId único por execução;
//  - reconfere o estado após o claim;
//  - só conclui (FAILED/DELETED) se a remoção retornar removed/not_found;
//  - se a remoção falhar, permanece pendente (não conclui, não conta como limpo);
//  - audita a transição (ator "system", userId nulo) na MESMA transação da mudança;
//  - todas as transições finais são updates CONDICIONAIS (status + lockId).
// Elegíveis ao claim: UPLOADING/QUARANTINED expirados, CLEANUP_FAILED, CLEANING órfão
// (finalize travado), DELETING, DELETE_FAILED.
const RECON_ELIGIBLE: EvidenceStatus[] = ['UPLOADING', 'QUARANTINED', 'CLEANING', 'CLEANUP_FAILED', 'DELETING', 'DELETE_FAILED']

export async function reconcileEvidences(
  opts: { limit?: number; now?: Clock; storage?: StorageProvider } = {}
): Promise<{ claimed: number; cleaned: number; deleted: number; failed: number }> {
  const now = opts.now ?? defaultNow
  const storage = opts.storage ?? getStorage()
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500)
  const t = now()
  const lockCutoff = new Date(t.getTime() - RECONCILE_LOCK_TTL_MS)
  const cleaningStaleCutoff = new Date(t.getTime() - RECONCILE_LOCK_TTL_MS)

  // Seleção inicial (SEM listagem do bucket). CLEANING só se ÓRFÃO (atualizado há mais
  // que o cutoff) — não interfere em finalize/reconcile fresco em andamento.
  const candidates = await prisma.evidence.findMany({
    where: {
      OR: [
        { status: 'UPLOADING', uploadExpiresAt: { lt: t } },
        // QUARANTINED só é limpo DEFINITIVAMENTE após a expiração real (token não reusa mais).
        { status: 'QUARANTINED', uploadExpiresAt: { lte: t } },
        { status: { in: ['CLEANUP_FAILED', 'DELETING', 'DELETE_FAILED'] } },
        { status: 'CLEANING', updatedAt: { lt: cleaningStaleCutoff } },
      ],
    },
    orderBy: { id: 'asc' },
    take: limit,
    select: { id: true },
  })

  let claimed = 0, cleaned = 0, deleted = 0, failed = 0
  for (const { id } of candidates) {
    const lockId = crypto.randomUUID()
    // Claim atômico: só um vencedor por linha (lock livre ou expirado), entre os status elegíveis.
    const lock = await prisma.evidence.updateMany({
      where: {
        id,
        status: { in: RECON_ELIGIBLE },
        OR: [{ reconcileLockedAt: null }, { reconcileLockedAt: { lt: lockCutoff } }],
      },
      data: { reconcileLockedAt: t, reconcileLockId: lockId },
    })
    if (lock.count === 0) continue // outra execução reivindicou / mudou de estado
    claimed++

    // Reconfere o estado APÓS o claim (pode ter mudado entre seleção e claim).
    const ev = await prisma.evidence.findUnique({ where: { id } })
    if (!ev || ev.reconcileLockId !== lockId) continue

    const ownLock: Prisma.EvidenceWhereInput = { reconcileLockId: lockId }
    const expiredNow = ev.uploadExpiresAt != null && ev.uploadExpiresAt.getTime() <= t.getTime()
    const isDeletion = ev.status === 'DELETING' || ev.status === 'DELETE_FAILED'
    const isExpiredUpload = ev.status === 'UPLOADING' && expiredNow
    // QUARANTINED só é limpo DEFINITIVAMENTE após a expiração real.
    const isQuarantineExpired = ev.status === 'QUARANTINED' && expiredNow
    const isCleanup = ev.status === 'CLEANING' || ev.status === 'CLEANUP_FAILED' || isExpiredUpload || isQuarantineExpired

    try {
      if (isDeletion) {
        // Fluxo de exclusão: remove e conclui DELETED só se removed/not_found.
        const res = await storage.remove(ev.storagePath)
        const ok = cleanupSucceeded(res)
        let applied = false
        await prisma.$transaction(async (tx) => {
          const upd = await tx.evidence.updateMany({
            where: { ...ownLock, id, status: ev.status },
            data: { status: ok ? 'DELETED' : 'DELETE_FAILED', deletedAt: ok ? t : undefined, reconcileLockedAt: null, reconcileLockId: null },
          })
          if (upd.count === 0) return
          applied = true
          await recordAuditInTx(tx, {
            action: ok ? AuditAction.FILE_DELETE_DONE : AuditAction.FILE_DELETE_FAILURE,
            result: ok ? 'success' : 'failure', userId: null, organizationId: ev.organizationId,
            entityType: 'Evidence', entityId: ev.id,
            metadata: { evidenceId: ev.id, projectId: ev.projectId, removeResult: res, actorType: 'system' },
          })
        })
        if (applied) { if (ok) deleted++; else failed++ } else { await releaseLock(id, lockId) }
      } else if (isCleanup) {
        // Fluxo de limpeza: garante CLEANING (transição condicional) ANTES de remover.
        if (ev.status !== 'CLEANING') {
          const reason = ev.status === 'UPLOADING' ? 'upload_expired'
            : ev.status === 'QUARANTINED' ? 'quarantine_expired' : 'cleanup_retry'
          const acq = await acquireCleaning(ev, { ...ownLock, status: ev.status }, reason, { userId: null, actorType: 'system' }, {})
          if (!acq) { await releaseLock(id, lockId); continue }
        }
        const r = await finalizeCleaning(ev, ownLock, { userId: null, actorType: 'system' }, {}, storage)
        if (r === 'FAILED') cleaned++
        else if (r === 'CLEANUP_FAILED') failed++
        else await releaseLock(id, lockId) // 'lost'
      } else {
        await releaseLock(id, lockId)
      }
    } catch {
      // Auditoria crítica falhou → transição revertida; libera o lock para novo retry.
      await releaseLock(id, lockId)
    }
  }
  return { claimed, cleaned, deleted, failed }
}

/** Libera o lock apenas se ainda for nosso (não interfere em re-claim de outra execução). */
async function releaseLock(id: string, lockId: string) {
  await prisma.evidence.updateMany({
    where: { id, reconcileLockId: lockId },
    data: { reconcileLockedAt: null, reconcileLockId: null },
  }).catch(() => {})
}
