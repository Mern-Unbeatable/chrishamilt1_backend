-- Allow admin user delete to remove related bookings, chats, reviews, and wallet rows.

ALTER TABLE "bookings" DROP CONSTRAINT "bookings_customerId_fkey";
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bookings" DROP CONSTRAINT "bookings_tradesmanId_fkey";
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bookings" DROP CONSTRAINT "bookings_quoteId_fkey";
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews" DROP CONSTRAINT "reviews_reviewerId_fkey";
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews" DROP CONSTRAINT "reviews_tradesmanId_fkey";
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations" DROP CONSTRAINT "conversations_customerId_fkey";
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations" DROP CONSTRAINT "conversations_tradesmanId_fkey";
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages" DROP CONSTRAINT "messages_senderId_fkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "token_purchases" DROP CONSTRAINT "token_purchases_tradesmanId_fkey";
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "token_usages" DROP CONSTRAINT "token_usages_tradesmanId_fkey";
ALTER TABLE "token_usages" ADD CONSTRAINT "token_usages_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "earnings" DROP CONSTRAINT "earnings_tradesmanId_fkey";
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_tradesmanId_fkey" FOREIGN KEY ("tradesmanId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "earnings" DROP CONSTRAINT "earnings_jobId_fkey";
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
