import { ResetPasswordForm } from '@/modules/auth/components'

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Redefinir senha</h2>
        <p className="text-sm text-muted-foreground">
          Crie uma nova senha para sua conta
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  )
}
