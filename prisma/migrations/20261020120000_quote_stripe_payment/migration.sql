-- AlterEnum
ALTER TYPE "QuoteStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "token_rules" ADD COLUMN "price" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN "stripeSessionId" TEXT;
ALTER TABLE "quotes" ADD COLUMN "tokensCharged" INTEGER;
ALTER TABLE "quotes" ADD COLUMN "amountPaid" DECIMAL(10,2);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_stripeSessionId_key" ON "quotes"("stripeSessionId");
