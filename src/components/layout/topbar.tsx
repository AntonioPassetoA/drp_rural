'use client'

import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User as UserIcon, Menu, Bell, Search, ChevronDown, Settings } from 'lucide-react'
import Link from 'next/link'
import { ROLE_LABELS } from '@/lib/constants/roles'
import { UserRole } from '@prisma/client'

interface TopbarProps {
  user: {
    id: string
    fullName: string
    email: string
    role: UserRole
    avatarUrl?: string | null
  }
  onMenuClick?: () => void
}

export function Topbar({ user, onMenuClick }: TopbarProps) {
  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="fixed top-0 left-64 right-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex h-full items-center justify-between px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden rounded-xl hover:bg-accent"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search bar */}
        <div className="hidden lg:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar projetos, tarefas..."
              className="w-full h-10 pl-11 pr-4 rounded-xl border border-border/50 bg-muted/30 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-xl hover:bg-accent"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          </Button>

          {/* Divider */}
          <div className="hidden md:block w-px h-8 bg-border/50 mx-2" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-accent transition-all duration-200 group">
              <div className="relative">
                <Avatar className="h-9 w-9 ring-2 ring-primary/10 ring-offset-2 ring-offset-white">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-600 text-white text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
              <ChevronDown className="hidden md:block h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl shadow-xl border-border/50">
              <div className="px-3 py-3 mb-2 bg-muted/50 rounded-lg">
                <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Link href="/profile">
                <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2.5 focus:bg-primary/5">
                  <div className="p-1.5 rounded-md bg-primary/10 mr-3">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">Meu Perfil</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2.5 focus:bg-primary/5">
                  <div className="p-1.5 rounded-md bg-muted mr-3">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="font-medium">Configurações</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-3 py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <div className="p-1.5 rounded-md bg-red-100 mr-3">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="font-medium">Sair da conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
