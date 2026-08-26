import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthzError } from '@/lib/authz'
import { listAuditLogs, type AuditFilters } from '@/lib/audit'
import { AuditResult } from '@prisma/client'

// GET /api/audit — consulta paginada e protegida.
// O cursor é um TOKEN OPACO assinado (HMAC), gerado pelo próprio serviço.
// Cursor inválido/adulterado/expirado/incompatível → 400 (nunca "primeira página").
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth()
    const sp = request.nextUrl.searchParams

    const filters: AuditFilters = {}
    if (sp.get('organizationId')) filters.organizationId = sp.get('organizationId')!
    if (sp.get('userId')) filters.userId = sp.get('userId')!
    if (sp.get('action')) filters.action = sp.get('action')!
    if (sp.get('entityType')) filters.entityType = sp.get('entityType')!
    if (sp.get('result')) filters.result = sp.get('result') as AuditResult
    if (sp.get('from')) {
      const d = new Date(sp.get('from')!)
      if (!isNaN(d.getTime())) filters.from = d
    }
    if (sp.get('to')) {
      const d = new Date(sp.get('to')!)
      if (!isNaN(d.getTime())) filters.to = d
    }

    const limitRaw = sp.get('limit')
    const limit = limitRaw ? parseInt(limitRaw, 10) : 50

    const page = await listAuditLogs(ctx, filters, sp.get('cursor'), isNaN(limit) ? 50 : limit)

    return NextResponse.json({ items: page.items, nextCursor: page.nextCursor })
  } catch (error) {
    return handleAuthzError(error)
  }
}
