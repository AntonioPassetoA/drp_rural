import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { requireAuth, requireProjectPageAccess } from '@/lib/authz'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import { StatusBadge, PriorityBadge } from '@/components/common/status-badge'
import { Plus, CheckSquare, ArrowLeft, Calendar, User } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ projectId: string }>
}

async function getProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  })
}

async function getTasks(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
    include: {
      assignedTo: {
        select: { id: true, fullName: true },
      },
      locality: {
        select: { name: true },
      },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  })
}

export default async function TasksPage({ params }: PageProps) {
  const { projectId } = await params
  const ctx = await requireAuth()
  await requireProjectPageAccess(ctx, projectId)
  const project = await getProject(projectId)

  if (!project) {
    notFound()
  }

  const tasks = await getTasks(projectId)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description={`Projeto: ${project.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/projects/${projectId}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/tasks/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Tarefa
              </Button>
            </Link>
          </div>
        }
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-12 w-12" />}
          title="Nenhuma tarefa cadastrada"
          description="Crie tarefas para organizar o trabalho da equipe"
          action={
            <Link href={`/projects/${projectId}/tasks/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Tarefa
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const isOverdue =
              new Date(task.dueDate) < today && task.status !== 'completed'

            return (
              <Link
                key={task.id}
                href={`/projects/${projectId}/tasks/${task.id}`}
              >
                <Card
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    isOverdue ? 'border-red-200 bg-red-50/50' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{task.title}</h3>
                          <StatusBadge status={task.status} type="task" />
                          <PriorityBadge priority={task.priority} />
                        </div>

                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          {task.assignedTo && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{task.assignedTo.fullName}</span>
                            </div>
                          )}
                          {task.locality && (
                            <span>{task.locality.name}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`flex items-center gap-1 text-sm ${
                            isOverdue
                              ? 'text-red-600 font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <Calendar className="h-4 w-4" />
                          {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </div>
                        {isOverdue && (
                          <p className="text-xs text-red-600 mt-1">Atrasada</p>
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
