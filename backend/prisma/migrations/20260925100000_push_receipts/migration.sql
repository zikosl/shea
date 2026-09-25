CREATE TYPE "PushReceiptStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

CREATE TABLE "PushReceipt" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER,
    "outboxEventId" TEXT,
    "status" "PushReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushReceipt_ticketId_key" ON "PushReceipt"("ticketId");
CREATE INDEX "PushReceipt_status_availableAt_idx" ON "PushReceipt"("status", "availableAt");
CREATE INDEX "PushReceipt_token_idx" ON "PushReceipt"("token");
CREATE INDEX "PushReceipt_outboxEventId_idx" ON "PushReceipt"("outboxEventId");
