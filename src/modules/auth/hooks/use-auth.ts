'use client'

import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'

interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string | null
}

interface UseAuthReturn {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession()

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || '',
        role: session.user.role,
        avatarUrl: session.user.avatarUrl,
      }
    : null

  return { user, isLoading, isAuthenticated }
}
