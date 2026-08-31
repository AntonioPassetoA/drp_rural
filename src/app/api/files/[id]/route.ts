import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthzError } from '@/lib/authz'
import { getEvidenceSignedUrl, deleteEvidence } from '@/modules/evidences/services/evidence-service'
import { metaFromHeaders } from '@/lib/request-context'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/files/{id} — gera signed URL curta (60s) para READY. Nunca retorna storagePath.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireAuth()
    const { id } = await params
    const meta = metaFromHeaders(request.headers)
    const { url } = await getEvidenceSignedUrl(ctx, id, meta)
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleAuthzError(error)
  }
}

// DELETE /api/files/{id} — exclusão lógica (preserva o registro; remove o objeto).
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireAuth()
    const { id } = await params
    const meta = metaFromHeaders(request.headers)
    const result = await deleteEvidence(ctx, id, meta)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleAuthzError(error)
  }
}
