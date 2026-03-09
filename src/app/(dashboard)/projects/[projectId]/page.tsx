import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/status-badge'
import {
  MapPin,
  Users,
  FileText,
  CheckSquare,
  Settings,
  Plus,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ projectId: string }>
}

async function getProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      },
      municipalities: true,
    },
  })
}

async function getProjectStats(projectId: string) {
  const [
    municipalitiesCount,
    membersCount,
    tasksCount,
    completedTasksCount,
  ] = await Promise.all([
    prisma.municipality.count({ where: { projectId } }),
    prisma.projectMember.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, status: 'completed' } }),
  ])

  return {
    municipalities: municipalitiesCount,
    members: membersCount,
    tasks: tasksCount,
    completedTasks: completedTasksCount,
  }
}

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params
  const project = await getProject(projectId)

  if (!project) {
    notFound()
  }

  const stats = await getProjectStats(projectId)

  return (
    <div>
      <PageHeader
        title={project.name}
        description={project.description || undefined}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} type="project" />
            <Link href={`/projects/${projectId}/edit`}>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
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
              Membros
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.members}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tarefas
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídas
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link href={`/projects/${projectId}/municipalities`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Municípios</p>
                <p className="text-sm text-muted-foreground">
                  Gerenciar municípios
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${projectId}/diagnostics`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Diagnósticos</p>
                <p className="text-sm text-muted-foreground">
                  Formulários DRP
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${projectId}/tasks`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Tarefas</p>
                <p className="text-sm text-muted-foreground">
                  Gerenciar tarefas
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${projectId}/team`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Equipe</p>
                <p className="text-sm text-muted-foreground">
                  Gerenciar membros
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Municipalities list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Municípios</CardTitle>
          <Link href={`/projects/${projectId}/municipalities`}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {project.municipalities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum município cadastrado neste projeto
            </p>
          ) : (
            <div className="space-y-2">
              {project.municipalities.slice(0, 5).map((municipality) => (
                <Link
                  key={municipality.id}
                  href={`/projects/${projectId}/municipalities/${municipality.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{municipality.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {municipality.state}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
