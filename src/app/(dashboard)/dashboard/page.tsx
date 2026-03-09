import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FolderKanban,
  MapPin,
  CheckSquare,
  AlertTriangle,
  Plus,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { Project, Task } from '@prisma/client'

async function getDashboardStats(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    projectsCount,
    municipalitiesCount,
    pendingTasksCount,
    overdueTasksCount,
    recentProjects,
    myTasks,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.municipality.count(),
    prisma.task.count({
      where: { status: { in: ['pending', 'in_progress'] } },
    }),
    prisma.task.count({
      where: {
        status: { in: ['pending', 'in_progress'] },
        dueDate: { lt: today },
      },
    }),
    prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        assignedToId: userId,
        status: { in: ['pending', 'in_progress'] },
      },
      include: {
        project: {
          select: { name: true },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
  ])

  return {
    projects: projectsCount,
    municipalities: municipalitiesCount,
    pendingTasks: pendingTasksCount,
    overdueTasks: overdueTasksCount,
    recentProjects,
    myTasks,
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
  })

  const stats = await getDashboardStats(session!.user.id)

  return (
    <div>
      <PageHeader
        title={`Bem-vindo, ${user!.fullName.split(' ')[0]}`}
        description="Acompanhe seus projetos e tarefas"
      />

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projetos
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Municípios
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.municipalities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tarefas Pendentes
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tarefas Atrasadas
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.overdueTasks}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Projetos Recentes</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentProjects.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Nenhum projeto cadastrado
                </p>
                <Link href="/projects/new">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Projeto
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentProjects.map((project: Project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.status === 'active'
                          ? 'Ativo'
                          : project.status === 'paused'
                          ? 'Pausado'
                          : 'Concluído'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Minhas Tarefas</CardTitle>
            <Link href="/my-tasks">
              <Button variant="ghost" size="sm">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.myTasks.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  Você não tem tarefas pendentes
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.myTasks.map((task: Task & { project: { name: string } }) => {
                  const isOverdue =
                    new Date(task.dueDate) < new Date() &&
                    task.status !== 'completed'
                  return (
                    <Link
                      key={task.id}
                      href={`/projects/${task.projectId}/tasks/${task.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {task.project?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm ${
                            isOverdue ? 'text-red-600 font-medium' : ''
                          }`}
                        >
                          {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </p>
                        {isOverdue && (
                          <p className="text-xs text-red-600">Atrasada</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
