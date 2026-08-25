-- Migration 0001: Multiempresa (Organization) + redefinição de papéis (RBAC 3 níveis)
--
-- SEGURANÇA / NÃO-DESTRUTIVO:
--  * A conversão do enum UserRole usa CASE para MAPEAR os valores antigos,
--    em vez do cast direto (que falharia para os valores legados).
--  * organization_id é NULLABLE (superadmin permanece sem organização; a regra
--    "gestor/colaborador precisam de organização" é garantida no backend).
--  * O backfill vincula usuários (exceto superadmin) e projetos legados a uma
--    "Organização Principal", criada apenas se houver dados legados a vincular.
--  * Nenhum DROP de tabela/coluna, nenhum reset, nenhuma perda de linhas.

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'suspended');

-- AlterEnum: UserRole (mapeamento seguro dos papéis antigos -> novos)
--  platform_admin -> superadmin
--  project_manager -> gestor
--  agronomist / local_manager / operator -> colaborador
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('superadmin', 'gestor', 'colaborador');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."users" ALTER COLUMN "role" TYPE "UserRole_new" USING (
  CASE "role"::text
    WHEN 'platform_admin'  THEN 'superadmin'
    WHEN 'project_manager' THEN 'gestor'
    WHEN 'agronomist'      THEN 'colaborador'
    WHEN 'local_manager'   THEN 'colaborador'
    WHEN 'operator'        THEN 'colaborador'
    ELSE 'colaborador'
  END::"UserRole_new"
);
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "public"."users" ALTER COLUMN "role" SET DEFAULT 'colaborador';
COMMIT;

-- AlterTable: projects ganha organization_id (nullable)
ALTER TABLE "projects" ADD COLUMN "organization_id" TEXT;

-- AlterTable: users ganha organization_id + last_login_at (nullable)
ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3),
ADD COLUMN "organization_id" TEXT;

-- CreateTable: organizations
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "document" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "projects_organization_id_idx" ON "projects"("organization_id");
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill dos dados legados (idempotente: só cria a organização se houver o que vincular)
DO $$
DECLARE
  v_org_id TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "role" <> 'superadmin' AND "organization_id" IS NULL)
     OR EXISTS (SELECT 1 FROM "projects" WHERE "organization_id" IS NULL) THEN

    INSERT INTO "organizations" ("id", "name", "slug", "status", "created_at", "updated_at")
    VALUES (gen_random_uuid(), 'Organização Principal', 'organizacao-principal', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING "id" INTO v_org_id;

    -- Todos os usuários antigos, EXCETO o superadmin da plataforma
    UPDATE "users"
      SET "organization_id" = v_org_id
      WHERE "role" <> 'superadmin' AND "organization_id" IS NULL;

    -- Todos os projetos legados
    UPDATE "projects"
      SET "organization_id" = v_org_id
      WHERE "organization_id" IS NULL;

    RAISE NOTICE 'Backfill concluido. Organizacao Principal = %', v_org_id;
  ELSE
    RAISE NOTICE 'Sem dados legados para backfill; organizacao nao criada.';
  END IF;
END $$;
