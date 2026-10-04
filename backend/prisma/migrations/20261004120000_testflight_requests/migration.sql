CREATE TYPE "TestFlightRequestStatus" AS ENUM ('REQUESTED', 'INVITED');

CREATE TABLE "TestFlightRequest" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "status" "TestFlightRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "invitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TestFlightRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TestFlightRequest_email_key" ON "TestFlightRequest"("email");
CREATE INDEX "TestFlightRequest_status_createdAt_idx" ON "TestFlightRequest"("status", "createdAt");
