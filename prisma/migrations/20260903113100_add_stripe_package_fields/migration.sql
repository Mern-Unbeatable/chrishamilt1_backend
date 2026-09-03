-- AlterTable
ALTER TABLE "token_packages" ADD COLUMN "stripePriceId" TEXT;

-- AlterTable
ALTER TABLE "token_purchases" ADD COLUMN "stripeSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "token_packages_stripePriceId_key" ON "token_packages"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "token_purchases_stripeSessionId_key" ON "token_purchases"("stripeSessionId");
