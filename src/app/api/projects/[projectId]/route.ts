import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuth,
  requirePermission,
  requireProjectInOrg,
  handleAuthzError,
} from '@/lib/authz'
import { recordAudit, recordAuditInTx } from '@/lib/audit'
import { AuditAction } from '@/lib/audit-actions'
import { metaFromHeaders } from '@/lib/request-context'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireAuth()
    requirePermission(ctx, 'projects:read')
    const { projectId } = await params

    // Isolamento: 404 se o projeto não existir ou for de outra organização.
    await requireProjectInOrg(ctx, projectId)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        _count: { select: { municipalities: true, tasks: true } },
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    return handleAuthzError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireAuth()
    requirePermission(ctx, 'projects:update')
    const { projectId } = await params

    // Confirma posse antes de editar por ID.
    const current = await requireProjectInOrg(ctx, projectId)

    const body = await request.json()
    const { name, description, status, startDate, endDate } = body

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name,
        description: description || null,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    // project.update — não crítico (best-effort). Só campos administrativos:
    // NÃO gravamos nome/descrição (podem conter dados pessoais), apenas se mudaram.
    const nameChanged = typeof name === 'string' && name !== current.name
    const descriptionChanged = (description || null) !== (current.description ?? null)
    const meta = metaFromHeaders(request.headers)
    await recordAudit({
      action: AuditAction.PROJECT_UPDATE,
      userId: ctx.userId,
      organizationId: current.organizationId,
      entityType: 'Project',
      entityId: projectId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: {
        nameChanged,
        descriptionChanged,
        statusFrom: current.status,
        statusTo: project.status,
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    return handleAuthzError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireAuth()
    // RBAC: apenas quem tem projects:delete (gestor/superadmin).
    requirePermission(ctx, 'projects:delete')
    const { projectId } = await params

    // Confirma posse antes de excluir por ID.
    const current = await requireProjectInOrg(ctx, projectId)
    const meta = metaFromHeaders(request.headers)

    // CRÍTICO: exclusão e auditoria na MESMA transação (se o log falhar, a
    // exclusão é revertida — não há exclusão sem trilha correspondente).
    await prisma.$transaction(async (tx) => {
      await tx.project.delete({ where: { id: projectId } })
      await recordAuditInTx(tx, {
        action: AuditAction.PROJECT_DELETE,
        userId: ctx.userId,
        organizationId: current.organizationId,
        entityType: 'Project',
        entityId: projectId,
        ip: meta.ip,
        userAgent: meta.userAgent,
        // Só campo administrativo — NÃO gravamos nome/descrição.
        metadata: { statusFrom: current.status },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthzError(error)
  }
}
