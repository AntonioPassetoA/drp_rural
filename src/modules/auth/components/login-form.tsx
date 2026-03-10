'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      setError('Email e senha são obrigatórios')
      setIsPending(false)
      return
    }

    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres')
      setIsPending(false)
      return
    }

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email ou senha inválidos')
        setIsPending(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro ao fazer login')
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-3 p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100 animate-scale-in">
          <div className="p-1 bg-red-100 rounded-full">
            <AlertCircle className="h-4 w-4" />
          </div>
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </Label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Mail className="h-5 w-5" />
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            required
            disabled={isPending}
            className="pl-12 h-12 rounded-xl border-border/50 bg-white/50 focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Senha
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Esqueceu a senha?
          </Link>
        </div>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            required
            disabled={isPending}
            className="pl-12 pr-12 h-12 rounded-xl border-border/50 bg-white/50 focus:bg-white transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 rounded-xl font-semibold text-base gradient-primary hover:opacity-90 transition-all btn-glow shine"
        disabled={isPending}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Entrando...
          </span>
        ) : (
          'Entrar na plataforma'
        )}
      </Button>
    </form>
  )
}
