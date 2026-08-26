import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/modules/evidences/services/evidence-service'
import {
  requireAuth,
  requirePermission,
  requireProjectInOrg,
  handleAuthzError,
} from '@/lib/authz'
import { recordAudit, buildFileUploadMetadata } from '@/lib/audit'
import { AuditAction } from '@/lib/audit-actions'
import { metaFromHeaders } from '@/lib/request-context'

// Tipos de arquivo aceitos: apenas JPG, PNG, WEBP e PDF. Valida MIME + extensão.
// (GIF removido a pedido — não é necessário.)
const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth()
    requirePermission(ctx, 'evidences:create')

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 })
    }

    // Isolamento: só permite enviar para projeto da própria organização.
    const project = await requireProjectInOrg(ctx, projectId)

    // Validação de tipo (MIME + extensão) — evita upload de arquivos perigosos.
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const allowedExts = ALLOWED_TYPES[file.type]
    if (!allowedExts || !allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Envie imagem (JPG, PNG, WEBP) ou PDF.' },
        { status: 400 }
      )
    }

    // Validação de tamanho.
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB` },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // NOTA: uploadFile grava em disco local (./uploads). Não funciona na Vercel
    // (serverless). A migração para Supabase Storage é um passo posterior (0.x).
    const result = await uploadFile(buffer, file.name, projectId)

    // file.upload — não crítico (best-effort). NUNCA gravamos o nome original do
    // arquivo (pode conter CPF/nome/placa/nota). Só identificador interno + tipo.
    const storedName = result.url.split('/').pop() || '' // uuid.ext gerado internamente
    const meta = metaFromHeaders(request.headers)
    await recordAudit({
      action: AuditAction.FILE_UPLOAD,
      userId: ctx.userId,
      organizationId: project.organizationId,
      entityType: 'Project',
      entityId: projectId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: buildFileUploadMetadata({
        storedName,
        ext,
        mimeType: file.type,
        fileSize: file.size,
      }),
    })

    return NextResponse.json({
      url: result.url,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    return handleAuthzError(error)
  }
}
