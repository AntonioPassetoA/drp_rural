# 📋 Notas de Sessão — Claude Code

> Documento de contexto para retomar o projeto de onde paramos.
> **Última sessão:** 07/08/2026 — 🚀 App publicado na web (Vercel): https://drp-rural.vercel.app

---

## 🎯 Onde paramos (resumo rápido)

- O projeto **volta a rodar localmente** em `http://localhost:3000` ✅
- Corrigimos um **erro 500** que quebrava o app inteiro (bug no CSS — detalhes abaixo).
- Decisão: **por enquanto rodar só local**. Deploy na web fica pra depois.
- O **banco (Supabase) está online**, mas o **app Next.js nunca foi publicado** num domínio público (sempre rodou local).

---

## ▶️ Como rodar o projeto (passo a passo)

```bash
npm install              # instala dependências (só na 1ª vez ou após mudanças)
npm run db:generate      # gera o client do Prisma (necessário!)
npm run dev              # sobe o servidor em http://localhost:3000
```

Se o login falhar (banco sem usuários), rode uma vez:
```bash
npm run db:push          # cria as tabelas no Supabase
npm run db:seed          # cria os usuários de teste
```

### 🔑 Login de teste
| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | `admin@drprural.com` | `admin123` |
| Gestor | `gestor@drprural.com` | `manager123` |
| Agrônomo | `agronomo@drprural.com` | `agronomo123` |

---

## 🛠️ O que foi feito nesta sessão

1. **Gerado o Prisma Client** (`npm run db:generate`) — não estava gerado, o app nem subia.
2. **Corrigido bug de CSS que causava erro 500** em `src/app/globals.css`:
   - O `@import` das fontes do Google estava **depois** do `@import "tailwindcss"`.
   - Como o Tailwind expande em milhares de regras, a regra de fonte caía "no meio" do CSS final, e o parser exige que todo `@import` venha **antes** de qualquer regra.
   - **Solução:** movemos o `@import url(google fonts)` pra **primeira linha** do arquivo.
3. Confirmado que o app responde **HTTP 200** após a correção.
4. Verificado que **não há deploy web ativo** (sem Vercel/Netlify vinculado ao repo).

---

## 🌐 Situação de "estar na web" — PUBLICADO ✅

- ✅ **App (frontend):** NO AR em **https://drp-rural.vercel.app** (hospedado na Vercel).
- ✅ **Banco (Supabase):** ONLINE — `db.lyxupfdgroiagytfgunk.supabase.co`.
- ✅ **Deploy automático:** a Vercel está conectada ao repo GitHub. Todo `git push` na branch `main` **republica o site automaticamente**.

### Variáveis de ambiente configuradas na Vercel
(Settings → Environment Variables do projeto na vercel.com)
- `DATABASE_URL` — conexão do Supabase
- `NEXTAUTH_SECRET` — chave do NextAuth
- `NEXTAUTH_URL` — `https://drp-rural.vercel.app`

> Se um dia trocar o valor de uma env var na Vercel, precisa **Redeploy** (Deployments → ⋯ → Redeploy) pra valer.

---

## 🧱 Visão geral do projeto

**DRP Rural Gestão** — SaaS de gestão de Diagnóstico Rural Participativo (DRP).
Ciclo: Projetos → Municípios → Microrregiões → Localidades → Diagnósticos (8 formulários) → Tarefas de campo → Evidências (fotos + GPS) → Relatórios.

### Stack
- **Next.js 16** (App Router) + React 19 + TypeScript
- **PostgreSQL (Supabase)** via **Prisma ORM 7**
- **NextAuth** (login email/senha, JWT, bcrypt)
- Tailwind CSS 4 + shadcn/ui
- OpenAI (módulo `src/ai/` — preparado, ainda não plugado nas telas)

### Organização (`src/`)
- `app/` — páginas: `(auth)` login público, `(dashboard)` protegido, `api/`
- `modules/` — lógica por domínio (`auth`, `projects`, `municipalities`, `diagnostics`, `tasks`, etc.) com `services/`, `actions/`, `components/`, `validations/`
- `permissions/` — 5 perfis (admin, gestor, agrônomo, gestor local, operador)
- `components/` — UI compartilhada; `lib/` — prisma, auth, constantes

---

## ✅ Pronto vs. 🚧 Faltando

**Pronto:** login/auth, dashboard com stats, CRUD de projetos, lista de municípios, tarefas, equipe, diagnósticos (visão de progresso), usuários, perfil.

**Faltando (referenciado no menu, mas a página ainda não existe):**
- [ ] Formulário de diagnóstico em si — `municipalities/[id]/diagnostics/[formType]`
- [ ] `projects/[id]/evidences` (evidências)
- [ ] `projects/[id]/reports` (relatórios + exportação PDF)
- [ ] `projects/[id]/municipalities/new` (adicionar município)
- [ ] `/settings`
- [ ] Ativar a IA (OpenAI) nas telas

---

## ⚠️ Pendências / dívidas técnicas

- O `.env` local tem credenciais reais do Supabase e o `NEXTAUTH_SECRET`. Está fora do git (correto), mas vale rotacionar essas chaves quando for pro deploy.
- Aviso do Next.js 16: o arquivo `middleware.ts` está deprecado, deveria virar `proxy.ts` (não urgente, só um warning).

---

## 💡 Próximos passos sugeridos (escolher em casa)

1. Implementar o **formulário de diagnóstico** (o coração do sistema, ainda falta).
2. Criar a página de **adicionar município** (`municipalities/new`).
3. Implementar **evidências** (upload de fotos com GPS).
4. Publicar o app na **Vercel**.
