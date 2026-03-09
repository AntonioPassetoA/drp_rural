import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import { FileText, ArrowLeft, MapPin, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ projectId: string }>
}

const FORM_TYPE_LABELS: Record<string, string> = {
  municipality_history: 'Histórico do Município',
  drp_summary: 'Resumo DRP',
  applied_methodology: 'Metodologia Aplicada',
  social_reality: 'Realidade Social',
  environmental_reality: 'Realidade Ambiental',
  productive_vocations: 'Vocações Produtivas',
  main_actions: 'Ações Principais',
  final_recommendations: 'Recomendações Finais',
}

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', icon: Clock, color: 'text-yellow-600' },
  in_progress: { label: 'Em Andamento', icon: AlertCircle, color: 'text-blue-600' },
  completed: { label: 'Concluído', icon: CheckCircle, color: 'text-green-600' },
}

async function getProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  })
}

async function getMunicipalitiesWithDiagnostics(projectId: string) {
  return prisma.municipality.findMany({
    where: { projectId },
    include: {
      diagnostics: {
        select: {
          id: true,
          formType: true,
          status: true,
          filledAt: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export default async function DiagnosticsPage({ params }: PageProps) {
  const { projectId } = await params
  const project = await getProject(projectId)

  if (!project) {
    notFound()
  }

  const municipalities = await getMunicipalitiesWithDiagnostics(projectId)

  const allFormTypes = Object.keys(FORM_TYPE_LABELS)

  return (
    <div>
      <PageHeader
        title="Diagnósticos"
        description={`Projeto: ${project.name}`}
        actions={
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />

      {municipalities.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Nenhum município cadastrado"
          description="Adicione municípios para começar os diagnósticos"
          action={
            <Link href={`/projects/${projectId}/municipalities/new`}>
              <Button>
                <MapPin className="mr-2 h-4 w-4" />
                Adicionar Município
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {municipalities.map((municipality) => {
            const completedCount = municipality.diagnostics.filter(
              (d) => d.status === 'completed'
            ).length
            const totalCount = allFormTypes.length
            const progress = Math.round((completedCount / totalCount) * 100)

            return (
              <Card key={municipality.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{municipality.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {municipality.state}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{progress}%</p>
                      <p className="text-sm text-muted-foreground">
                        {completedCount}/{totalCount} formulários
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                    {allFormTypes.map((formType) => {
                      const diagnostic = municipality.diagnostics.find(
                        (d) => d.formType === formType
                      )
                      const status = diagnostic?.status || 'not_started'
                      const StatusIcon =
                        status === 'not_started'
                          ? Clock
                          : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.icon || Clock
                      const statusColor =
                        status === 'not_started'
                          ? 'text-gray-400'
                          : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || 'text-gray-400'

                      return (
                        <Link
                          key={formType}
                          href={`/projects/${projectId}/municipalities/${municipality.id}/diagnostics/${formType}`}
                          className="flex items-center gap-2 p-2 rounded-lg border hover:bg-gray-50 transition-colors"
                        >
                          <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                          <span className="text-sm truncate">
                            {FORM_TYPE_LABELS[formType]}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
