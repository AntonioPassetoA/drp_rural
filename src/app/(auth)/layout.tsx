import { Leaf } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">DRP Rural Gestão</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plataforma de Diagnóstico Rural Participativo
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          {children}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Sistema de gestão rural profissional
        </p>
      </div>
    </div>
  )
}
