# DRP Rural Gestão

Plataforma SaaS B2B profissional para gestão de Diagnóstico Rural Participativo (DRP).

## Visão Geral

O DRP Rural Gestão centraliza todo o ciclo de Diagnóstico Rural Participativo em um único sistema digital, substituindo processos manuais, fragmentados e lentos por uma solução integrada, rastreável e inteligente.

### Principais Funcionalidades (MVP)

- **Autenticação segura** com controle de perfis
- **Cadastro estrutural** (projetos, municípios, microrregiões, localidades)
- **Formulários de diagnóstico DRP** (8 tipos)
- **Gestão de tarefas e ordens** com status rastreável
- **Upload de evidências** (fotos + GPS)
- **Dashboard gerencial** com visão consolidada
- **Relatórios resumidos** com exportação PDF
- **Estrutura preparada para IA**

### Perfis de Usuário

1. **Platform Admin** - Acesso total ao sistema
2. **Project Manager** - Gestão de projetos e equipes
3. **Agronomist** - Visitas e formulários de campo
4. **Local Manager** - Acompanhamento local
5. **Operator** - Execução de tarefas

## Tecnologias

- **Frontend:** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** PostgreSQL + Prisma ORM
- **Autenticação:** NextAuth.js
- **IA:** OpenAI (preparado)
- **Validação:** Zod, React Hook Form
- **Tabelas:** TanStack Table

## Estrutura do Projeto

```
src/
├── app/                    # App Router (páginas)
│   ├── (auth)/            # Páginas de autenticação
│   ├── (dashboard)/       # Páginas protegidas
│   └── api/               # API Routes
├── components/            # Componentes compartilhados
│   ├── ui/               # shadcn/ui
│   ├── layout/           # Sidebar, Topbar
│   └── providers/        # Context Providers
├── modules/              # Módulos de domínio
│   ├── auth/             # Autenticação
│   ├── users/            # Usuários
│   ├── projects/         # Projetos
│   ├── municipalities/   # Municípios
│   ├── diagnostics/      # Diagnósticos
│   ├── tasks/            # Tarefas
│   ├── evidences/        # Evidências
│   └── reports/          # Relatórios
├── lib/                  # Utilitários
│   ├── prisma.ts         # Cliente Prisma
│   ├── auth.ts           # Configuração NextAuth
│   └── constants/        # Constantes
├── permissions/          # Sistema de permissões
├── ai/                   # Módulo de IA
└── types/               # Tipos TypeScript
```

## Configuração

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- PostgreSQL instalado (pgAdmin para gerenciamento)

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/AntonioPassetoA/drp_rural.git
cd drp_rural
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:
```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/drp_rural?schema=public"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=sua_chave_secreta_aqui

# OpenAI (para IA)
OPENAI_API_KEY=sua_openai_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Upload de arquivos (local)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

4. Crie o banco de dados no PostgreSQL:
```sql
CREATE DATABASE drp_rural;
```

5. Execute as migrações do Prisma:
```bash
npm run db:migrate
```

6. Execute o seed para criar dados iniciais:
```bash
npm run db:seed
```

7. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### Credenciais de Acesso (após seed)

| Usuário | Email | Senha |
|---------|-------|-------|
| Superadmin | admin@drprural.com | definida via variável de ambiente |
| Gestor | gestor@drprural.com | definida via variável de ambiente |
| Colaborador | agronomo@drprural.com | definida via variável de ambiente |

> As senhas **não são versionadas**. O seed lê `SEED_ADMIN_PASSWORD`,
> `SEED_MANAGER_PASSWORD` e `SEED_AGRONOMIST_PASSWORD` do `.env` (veja `.env.example`).

## Scripts Disponíveis

```bash
npm run dev         # Desenvolvimento
npm run build       # Build de produção
npm start           # Iniciar produção
npm run lint        # Lint
npm run db:generate # Gerar cliente Prisma
npm run db:migrate  # Executar migrações
npm run db:push     # Push direto (sem migração)
npm run db:seed     # Popular banco com dados iniciais
npm run db:studio   # Abrir Prisma Studio
npm run db:reset    # Resetar banco de dados
```

## Banco de Dados

### Entidades Principais

| Entidade | Descrição |
|----------|-----------|
| users | Usuários da plataforma |
| projects | Projetos de DRP |
| project_members | Vinculação usuário-projeto |
| municipalities | Municípios do projeto |
| microregions | Microrregiões do município |
| localities | Localidades da microrregião |
| diagnostics | Formulários DRP |
| tasks | Tarefas e ordens |
| evidences | Fotos, vídeos, documentos |
| audit_logs | Logs de auditoria |

### Gerenciamento com pgAdmin

1. Abra o pgAdmin
2. Conecte ao servidor PostgreSQL local
3. Navegue até o banco `drp_rural`
4. Use o Query Tool para consultas SQL ou visualize as tabelas

### Prisma Studio

Para uma interface visual do banco de dados, execute:
```bash
npm run db:studio
```

## Telas do MVP

### Autenticação
- `/login` - Login
- `/forgot-password` - Recuperar senha
- `/reset-password` - Redefinir senha

### Dashboard
- `/dashboard` - Painel principal

### Projetos
- `/projects` - Lista de projetos
- `/projects/new` - Novo projeto
- `/projects/[id]` - Detalhes do projeto
- `/projects/[id]/municipalities` - Municípios
- `/projects/[id]/diagnostics` - Diagnósticos
- `/projects/[id]/tasks` - Tarefas
- `/projects/[id]/evidences` - Evidências
- `/projects/[id]/reports` - Relatórios
- `/projects/[id]/team` - Equipe

### Usuário
- `/my-tasks` - Minhas tarefas
- `/profile` - Meu perfil
- `/users` - Gestão de usuários (admin)
- `/settings` - Configurações (admin)

## Regras de Acesso

| Perfil | Acesso |
|--------|--------|
| Platform Admin | Total - todos os dados |
| Project Manager | Projetos vinculados - gestão completa |
| Agronomist | Escopo atribuído - formulários e evidências |
| Local Manager | Área específica - visualização e ordens |
| Operator | Tarefas atribuídas apenas |

## Arquitetura

### Camadas

1. **Presentation (UI)** - Componentes React, páginas
2. **Application** - Hooks, Server Actions, validações
3. **Domain** - Tipos, regras de negócio
4. **Infrastructure** - Prisma, OpenAI, Storage local

### Segurança (4 camadas)

1. UI - Esconde elementos por role
2. Middleware - Proteção de rotas (NextAuth JWT)
3. Server Actions - Validação de permissões
4. Prisma - Queries filtradas por escopo

## Upload de Arquivos

Os arquivos são armazenados localmente na pasta `./uploads` (configurável via `UPLOAD_DIR`).

Estrutura:
```
uploads/
└── projects/
    └── {projectId}/
        └── evidences/
            └── {year}/
                └── {month}/
                    └── {uuid}.{ext}
```

## Pendências para Versões Futuras

### v2.0
- [ ] Cadastro completo (propriedades, famílias, associações)
- [ ] Módulo de solo e produção detalhado
- [ ] Mapas avançados com camadas
- [ ] Dashboards comparativos
- [ ] Modo offline completo

### v3.0
- [ ] Integração com drones
- [ ] Análise histórica por safra
- [ ] IA ativa (resumos e recomendações automáticas)
- [ ] Notificações push
- [ ] Multi-tenant completo

---

**DRP Rural Gestão** - Transformando diagnósticos rurais em decisões estratégicas.
