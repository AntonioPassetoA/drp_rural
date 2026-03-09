'use client'

import { useActionState } from 'react'
import { createProject, CreateProjectState } from '../actions/create-project'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { PROJECT_STATUS } from '@/lib/constants/status'

const initialState: CreateProjectState = {}

export function ProjectForm() {
  const [state, formAction, isPending] = useActionState(createProject, initialState)

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nome do Projeto *</Label>
          <Input
            id="name"
            name="name"
            placeholder="Ex: DRP Nordeste 2024"
            required
            disabled={isPending}
          />
          {state.fieldErrors?.name && (
            <p className="text-sm text-red-600">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Descreva o projeto..."
            rows={3}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue="active" disabled={isPending}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">Data de Início</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">Data de Término Prevista</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-4 border-t">
        <Link href="/projects">
          <Button type="button" variant="outline" disabled={isPending}>
            Cancelar
          </Button>
        </Link>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando...
            </>
          ) : (
            'Criar Projeto'
          )}
        </Button>
      </div>
    </form>
  )
}
