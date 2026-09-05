ALTER TABLE "Partner" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_language_check" CHECK ("language" IN ('en', 'ar'));
