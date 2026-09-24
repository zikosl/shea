ALTER TABLE "Token"
  ADD COLUMN "deviceKey" TEXT,
  ADD COLUMN "deviceName" TEXT,
  ADD COLUMN "platform" TEXT,
  ADD COLUMN "appVersion" TEXT,
  ADD COLUMN "ipAddress" TEXT,
  ADD COLUMN "userAgent" TEXT,
  ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "revokedAt" TIMESTAMP(3);

CREATE INDEX "Token_userId_revokedAt_expiresAt_idx"
  ON "Token"("userId", "revokedAt", "expiresAt");
CREATE INDEX "Token_userId_deviceKey_idx"
  ON "Token"("userId", "deviceKey");
