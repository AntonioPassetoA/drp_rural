import { LoginForm } from '@/modules/auth/components'

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Bem-vindo de volta</h2>
        <p className="text-sm text-muted-foreground">
          Entre com suas credenciais para acessar o sistema
        </p>
      </div>

      <LoginForm />
    </div>
  )
}
