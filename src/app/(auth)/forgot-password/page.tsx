import { ForgotPasswordForm } from '@/modules/auth/components'

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Recuperar senha</h2>
        <p className="text-sm text-muted-foreground">
          Enviaremos um link de recuperação para seu email
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  )
}
