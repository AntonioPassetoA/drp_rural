import { NextResponse } from 'next/server'

// ⚠️ ROTA DEPRECADA E BLOQUEADA.
// O upload local em disco (./uploads) não funciona no serverless da Vercel e foi
// substituído pelo fluxo de UPLOAD DIRETO ao Supabase Storage:
//   POST /api/files/authorize  →  PUT direto ao Storage  →  POST /api/files/{id}/finalize
//
// IMPACTO DA DEPRECIAÇÃO: nenhum componente de frontend chamava esta rota e a
// tabela `evidences` estava vazia — portanto não há perda funcional nem dados a
// migrar. O arquivo é mantido (não removido definitivamente) e responde 410 Gone.

export async function POST() {
  return NextResponse.json(
    { error: 'Rota de upload descontinuada. Use POST /api/files/authorize (upload direto ao Storage).' },
    { status: 410 }
  )
}
