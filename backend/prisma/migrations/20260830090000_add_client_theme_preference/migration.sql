CREATE TYPE "ThemePreference" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

ALTER TABLE "Client"
ADD COLUMN "themePreference" "ThemePreference" NOT NULL DEFAULT 'SYSTEM';
