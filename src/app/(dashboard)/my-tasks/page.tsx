import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import { StatusBadge, PriorityBadge } from '@/components/common/status-badge'
import { CheckSquare, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import { Task, Locality, Project } from '@prisma/client'

type TaskWithRelations = Task & {
  project: Pick<Project, 'id' | 'name'>
  locality: Pick<Locality, 'name'> | null
}

async function getMyTasks(userId: string): Promise<TaskWithRelations[]> {
  return prisma.task.findMany({
    where: {
      assignedToId: userId,
      status: { in: ['pending', 'in_progress'] },
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      locality: {
        select: { name: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  })
}

export default async function MyTasksPage() {
  const session = await getServerSession(authOptions)
  const tasks = await getMyTasks(session!.user.id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div>
      <PageHeader
        title="Minhas Tarefas"
        description="Tarefas atribuídas a você"
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-12 w-12" />}
          title="Nenhuma tarefa pendente"
          description="Você não tem tarefas atribuídas no momento"
        />
      ) : (
        <div className="space-y-4">
          {tasks.map((task: TaskWithRelations) => {
            const isOverdue = new Date(task.dueDate) < today
            return (
              <Link
                key={task.id}
                href={`/projects/${task.projectId}/tasks/${task.id}`}
              >
                <Card
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    isOverdue ? 'border-red-200 bg-red-50/50' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{task.title}</h3>
                          <StatusBadge status={task.status} type="task" />
                          <PriorityBadge priority={task.priority} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {task.project?.name}
                        </p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div
                          className={`flex items-center gap-1 text-sm ${
                            isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                          }`}
                        >
                          <Calendar className="h-4 w-4" />
                          {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </div>
                        {isOverdue && (
                          <p className="text-xs text-red-600 mt-1">Atrasada</p>
                        )}
                        {task.locality?.name && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            {task.locality.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
