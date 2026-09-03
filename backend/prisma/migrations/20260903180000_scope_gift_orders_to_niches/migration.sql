ALTER TABLE "CustomOrder" ADD COLUMN "nicheId" INTEGER;
CREATE INDEX "CustomOrder_partnerId_nicheId_requiredAt_idx" ON "CustomOrder"("partnerId", "nicheId", "requiredAt");
ALTER TABLE "CustomOrder" ADD CONSTRAINT "CustomOrder_nicheId_fkey" FOREIGN KEY ("nicheId") REFERENCES "Niche"("id") ON DELETE SET NULL ON UPDATE CASCADE;
