import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuth,
  requirePermission,
  requireProjectInOrg,
  handleAuthzError,
} from '@/lib/authz'

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
    await requireProjectInOrg(ctx, projectId)

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
    await requireProjectInOrg(ctx, projectId)

    await prisma.project.delete({ where: { id: projectId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthzError(error)
  }
}
