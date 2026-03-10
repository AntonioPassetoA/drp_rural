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
  ChevronRight,
  Sparkles,
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar overflow-hidden">
      {/* Decoração de fundo */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-green-400 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-emerald-400 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative h-full flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20">
            <Leaf className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">
              DRP Rural
            </h1>
            <p className="text-[10px] text-sidebar-foreground/50 font-medium uppercase tracking-wider">
              Gestão
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
          <p className="px-3 mb-3 text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest">
            Menu Principal
          </p>

          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-green-500/20'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-white/20'
                      : 'bg-sidebar-accent group-hover:bg-sidebar-primary/20 group-hover:scale-110'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="h-4 w-4 opacity-70" />
                )}
              </Link>
            )
          })}

          {/* Project nav */}
          {projectNavItems.length > 0 && (
            <>
              <div className="pt-6">
                <p className="px-3 mb-3 text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest">
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
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ml-2 border-l-2',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-foreground border-sidebar-primary'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 border-transparent'
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
              <div className="pt-6">
                <p className="px-3 mb-3 text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest">
                  Administração
                </p>
              </div>
              {adminNavItems
                .filter((item) => item.show)
                .map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-green-500/20'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                      )}
                    >
                      <div
                        className={cn(
                          'p-2 rounded-lg transition-all duration-200',
                          isActive
                            ? 'bg-white/20'
                            : 'bg-sidebar-accent group-hover:bg-sidebar-primary/20 group-hover:scale-110'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="h-4 w-4 opacity-70" />
                      )}
                    </Link>
                  )
                })}
            </>
          )}
        </nav>

        {/* Footer com versão */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="p-3 rounded-xl bg-gradient-to-br from-sidebar-accent to-sidebar-accent/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sidebar-primary/20">
              <Sparkles className="h-4 w-4 text-sidebar-primary" />
            </div>
            <div>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Versão</p>
              <p className="text-sm font-bold text-sidebar-foreground">1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
