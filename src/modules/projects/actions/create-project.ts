'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createProjectSchema } from '../validations/project-schema'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type CreateProjectState = {
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createProject(
  prevState: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { error: 'Não autorizado' }
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

  try {
    const project = await prisma.project.create({
      data: {
        name: validatedFields.data.name,
        description: validatedFields.data.description,
        status: validatedFields.data.status as 'active' | 'paused' | 'completed',
        startDate: validatedFields.data.start_date ? new Date(validatedFields.data.start_date) : null,
        endDate: validatedFields.data.end_date ? new Date(validatedFields.data.end_date) : null,
        createdById: session.user.id,
      },
    })

    // Add creator as manager
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        roleInProject: 'manager',
        scopeType: 'project',
      },
    })

    revalidatePath('/projects')
    redirect(`/projects/${project.id}`)
  } catch (error) {
    console.error('Error creating project:', error)
    return { error: 'Erro ao criar projeto' }
  }
}
