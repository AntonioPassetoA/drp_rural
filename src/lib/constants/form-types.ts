import { DiagnosticFormType, LocalityType } from '@/types/database'

export const DIAGNOSTIC_FORM_TYPES: {
  value: DiagnosticFormType
  label: string
  description: string
  icon: string
}[] = [
  {
    value: 'municipality_history',
    label: 'Histórico do Município',
    description: 'Informações históricas e contexto do município',
    icon: '📜',
  },
  {
    value: 'drp_summary',
    label: 'Resumo do DRP',
    description: 'Visão geral do diagnóstico rural participativo',
    icon: '📋',
  },
  {
    value: 'applied_methodology',
    label: 'Metodologia Aplicada',
    description: 'Descrição da metodologia utilizada no diagnóstico',
    icon: '🔬',
  },
  {
    value: 'social_reality',
    label: 'Realidade Social',
    description: 'Aspectos sociais, demográficos e organizacionais',
    icon: '👥',
  },
  {
    value: 'environmental_reality',
    label: 'Realidade Ambiental',
    description: 'Aspectos ambientais, recursos naturais e preservação',
    icon: '🌳',
  },
  {
    value: 'productive_vocations',
    label: 'Vocações Produtivas',
    description: 'Potencial produtivo e cadeias de valor',
    icon: '🌾',
  },
  {
    value: 'main_actions',
    label: 'Ações Principais',
    description: 'Ações prioritárias identificadas no diagnóstico',
    icon: '🎯',
  },
  {
    value: 'final_recommendations',
    label: 'Recomendações Finais',
    description: 'Recomendações técnicas e encaminhamentos',
    icon: '📝',
  },
]

export const LOCALITY_TYPES: { value: LocalityType; label: string }[] = [
  { value: 'community', label: 'Comunidade' },
  { value: 'settlement', label: 'Assentamento' },
  { value: 'village', label: 'Vila' },
  { value: 'other', label: 'Outro' },
]

export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
]
