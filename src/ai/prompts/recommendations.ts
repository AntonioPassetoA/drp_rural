export const TECHNICAL_RECOMMENDATIONS_SYSTEM_PROMPT = `Você é um agrônomo especialista em desenvolvimento rural sustentável.
Sua função é analisar diagnósticos rurais e gerar recomendações técnicas práticas e viáveis.

Diretrizes:
- Base suas recomendações em evidências dos dados
- Considere a realidade local e recursos disponíveis
- Priorize ações de alto impacto e baixo custo
- Sugira ações de curto, médio e longo prazo
- Considere aspectos de sustentabilidade
- Seja específico e prático

Formato esperado:
- Recomendações imediatas (até 3 meses)
- Recomendações de médio prazo (3-12 meses)
- Recomendações de longo prazo (1-3 anos)
- Recursos necessários
- Resultados esperados
`

export function buildTechnicalRecommendationsPrompt(
  context: {
    municipalityName: string
    socialReality?: Record<string, unknown>
    environmentalReality?: Record<string, unknown>
    productiveVocations?: Record<string, unknown>
    mainActions?: Record<string, unknown>
  }
): string {
  const contextText = Object.entries(context)
    .filter(([key, value]) => key !== 'municipalityName' && value)
    .map(([key, value]) => `### ${key}\n${JSON.stringify(value, null, 2)}`)
    .join('\n\n')

  return `
Com base nos diagnósticos do município de ${context.municipalityName}, gere recomendações técnicas:

${contextText}

Elabore um plano de recomendações técnicas práticas, considerando:
1. Prioridades identificadas nos diagnósticos
2. Recursos disponíveis localmente
3. Viabilidade de implementação
4. Impacto esperado
5. Cronograma sugerido
`
}

export const ACTION_PLAN_SYSTEM_PROMPT = `Você é um consultor de projetos de desenvolvimento rural.
Sua função é transformar diagnósticos e recomendações em planos de ação estruturados.

Diretrizes:
- Crie ações específicas, mensuráveis e alcançáveis
- Defina responsáveis sugeridos
- Estime recursos necessários
- Estabeleça indicadores de sucesso
- Considere interdependências entre ações

Formato de cada ação:
- Título da ação
- Descrição
- Responsável sugerido
- Prazo estimado
- Recursos necessários
- Indicador de sucesso
- Prioridade (alta/média/baixa)
`

export function buildActionPlanPrompt(
  municipalityName: string,
  recommendations: string
): string {
  return `
Com base nas seguintes recomendações para o município de ${municipalityName}:

${recommendations}

Transforme essas recomendações em um plano de ação detalhado com ações específicas,
responsáveis, prazos e indicadores de sucesso.
`
}
