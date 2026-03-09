// AI Module exports
export { getOpenAIClient, generateCompletion } from './client'

// Services
export {
  generateDiagnosticSummary,
  generateMunicipalityOverview,
  type DiagnosticSummary,
  type MunicipalityOverview,
} from './services/generate-summary'

export {
  generateTechnicalRecommendations,
  generateActionPlan,
  type TechnicalRecommendations,
  type ActionItem,
  type ActionPlan,
} from './services/generate-recommendations'

// Prompts (for customization)
export * from './prompts/summary'
export * from './prompts/recommendations'
export * from './prompts/report-generation'
