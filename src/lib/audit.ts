// Serviço central de auditoria (baixo nível).
// NÃO importa authz.ts (para evitar ciclo): authz.ts é quem importa este módulo.
// Depende apenas de: prisma, sanitize, audit-actions, check-permission (puro), errors.

import { prisma } from '@/lib/prisma'
import { Prisma, AuditResult, UserRole } from '@prisma/client'
import { sanitize } from '@/lib/sanitize'
import { hasPermission } from '@/permissions/check-permission'
import { AuthzError } from '@/lib/errors'
import { encodeCursor, decodeCursor, scopeFingerprint } from '@/lib/audit-cursor'

export type AuditEntry = {
  action: string
  organizationId?: string | null
  userId?: string | null
  entityType?: string | null
  entityId?: string | null
  result?: AuditResult
  crossOrg?: boolean
  ip?: string | null
  userAgent?: string | null
  metadata?: unknown // será SANITIZADO
  oldData?: unknown // será SANITIZADO
  newData?: unknown // será SANITIZADO
}

function toCreateData(e: AuditEntry): Prisma.AuditLogUncheckedCreateInput {
  return {
    action: e.action,
    organizationId: e.organizationId ?? null,
    userId: e.userId ?? null,
    entityType: e.entityType ?? null,
    entityId: e.entityId ?? null,
    result: e.result ?? 'success',
    crossOrg: e.crossOrg ?? false,
    ipAddress: e.ip ?? null,
    userAgent: e.userAgent ?? null,
    metadata: e.metadata === undefined ? undefined : (sanitize(e.metadata) as Prisma.InputJsonValue),
    oldData: e.oldData === undefined ? undefined : (sanitize(e.oldData) as Prisma.InputJsonValue),
    newData: e.newData === undefined ? undefined : (sanitize(e.newData) as Prisma.InputJsonValue),
  }
}

/**
 * Evento NÃO CRÍTICO — best-effort. NUNCA lança: uma falha ao auditar não pode
 * transformar uma leitura/login legítimo em erro.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: toCreateData(entry) })
  } catch (err) {
    console.error('[audit] falha ao gravar (best-effort):', (err as Error)?.message)
  }
}

/**
 * Evento CRÍTICO — grava DENTRO da transação da operação principal. Se falhar,
 * lança e a transação inteira é revertida (não há ação crítica sem trilha).
 */
export async function recordAuditInTx(
  tx: Prisma.TransactionClient,
  entry: AuditEntry
): Promise<void> {
  await tx.auditLog.create({ data: toCreateData(entry) })
}

// ---------------------------------------------------------------------------
// Consulta (separada da gravação), com RBAC, isolamento e paginação por cursor.
// ---------------------------------------------------------------------------

export type AuditQueryContext = {
  userId: string
  role: UserRole
  organizationId: string | null
}

export type AuditFilters = {
  organizationId?: string
  userId?: string
  action?: string
  entityType?: string
  result?: AuditResult
  from?: Date
  to?: Date
}

export type AuditPage = {
  items: Array<{
    id: string
    createdAt: Date
    action: string
    result: AuditResult
    organizationId: string | null
    userId: string | null
    entityType: string | null
    entityId: string | null
    crossOrg: boolean
    ipAddress: string | null
    userAgent: string | null
    metadata: Prisma.JsonValue
  }>
  // Token OPACO assinado (HMAC). null quando não há próxima página.
  nextCursor: string | null
}

const MAX_LIMIT = 100

/** Representação canônica dos filtros que ancoram o cursor. */
function normalizeFilters(f: AuditFilters) {
  return {
    userId: f.userId ?? null,
    action: f.action ?? null,
    entityType: f.entityType ?? null,
    result: f.result ?? null,
    from: f.from ? f.from.toISOString() : null,
    to: f.to ? f.to.toISOString() : null,
  }
}

/**
 * Lista logs com isolamento por organização e paginação por cursor OPACO/ASSINADO
 * (ordem createdAt DESC, id DESC), vinculado a org + filtros + ordenação + pageSize.
 * Colaborador é negado; gestor só a própria organização; superadmin todas (consulta
 * a uma org específica gera auditoria). Cursor inválido/adulterado/expirado → 400.
 */
export async function listAuditLogs(
  ctx: AuditQueryContext,
  filters: AuditFilters = {},
  cursorToken: string | null = null,
  limit = 50
): Promise<AuditPage> {
  if (!hasPermission(ctx.role, 'audit:read')) {
    throw new AuthzError('Sem permissão para consultar auditoria', 403)
  }
  const take = Math.min(Math.max(Math.trunc(limit) || 50, 1), MAX_LIMIT)
  const isSuper = ctx.role === 'superadmin'

  // Organização EFETIVA da consulta (base do isolamento e do escopo do cursor).
  let effOrg: string
  if (!isSuper) {
    if (filters.organizationId && filters.organizationId !== ctx.organizationId) {
      throw new AuthzError('Recurso não encontrado', 404)
    }
    effOrg = ctx.organizationId ?? '__none__'
  } else {
    effOrg = filters.organizationId ?? 'ALL'
    if (filters.organizationId) {
      // Superadmin consultando dados de uma organização específica = cross-org.
      await recordAudit({
        action: 'superadmin.cross_org.access',
        userId: ctx.userId,
        organizationId: filters.organizationId,
        crossOrg: true,
        entityType: 'AuditLog',
        metadata: { via: 'listAuditLogs' },
      })
    }
  }

  // Escopo que ANCORA o cursor: org + filtros + ordenação fixa + pageSize.
  const scopeFp = scopeFingerprint({
    org: effOrg,
    filters: normalizeFilters(filters),
    order: 'createdAt:desc,id:desc',
    limit: take,
  })

  // Decodifica/valida o cursor (lança 400 se inválido/adulterado/expirado/escopo diferente).
  const pos = cursorToken ? decodeCursor(cursorToken, scopeFp) : null

  const and: Prisma.AuditLogWhereInput[] = []
  if (effOrg !== 'ALL') and.push({ organizationId: effOrg })
  if (filters.userId) and.push({ userId: filters.userId })
  if (filters.action) and.push({ action: filters.action })
  if (filters.entityType) and.push({ entityType: filters.entityType })
  if (filters.result) and.push({ result: filters.result })
  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {}
    if (filters.from) createdAt.gte = filters.from
    if (filters.to) createdAt.lte = filters.to
    and.push({ createdAt })
  }
  if (pos) {
    const cAt = new Date(pos.createdAt)
    and.push({
      OR: [{ createdAt: { lt: cAt } }, { AND: [{ createdAt: cAt }, { id: { lt: pos.id } }] }],
    })
  }

  const rows = await prisma.auditLog.findMany({
    where: and.length ? { AND: and } : {},
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    select: {
      id: true, createdAt: true, action: true, result: true, organizationId: true,
      userId: true, entityType: true, entityId: true, crossOrg: true,
      ipAddress: true, userAgent: true, metadata: true,
    },
  })

  let nextCursor: string | null = null
  if (rows.length > take) {
    const last = rows[take - 1]
    nextCursor = encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }, scopeFp)
    rows.length = take
  }
  return { items: rows, nextCursor }
}

/**
 * Metadados SEGUROS para o evento file.upload — NUNCA o nome original do arquivo
 * (pode conter CPF/nome/placa/nota). Apenas identificador interno, extensão e MIME
 * já validados, tamanho e categoria genérica.
 */
export function buildFileUploadMetadata(input: {
  storedName: string
  ext: string
  mimeType: string
  fileSize: number
}): { fileId: string; ext: string; mimeType: string; fileSize: number; category: string } {
  const category = input.mimeType.startsWith('image/')
    ? 'image'
    : input.mimeType === 'application/pdf'
      ? 'document'
      : 'other'
  return {
    fileId: input.storedName,
    ext: input.ext,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    category,
  }
}
