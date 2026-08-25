import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/status-badge'
import { EmptyState } from '@/components/common/empty-state'
import { Plus, FolderKanban, MapPin, Users, ArrowRight, Calendar, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Project } from '@prisma/client'
import { requireAuth, projectOrgWhere, type AuthContext } from '@/lib/authz'

type ProjectWithCounts = Project & {
  _count: {
    members: number
    municipalities: number
  }
}

async function getProjects(ctx: AuthContext): Promise<ProjectWithCounts[]> {
  return prisma.project.findMany({
    // Isolamento multiempresa: só projetos da organização da sessão
    // (superadmin vê todos).
    where: projectOrgWhere(ctx),
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
  const ctx = await requireAuth()
  const projects = await getProjects(ctx)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl gradient-hero p-8 text-white">
        <div className="absolute inset-0 opacity-10 pattern-dots" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-400/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-green-300/80 mb-2">
              <FolderKanban className="h-5 w-5" />
              <span className="text-sm font-medium">Gestão de Projetos</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Projetos de DRP</h1>
            <p className="text-green-200/70 max-w-xl">
              Gerencie seus projetos de Diagnóstico Rural Participativo, acompanhe o progresso e coordene sua equipe.
            </p>
          </div>
          <Link href="/projects/new">
            <Button size="lg" className="bg-white text-green-700 hover:bg-white/90 shadow-xl shadow-black/10 rounded-xl font-semibold">
              <Plus className="mr-2 h-5 w-5" />
              Novo Projeto
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
          <p className="text-2xl font-bold text-foreground">{projects.length}</p>
          <p className="text-sm text-muted-foreground">Total de projetos</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
          <p className="text-2xl font-bold text-green-600">{projects.filter(p => p.status === 'active').length}</p>
          <p className="text-sm text-muted-foreground">Projetos ativos</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{projects.reduce((acc, p) => acc + p._count.municipalities, 0)}</p>
          <p className="text-sm text-muted-foreground">Municípios</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{projects.reduce((acc, p) => acc + p._count.members, 0)}</p>
          <p className="text-sm text-muted-foreground">Membros</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-black/5 rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="text-center py-16 px-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhum projeto cadastrado
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Crie seu primeiro projeto para começar a gerenciar diagnósticos rurais participativos.
              </p>
              <Link href="/projects/new">
                <Button size="lg" className="gradient-primary btn-glow rounded-xl font-semibold">
                  <Plus className="mr-2 h-5 w-5" />
                  Criar Primeiro Projeto
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: ProjectWithCounts, index: number) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card
                className="group border-0 shadow-lg shadow-black/5 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Gradient top bar */}
                <div className="h-2 bg-gradient-to-r from-primary via-emerald-500 to-lime-500" />

                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:scale-110 transition-transform">
                      <FolderKanban className="h-6 w-6 text-primary" />
                    </div>
                    <StatusBadge status={project.status} type="project" />
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>

                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded bg-blue-100">
                        <MapPin className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span>{project._count.municipalities} municípios</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded bg-amber-100">
                        <Users className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <span>{project._count.members} membros</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(project.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
                      <span>Ver projeto</span>
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
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
