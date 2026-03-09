import { prisma } from '@/lib/prisma'
import { Task, TaskStatus, TaskPriority, TaskType } from '@prisma/client'

export type CreateTaskData = {
  projectId: string
  title: string
  description?: string
  taskType?: TaskType
  priority?: TaskPriority
  assignedToId: string
  dueDate: Date
  localityId?: string
  checklist?: object
}

export type UpdateTaskData = {
  title?: string
  description?: string
  taskType?: TaskType
  priority?: TaskPriority
  status?: TaskStatus
  assignedToId?: string
  dueDate?: Date
  localityId?: string
  checklist?: object
}

export async function getTasksByProject(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
    include: {
      assignedTo: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      locality: true,
    },
    orderBy: { dueDate: 'asc' },
  })
}

export async function getTaskById(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      project: true,
      assignedTo: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
          phone: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      locality: {
        include: {
          microregion: {
            include: {
              municipality: true,
            },
          },
        },
      },
      evidences: true,
    },
  })
}

export async function getMyTasks(userId: string) {
  return prisma.task.findMany({
    where: {
      assignedToId: userId,
      status: { in: ['pending', 'in_progress'] },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      locality: true,
    },
    orderBy: { dueDate: 'asc' },
  })
}

export async function createTask(data: CreateTaskData, createdById: string): Promise<Task> {
  return prisma.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      taskType: data.taskType || 'task',
      priority: data.priority || 'medium',
      assignedToId: data.assignedToId,
      createdById,
      dueDate: data.dueDate,
      localityId: data.localityId,
      checklist: data.checklist,
    },
  })
}

export async function updateTask(id: string, data: UpdateTaskData): Promise<Task> {
  const updateData: Record<string, unknown> = { ...data }

  // Set completedAt when status changes to completed
  if (data.status === 'completed') {
    updateData.completedAt = new Date()
  }

  return prisma.task.update({
    where: { id },
    data: updateData,
  })
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  return updateTask(id, { status })
}

export async function deleteTask(id: string): Promise<void> {
  await prisma.task.delete({
    where: { id },
  })
}

export async function getTaskStats(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: {
      status: true,
      dueDate: true,
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const stats = {
    total: tasks.length,
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
  }

  for (const task of tasks) {
    if (task.status === 'pending') stats.pending++
    else if (task.status === 'in_progress') stats.in_progress++
    else if (task.status === 'completed') stats.completed++
    else if (task.status === 'cancelled') stats.cancelled++

    // Check overdue
    if (
      (task.status === 'pending' || task.status === 'in_progress') &&
      task.dueDate < today
    ) {
      stats.overdue++
    }
  }

  return stats
}

export async function getOverdueTasks(projectId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return prisma.task.findMany({
    where: {
      projectId,
      status: { in: ['pending', 'in_progress'] },
      dueDate: { lt: today },
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  })
}

export async function getTasksByAssignee(userId: string, projectId?: string) {
  return prisma.task.findMany({
    where: {
      assignedToId: userId,
      ...(projectId && { projectId }),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      locality: true,
    },
    orderBy: { dueDate: 'asc' },
  })
}
