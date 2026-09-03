-- AlterTable
ALTER TABLE "token_rules" ALTER COLUMN "maxBudget" DROP NOT NULL;

-- AlterTable
ALTER TABLE "token_rules" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "token_rules_isActive_idx" ON "token_rules"("isActive");
