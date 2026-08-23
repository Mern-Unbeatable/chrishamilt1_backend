-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'TRADESMAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "profileImage" TEXT,
    "tokenBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tradesman_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "specialties" TEXT[],
    "location" TEXT,
    "publicLiabilityCover" DECIMAL(12,2),
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "jobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "responseTimeHours" INTEGER,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tradesman_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "jobCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "city" TEXT,
    "budgetMin" DECIMAL(12,2) NOT NULL,
    "budgetMax" DECIMAL(12,2) NOT NULL,
    "urgency" "JobUrgency" NOT NULL DEFAULT 'MEDIUM',
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "preferredStart" TIMESTAMP(3),
    "completionBy" TIMESTAMP(3),
    "specialNotes" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "leadPrice" DECIMAL(10,2),
    "customerId" TEXT NOT NULL,
    "tradesmanId" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_images" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_requirements" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "job_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "tradesmanId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "estimatedDuration" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "materialsIncluded" BOOLEAN NOT NULL DEFAULT false,
    "warranty" TEXT,
    "proposal" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_images" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tradesmanId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "status" "BookingStatus" NOT NULL DEFAULT 'ACCEPTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "tradesmanId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tradesmanId" TEXT NOT NULL,
    "jobId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "tokenQuantity" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "badge" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minBudget" DECIMAL(12,2) NOT NULL,
    "maxBudget" DECIMAL(12,2) NOT NULL,
    "tokenCost" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_purchases" (
    "id" TEXT NOT NULL,
    "tradesmanId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_usages" (
    "id" TEXT NOT NULL,
    "tradesmanId" TEXT NOT NULL,
    "jobId" TEXT,
    "tokens" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earnings" (
    "id" TEXT NOT NULL,
    "tradesmanId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tradesman_profiles_userId_key" ON "tradesman_profiles"("userId");

-- CreateIndex
CREATE INDEX "warehouses_userId_idx" ON "warehouses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_jobCode_key" ON "jobs"("jobCode");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_categoryId_idx" ON "jobs"("categoryId");

-- CreateIndex
CREATE INDEX "jobs_customerId_idx" ON "jobs"("customerId");

-- CreateIndex
CREATE INDEX "jobs_tradesmanId_idx" ON "jobs"("tradesmanId");

-- CreateIndex
CREATE INDEX "jobs_location_idx" ON "jobs"("location");

-- CreateIndex
CREATE INDEX "jobs_createdAt_idx" ON "jobs"("createdAt");

-- CreateIndex
CREATE INDEX "job_images_jobId_idx" ON "job_images"("jobId");

-- CreateIndex
CREATE INDEX "job_requirements_jobId_idx" ON "job_requirements"("jobId");

-- CreateIndex
CREATE INDEX "quotes_tradesmanId_idx" ON "quotes"("tradesmanId");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_jobId_tradesmanId_key" ON "quotes"("jobId", "tradesmanId");

-- CreateIndex
CREATE INDEX "quote_images_quoteId_idx" ON "quote_images"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_jobId_key" ON "bookings"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_quoteId_key" ON "bookings"("quoteId");

-- CreateIndex
CREATE INDEX "bookings_customerId_idx" ON "bookings"("customerId");

-- CreateIndex
CREATE INDEX "bookings_tradesmanId_idx" ON "bookings"("tradesmanId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "reviews_tradesmanId_idx" ON "reviews"("tradesmanId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_jobId_reviewerId_key" ON "reviews"("jobId", "reviewerId");

-- CreateIndex
CREATE INDEX "conversations_customerId_idx" ON "conversations"("customerId");

-- CreateIndex
CREATE INDEX "conversations_tradesmanId_idx" ON "conversations"("tradesmanId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "token_purchases_tradesmanId_idx" ON "token_purchases"("tradesmanId");

-- CreateIndex
CREATE INDEX "token_purchases_status_idx" ON "token_purchases"("status");

-- CreateIndex
CREATE INDEX "token_usages_tradesmanId_idx" ON "token_usages"("tradesmanId");

-- CreateIndex
CREATE INDEX "earnings_tradesmanId_idx" ON "earnings"("tradesmanId");

-- CreateIndex
CREATE INDEX "earnings_createdAt_idx" ON "earnings"("createdAt");

-- AddForeignKey
ALTER TABLE "tradesman_profiles" ADD CONSTRAINT "tradesman_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_images" ADD CONSTRAINT "job_images_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requirements" ADD CONSTRAINT "job_requirements_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_images" ADD CONSTRAINT "quote_images_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "token_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usages" ADD CONSTRAINT "token_usages_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usages" ADD CONSTRAINT "token_usages_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
