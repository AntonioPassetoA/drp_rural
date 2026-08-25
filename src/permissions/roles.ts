import { UserRole } from '@prisma/client'

export type Permission =
  // Users
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  // Projects
  | 'projects:read'
  | 'projects:create'
  | 'projects:update'
  | 'projects:delete'
  | 'projects:manage_members'
  // Municipalities
  | 'municipalities:read'
  | 'municipalities:create'
  | 'municipalities:update'
  | 'municipalities:delete'
  // Microregions
  | 'microregions:read'
  | 'microregions:create'
  | 'microregions:update'
  | 'microregions:delete'
  // Localities
  | 'localities:read'
  | 'localities:create'
  | 'localities:update'
  | 'localities:delete'
  // Diagnostics
  | 'diagnostics:read'
  | 'diagnostics:create'
  | 'diagnostics:update'
  | 'diagnostics:delete'
  // Tasks
  | 'tasks:read'
  | 'tasks:read_own'
  | 'tasks:create'
  | 'tasks:update'
  | 'tasks:update_own'
  | 'tasks:delete'
  // Evidences
  | 'evidences:read'
  | 'evidences:create'
  | 'evidences:delete'
  // Reports
  | 'reports:read'
  | 'reports:generate'
  // Dashboard
  | 'dashboard:read'
  | 'dashboard:read_global'
  // Settings
  | 'settings:read'
  | 'settings:update'
  // Audit
  | 'audit:read'

// Todas as permissões existentes (usadas para conceder acesso total ao superadmin
// e ao gestor dentro da própria organização). Novos módulos devem adicionar suas
// permissões aqui e concedê-las aos papéis correspondentes.
const ALL_PERMISSIONS: Permission[] = [
  'users:read',
  'users:create',
  'users:update',
  'users:delete',
  'projects:read',
  'projects:create',
  'projects:update',
  'projects:delete',
  'projects:manage_members',
  'municipalities:read',
  'municipalities:create',
  'municipalities:update',
  'municipalities:delete',
  'microregions:read',
  'microregions:create',
  'microregions:update',
  'microregions:delete',
  'localities:read',
  'localities:create',
  'localities:update',
  'localities:delete',
  'diagnostics:read',
  'diagnostics:create',
  'diagnostics:update',
  'diagnostics:delete',
  'tasks:read',
  'tasks:read_own',
  'tasks:create',
  'tasks:update',
  'tasks:update_own',
  'tasks:delete',
  'evidences:read',
  'evidences:create',
  'evidences:delete',
  'reports:read',
  'reports:generate',
  'dashboard:read',
  'dashboard:read_global',
  'settings:read',
  'settings:update',
  'audit:read',
]

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Superadmin: acesso total a toda a plataforma.
  superadmin: [...ALL_PERMISSIONS],

  // Gestor: administra a própria organização (usuários, cadastros, aprovações,
  // relatórios e configurações). O isolamento por organização é garantido no
  // backend — as permissões aqui são o teto de ações, não o escopo dos dados.
  gestor: [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'projects:read',
    'projects:create',
    'projects:update',
    'projects:delete',
    'projects:manage_members',
    'municipalities:read',
    'municipalities:create',
    'municipalities:update',
    'municipalities:delete',
    'microregions:read',
    'microregions:create',
    'microregions:update',
    'microregions:delete',
    'localities:read',
    'localities:create',
    'localities:update',
    'localities:delete',
    'diagnostics:read',
    'diagnostics:create',
    'diagnostics:update',
    'diagnostics:delete',
    'tasks:read',
    'tasks:read_own',
    'tasks:create',
    'tasks:update',
    'tasks:update_own',
    'tasks:delete',
    'evidences:read',
    'evidences:create',
    'evidences:delete',
    'reports:read',
    'reports:generate',
    'dashboard:read',
    'settings:read',
    'settings:update',
    'audit:read',
  ],

  // Colaborador: usuário operacional (agrônomo/técnico). Cria e edita apenas os
  // PRÓPRIOS registros operacionais (tarefas, diagnósticos, evidências).
  // NÃO exclui definitivamente, NÃO altera projetos, NÃO gerencia membros/usuários
  // e NÃO mexe em cadastros administrativos (microrregiões/localidades) sem
  // permissão específica. As permissões de create/update de cadastros
  // administrativos herdadas do modelo municipal foram REMOVIDAS aqui.
  colaborador: [
    'projects:read',
    'municipalities:read',
    'microregions:read',
    'localities:read',
    'diagnostics:read',
    'diagnostics:create',
    'diagnostics:update',
    'tasks:read_own',
    'tasks:create',
    'tasks:update_own',
    'evidences:read',
    'evidences:create',
    'dashboard:read',
  ],
}
