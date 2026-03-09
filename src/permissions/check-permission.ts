import { UserRole } from '@prisma/client'
import { Permission, ROLE_PERMISSIONS } from './roles'

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.includes(permission)
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role]
}

export function isPlatformAdmin(role: UserRole): boolean {
  return role === 'platform_admin'
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, 'users:create') || isPlatformAdmin(role)
}

export function canManageProjects(role: UserRole): boolean {
  return hasPermission(role, 'projects:create') || isPlatformAdmin(role)
}

export function canGenerateReports(role: UserRole): boolean {
  return hasPermission(role, 'reports:generate')
}

export function canAccessDashboard(role: UserRole): boolean {
  return hasPermission(role, 'dashboard:read')
}

export function canAccessGlobalDashboard(role: UserRole): boolean {
  return hasPermission(role, 'dashboard:read_global')
}

export function canAccessSettings(role: UserRole): boolean {
  return hasPermission(role, 'settings:read')
}

export function canAccessAuditLogs(role: UserRole): boolean {
  return hasPermission(role, 'audit:read')
}
