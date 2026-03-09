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

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  platform_admin: [
    // All permissions
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
  ],

  project_manager: [
    'projects:read',
    'projects:update',
    'projects:manage_members',
    'municipalities:read',
    'municipalities:create',
    'municipalities:update',
    'microregions:read',
    'microregions:create',
    'microregions:update',
    'localities:read',
    'localities:create',
    'localities:update',
    'diagnostics:read',
    'diagnostics:create',
    'diagnostics:update',
    'tasks:read',
    'tasks:read_own',
    'tasks:create',
    'tasks:update',
    'tasks:update_own',
    'evidences:read',
    'evidences:create',
    'reports:read',
    'reports:generate',
    'dashboard:read',
  ],

  agronomist: [
    'projects:read',
    'municipalities:read',
    'microregions:read',
    'microregions:create',
    'localities:read',
    'localities:create',
    'localities:update',
    'diagnostics:read',
    'diagnostics:create',
    'diagnostics:update',
    'tasks:read_own',
    'tasks:update_own',
    'evidences:read',
    'evidences:create',
    'dashboard:read',
  ],

  local_manager: [
    'projects:read',
    'municipalities:read',
    'microregions:read',
    'localities:read',
    'diagnostics:read',
    'tasks:read_own',
    'tasks:update_own',
    'evidences:read',
    'evidences:create',
    'reports:read',
    'dashboard:read',
  ],

  operator: [
    'tasks:read_own',
    'tasks:update_own',
    'evidences:create',
  ],
}
