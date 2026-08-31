// Validação de arquivos por CONTEÚDO (magic bytes), nunca por file.type/file.name.
// Whitelist estrita: JPEG, PNG, WEBP, PDF. SVG/HTML/executáveis/desconhecidos são
// recusados. MIME, extensão, categoria e EvidenceType são DERIVADOS do conteúdo.
//
// RISCO RESIDUAL DOCUMENTADO: magic bytes NÃO é antivírus. Não detecta polyglots
// nem PDF malicioso (ex.: JS embutido). Mitigações atuais: whitelist + bucket
// privado + signed URL curta + Content-Disposition: attachment para PDF.
// Antivírus/antimalware fica como evolução futura identificada.

export type EvidenceCategory = 'photo' | 'document'
export type EvidenceTypeValue = 'photo' | 'video' | 'document'

export type AllowedType = {
  mime: string
  ext: string
  category: EvidenceCategory
  evidenceType: EvidenceTypeValue
  maxBytes: number
}

const MB = 1024 * 1024

// Limites POR FORMATO. Imagem 5 MB, PDF 10 MB.
export const ALLOWED_TYPES: AllowedType[] = [
  { mime: 'image/jpeg', ext: 'jpg',  category: 'photo',    evidenceType: 'photo',    maxBytes: 5 * MB },
  { mime: 'image/png',  ext: 'png',  category: 'photo',    evidenceType: 'photo',    maxBytes: 5 * MB },
  { mime: 'image/webp', ext: 'webp', category: 'photo',    evidenceType: 'photo',    maxBytes: 5 * MB },
  { mime: 'application/pdf', ext: 'pdf', category: 'document', evidenceType: 'document', maxBytes: 10 * MB },
]

// Teto absoluto aplicado no authorize (antes de conhecer o tipo real).
export const ABSOLUTE_MAX_BYTES = 10 * MB

// Kinds genéricos que o frontend pode DECLARAR (não confiável; só rejeição barata).
export type RequestedKind = 'photo' | 'document'
export const REQUESTED_KINDS: RequestedKind[] = ['photo', 'document']

// Nº de bytes lidos do objeto para a inspeção (suficiente p/ as assinaturas aceitas).
export const MAGIC_BYTES_CAP = 32 * 1024

export type TypeDetector = (buffer: Uint8Array) => Promise<{ mime: string; ext: string } | null>

// Detector padrão: file-type (magic bytes). Import dinâmico pois é ESM-only.
const defaultDetector: TypeDetector = async (buffer) => {
  const { fileTypeFromBuffer } = await import('file-type')
  const r = await fileTypeFromBuffer(buffer)
  return r ? { mime: r.mime, ext: r.ext } : null
}

// Permite injetar o detector nos testes (o padrão continua sendo file-type).
let detector: TypeDetector = defaultDetector
export function setTypeDetector(d: TypeDetector | null) { detector = d ?? defaultDetector }

/** Detecta o tipo real pelo CONTEÚDO (magic bytes). */
export async function detectType(buffer: Uint8Array): Promise<{ mime: string; ext: string } | null> {
  return detector(buffer)
}

export function matchAllowed(detectedMime: string): AllowedType | null {
  return ALLOWED_TYPES.find((t) => t.mime === detectedMime) ?? null
}

export type ValidationOk = {
  ok: true
  mime: string
  ext: string
  category: EvidenceCategory
  evidenceType: EvidenceTypeValue
}
export type ValidationErr = { ok: false; reason: string }

/**
 * Valida um buffer (cabeçalho) + tamanho real. Deriva tudo do conteúdo.
 * Vídeo é recusado nesta etapa (não há tipo de vídeo no whitelist).
 */
export async function validateContent(
  headerBuffer: Uint8Array,
  realSize: number
): Promise<ValidationOk | ValidationErr> {
  const detected = await detectType(headerBuffer)
  if (!detected) return { ok: false, reason: 'unknown_type' }

  const allowed = matchAllowed(detected.mime)
  if (!allowed) return { ok: false, reason: 'type_not_allowed' } // SVG/HTML/exec/vídeo/etc.

  if (!Number.isFinite(realSize) || realSize <= 0) return { ok: false, reason: 'invalid_size' }
  if (realSize > allowed.maxBytes) return { ok: false, reason: 'too_large' }

  return {
    ok: true,
    mime: allowed.mime,
    ext: allowed.ext,
    category: allowed.category,
    evidenceType: allowed.evidenceType,
  }
}

/** Rejeição antecipada no authorize: kind válido + tamanho declarado dentro do teto. */
export function validateAuthorizeIntent(
  requestedKind: string,
  declaredSize: number
): { ok: true } | { ok: false; reason: string } {
  if (!REQUESTED_KINDS.includes(requestedKind as RequestedKind)) {
    return { ok: false, reason: 'invalid_kind' } // 'video' cai aqui → recusado
  }
  if (!Number.isFinite(declaredSize) || declaredSize <= 0) {
    return { ok: false, reason: 'invalid_declared_size' }
  }
  if (declaredSize > ABSOLUTE_MAX_BYTES) {
    return { ok: false, reason: 'declared_too_large' }
  }
  return { ok: true }
}
