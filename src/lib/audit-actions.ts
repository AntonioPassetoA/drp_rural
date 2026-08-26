// Nomes de ações auditadas — constantes padronizadas (sem strings soltas).
export const AuditAction = {
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  // Documentado como PENDÊNCIA DE SEGURANÇA: só será gravado quando houver uma
  // estratégia durável e testada de limitação/agregação (ver NOTAS/relatório).
  AUTH_LOGIN_FAILURE: 'auth.login.failure',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_ROLE_CHANGE: 'user.role.change',
  USER_ACTIVATE: 'user.activate',
  USER_DEACTIVATE: 'user.deactivate',
  USER_ORG_TRANSFER: 'user.organization.transfer',
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  FILE_UPLOAD: 'file.upload',
  AUTHZ_DENIED: 'authz.denied',
  SUPERADMIN_CROSS_ORG_ACCESS: 'superadmin.cross_org.access',
} as const

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction]
