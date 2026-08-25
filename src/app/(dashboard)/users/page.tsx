import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Mail, Phone, Shield } from 'lucide-react'
import Link from 'next/link'
import { ROLE_LABELS } from '@/lib/constants/roles'
import { UserRole } from '@prisma/client'
import { requireAuth, userOrgWhere, type AuthContext } from '@/lib/authz'

async function getUsers(ctx: AuthContext) {
  return prisma.user.findMany({
    // Isolamento: gestor vê apenas usuários da própria organização;
    // superadmin vê todos.
    where: userOrgWhere(ctx),
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
    },
  })
}

export default async function UsersPage() {
  const ctx = await requireAuth()

  // Apenas superadmin (plataforma) e gestor (organização) administram usuários
  if (ctx.role !== 'superadmin' && ctx.role !== 'gestor') {
    redirect('/dashboard')
  }

  const users = await getUsers(ctx)

  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários da plataforma"
        actions={
          <Link href="/users/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Link key={user.id} href={`/users/${user.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{user.fullName}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Shield className="h-3 w-3" />
                      <span>{ROLE_LABELS[user.role as UserRole]}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Phone className="h-3 w-3" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
