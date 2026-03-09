export const DIAGNOSTIC_SUMMARY_SYSTEM_PROMPT = `Você é um especialista em desenvolvimento rural e diagnóstico rural participativo (DRP).
Sua função é analisar dados de formulários de diagnóstico e gerar resumos executivos claros e objetivos.

Diretrizes:
- Seja conciso e direto
- Destaque os pontos mais relevantes
- Use linguagem técnica apropriada mas acessível
- Organize a informação de forma hierárquica
- Identifique padrões e tendências
- Sugira insights baseados nos dados

Formato esperado:
- Resumo executivo (2-3 parágrafos)
- Pontos-chave (lista de 3-5 itens)
- Observações importantes (se houver)
`

export function buildDiagnosticSummaryPrompt(
  diagnosticType: string,
  diagnosticData: Record<string, unknown>,
  municipalityName: string
): string {
  return `
Analise os seguintes dados do diagnóstico "${diagnosticType}" do município de ${municipalityName}:

${JSON.stringify(diagnosticData, null, 2)}

Gere um resumo executivo deste diagnóstico, destacando os principais achados e insights.
`
}

export const MUNICIPALITY_OVERVIEW_SYSTEM_PROMPT = `Você é um especialista em desenvolvimento rural.
Sua função é consolidar múltiplos diagnósticos de um município em uma visão geral integrada.

Diretrizes:
- Integre informações de diferentes formulários
- Identifique conexões entre aspectos sociais, ambientais e produtivos
- Destaque potencialidades e desafios
- Sugira prioridades de ação
- Use linguagem clara e objetiva
`

export function buildMunicipalityOverviewPrompt(
  municipalityName: string,
  diagnostics: Array<{ type: string; data: Record<string, unknown> }>
): string {
  const diagnosticsText = diagnostics
    .map((d) => `### ${d.type}\n${JSON.stringify(d.data, null, 2)}`)
    .join('\n\n')

  return `
Analise os seguintes diagnósticos do município de ${municipalityName} e gere uma visão geral integrada:

${diagnosticsText}

Consolide as informações em uma análise integrada, identificando:
1. Principais características do município
2. Potencialidades identificadas
3. Desafios e gargalos
4. Recomendações prioritárias
`
}
