import { UserRole, ProjectRole } from '@prisma/client'

export const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'platform_admin',
    label: 'Administrador da Plataforma',
    description: 'Acesso total ao sistema',
  },
  {
    value: 'project_manager',
    label: 'Gestor de Projeto',
    description: 'Gerencia projetos, equipes e relatórios',
  },
  {
    value: 'agronomist',
    label: 'Agrônomo / Técnico de Campo',
    description: 'Realiza visitas e preenche formulários',
  },
  {
    value: 'local_manager',
    label: 'Gestor Local',
    description: 'Acompanha execução na sua área',
  },
  {
    value: 'operator',
    label: 'Operador / Colaborador',
    description: 'Executa tarefas atribuídas',
  },
]

export const PROJECT_ROLES: { value: ProjectRole; label: string }[] = [
  { value: 'manager', label: 'Gestor' },
  { value: 'agronomist', label: 'Agrônomo' },
  { value: 'local_manager', label: 'Gestor Local' },
  { value: 'operator', label: 'Operador' },
]

export const ROLE_LABELS: Record<UserRole, string> = {
  platform_admin: 'Admin',
  project_manager: 'Gestor',
  agronomist: 'Agrônomo',
  local_manager: 'Gestor Local',
  operator: 'Operador',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  platform_admin: 'bg-purple-100 text-purple-700',
  project_manager: 'bg-blue-100 text-blue-700',
  agronomist: 'bg-green-100 text-green-700',
  local_manager: 'bg-teal-100 text-teal-700',
  operator: 'bg-gray-100 text-gray-700',
}
