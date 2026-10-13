ALTER TABLE "CashSession"
  ALTER COLUMN "openedById" DROP NOT NULL;

ALTER TABLE "CashSession"
  DROP CONSTRAINT "CashSession_openedById_fkey",
  ADD CONSTRAINT "CashSession_openedById_fkey"
    FOREIGN KEY ("openedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
