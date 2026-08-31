// Cliente administrativo do Supabase — SERVER-ONLY.
// Usa a SERVICE ROLE, que IGNORA RLS. Por isso a proteção real é sempre o backend
// (sessão/permissão/organização/projeto/estado). NUNCA importar isto em código de
// cliente; NUNCA expor a service role em NEXT_PUBLIC_*, resposta ou bundle.

// Barreira OFICIAL de build: qualquer import (direto ou indireto) deste módulo a
// partir de um Client Component quebra o build do Next.js.
import 'server-only'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Defesa adicional em runtime (não substitui a barreira de import acima).
if (typeof window !== 'undefined') {
  throw new Error('supabase-admin é server-only e não pode ser usado no cliente')
}

let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) {
    throw new Error('Configuração do Storage ausente (URL/Service Role)')
  }
  cached = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

export function getBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || 'evidences'
}
