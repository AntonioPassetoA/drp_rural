// Cliente PÚBLICO do Supabase — pode rodar no navegador.
// Usa SOMENTE a URL pública + a ANON KEY (publishable). NUNCA a service role.
// A autenticação principal do sistema continua sendo o NextAuth já existente; este
// cliente serve apenas para o passo de UPLOAD DIRETO ao Storage via token assinado.
//
// A anon key + bucket privado NÃO concedem, por si sós, listagem/leitura/exclusão
// nem upload arbitrário: só o TOKEN assinado emitido pelo backend (createSignedUploadUrl,
// vinculado a um path específico) permite gravar — e apenas naquele path.
//
// ⚠️ A comprovação de que a anon key não permite acesso arbitrário e de que só o
// token assinado grava no path autorizado depende do bucket privado real e será
// validada na etapa de INTEGRAÇÃO (pendência). Este módulo NÃO está ligado a
// nenhuma UI ainda — o componente de upload será criado numa etapa futura.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// MIME aceitos pelo bucket (barreira ADICIONAL — não é a validação definitiva).
// A validação principal é o magic bytes no finalize (backend). Aqui só evitamos
// um upload que o bucket certamente recusaria e damos um erro controlado.
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export function getSupabasePublic(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Configuração pública do Supabase ausente')
  return createClient(url, anon, { auth: { persistSession: false } })
}

/**
 * Envia o arquivo DIRETO ao Storage usando o token assinado emitido pelo backend
 * (POST /api/files/authorize). O `path` e o `token` vêm da resposta de autorização;
 * o navegador não escolhe o path. Após concluir, o cliente chama /api/files/{id}/finalize.
 *
 * O contentType (file.type) é enviado para casar com a whitelist do bucket — barreira
 * adicional, NUNCA a validação definitiva (essa é o magic bytes no finalize). MIME vazio
 * ou fora da whitelist gera erro controlado ANTES de qualquer chamada de rede.
 */
export async function uploadWithSignedToken(
  path: string,
  token: string,
  file: File,
  bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'evidences'
): Promise<void> {
  const contentType = file.type
  if (!contentType || !ALLOWED_MIME.includes(contentType)) {
    // Erro controlado — não registra nome original/token/path/URL.
    throw new Error('Tipo de arquivo não permitido')
  }
  const supabase = getSupabasePublic()
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType })
  if (error) throw new Error('Falha no upload direto ao Storage')
}
