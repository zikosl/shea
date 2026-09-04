CREATE TYPE "StoreDeploymentMode" AS ENUM ('SOLO', 'MULTI_POS');
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "StoreTerminalStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "Store" (
  "id" TEXT NOT NULL,
  "partnerId" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Algiers',
  "deploymentMode" "StoreDeploymentMode" NOT NULL DEFAULT 'SOLO',
  "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
  "cloudSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
  "cloudGatewayUrl" TEXT,
  "localGatewayUrl" TEXT,
  "gatewayProvisionedAt" TIMESTAMP(3),
  "gatewayLastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreTerminal" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "deviceId" TEXT,
  "terminalKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "StoreTerminalStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreTerminal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Store_partnerId_code_key" ON "Store"("partnerId", "code");
CREATE INDEX "Store_partnerId_status_idx" ON "Store"("partnerId", "status");
CREATE UNIQUE INDEX "StoreTerminal_deviceId_key" ON "StoreTerminal"("deviceId");
CREATE UNIQUE INDEX "StoreTerminal_terminalKey_key" ON "StoreTerminal"("terminalKey");
CREATE INDEX "StoreTerminal_storeId_status_idx" ON "StoreTerminal"("storeId", "status");

ALTER TABLE "Store" ADD CONSTRAINT "Store_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreTerminal" ADD CONSTRAINT "StoreTerminal_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreTerminal" ADD CONSTRAINT "StoreTerminal_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Store" ("id", "partnerId", "code", "name", "updatedAt")
SELECT gen_random_uuid()::text, p."userId", 'main', p."companyName", CURRENT_TIMESTAMP
FROM "Partner" p
ON CONFLICT ("partnerId", "code") DO NOTHING;

INSERT INTO "StoreTerminal" ("id", "storeId", "deviceId", "terminalKey", "name", "lastSeenAt", "updatedAt")
SELECT gen_random_uuid()::text, s."id", d."id", d."deviceKey", COALESCE(d."name", 'POS terminal'), d."lastSyncAt", CURRENT_TIMESTAMP
FROM "Device" d
JOIN "Store" s ON s."partnerId" = d."partnerId" AND s."code" = 'main'
ON CONFLICT ("deviceId") DO NOTHING;
