import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthzError } from '@/lib/authz'
import { listEvidences, type EvidenceCursor } from '@/modules/evidences/services/evidence-service'
import { AuthzError } from '@/lib/errors'
import { EvidenceStatus } from '@prisma/client'

// GET /api/files — listagem protegida e isolada por organização, paginação por cursor.
// storagePath NUNCA é retornado.
// Cursor malformado (base64/JSON/estrutura) → 400 (não é ignorado silenciosamente).
function decodeCursor(raw: string | null): EvidenceCursor {
  if (!raw) return null
  let o: unknown
  try {
    o = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
  } catch {
    throw new AuthzError('Cursor inválido', 400)
  }
  if (
    !o || typeof o !== 'object' ||
    typeof (o as { createdAt?: unknown }).createdAt !== 'string' ||
    typeof (o as { id?: unknown }).id !== 'string'
  ) {
    throw new AuthzError('Cursor inválido', 400)
  }
  return { createdAt: (o as { createdAt: string }).createdAt, id: (o as { id: string }).id }
}
function encodeCursor(c: EvidenceCursor): string | null {
  return c ? Buffer.from(JSON.stringify(c)).toString('base64') : null
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth()
    const sp = request.nextUrl.searchParams
    const filters: { projectId?: string; status?: EvidenceStatus } = {}
    if (sp.get('projectId')) filters.projectId = sp.get('projectId')!
    if (sp.get('status')) filters.status = sp.get('status') as EvidenceStatus
    const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : 50
    const page = await listEvidences(ctx, filters, decodeCursor(sp.get('cursor')), isNaN(limit) ? 50 : limit)
    return NextResponse.json({ items: page.items, nextCursor: encodeCursor(page.nextCursor) })
  } catch (error) {
    return handleAuthzError(error)
  }
}
