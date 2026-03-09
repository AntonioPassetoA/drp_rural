import { generateCompletion } from '../client'
import {
  TECHNICAL_RECOMMENDATIONS_SYSTEM_PROMPT,
  buildTechnicalRecommendationsPrompt,
  ACTION_PLAN_SYSTEM_PROMPT,
  buildActionPlanPrompt,
} from '../prompts/recommendations'

export interface TechnicalRecommendations {
  immediate: string[]
  mediumTerm: string[]
  longTerm: string[]
  resources: string[]
  expectedResults: string[]
}

export async function generateTechnicalRecommendations(
  context: {
    municipalityName: string
    socialReality?: Record<string, unknown>
    environmentalReality?: Record<string, unknown>
    productiveVocations?: Record<string, unknown>
    mainActions?: Record<string, unknown>
  }
): Promise<TechnicalRecommendations> {
  const prompt = buildTechnicalRecommendationsPrompt(context)

  const response = await generateCompletion(
    TECHNICAL_RECOMMENDATIONS_SYSTEM_PROMPT,
    prompt,
    { temperature: 0.6, maxTokens: 3000 }
  )

  // Parse response (simplified)
  return {
    immediate: [],
    mediumTerm: [],
    longTerm: [],
    resources: [],
    expectedResults: [],
  }
}

export interface ActionItem {
  title: string
  description: string
  suggestedResponsible: string
  estimatedDeadline: string
  resources: string
  successIndicator: string
  priority: 'high' | 'medium' | 'low'
}

export interface ActionPlan {
  actions: ActionItem[]
  summary: string
}

export async function generateActionPlan(
  municipalityName: string,
  recommendations: string
): Promise<ActionPlan> {
  const prompt = buildActionPlanPrompt(municipalityName, recommendations)

  const response = await generateCompletion(
    ACTION_PLAN_SYSTEM_PROMPT,
    prompt,
    { temperature: 0.5, maxTokens: 4000 }
  )

  // Parse response (simplified)
  return {
    actions: [],
    summary: response,
  }
}
