// Erros compartilhados (sem dependências) — permite que authz.ts e audit.ts
// usem o mesmo tipo de erro sem criar ciclo de importação entre eles.

export class AuthzError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthzError'
    this.status = status
  }
}
