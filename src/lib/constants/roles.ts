import { UserRole, ProjectRole } from '@prisma/client'

export const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'superadmin',
    label: 'Superadministrador',
    description: 'Administra toda a plataforma e as organizações',
  },
  {
    value: 'gestor',
    label: 'Gestor da Organização',
    description: 'Administra a fazenda/empresa: usuários, cadastros, aprovações e relatórios',
  },
  {
    value: 'colaborador',
    label: 'Colaborador / Agrônomo',
    description: 'Registra atividades, diagnósticos e despesas no campo',
  },
]

export const PROJECT_ROLES: { value: ProjectRole; label: string }[] = [
  { value: 'manager', label: 'Gestor' },
  { value: 'agronomist', label: 'Agrônomo' },
  { value: 'local_manager', label: 'Gestor Local' },
  { value: 'operator', label: 'Operador' },
]

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadmin',
  gestor: 'Gestor',
  colaborador: 'Colaborador',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: 'bg-purple-100 text-purple-700',
  gestor: 'bg-blue-100 text-blue-700',
  colaborador: 'bg-green-100 text-green-700',
}
