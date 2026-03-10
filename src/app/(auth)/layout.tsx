import { Leaf, Sprout, TreeDeciduous, Mountain } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo - Branding visual */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 gradient-hero relative overflow-hidden">
        {/* Pattern de fundo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 pattern-grid" />
        </div>

        {/* Elementos decorativos flutuantes */}
        <div className="absolute top-20 left-20 animate-float opacity-20">
          <TreeDeciduous className="h-32 w-32 text-green-400" strokeWidth={1} />
        </div>
        <div className="absolute top-40 right-32 animate-float animation-delay-200 opacity-15">
          <Sprout className="h-24 w-24 text-emerald-300" strokeWidth={1} />
        </div>
        <div className="absolute bottom-32 left-32 animate-float animation-delay-400 opacity-20">
          <Mountain className="h-40 w-40 text-green-500" strokeWidth={1} />
        </div>
        <div className="absolute bottom-20 right-20 animate-float animation-delay-300 opacity-15">
          <Leaf className="h-28 w-28 text-lime-400" strokeWidth={1} />
        </div>

        {/* Círculos decorativos com gradiente */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-gradient-to-tr from-lime-500/15 to-green-400/10 blur-3xl" />

        {/* Conteúdo central */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="space-y-8">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl shadow-green-500/30 animate-pulse-glow">
                <Leaf className="h-10 w-10 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-4xl xl:text-5xl font-bold text-white tracking-tight">
                  DRP Rural
                </h1>
                <p className="text-green-300/80 font-medium">Gestão</p>
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-4 max-w-lg">
              <h2 className="text-2xl xl:text-3xl font-semibold text-white/90 leading-tight">
                Transformando o campo com
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-lime-300">
                  diagnósticos inteligentes
                </span>
              </h2>
              <p className="text-lg text-green-200/70 leading-relaxed">
                Plataforma completa para Diagnóstico Rural Participativo.
                Conecte equipes, organize municípios e gere relatórios profissionais.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">500+</p>
                <p className="text-sm text-green-300/70">Municípios</p>
              </div>
              <div className="w-px bg-green-500/30" />
              <div className="text-center">
                <p className="text-3xl font-bold text-white">2.5k+</p>
                <p className="text-sm text-green-300/70">Diagnósticos</p>
              </div>
              <div className="w-px bg-green-500/30" />
              <div className="text-center">
                <p className="text-3xl font-bold text-white">98%</p>
                <p className="text-sm text-green-300/70">Satisfação</p>
              </div>
            </div>
          </div>
        </div>

        {/* Linha decorativa na borda */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-green-500/30 to-transparent" />
      </div>

      {/* Lado direito - Formulário */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col justify-center gradient-mesh relative">
        {/* Logo mobile */}
        <div className="lg:hidden absolute top-8 left-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
              <Leaf className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-xl font-bold text-foreground">DRP Rural</span>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto px-8 py-12">
          {/* Card do formulário */}
          <div className="glass rounded-3xl p-8 shadow-2xl shadow-black/5 animate-scale-in">
            {children}
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground mt-8 animate-fade-in animation-delay-300">
            Desenvolvido para profissionais do campo
          </p>
        </div>
      </div>
    </div>
  )
}
