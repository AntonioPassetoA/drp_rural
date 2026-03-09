import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/common/empty-state'
import { Plus, Users, ArrowLeft, Mail, Shield } from 'lucide-react'
import Link from 'next/link'
import { ROLE_LABELS } from '@/lib/constants/roles'
import { UserRole } from '@prisma/client'

interface PageProps {
  params: Promise<{ projectId: string }>
}

const PROJECT_ROLE_LABELS: Record<string, string> = {
  manager: 'Gerente',
  agronomist: 'Agrônomo',
  local_manager: 'Gestor Local',
  operator: 'Operador',
}

async function getProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  })
}

async function getMembers(projectId: string) {
  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export default async function TeamPage({ params }: PageProps) {
  const { projectId } = await params
  const project = await getProject(projectId)

  if (!project) {
    notFound()
  }

  const members = await getMembers(projectId)

  return (
    <div>
      <PageHeader
        title="Equipe"
        description={`Projeto: ${project.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/projects/${projectId}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/team/add`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Membro
              </Button>
            </Link>
          </div>
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Nenhum membro na equipe"
          description="Adicione membros para colaborar neste projeto"
          action={
            <Link href={`/projects/${projectId}/team/add`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Membro
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const initials = member.user.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {member.user.fullName}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Shield className="h-3 w-3" />
                        <span>
                          {PROJECT_ROLE_LABELS[member.roleInProject] ||
                            member.roleInProject}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.user.email}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Função: {ROLE_LABELS[member.user.role as UserRole]}
                      </p>
                    </div>
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
