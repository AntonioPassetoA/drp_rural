export const REPORT_GENERATION_SYSTEM_PROMPT = `Você é um redator técnico especializado em relatórios de desenvolvimento rural.
Sua função é gerar textos bem estruturados para relatórios de diagnóstico rural participativo (DRP).

Diretrizes:
- Use linguagem formal mas acessível
- Estruture o texto com introdução, desenvolvimento e conclusão
- Cite dados específicos quando disponíveis
- Mantenha objetividade técnica
- Conecte diferentes aspectos do diagnóstico
- Produza texto pronto para uso em relatórios oficiais

Estilo:
- Parágrafos curtos e claros
- Transições suaves entre seções
- Destaque para números e indicadores
- Tom institucional e profissional
`

export function buildLocalityReportPrompt(
  localityData: {
    name: string
    type: string
    microregion: string
    municipality: string
    coordinates?: { lat: number; lng: number }
    evidenceCount: number
    visitDates: string[]
  }
): string {
  return `
Gere um texto descritivo para o relatório da localidade:

Nome: ${localityData.name}
Tipo: ${localityData.type}
Microrregião: ${localityData.microregion}
Município: ${localityData.municipality}
${localityData.coordinates ? `Coordenadas: ${localityData.coordinates.lat}, ${localityData.coordinates.lng}` : ''}
Evidências registradas: ${localityData.evidenceCount}
Visitas realizadas: ${localityData.visitDates.join(', ')}

Produza um parágrafo introdutório descrevendo a localidade e seu contexto no município.
`
}

export function buildMicroregionReportPrompt(
  microregionData: {
    name: string
    municipality: string
    description?: string
    familiesCount?: number
    localitiesCount: number
    localities: string[]
  }
): string {
  return `
Gere um texto descritivo para o relatório da microrregião:

Nome: ${microregionData.name}
Município: ${microregionData.municipality}
${microregionData.description ? `Descrição: ${microregionData.description}` : ''}
${microregionData.familiesCount ? `Número de famílias: ${microregionData.familiesCount}` : ''}
Localidades (${microregionData.localitiesCount}): ${microregionData.localities.join(', ')}

Produza uma seção descritiva sobre a microrregião, incluindo suas características
e as localidades que a compõem.
`
}

export function buildExecutiveSummaryPrompt(
  projectData: {
    name: string
    description?: string
    municipalitiesCount: number
    microregionsCount: number
    localitiesCount: number
    diagnosticsCompleted: number
    diagnosticsTotal: number
    tasksCompleted: number
    tasksTotal: number
    mainFindings: string[]
  }
): string {
  return `
Gere um resumo executivo para o projeto de DRP:

Projeto: ${projectData.name}
${projectData.description ? `Descrição: ${projectData.description}` : ''}

Abrangência:
- Municípios: ${projectData.municipalitiesCount}
- Microrregiões: ${projectData.microregionsCount}
- Localidades: ${projectData.localitiesCount}

Progresso:
- Diagnósticos: ${projectData.diagnosticsCompleted}/${projectData.diagnosticsTotal}
- Tarefas: ${projectData.tasksCompleted}/${projectData.tasksTotal}

Principais achados:
${projectData.mainFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Produza um resumo executivo de 2-3 parágrafos que sintetize o projeto,
seu progresso e os principais resultados obtidos.
`
}
