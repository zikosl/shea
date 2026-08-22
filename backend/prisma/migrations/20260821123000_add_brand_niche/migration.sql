ALTER TABLE "Brand"
ADD COLUMN "niche_id" INTEGER;

CREATE INDEX "Brand_niche_id_idx" ON "Brand"("niche_id");

ALTER TABLE "Brand"
ADD CONSTRAINT "Brand_niche_id_fkey" FOREIGN KEY ("niche_id") REFERENCES "Niche"("id") ON DELETE SET NULL ON UPDATE CASCADE;
