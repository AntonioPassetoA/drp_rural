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
    throw new AuthzError('Gestor não pode criar superadministrador', 403)
  }

  const organizationId = resolveTargetOrg(ctx, data.role, data.organizationId ?? null)

  const hashedPassword = await bcrypt.hash(data.password, 10)
  return prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      fullName: data.fullName,
      role: data.role,
      phone: data.phone,
      organizationId,
    },
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
      throw new AuthzError('Gestor não pode promover a superadministrador', 403)
    }
    if (target.role === 'superadmin') {
      throw new AuthzError('Sem permissão', 403)
    }
  }

  // Transferência de organização: apenas superadmin.
  let organizationId = target.organizationId
  if (data.organizationId !== undefined && data.organizationId !== target.organizationId) {
    if (!isSuperadmin(ctx)) {
      throw new AuthzError('Gestor não pode transferir usuários entre organizações', 403)
    }
    organizationId = data.organizationId
  }

  const newRole = data.role ?? target.role

  // Se o alvo é o último gestor ativo e vai deixar de ser gestor (ou mudar de org),
  // bloqueia para não deixar a organização sem gestor.
  const deixaDeSerGestor = target.role === 'gestor' && target.isActive && newRole !== 'gestor'
  const mudaDeOrg = organizationId !== target.organizationId
  if (target.role === 'gestor' && target.isActive && (deixaDeSerGestor || mudaDeOrg)) {
    await assertOrgKeepsActiveManager(target.organizationId, target.id)
  }

  return prisma.user.update({
    where: { id },
    data: {
      fullName: data.fullName,
      role: newRole,
      phone: data.phone,
      avatarUrl: data.avatarUrl,
      organizationId: newRole === 'superadmin' ? null : organizationId,
    },
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
    throw new AuthzError('Sem permissão', 403)
  }

  // Não deixar a organização sem gestor ativo ao desativar um gestor.
  if (!isActive && target.role === 'gestor' && target.isActive) {
    await assertOrgKeepsActiveManager(target.organizationId, target.id)
  }

  return prisma.user.update({ where: { id }, data: { isActive } })
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
