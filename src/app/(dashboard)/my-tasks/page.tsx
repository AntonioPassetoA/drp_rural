import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge, PriorityBadge } from '@/components/common/status-badge'
import { CheckSquare, Calendar, MapPin, ArrowRight, Clock, AlertTriangle, ListTodo, Sparkles } from 'lucide-react'
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

  const overdueTasks = tasks.filter(t => new Date(t.dueDate) < today)
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const pendingTasks = tasks.filter(t => t.status === 'pending')

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-8 text-white">
        <div className="absolute inset-0 opacity-10 pattern-dots" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-amber-200/80 mb-2">
            <ListTodo className="h-5 w-5" />
            <span className="text-sm font-medium">Gestão de Tarefas</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Minhas Tarefas</h1>
          <p className="text-amber-100/70 max-w-xl">
            Acompanhe e gerencie suas tarefas atribuídas. Você tem{' '}
            <span className="text-white font-semibold">{tasks.length} tarefas</span> pendentes
            {overdueTasks.length > 0 && (
              <span className="text-red-200"> ({overdueTasks.length} atrasadas)</span>
            )}.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100">
              <CheckSquare className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{inProgressTasks.length}</p>
              <p className="text-sm text-muted-foreground">Em progresso</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gray-100">
              <ListTodo className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{pendingTasks.length}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
              <p className="text-sm text-muted-foreground">Atrasadas</p>
            </div>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-black/5 rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="text-center py-16 px-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Tudo em dia!
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Você não tem tarefas pendentes no momento. Aproveite para relaxar ou ajudar um colega.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task: TaskWithRelations, index: number) => {
            const isOverdue = new Date(task.dueDate) < today
            const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            return (
              <Link
                key={task.id}
                href={`/projects/${task.projectId}/tasks/${task.id}`}
              >
                <Card
                  className={`group border-0 shadow-lg shadow-black/5 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ${
                    isOverdue ? 'ring-2 ring-red-200 bg-gradient-to-r from-red-50/50 to-white' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${
                          isOverdue
                            ? 'bg-gradient-to-br from-red-100 to-red-50'
                            : task.status === 'in_progress'
                            ? 'bg-gradient-to-br from-blue-100 to-blue-50'
                            : 'bg-gradient-to-br from-amber-100 to-amber-50'
                        }`}>
                          <CheckSquare className={`h-5 w-5 ${
                            isOverdue
                              ? 'text-red-600'
                              : task.status === 'in_progress'
                              ? 'text-blue-600'
                              : 'text-amber-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {task.title}
                            </h3>
                            <StatusBadge status={task.status} type="task" />
                            <PriorityBadge priority={task.priority} />
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.project?.name}
                          </p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          )}
                          {task.locality?.name && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
                              <MapPin className="h-3.5 w-3.5" />
                              {task.locality.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                            isOverdue
                              ? 'bg-red-100 text-red-700'
                              : daysUntilDue <= 2
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(task.dueDate).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short'
                          })}
                        </div>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            Atrasada
                          </span>
                        )}
                        <div className="flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Ver tarefa</span>
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </div>
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
