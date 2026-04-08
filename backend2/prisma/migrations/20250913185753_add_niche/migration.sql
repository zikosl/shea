-- AlterTable
ALTER TABLE "Category" ADD COLUMN "niche_id" INTEGER;

-- CreateTable
CREATE TABLE "Niche" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    CONSTRAINT "Niche_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Category"
ADD CONSTRAINT "Category_niche_id_fkey" FOREIGN KEY ("niche_id") REFERENCES "Niche" ("id") ON DELETE SET NULL ON UPDATE CASCADE;