import { generateCompletion } from '../client'
import {
  DIAGNOSTIC_SUMMARY_SYSTEM_PROMPT,
  buildDiagnosticSummaryPrompt,
  MUNICIPALITY_OVERVIEW_SYSTEM_PROMPT,
  buildMunicipalityOverviewPrompt,
} from '../prompts/summary'

export interface DiagnosticSummary {
  summary: string
  keyPoints: string[]
  observations: string[]
}

export async function generateDiagnosticSummary(
  diagnosticType: string,
  diagnosticData: Record<string, unknown>,
  municipalityName: string
): Promise<DiagnosticSummary> {
  const prompt = buildDiagnosticSummaryPrompt(
    diagnosticType,
    diagnosticData,
    municipalityName
  )

  const response = await generateCompletion(
    DIAGNOSTIC_SUMMARY_SYSTEM_PROMPT,
    prompt,
    { temperature: 0.5 }
  )

  // Parse the response into structured format
  const lines = response.split('\n').filter((line) => line.trim())

  let summary = ''
  const keyPoints: string[] = []
  const observations: string[] = []

  let currentSection = 'summary'

  for (const line of lines) {
    if (line.toLowerCase().includes('pontos-chave') || line.toLowerCase().includes('pontos chave')) {
      currentSection = 'keyPoints'
      continue
    }
    if (line.toLowerCase().includes('observações') || line.toLowerCase().includes('observacoes')) {
      currentSection = 'observations'
      continue
    }

    const cleanLine = line.replace(/^[-*•]\s*/, '').trim()

    if (currentSection === 'summary') {
      summary += (summary ? ' ' : '') + cleanLine
    } else if (currentSection === 'keyPoints' && cleanLine) {
      keyPoints.push(cleanLine)
    } else if (currentSection === 'observations' && cleanLine) {
      observations.push(cleanLine)
    }
  }

  return { summary, keyPoints, observations }
}

export interface MunicipalityOverview {
  characteristics: string
  potentials: string[]
  challenges: string[]
  recommendations: string[]
}

export async function generateMunicipalityOverview(
  municipalityName: string,
  diagnostics: Array<{ type: string; data: Record<string, unknown> }>
): Promise<MunicipalityOverview> {
  const prompt = buildMunicipalityOverviewPrompt(municipalityName, diagnostics)

  const response = await generateCompletion(
    MUNICIPALITY_OVERVIEW_SYSTEM_PROMPT,
    prompt,
    { temperature: 0.5, maxTokens: 3000 }
  )

  // Parse response (simplified - in production, use structured output)
  return {
    characteristics: response,
    potentials: [],
    challenges: [],
    recommendations: [],
  }
}
