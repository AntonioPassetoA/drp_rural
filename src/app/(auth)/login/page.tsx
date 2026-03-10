import { LoginForm } from '@/modules/auth/components'
import { ArrowRight } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Bem-vindo de volta
        </h2>
        <p className="text-muted-foreground">
          Entre com suas credenciais para acessar
        </p>
      </div>

      <LoginForm />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white/80 px-2 text-muted-foreground">
            Novo por aqui?
          </span>
        </div>
      </div>

      <div className="text-center">
        <a
          href="mailto:contato@drprural.com.br"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
        >
          Solicite acesso à plataforma
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  )
}
