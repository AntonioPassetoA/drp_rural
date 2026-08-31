-- Migration 0003: Evidences via Supabase Storage (upload direto + máquina de estados)
--
-- SEGURANÇA / NÃO-DESTRUTIVO:
--  * A GUARDA abaixo é a 1ª instrução: aborta ANTES de qualquer DDL se a tabela
--    "evidences" não estiver vazia. DDL no Postgres é transacional, então um
--    abort aqui reverte a migration inteira (rollback integral).
--  * A tabela foi confirmada com 0 registros; por isso as colunas obrigatórias
--    podem ser NOT NULL sem backfill.
--  * Campos VALIDADOS (evidence_type/file_size/mime_type/category) passam a ser
--    nullable: o registro nasce em UPLOADING, antes da validação do conteúdo.
--  * Legado file_url/file_name viram nullable (deprecados; não gravamos mais).
--  * FKs org/projeto/uploader com ON DELETE RESTRICT (nunca Cascade -> sem órfãos).

-- Guarda: interrompe com segurança se houver qualquer registro.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "evidences") > 0 THEN
    RAISE EXCEPTION 'Abortado: % registro(s) em evidences; esta migration assume tabela vazia',
      (SELECT COUNT(*) FROM "evidences");
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('UPLOADING', 'READY', 'FAILED', 'QUARANTINED', 'CLEANING', 'CLEANUP_FAILED', 'DELETING', 'DELETE_FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "EvidenceCategory" AS ENUM ('photo', 'document');

-- AlterTable
ALTER TABLE "evidences" ADD COLUMN     "category" "EvidenceCategory",
ADD COLUMN     "declared_size" INTEGER,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "project_id" TEXT NOT NULL,
ADD COLUMN     "ready_at" TIMESTAMP(3),
ADD COLUMN     "reconcile_locked_at" TIMESTAMP(3),
ADD COLUMN     "reconcile_lock_id" TEXT,
ADD COLUMN     "status" "EvidenceStatus" NOT NULL DEFAULT 'UPLOADING',
ADD COLUMN     "storage_path" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "upload_expires_at" TIMESTAMP(3),
ALTER COLUMN "evidence_type" DROP NOT NULL,
ALTER COLUMN "file_url" DROP NOT NULL,
ALTER COLUMN "file_name" DROP NOT NULL,
ALTER COLUMN "file_size" DROP NOT NULL,
ALTER COLUMN "mime_type" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "evidences_storage_path_key" ON "evidences"("storage_path");

-- CreateIndex
CREATE INDEX "evidences_organization_id_created_at_id_idx" ON "evidences"("organization_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "evidences_project_id_created_at_id_idx" ON "evidences"("project_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "evidences_status_upload_expires_at_idx" ON "evidences"("status", "upload_expires_at");

-- CreateIndex
CREATE INDEX "evidences_status_reconcile_locked_at_idx" ON "evidences"("status", "reconcile_locked_at");

-- CHECK: uma evidência READY tem que estar COMPLETA (campos validados presentes).
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_ready_complete_chk" CHECK (
  status <> 'READY' OR (
    mime_type     IS NOT NULL AND
    file_size     IS NOT NULL AND
    category      IS NOT NULL AND
    evidence_type IS NOT NULL AND
    ready_at      IS NOT NULL AND
    storage_path  IS NOT NULL
  )
);

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
