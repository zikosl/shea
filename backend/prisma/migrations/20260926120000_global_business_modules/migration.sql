CREATE TABLE "GlobalCapabilitySetting" (
    "id" SERIAL NOT NULL,
    "capability" "CapabilityCode" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalCapabilitySetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GlobalCapabilitySetting_capability_key"
ON "GlobalCapabilitySetting"("capability");
