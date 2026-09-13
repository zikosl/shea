ALTER TABLE "Order" ALTER COLUMN "addressId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN "requestKey" TEXT;
CREATE UNIQUE INDEX "Order_requestKey_key" ON "Order"("requestKey");
