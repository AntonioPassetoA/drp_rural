import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthzError } from '@/lib/authz'
import { finalizeUpload } from '@/modules/evidences/services/evidence-service'
import { metaFromHeaders } from '@/lib/request-context'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/files/{id}/finalize
// Recebe SÓ o evidenceId (o storagePath é carregado do banco — nunca do cliente).
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireAuth()
    const { id } = await params
    const meta = metaFromHeaders(request.headers)
    const result = await finalizeUpload(ctx, id, meta)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleAuthzError(error)
  }
}
