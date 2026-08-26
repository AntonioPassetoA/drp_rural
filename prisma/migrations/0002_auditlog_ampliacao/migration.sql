-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('success', 'failure');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "cross_org" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "organization_id" TEXT,
ADD COLUMN     "result" "AuditResult" NOT NULL DEFAULT 'success',
ADD COLUMN     "user_agent" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL,
ALTER COLUMN "entity_type" DROP NOT NULL,
ALTER COLUMN "entity_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_id_idx" ON "audit_logs"("organization_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_id_idx" ON "audit_logs"("user_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_id_idx" ON "audit_logs"("action", "created_at", "id");

-- CreateIndex
CREATE INDEX "audit_logs_result_created_at_id_idx" ON "audit_logs"("result", "created_at", "id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_id_idx" ON "audit_logs"("created_at", "id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
