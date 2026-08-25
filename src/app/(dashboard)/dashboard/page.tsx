import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FolderKanban,
  MapPin,
  CheckSquare,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { Project, Task } from '@prisma/client'
import { requireAuth, projectOrgWhere, viaProjectOrgWhere, type AuthContext } from '@/lib/authz'

async function getDashboardStats(ctx: AuthContext) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Isolamento multiempresa: contadores restritos à organização da sessão
  // (superadmin vê tudo). Municípios e tarefas filtram pela relação project.
  const projWhere = projectOrgWhere(ctx)
  const viaProj = viaProjectOrgWhere(ctx)

  const [
    projectsCount,
    municipalitiesCount,
    pendingTasksCount,
    overdueTasksCount,
    recentProjects,
    myTasks,
  ] = await Promise.all([
    prisma.project.count({ where: projWhere }),
    prisma.municipality.count({ where: viaProj }),
    prisma.task.count({
      where: { status: { in: ['pending', 'in_progress'] }, ...viaProj },
    }),
    prisma.task.count({
      where: {
        status: { in: ['pending', 'in_progress'] },
        dueDate: { lt: today },
        ...viaProj,
      },
    }),
    prisma.project.findMany({
      where: projWhere,
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        assignedToId: ctx.userId,
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

  const ctx = await requireAuth()

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
  })

  const stats = await getDashboardStats(ctx)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header com saudação */}
      <div className="relative overflow-hidden rounded-3xl gradient-hero p-8 text-white">
        <div className="absolute inset-0 opacity-10 pattern-dots" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-400/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-green-300/80 mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">{greeting}</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Olá, {user!.fullName.split(' ')[0]}!
          </h1>
          <p className="text-green-200/70 max-w-xl">
            Acompanhe seus projetos e tarefas. Você tem{' '}
            <span className="text-white font-semibold">{stats.pendingTasks} tarefas</span> pendentes
            {stats.overdueTasks > 0 && (
              <span className="text-amber-300"> e {stats.overdueTasks} atrasadas</span>
            )}.
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover border-0 shadow-lg shadow-black/5 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projetos Ativos
            </CardTitle>
            <div className="stat-icon">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-foreground">{stats.projects}</span>
              <span className="flex items-center text-sm text-green-600 font-medium mb-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                ativos
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-lg shadow-black/5 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Municípios
            </CardTitle>
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))' }}>
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-foreground">{stats.municipalities}</span>
              <span className="text-sm text-muted-foreground mb-1">cadastrados</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-lg shadow-black/5 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tarefas Pendentes
            </CardTitle>
            <div className="stat-icon-warning">
              <CheckSquare className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-foreground">{stats.pendingTasks}</span>
              <span className="flex items-center text-sm text-amber-600 font-medium mb-1">
                <Clock className="h-4 w-4 mr-1" />
                aguardando
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-lg shadow-black/5 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tarefas Atrasadas
            </CardTitle>
            <div className="stat-icon-danger">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-red-600">{stats.overdueTasks}</span>
              {stats.overdueTasks > 0 && (
                <span className="text-sm text-red-600 font-medium mb-1">atenção!</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent projects */}
        <Card className="border-0 shadow-lg shadow-black/5 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-semibold">Projetos Recentes</CardTitle>
            </div>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/5">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentProjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <FolderKanban className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground mb-4">
                  Nenhum projeto cadastrado
                </p>
                <Link href="/projects/new">
                  <Button className="gradient-primary btn-glow">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Projeto
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {stats.recentProjects.map((project: Project, index: number) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {project.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {project.status === 'active' ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              Ativo
                            </span>
                          ) : project.status === 'paused' ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Pausado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              Concluído
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My tasks */}
        <Card className="border-0 shadow-lg shadow-black/5 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <CheckSquare className="h-5 w-5 text-amber-600" />
              </div>
              <CardTitle className="text-lg font-semibold">Minhas Tarefas</CardTitle>
            </div>
            <Link href="/my-tasks">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/5">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {stats.myTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <CheckSquare className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">
                  Você não tem tarefas pendentes
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {stats.myTasks.map((task: Task & { project: { name: string } }, index: number) => {
                  const isOverdue =
                    new Date(task.dueDate) < new Date() &&
                    task.status !== 'completed'
                  return (
                    <Link
                      key={task.id}
                      href={`/projects/${task.projectId}/tasks/${task.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                          isOverdue
                            ? 'bg-gradient-to-br from-red-500/20 to-red-500/5'
                            : 'bg-gradient-to-br from-amber-500/20 to-amber-500/5'
                        }`}>
                          <Calendar className={`h-5 w-5 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {task.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {task.project?.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-medium ${
                            isOverdue ? 'text-red-600' : 'text-muted-foreground'
                          }`}
                        >
                          {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </p>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            Atrasada
                          </span>
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
