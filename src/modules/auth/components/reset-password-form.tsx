'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePassword, UpdatePasswordState } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useEffect } from 'react'

const initialState: UpdatePasswordState = {}

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push('/login')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state.success, router])

  if (state.success) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 rounded-lg">
        <CheckCircle className="h-4 w-4" />
        Senha atualizada com sucesso! Redirecionando...
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">Nova Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="******"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="******"
          required
          disabled={isPending}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Atualizando...
          </>
        ) : (
          'Atualizar senha'
        )}
      </Button>
    </form>
  )
}
