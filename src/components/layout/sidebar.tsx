'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  Leaf,
} from 'lucide-react'
import { UserRole } from '@prisma/client'
import { hasPermission } from '@/permissions'

interface SidebarProps {
  user: {
    id: string
    fullName: string
    email: string
    role: UserRole
    avatarUrl?: string | null
  }
  currentProjectId?: string
}

export function Sidebar({ user, currentProjectId }: SidebarProps) {
  const pathname = usePathname()

  const mainNavItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      permission: null,
    },
    {
      label: 'Projetos',
      href: '/projects',
      icon: FolderKanban,
      permission: null,
    },
    {
      label: 'Minhas Tarefas',
      href: '/my-tasks',
      icon: CheckSquare,
      permission: null,
    },
  ]

  const adminNavItems = [
    {
      label: 'Usuários',
      href: '/users',
      icon: Users,
      show: hasPermission(user.role, 'users:read'),
    },
    {
      label: 'Configurações',
      href: '/settings',
      icon: Settings,
      show: hasPermission(user.role, 'settings:read'),
    },
  ]

  const projectNavItems = currentProjectId
    ? [
        { label: 'Visão Geral', href: `/projects/${currentProjectId}` },
        { label: 'Municípios', href: `/projects/${currentProjectId}/municipalities` },
        { label: 'Diagnósticos', href: `/projects/${currentProjectId}/diagnostics` },
        { label: 'Tarefas', href: `/projects/${currentProjectId}/tasks` },
        { label: 'Evidências', href: `/projects/${currentProjectId}/evidences` },
        { label: 'Relatórios', href: `/projects/${currentProjectId}/reports` },
      ]
    : []

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold text-lg">DRP Rural</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Main nav */}
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}

          {/* Project nav */}
          {projectNavItems.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Projeto Atual
                </p>
              </div>
              {projectNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors pl-6',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </>
          )}

          {/* Admin nav */}
          {adminNavItems.some((item) => item.show) && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Administração
                </p>
              </div>
              {adminNavItems
                .filter((item) => item.show)
                .map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
            </>
          )}
        </nav>
      </div>
    </aside>
  )
}
