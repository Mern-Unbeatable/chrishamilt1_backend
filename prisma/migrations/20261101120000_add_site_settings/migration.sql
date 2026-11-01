-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_key_key" ON "site_settings"("key");

-- Seed default footer contact
INSERT INTO "site_settings" ("id", "key", "address", "phone", "email", "createdAt", "updatedAt")
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'contact',
    '2 enterprise house, barkering, London IG11 0JZ, United Kingdom',
    '07392255366',
    'admin@tradersinloop.co.uk',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
