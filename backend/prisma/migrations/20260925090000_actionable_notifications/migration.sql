ALTER TABLE "Log"
ADD COLUMN "readAt" TIMESTAMP(3),
ADD COLUMN "eventKey" TEXT,
ADD COLUMN "entityType" TEXT,
ADD COLUMN "entityId" TEXT,
ADD COLUMN "action" TEXT,
ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "metadata" JSONB;

CREATE UNIQUE INDEX "Log_userId_eventKey_key" ON "Log"("userId", "eventKey");
CREATE INDEX "Log_userId_read_id_idx" ON "Log"("userId", "read", "id");
