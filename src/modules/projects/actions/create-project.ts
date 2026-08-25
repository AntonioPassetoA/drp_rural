'use server'

import { prisma } from '@/lib/prisma'
import { createProjectSchema } from '../validations/project-schema'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuth, requirePermission, AuthzError } from '@/lib/authz'

export type CreateProjectState = {
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createProject(
  prevState: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  // Autenticação + RBAC (colaborador não possui projects:create).
  let ctx
  try {
    ctx = await requireAuth()
    requirePermission(ctx, 'projects:create')
  } catch (e) {
    if (e instanceof AuthzError) return { error: e.message }
    throw e
  }

  const rawData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string || undefined,
    status: (formData.get('status') as string) || 'active',
    start_date: formData.get('start_date') as string || undefined,
    end_date: formData.get('end_date') as string || undefined,
  }

  const validatedFields = createProjectSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  // A organização vem SEMPRE da sessão — nunca do formulário/cliente.
  // Superadmin não pertence a uma organização; não pode criar projeto sem
  // escolher uma (seletor ainda não implementado neste formulário).
  const organizationId = ctx.organizationId
  if (!organizationId) {
    return { error: 'Superadmin deve selecionar uma organização para criar projetos.' }
  }

  let newProjectId: string
  try {
    // Transação: projeto + vínculo do criador como gestor do projeto.
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: validatedFields.data.name,
          description: validatedFields.data.description,
          status: validatedFields.data.status as 'active' | 'paused' | 'completed',
          startDate: validatedFields.data.start_date ? new Date(validatedFields.data.start_date) : null,
          endDate: validatedFields.data.end_date ? new Date(validatedFields.data.end_date) : null,
          createdById: ctx.userId,
          organizationId,
        },
      })

      await tx.projectMember.create({
        data: {
          projectId: created.id,
          userId: ctx.userId,
          roleInProject: 'manager',
          scopeType: 'project',
        },
      })

      return created
    })
    newProjectId = project.id
  } catch (error) {
    console.error('Error creating project:', error)
    return { error: 'Erro ao criar projeto' }
  }

  revalidatePath('/projects')
  // redirect() lança NEXT_REDIRECT — precisa ficar FORA do try/catch acima.
  redirect(`/projects/${newProjectId}`)
}
