-- CreateTable
CREATE TABLE "Partner_Niche" (
    "id" SERIAL NOT NULL,
    "partnerId" INTEGER,
    "niche_id" INTEGER,

    CONSTRAINT "Partner_Niche_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Partner_Niche" ADD CONSTRAINT "Partner_Niche_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner_Niche" ADD CONSTRAINT "Partner_Niche_niche_id_fkey" FOREIGN KEY ("niche_id") REFERENCES "Niche"("id") ON DELETE SET NULL ON UPDATE CASCADE;
