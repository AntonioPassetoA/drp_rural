import { prisma } from '@/lib/prisma'
import { User, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  AuthContext,
  AuthzError,
  isSuperadmin,
  requirePermission,
  userOrgWhere,
} from '@/lib/authz'
import { recordAudit, recordAuditInTx } from '@/lib/audit'
import { AuditAction } from '@/lib/audit-actions'
import { metaFromRequestScope } from '@/lib/request-context'

/** Registra uma tentativa proibida (best-effort, não bloqueia o fluxo de erro). */
async function auditDenied(ctx: AuthContext, attempted: string, extra?: Record<string, unknown>) {
  const meta = await metaFromRequestScope()
  await recordAudit({
    action: AuditAction.AUTHZ_DENIED,
    result: 'failure',
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    entityType: 'User',
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: { attempted, ...(extra || {}) },
  })
}

// ============================================================================
// Serviço de usuários — TODAS as operações exigem um AuthContext e aplicam:
//  - RBAC (requirePermission);
//  - isolamento por organização (gestor só enxerga/edita a própria org);
//  - regras de negócio (não criar/promover superadmin, não transferir de org,
//    não deixar a organização sem gestor ativo, preservar histórico).
// Regra de ouro: nenhum organizationId vindo do formulário é aceito para gestor.
// ============================================================================

export type CreateUserInput = {
  email: string
  password: string
  fullName: string
  role: UserRole
  phone?: string
  // Só é honrado quando quem cria é superadmin. Para gestor é sempre ignorado.
  organizationId?: string | null
}

export type UpdateUserInput = {
  fullName?: string
  role?: UserRole
  phone?: string
  avatarUrl?: string
  // Só superadmin pode transferir usuários entre organizações.
  organizationId?: string | null
}

/** Leitura por email para o fluxo de autenticação (sem ctx, sem dados sensíveis expostos). */
export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } })
}

/** Lista usuários no escopo do usuário logado (gestor: própria org; superadmin: todos). */
export async function listUsers(ctx: AuthContext): Promise<User[]> {
  requirePermission(ctx, 'users:read')
  return prisma.user.findMany({
    where: userOrgWhere(ctx),
    orderBy: { fullName: 'asc' },
  })
}

/** Carrega um usuário garantindo que ele está no escopo do ctx; senão 404. */
export async function getUserInScope(ctx: AuthContext, id: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new AuthzError('Usuário não encontrado', 404)
  if (!isSuperadmin(ctx) && user.organizationId !== ctx.organizationId) {
    // Tentativa de administrar/acessar usuário de OUTRA organização (auditável).
    await auditDenied(ctx, 'user.admin', { targetUserId: id, reason: 'cross_org' })
    // Não revela a existência de usuário de outra organização.
    throw new AuthzError('Usuário não encontrado', 404)
  }
  return user
}

/**
 * Resolve a organização-alvo aplicando as regras:
 *  - gestor: SEMPRE a própria organização (ignora qualquer valor do formulário);
 *  - superadmin: usa o organizationId informado (obrigatório p/ gestor/colaborador);
 *  - papel superadmin nunca tem organização.
 */
function resolveTargetOrg(
  ctx: AuthContext,
  role: UserRole,
  requestedOrgId: string | null
): string | null {
  if (role === 'superadmin') return null
  if (!isSuperadmin(ctx)) return ctx.organizationId // gestor: força a própria org
  if (!requestedOrgId) {
    throw new AuthzError('Selecione a organização do usuário', 400)
  }
  return requestedOrgId
}

/** Impede que a organização fique sem nenhum gestor ativo. */
async function assertOrgKeepsActiveManager(
  organizationId: string | null,
  excludingUserId: string
) {
  if (!organizationId) return
  const otherActiveManagers = await prisma.user.count({
    where: {
      organizationId,
      role: 'gestor',
      isActive: true,
      id: { not: excludingUserId },
    },
  })
  if (otherActiveManagers === 0) {
    throw new AuthzError('A organização não pode ficar sem um gestor ativo', 409)
  }
}

export async function createUser(ctx: AuthContext, data: CreateUserInput): Promise<User> {
  requirePermission(ctx, 'users:create')

  // Gestor não pode criar superadministrador.
  if (!isSuperadmin(ctx) && data.role === 'superadmin') {
    await auditDenied(ctx, 'user.create', { reason: 'gestor_create_superadmin' })
    throw new AuthzError('Gestor não pode criar superadministrador', 403)
  }

  const organizationId = resolveTargetOrg(ctx, data.role, data.organizationId ?? null)

  const hashedPassword = await bcrypt.hash(data.password, 10)
  const meta = await metaFromRequestScope()

  // CRÍTICO: criar conta (acesso ao sistema) e auditoria na MESMA transação.
  // Se o log falhar, a criação é revertida. NUNCA registramos e-mail/telefone/
  // nome/senha/hash — apenas ID, papel, organização e status inicial.
  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        role: data.role,
        phone: data.phone,
        organizationId,
      },
    })
    await recordAuditInTx(tx, {
      action: AuditAction.USER_CREATE,
      userId: ctx.userId,
      organizationId: created.organizationId,
      entityType: 'User',
      entityId: created.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      newData: { role: created.role, organizationId: created.organizationId, isActive: created.isActive },
    })
    return created
  })
}

export async function updateUser(
  ctx: AuthContext,
  id: string,
  data: UpdateUserInput
): Promise<User> {
  requirePermission(ctx, 'users:update')
  const target = await getUserInScope(ctx, id) // garante mesma org (ou superadmin)

  // Gestor não pode promover ninguém a superadmin nem editar um superadmin.
  if (!isSuperadmin(ctx)) {
    if (data.role === 'superadmin') {
      await auditDenied(ctx, 'user.role.change', { targetUserId: id, reason: 'promote_superadmin' })
      throw new AuthzError('Gestor não pode promover a superadministrador', 403)
    }
    if (target.role === 'superadmin') {
      await auditDenied(ctx, 'user.update', { targetUserId: id, reason: 'edit_superadmin' })
      throw new AuthzError('Sem permissão', 403)
    }
  }

  // Transferência de organização: apenas superadmin.
  let organizationId = target.organizationId
  if (data.organizationId !== undefined && data.organizationId !== target.organizationId) {
    if (!isSuperadmin(ctx)) {
      await auditDenied(ctx, 'user.organization.transfer', { targetUserId: id })
      throw new AuthzError('Gestor não pode transferir usuários entre organizações', 403)
    }
    organizationId = data.organizationId
  }

  const newRole = data.role ?? target.role
  const roleChanged = newRole !== target.role
  const orgChanged = organizationId !== target.organizationId

  // Se o alvo é o último gestor ativo e vai deixar de ser gestor (ou mudar de org),
  // bloqueia para não deixar a organização sem gestor.
  if (target.role === 'gestor' && target.isActive && ((roleChanged && newRole !== 'gestor') || orgChanged)) {
    await assertOrgKeepsActiveManager(target.organizationId, target.id)
  }

  const meta = await metaFromRequestScope()

  // CRÍTICO: a atualização e a auditoria ocorrem na MESMA transação.
  // Se a auditoria falhar, a alteração é revertida (sem trilha → sem alteração).
  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        fullName: data.fullName,
        role: newRole,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        organizationId: newRole === 'superadmin' ? null : organizationId,
      },
    })
    const orgForLog = updated.organizationId ?? target.organizationId
    if (roleChanged) {
      await recordAuditInTx(tx, {
        action: AuditAction.USER_ROLE_CHANGE, userId: ctx.userId, organizationId: orgForLog,
        entityType: 'User', entityId: id, ip: meta.ip, userAgent: meta.userAgent,
        oldData: { role: target.role }, newData: { role: newRole },
      })
    }
    if (orgChanged) {
      await recordAuditInTx(tx, {
        action: AuditAction.USER_ORG_TRANSFER, userId: ctx.userId, organizationId: orgForLog,
        entityType: 'User', entityId: id, ip: meta.ip, userAgent: meta.userAgent,
        oldData: { organizationId: target.organizationId }, newData: { organizationId },
      })
    }
    if (!roleChanged && !orgChanged) {
      await recordAuditInTx(tx, {
        action: AuditAction.USER_UPDATE, userId: ctx.userId, organizationId: orgForLog,
        entityType: 'User', entityId: id, ip: meta.ip, userAgent: meta.userAgent,
      })
    }
    return updated
  })
}

/** Ativa/desativa (exclusão LÓGICA — preserva o histórico do usuário). */
export async function setUserActive(
  ctx: AuthContext,
  id: string,
  isActive: boolean
): Promise<User> {
  requirePermission(ctx, 'users:update')
  const target = await getUserInScope(ctx, id)

  if (!isSuperadmin(ctx) && target.role === 'superadmin') {
    await auditDenied(ctx, isActive ? 'user.activate' : 'user.deactivate', { targetUserId: id, reason: 'target_superadmin' })
    throw new AuthzError('Sem permissão', 403)
  }

  // Não deixar a organização sem gestor ativo ao desativar um gestor.
  if (!isActive && target.role === 'gestor' && target.isActive) {
    await assertOrgKeepsActiveManager(target.organizationId, target.id)
  }

  const meta = await metaFromRequestScope()

  // CRÍTICO: ativação/desativação e auditoria na MESMA transação.
  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id }, data: { isActive } })
    await recordAuditInTx(tx, {
      action: isActive ? AuditAction.USER_ACTIVATE : AuditAction.USER_DEACTIVATE,
      userId: ctx.userId, organizationId: target.organizationId,
      entityType: 'User', entityId: id, ip: meta.ip, userAgent: meta.userAgent,
      oldData: { isActive: target.isActive }, newData: { isActive },
    })
    return updated
  })
}

export async function deactivateUser(ctx: AuthContext, id: string): Promise<User> {
  return setUserActive(ctx, id, false)
}

export async function reactivateUser(ctx: AuthContext, id: string): Promise<User> {
  return setUserActive(ctx, id, true)
}

/**
 * Exclusão DEFINITIVA desabilitada de propósito: apagar o usuário removeria o
 * histórico de atividades/despesas vinculado a ele. Use a desativação lógica.
 */
export async function deleteUser(): Promise<never> {
  throw new AuthzError(
    'Exclusão definitiva desabilitada. Use a desativação para preservar o histórico.',
    400
  )
}

export async function updateUserPassword(
  ctx: AuthContext,
  id: string,
  newPassword: string
): Promise<void> {
  requirePermission(ctx, 'users:update')
  await getUserInScope(ctx, id)
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id }, data: { password: hashedPassword } })
}
