import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { notFound } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/permissions/check-permission'
import type { Permission } from '@/permissions/roles'
import { AuthzError } from '@/lib/errors'
import { recordAudit } from '@/lib/audit'
import { AuditAction } from '@/lib/audit-actions'
import { metaFromRequestScope } from '@/lib/request-context'

// Reexporta para compatibilidade (código existente importa AuthzError daqui).
export { AuthzError }

// ============================================================================
// Contexto de autorização
// ----------------------------------------------------------------------------
// Ponto ÚNICO e centralizado para:
//  - identificar o usuário autenticado (sempre a partir da sessão, nunca do body);
//  - validar permissões (RBAC);
//  - aplicar o isolamento multiempresa (a organização vem SEMPRE da sessão).
//
// Regra de ouro: nenhum `organizationId` enviado pelo frontend é confiável.
// ============================================================================

export type AuthContext = {
  userId: string
  role: UserRole
  organizationId: string | null
}

/** Lê o contexto da sessão. Retorna null se não houver usuário autenticado. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return {
    userId: session.user.id,
    role: session.user.role,
    organizationId: session.user.organizationId ?? null,
  }
}

/**
 * Exige autenticação. Além disso, aplica a regra de negócio (que o banco sozinho
 * não garante): gestor e colaborador PRECISAM pertencer a uma organização.
 * Lança AuthzError (401/403) — use handleAuthz() nas rotas de API.
 */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) throw new AuthzError('Não autorizado', 401)
  if (ctx.role !== 'superadmin' && !ctx.organizationId) {
    throw new AuthzError('Usuário sem organização', 403)
  }
  return ctx
}

/** Exige uma permissão específica (RBAC). Lança 403 se faltar. */
export function requirePermission(ctx: AuthContext, permission: Permission): void {
  if (!hasPermission(ctx.role, permission)) {
    throw new AuthzError('Sem permissão para esta ação', 403)
  }
}

export function isSuperadmin(ctx: AuthContext): boolean {
  return ctx.role === 'superadmin'
}

// ----------------------------------------------------------------------------
// Filtros de isolamento por organização (para usar em cláusulas `where`)
// ----------------------------------------------------------------------------

/** Filtro para o próprio model Project. Superadmin não é filtrado. */
export function projectOrgWhere(ctx: AuthContext): { organizationId?: string } {
  return isSuperadmin(ctx) ? {} : { organizationId: ctx.organizationId ?? '__none__' }
}

/** Filtro para entidades acessadas através da relação `project` (ex.: Task, Municipality). */
export function viaProjectOrgWhere(ctx: AuthContext) {
  return isSuperadmin(ctx)
    ? {}
    : { project: { organizationId: ctx.organizationId ?? '__none__' } }
}

/** Filtro para o model User (mesma organização). Superadmin não é filtrado. */
export function userOrgWhere(ctx: AuthContext): { organizationId?: string } {
  return isSuperadmin(ctx) ? {} : { organizationId: ctx.organizationId ?? '__none__' }
}

/**
 * Confirma que um organizationId pertence ao contexto do usuário.
 * Superadmin ignora a checagem. Caso contrário, dispara 404 (não revela existência).
 */
export function assertOrg(ctx: AuthContext, organizationId: string | null): void {
  if (isSuperadmin(ctx)) return
  if (!organizationId || organizationId !== ctx.organizationId) {
    throw new AuthzError('Recurso não encontrado', 404)
  }
}

/**
 * Carrega um projeto pelo ID JÁ garantindo que ele pertence à organização do
 * usuário (superadmin acessa qualquer um). Base do isolamento de todas as
 * entidades filhas de um projeto (municípios, tarefas, diagnósticos, etc.).
 * Lança 404 se não existir ou for de outra organização.
 */
export async function requireProjectInOrg(ctx: AuthContext, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new AuthzError('Projeto não encontrado', 404)

  if (isSuperadmin(ctx)) {
    // Superadmin acessando recurso de uma organização = cross-org (auditável).
    if (project.organizationId) {
      const meta = await metaFromRequestScope()
      await recordAudit({
        action: AuditAction.SUPERADMIN_CROSS_ORG_ACCESS,
        userId: ctx.userId, organizationId: project.organizationId, crossOrg: true,
        entityType: 'Project', entityId: project.id, ip: meta.ip, userAgent: meta.userAgent,
        metadata: { via: 'api' },
      })
    }
    return project
  }

  if (!project.organizationId || project.organizationId !== ctx.organizationId) {
    const meta = await metaFromRequestScope()
    await recordAudit({
      action: AuditAction.AUTHZ_DENIED, result: 'failure',
      userId: ctx.userId, organizationId: ctx.organizationId,
      entityType: 'Project', entityId: projectId, ip: meta.ip, userAgent: meta.userAgent,
      metadata: { attempted: 'project.access', reason: 'cross_org' },
    })
    throw new AuthzError('Recurso não encontrado', 404)
  }
  return project
}

/**
 * Versão para PÁGINAS (Server Components): garante que o projeto pertence à
 * organização do usuário; caso contrário chama notFound() (renderiza 404 em vez
 * de vazar a existência do recurso). Use no topo de toda página escopada por
 * projeto — protege também as entidades filhas (municípios, tarefas, etc.).
 */
export async function requireProjectPageAccess(ctx: AuthContext, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) notFound()

  if (isSuperadmin(ctx)) {
    if (project.organizationId) {
      const meta = await metaFromRequestScope()
      await recordAudit({
        action: AuditAction.SUPERADMIN_CROSS_ORG_ACCESS,
        userId: ctx.userId, organizationId: project.organizationId, crossOrg: true,
        entityType: 'Project', entityId: project.id, ip: meta.ip, userAgent: meta.userAgent,
        metadata: { via: 'page' },
      })
    }
    return project
  }

  if (project.organizationId !== ctx.organizationId) {
    const meta = await metaFromRequestScope()
    await recordAudit({
      action: AuditAction.AUTHZ_DENIED, result: 'failure',
      userId: ctx.userId, organizationId: ctx.organizationId,
      entityType: 'Project', entityId: projectId, ip: meta.ip, userAgent: meta.userAgent,
      metadata: { attempted: 'project.page', reason: 'cross_org' },
    })
    notFound()
  }
  return project
}

// ----------------------------------------------------------------------------
// Integração com rotas de API
// ----------------------------------------------------------------------------

/** Converte AuthzError em NextResponse; demais erros viram 500 sem vazar detalhes. */
export function handleAuthzError(error: unknown): NextResponse {
  if (error instanceof AuthzError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('Erro interno:', error)
  return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
}
