import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'
import { recordAudit } from '@/lib/audit'
import { AuditAction } from '@/lib/audit-actions'
import { metaFromPlainHeaders } from '@/lib/request-context'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      // Organização do usuário. Nula apenas para superadmin.
      // Vem SEMPRE do banco (via JWT) — o cliente nunca define este valor.
      organizationId: string | null
      avatarUrl?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    organizationId: string | null
    avatarUrl?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    organizationId: string | null
    avatarUrl?: string | null
    // Marca temporal da última revalidação do token contra o banco.
    checkedAt?: number
    // Sinaliza que o usuário foi desativado/removido — força logout.
    disabled?: boolean
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        // FALHA DE LOGIN: resposta pública genérica e NÃO gravamos no AuditLog
        // (nem senha, nem e-mail de usuário inexistente). Registrar cada tentativa
        // recusada exige limitação/agregação durável (ver PENDÊNCIA no relatório);
        // por ora, fica apenas em log operacional, sem dados pessoais.
        if (!user || !user.isActive) {
          throw new Error('Email ou senha inválidos')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Email ou senha inválidos')
        }

        // Registra o último acesso (requisito de auditoria/segurança).
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        // auth.login.success — evento NÃO crítico (best-effort).
        const meta = metaFromPlainHeaders(
          req?.headers as Record<string, string | string[] | undefined> | undefined
        )
        await recordAudit({
          action: AuditAction.AUTH_LOGIN_SUCCESS,
          userId: user.id,
          organizationId: user.organizationId,
          entityType: 'User',
          entityId: user.id,
          ip: meta.ip,
          userAgent: meta.userAgent,
        })

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          organizationId: user.organizationId,
          avatarUrl: user.avatarUrl,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Login inicial: popula o token a partir do usuário autenticado (do banco).
      if (user) {
        token.id = user.id
        token.role = user.role
        token.organizationId = user.organizationId
        token.avatarUrl = user.avatarUrl
        token.checkedAt = Date.now()
        token.disabled = false
        return token
      }

      // Revalidação periódica contra o banco: reflete mudanças de papel,
      // organização e status, e bloqueia usuários desativados/removidos sem
      // esperar a expiração natural da sessão (24h).
      const REVALIDATE_MS = 60_000
      const now = Date.now()
      if (token.id && (!token.checkedAt || now - token.checkedAt > REVALIDATE_MS)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, organizationId: true, avatarUrl: true, isActive: true },
        })
        if (!dbUser || !dbUser.isActive) {
          token.disabled = true
        } else {
          token.role = dbUser.role
          token.organizationId = dbUser.organizationId
          token.avatarUrl = dbUser.avatarUrl
          token.disabled = false
        }
        token.checkedAt = now
      }
      return token
    },
    async session({ session, token }) {
      // Usuário desativado/removido: devolve sessão sem usuário → tratado como
      // não autenticado pelas páginas, middleware e guards de API.
      if (token?.disabled) {
        return { ...session, user: undefined } as unknown as typeof session
      }
      if (token && session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.organizationId = token.organizationId
        session.user.avatarUrl = token.avatarUrl
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
}
