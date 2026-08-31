import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthzError } from '@/lib/authz'
import { authorizeUpload } from '@/modules/evidences/services/evidence-service'
import { metaFromHeaders } from '@/lib/request-context'

// POST /api/files/authorize
// Autoriza um upload direto ao Storage. Retorna { evidenceId, uploadUrl, token, path }.
// `path` aparece SÓ aqui (o SDK do cliente precisa dele); nunca em outras respostas.
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const meta = metaFromHeaders(request.headers)

    const result = await authorizeUpload(
      ctx,
      {
        projectId: String(body.projectId ?? ''),
        requestedKind: String(body.requestedKind ?? ''),
        declaredSize: Number(body.declaredSize ?? 0),
        taskId: body.taskId ? String(body.taskId) : undefined,
        diagnosticId: body.diagnosticId ? String(body.diagnosticId) : undefined,
        localityId: body.localityId ? String(body.localityId) : undefined,
        latitude: body.latitude != null ? Number(body.latitude) : undefined,
        longitude: body.longitude != null ? Number(body.longitude) : undefined,
        capturedAt: body.capturedAt ? new Date(body.capturedAt) : undefined,
      },
      meta
    )

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleAuthzError(error)
  }
}
