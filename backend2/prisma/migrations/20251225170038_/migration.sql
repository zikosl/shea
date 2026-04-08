/*
  Warnings:

  - A unique constraint covering the columns `[niche_id,partnerId]` on the table `Partner_Niche` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Partner_Niche_niche_id_partnerId_key" ON "Partner_Niche"("niche_id", "partnerId");
