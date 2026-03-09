import { prisma } from '@/lib/prisma'
import { Project, ProjectMember, ProjectStatus, ProjectRole, ScopeType } from '@prisma/client'

export type CreateProjectData = {
  name: string
  description?: string
  startDate?: Date
  endDate?: Date
}

export type UpdateProjectData = {
  name?: string
  description?: string
  status?: ProjectStatus
  startDate?: Date
  endDate?: Date
}

export type ProjectWithMembers = Project & {
  members: (ProjectMember & {
    user: {
      id: string
      email: string
      fullName: string
      role: string
      avatarUrl: string | null
    }
  })[]
  municipalities: {
    id: string
    name: string
    state: string
  }[]
}

export async function getProjects(): Promise<Project[]> {
  return prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function getProjectById(id: string): Promise<ProjectWithMembers | null> {
  return prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
      },
      municipalities: {
        select: {
          id: true,
          name: true,
          state: true,
        },
      },
    },
  })
}

export async function createProject(data: CreateProjectData, userId: string): Promise<Project> {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      createdById: userId,
    },
  })

  // Add creator as project manager
  await addProjectMember(project.id, userId, 'manager', 'project')

  return project
}

export async function updateProject(id: string, data: UpdateProjectData): Promise<Project> {
  return prisma.project.update({
    where: { id },
    data,
  })
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({
    where: { id },
  })
}

export async function getProjectMembers(projectId: string) {
  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          avatarUrl: true,
          phone: true,
        },
      },
    },
  })
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  roleInProject: ProjectRole,
  scopeType: ScopeType,
  scopeId?: string
): Promise<ProjectMember> {
  return prisma.projectMember.create({
    data: {
      projectId,
      userId,
      roleInProject,
      scopeType,
      scopeId,
    },
  })
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  await prisma.projectMember.delete({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  })
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: true,
    },
  })

  return memberships.map((m) => m.project)
}

export async function getProjectStats(projectId: string) {
  const [
    municipalitiesCount,
    tasksCount,
    completedTasksCount,
  ] = await Promise.all([
    prisma.municipality.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, status: 'completed' } }),
  ])

  // Get microregions count through municipalities
  const municipalities = await prisma.municipality.findMany({
    where: { projectId },
    select: { id: true },
  })
  const municipalityIds = municipalities.map((m) => m.id)

  const [microregionsCount, diagnosticsCount] = await Promise.all([
    prisma.microregion.count({
      where: { municipalityId: { in: municipalityIds } },
    }),
    prisma.diagnostic.count({
      where: { municipalityId: { in: municipalityIds } },
    }),
  ])

  // Get localities count through microregions
  const microregions = await prisma.microregion.findMany({
    where: { municipalityId: { in: municipalityIds } },
    select: { id: true },
  })
  const microregionIds = microregions.map((m) => m.id)

  const localitiesCount = await prisma.locality.count({
    where: { microregionId: { in: microregionIds } },
  })

  return {
    municipalities: municipalitiesCount,
    microregions: microregionsCount,
    localities: localitiesCount,
    tasks: tasksCount,
    completedTasks: completedTasksCount,
    diagnostics: diagnosticsCount,
  }
}

export async function isUserProjectMember(projectId: string, userId: string): Promise<boolean> {
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  })
  return !!member
}

export async function getActiveProjects(): Promise<Project[]> {
  return prisma.project.findMany({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  })
}
