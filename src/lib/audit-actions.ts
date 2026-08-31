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
  // Fluxo de upload direto ao Storage (máquina de estados de Evidence):
  FILE_UPLOAD_START: 'file.upload.start',       // authorize (não crítico)
  FILE_UPLOAD_SUCCESS: 'file.upload.success',   // UPLOADING->READY (CRÍTICO, em tx)
  FILE_UPLOAD_FAILURE: 'file.upload.failure',   // validação falhou (não crítico)
  FILE_ACCESS: 'file.access',                   // signed URL emitida (best-effort)
  FILE_DELETE_START: 'file.delete.start',       // READY->DELETING (CRÍTICO, em tx)
  FILE_DELETE_DONE: 'file.delete.done',         // DELETING->DELETED (CRÍTICO, em tx)
  FILE_DELETE_FAILURE: 'file.delete.failure',   // falha ao remover no Storage (não crítico)
  // Quarentena (rejeição ANTES da expiração; token pode reusar o path):
  FILE_QUARANTINE: 'file.quarantine',                 // UPLOADING -> QUARANTINED (CRÍTICO, em tx)
  FILE_QUARANTINE_REMOVE: 'file.quarantine.remove',   // tentativa antecipada de remoção (best-effort)
  // Limpeza (finalize-expirado ou reconciliador; ator "user" ou "system"; CRÍTICOS em tx):
  FILE_CLEANUP_START: 'file.cleanup.start',     // -> CLEANING (antes de remover o objeto)
  FILE_CLEANUP_DONE: 'file.cleanup.done',       // CLEANING + removido/ausente -> FAILED
  FILE_CLEANUP_FAILURE: 'file.cleanup.failure', // CLEANING + remoção falhou -> CLEANUP_FAILED
  SUPERADMIN_CROSS_ORG_FILE_ACCESS: 'superadmin.cross_org.file_access',
} as const

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction]
