// Sanitizador central para metadados de auditoria.
// 2ª barreira de defesa: mesmo que um evento passe um objeto maior que o esperado,
// campos sensíveis são redigidos e o tamanho é limitado. NUNCA lança de forma
// que exponha o objeto original.

const REDACTED = '[REDACTED]'

// Campos proibidos (comparação case-insensitive, por SUBSTRING no nome da chave).
const DENY_SUBSTRINGS = [
  'password', 'senha', 'newpassword', 'currentpassword',
  'passwordhash', 'hashedpassword', 'hash',
  'token', 'accesstoken', 'refreshtoken', 'sessiontoken',
  'secret', 'clientsecret', 'apikey', 'privatekey',
  'cookie', 'set-cookie', 'authorization',
  'connectionstring', 'database_url',
  'cpf', 'cnpj', 'card', 'cartao', 'creditcard',
]

const MAX_DEPTH = 4
const MAX_ITEMS = 50
const MAX_STRING = 500
const MAX_JSON_BYTES = 4096

function isDeniedKey(key: string): boolean {
  const k = key.toLowerCase()
  return DENY_SUBSTRINGS.some((d) => k.includes(d))
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value

  const t = typeof value
  if (t === 'string') {
    const s = value as string
    return s.length > MAX_STRING ? s.slice(0, MAX_STRING) + '…' : s
  }
  if (t === 'number' || t === 'boolean') return value
  if (t === 'bigint') return (value as bigint).toString()
  if (t === 'function' || t === 'symbol') return '[Unserializable]'

  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) {
    return { name: value.name, message: String(value.message).slice(0, MAX_STRING) }
  }

  if (t === 'object') {
    const obj = value as Record<string, unknown>
    const ctor = obj?.constructor?.name
    // Prisma.Decimal e afins: representa como string.
    if (ctor === 'Decimal' && typeof (obj as { toString?: () => string }).toString === 'function') {
      return (obj as { toString: () => string }).toString()
    }
    if (depth >= MAX_DEPTH) return '[Depth limit]'
    if (seen.has(obj)) return '[Circular]'
    seen.add(obj)

    try {
      if (Array.isArray(value)) {
        const arr = value.slice(0, MAX_ITEMS).map((v) => sanitizeValue(v, depth + 1, seen))
        if (value.length > MAX_ITEMS) arr.push(`[+${value.length - MAX_ITEMS} itens]`)
        return arr
      }
      const out: Record<string, unknown> = {}
      let count = 0
      for (const k of Object.keys(obj)) {
        if (count >= MAX_ITEMS) {
          out['…'] = '[itens omitidos]'
          break
        }
        count++
        if (isDeniedKey(k)) {
          out[k] = REDACTED
          continue
        }
        try {
          out[k] = sanitizeValue(obj[k], depth + 1, seen)
        } catch {
          out[k] = REDACTED
        }
      }
      return out
    } finally {
      seen.delete(obj)
    }
  }

  return REDACTED
}

/** Sanitiza um valor arbitrário para uso seguro em metadata/oldData/newData. */
export function sanitize(input: unknown): unknown {
  try {
    const result = sanitizeValue(input, 0, new WeakSet())
    const json = JSON.stringify(result ?? null)
    if (json && json.length > MAX_JSON_BYTES) {
      return { _truncated: true, note: '[conteúdo excedeu o limite de auditoria e foi omitido]' }
    }
    return result
  } catch {
    // Nunca expõe o objeto original em caso de erro inesperado.
    return REDACTED
  }
}

export const SANITIZE_LIMITS = { MAX_DEPTH, MAX_ITEMS, MAX_STRING, MAX_JSON_BYTES }
