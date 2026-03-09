import { ProjectStatus, TaskStatus, TaskPriority, DiagnosticStatus } from '@/types/database'

export const PROJECT_STATUS: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-700' },
  { value: 'paused', label: 'Pausado', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'Concluído', color: 'bg-gray-100 text-gray-700' },
]

export const TASK_STATUS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'in_progress', label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: 'Concluída', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Cancelada', color: 'bg-red-100 text-red-700' },
]

export const TASK_PRIORITY: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baixa', color: 'bg-gray-100 text-gray-600' },
  { value: 'medium', label: 'Média', color: 'bg-blue-100 text-blue-600' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-600' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-600' },
]

export const DIAGNOSTIC_STATUS: { value: DiagnosticStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Rascunho', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'Completo', color: 'bg-green-100 text-green-700' },
]

export const STATUS_LABELS = {
  project: Object.fromEntries(PROJECT_STATUS.map(s => [s.value, s.label])),
  task: Object.fromEntries(TASK_STATUS.map(s => [s.value, s.label])),
  priority: Object.fromEntries(TASK_PRIORITY.map(s => [s.value, s.label])),
  diagnostic: Object.fromEntries(DIAGNOSTIC_STATUS.map(s => [s.value, s.label])),
}

export const STATUS_COLORS = {
  project: Object.fromEntries(PROJECT_STATUS.map(s => [s.value, s.color])),
  task: Object.fromEntries(TASK_STATUS.map(s => [s.value, s.color])),
  priority: Object.fromEntries(TASK_PRIORITY.map(s => [s.value, s.color])),
  diagnostic: Object.fromEntries(DIAGNOSTIC_STATUS.map(s => [s.value, s.color])),
}
