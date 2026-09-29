ALTER TABLE "ProductTemplate" ADD COLUMN "importSourceUrl" TEXT;

CREATE UNIQUE INDEX "ProductTemplate_importSourceUrl_key" ON "ProductTemplate"("importSourceUrl");
