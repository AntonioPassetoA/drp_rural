// Abstração de Storage. A interface StorageProvider isola os comportamentos do
// Supabase que AINDA NÃO foram comprovados por integração real (marcados abaixo),
// permitindo mocks nos testes e troca de implementação sem tocar no serviço.
//
// ⚠️ PENDÊNCIAS DE INTEGRAÇÃO REAL (não são fatos até comprovados na Etapa de
// integração — cada uma está confinada a SupabaseStorageProvider):
//  P1: duração efetiva do token de createSignedUploadUrl (doc: ~2h, não configurável);
//  P2: suporte a HTTP Range no objeto autenticado (esperado 206);
//  P3: formato/confiabilidade do Content-Range (bytes a-b/total);
//  P4: método confiável para obter o tamanho real (Content-Range vs info());
//  P5: comportamento de upload duplicado / upsert:false (esperado erro de duplicado);
//  P6: comportamento de upload interrompido/parcial.

// NOTA: supabase-admin (server-only) é importado de forma LAZY dentro dos métodos
// para que importar este módulo não avalie a barreira 'server-only' fora do servidor.
// A barreira continua protegendo supabase-admin contra uso em Client Components.
async function admin() {
  const { getSupabaseAdmin, getBucketName } = await import('@/lib/supabase-admin')
  return { client: getSupabaseAdmin(), bucket: getBucketName() }
}

export type SignedUpload = { uploadUrl: string; token: string; path: string }

export type HeadRead = {
  header: Uint8Array   // primeiros bytes (<= cap) para magic bytes
  totalSize: number | null // tamanho REAL do objeto (fonte confiável) ou null
  rangeHonored: boolean    // true se o servidor respondeu 206 respeitando o Range
  bytesTransferred: number // quantos bytes a Function realmente baixou (<= cap)
}

// Resultado TIPADO da remoção. `not_found` = objeto confirmado ausente (final seguro).
// `retryable_failure`/`permanent_failure` = objeto pode existir → NÃO é limpeza concluída.
export type RemoveResult = 'removed' | 'not_found' | 'retryable_failure' | 'permanent_failure'

export type DownloadOptions = { attachment?: boolean }

export interface StorageProvider {
  createSignedUploadUrl(path: string): Promise<SignedUpload>
  readHeadAndSize(path: string, cap: number): Promise<HeadRead>
  createSignedDownloadUrl(path: string, expiresSec: number, opts?: DownloadOptions): Promise<string>
  remove(path: string): Promise<RemoveResult>
  exists(path: string): Promise<boolean>
}

// Prefixo neutro na fase pendente (categoria/extensão só são conhecidas na
// finalização; não entram no path para não depender de dado não confiável).
export function buildPendingPath(organizationId: string, projectId: string, uuid: string): string {
  return `organizations/${organizationId}/projects/${projectId}/pending/${uuid}`
}

// ---------------------------------------------------------------------------
// Implementação Supabase (contém as pendências P1..P6 confinadas)
// ---------------------------------------------------------------------------
export class SupabaseStorageProvider implements StorageProvider {
  async createSignedUploadUrl(path: string): Promise<SignedUpload> {
    // P1/P5: TTL do token e semântica de duplicado dependem do Supabase.
    const { client, bucket } = await admin()
    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path)
    if (error || !data) throw new Error('Falha ao autorizar upload')
    return { uploadUrl: data.signedUrl, token: data.token, path }
  }

  async readHeadAndSize(path: string, cap: number): Promise<HeadRead> {
    // P2/P3/P4: leitura parcial via Range + Content-Range. Estratégia:
    //  1) cria signed URL curta; 2) GET com Range: bytes=0-(cap-1);
    //  3) confirma 206 + valida Content-Range para obter o total confiável;
    //  4) lê o corpo com CORTE RÍGIDO em `cap` (se o servidor ignorar o Range e
    //     mandar 200 com o arquivo todo, a leitura é abortada ao atingir o cap).
    const signed = await this.createSignedDownloadUrl(path, 60)
    const res = await fetch(signed, { headers: { Range: `bytes=0-${cap - 1}` } })
    if (!res.ok && res.status !== 206) throw new Error('Falha ao ler objeto')

    const rangeHonored = res.status === 206
    let totalSize: number | null = null
    const cr = res.headers.get('content-range') // ex.: "bytes 0-32767/1048576"
    const m = cr && /^bytes \d+-\d+\/(\d+)$/.exec(cr)
    if (m) totalSize = parseInt(m[1], 10)

    // Corte rígido: lê no máximo `cap` bytes e cancela o restante.
    const reader = res.body?.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    if (reader) {
      while (received < cap) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          const remaining = cap - received
          const slice = value.length > remaining ? value.subarray(0, remaining) : value
          chunks.push(slice)
          received += slice.length
        }
      }
      try { await reader.cancel() } catch { /* aborta o download restante */ }
    }
    const header = new Uint8Array(received)
    let off = 0
    for (const c of chunks) { header.set(c, off); off += c.length }

    // Fallback P4: se não veio Content-Range confiável, tenta o tamanho por metadados.
    if (totalSize == null) {
      totalSize = await this.sizeFromInfo(path)
    }
    return { header, totalSize, rangeHonored, bytesTransferred: received }
  }

  private async sizeFromInfo(path: string): Promise<number | null> {
    try {
      // P4: SDK expõe info()/list() com metadata.size — a confiabilidade exata
      // será confirmada na integração. Acesso tipado sem `any`.
      type InfoFn = (p: string) => Promise<{ data?: { size?: number; metadata?: { size?: number } } }>
      const { client, bucket } = await admin()
      const b = client.storage.from(bucket)
      const info = (b as unknown as { info?: InfoFn }).info
      if (typeof info === 'function') {
        const { data } = await info(path)
        const size = data?.size ?? data?.metadata?.size
        return typeof size === 'number' ? size : null
      }
    } catch { /* ignora -> null */ }
    return null
  }

  async createSignedDownloadUrl(path: string, expiresSec: number, opts?: DownloadOptions): Promise<string> {
    // PDF (attachment) força download; imagem fica inline. O SDK aceita { download }.
    const options = opts?.attachment ? { download: true as const } : undefined
    const { client, bucket } = await admin()
    const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresSec, options)
    if (error || !data) throw new Error('Falha ao gerar URL')
    return data.signedUrl
  }

  async remove(path: string): Promise<RemoveResult> {
    // Comportamento REAL comprovado do Supabase Storage (integração):
    //  - erro          -> 'retryable_failure' (timeout/indisponível/desconhecido);
    //  - data com >= 1 -> 'removed' (o objeto foi efetivamente removido);
    //  - data vazio (sem erro) -> 'not_found' (objeto confirmado ausente).
    // 'permanent_failure' não é emitido: não há caso real/tratamento definido ainda.
    try {
      const { client, bucket } = await admin()
      const { data, error } = await client.storage.from(bucket).remove([path])
      if (error) return 'retryable_failure'
      return Array.isArray(data) && data.length >= 1 ? 'removed' : 'not_found'
    } catch {
      return 'retryable_failure'
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const { client, bucket } = await admin()
      const { data } = await client.storage.from(bucket).createSignedUrl(path, 10)
      if (!data?.signedUrl) return false
      const res = await fetch(data.signedUrl, { method: 'GET', headers: { Range: 'bytes=0-0' } })
      return res.ok || res.status === 206
    } catch { return false }
  }
}

// Provider default (lazy). Testes injetam um mock.
let provider: StorageProvider | null = null
export function getStorage(): StorageProvider {
  if (!provider) provider = new SupabaseStorageProvider()
  return provider
}
export function setStorageProvider(p: StorageProvider | null) {
  provider = p
}
