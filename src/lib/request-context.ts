// Extração de IP e user-agent para auditoria.
// IP e user-agent são dados de SEGURANÇA/AUDITORIA, com retenção controlada.
// O IP é sempre ANONIMIZADO antes de sair daqui (LGPD).

import { headers } from 'next/headers'

/** Anonimiza IPv4 (zera o último octeto) e IPv6 (trunca para /48). */
export function anonymizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  const clean = ip.trim()
  if (clean === '') return null
  if (clean.includes(':')) {
    // IPv6 → mantém os 3 primeiros grupos (/48)
    const groups = clean.split(':')
    return groups.slice(0, 3).join(':') + '::/48'
  }
  const parts = clean.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`
  return null // formato desconhecido → não armazena
}

/**
 * Seleciona o IP do cliente a partir de fonte CONFIÁVEL da infraestrutura.
 * Na Vercel, `x-real-ip` é definido pela plataforma; `x-forwarded-for` pode ser
 * manipulado pelo cliente (só o 1º valor, colocado pela borda, é considerado).
 */
export function pickClientIp(get: (name: string) => string | null): string | null {
  const real = get('x-real-ip')
  if (real) return real.trim()
  const xff = get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return null
}

export type RequestMeta = { ip: string | null; userAgent: string | null }

function fromGetter(get: (name: string) => string | null): RequestMeta {
  const ip = anonymizeIp(pickClientIp(get))
  const uaRaw = get('user-agent')
  const userAgent = uaRaw ? String(uaRaw).slice(0, 512) : null
  return { ip, userAgent }
}

/** Para um objeto Headers (rotas de API). */
export function metaFromHeaders(h: Headers): RequestMeta {
  return fromGetter((n) => h.get(n))
}

/** Para escopo de requisição (Server Actions / RSC) via next/headers. */
export async function metaFromRequestScope(): Promise<RequestMeta> {
  try {
    const h = await headers()
    return fromGetter((n) => h.get(n))
  } catch {
    return { ip: null, userAgent: null }
  }
}

/** Para o `req` do authorize() do NextAuth (headers como objeto simples). */
export function metaFromPlainHeaders(h: Record<string, string | string[] | undefined> | undefined): RequestMeta {
  const get = (n: string): string | null => {
    if (!h) return null
    const v = h[n] ?? h[n.toLowerCase()]
    if (Array.isArray(v)) return v[0] ?? null
    return (v as string) ?? null
  }
  return fromGetter(get)
}
