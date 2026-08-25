import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { requireAuth, requireProjectPageAccess } from '@/lib/authz'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import { Plus, MapPin, Users, ArrowLeft, ArrowRight } from 'lucide-react'
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

async function getMunicipalities(projectId: string) {
  return prisma.municipality.findMany({
    where: { projectId },
    include: {
      _count: {
        select: {
          microregions: true,
          diagnostics: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export default async function MunicipalitiesPage({ params }: PageProps) {
  const { projectId } = await params
  const ctx = await requireAuth()
  await requireProjectPageAccess(ctx, projectId)
  const project = await getProject(projectId)

  if (!project) {
    notFound()
  }

  const municipalities = await getMunicipalities(projectId)

  return (
    <div>
      <PageHeader
        title="Municípios"
        description={`Projeto: ${project.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/projects/${projectId}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/municipalities/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Município
              </Button>
            </Link>
          </div>
        }
      />

      {municipalities.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-12 w-12" />}
          title="Nenhum município cadastrado"
          description="Adicione municípios para começar o diagnóstico rural"
          action={
            <Link href={`/projects/${projectId}/municipalities/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Município
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {municipalities.map((municipality) => (
            <Link
              key={municipality.id}
              href={`/projects/${projectId}/municipalities/${municipality.id}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{municipality.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {municipality.state}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{municipality._count.microregions} microrregiões</span>
                    </div>
                  </div>

                  {municipality.population && (
                    <p className="text-sm text-muted-foreground mt-2">
                      População: {municipality.population.toLocaleString('pt-BR')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
