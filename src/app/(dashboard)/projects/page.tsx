import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/status-badge'
import { EmptyState } from '@/components/common/empty-state'
import { Plus, FolderKanban, MapPin, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Project } from '@prisma/client'

type ProjectWithCounts = Project & {
  _count: {
    members: number
    municipalities: number
  }
}

async function getProjects(): Promise<ProjectWithCounts[]> {
  return prisma.project.findMany({
    include: {
      _count: {
        select: {
          members: true,
          municipalities: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <div>
      <PageHeader
        title="Projetos"
        description="Gerencie seus projetos de DRP"
        actions={
          <Link href="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-12 w-12" />}
          title="Nenhum projeto cadastrado"
          description="Crie seu primeiro projeto para começar a gerenciar diagnósticos rurais"
          action={
            <Link href="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Projeto
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: ProjectWithCounts) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">
                      {project.name}
                    </CardTitle>
                    <StatusBadge status={project.status} type="project" />
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{project._count.municipalities} municípios</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{project._count.members} membros</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-4 text-primary">
                    <span className="text-sm font-medium">Ver detalhes</span>
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
