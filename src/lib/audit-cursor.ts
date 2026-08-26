import crypto from 'crypto'
import { AuthzError } from '@/lib/errors'

// Cursor OPACO e ASSINADO (HMAC-SHA256) para paginação da auditoria.
// Vinculado ao ESCOPO da consulta (organização + filtros + ordenação + pageSize)
// e com versão + expiração. Qualquer adulteração/incompatibilidade → HTTP 400.
// Segredo próprio (AUDIT_CURSOR_SECRET) — NUNCA reutiliza NEXTAUTH_SECRET.

const VERSION = 'v1'
const DEFAULT_TTL_MS = 15 * 60 * 1000 // 15 minutos

function getSecret(): string {
  const s = process.env.AUDIT_CURSOR_SECRET
  if (!s || s.length < 16) {
    // Config ausente/fraca → não paginamos de forma insegura.
    throw new AuthzError('Configuração de auditoria ausente (AUDIT_CURSOR_SECRET)', 500)
  }
  return s
}

/** Fingerprint estável do escopo (organização + filtros + ordenação + pageSize). */
export function scopeFingerprint(scope: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(scope)).digest('hex').slice(0, 24)
}

function sign(body: string): string {
  return crypto.createHmac('sha256', getSecret()).update(body).digest('base64url')
}

export type CursorPosition = { createdAt: string; id: string }

export function encodeCursor(pos: CursorPosition, scopeFp: string, ttlMs = DEFAULT_TTL_MS): string {
  const payload = { v: VERSION, c: pos.createdAt, i: pos.id, s: scopeFp, e: Date.now() + ttlMs }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

/**
 * Decodifica e VALIDA o cursor. Lança AuthzError(400) para: base64/JSON inválido,
 * estrutura incompleta, versão errada, assinatura adulterada, expiração, e escopo
 * incompatível (organização/filtros/pageSize diferentes). AuthzError(500) se o
 * segredo não estiver configurado.
 */
export function decodeCursor(token: string, scopeFp: string): CursorPosition {
  const invalid = () => new AuthzError('Cursor inválido', 400)
  if (typeof token !== 'string' || !token.includes('.')) throw invalid()
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw invalid()
  const [body, sig] = parts

  // Comparação de assinatura em tempo constante.
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw invalid()

  let payload: { v?: string; c?: string; i?: string; s?: string; e?: number }
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    throw invalid()
  }
  if (!payload || payload.v !== VERSION) throw invalid()
  if (typeof payload.c !== 'string' || typeof payload.i !== 'string') throw invalid()
  if (typeof payload.e !== 'number' || Date.now() > payload.e) throw invalid() // expirado
  if (payload.s !== scopeFp) throw invalid() // escopo/filtros/org/pageSize diferentes

  const d = new Date(payload.c)
  if (isNaN(d.getTime())) throw invalid()
  return { createdAt: payload.c, id: payload.i }
}
