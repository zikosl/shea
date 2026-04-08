-- CreateEnum
CREATE TYPE "PricingName" AS ENUM ('APP_TAX', 'NORMAL_DELIVERY_TAX', 'GROUP_DELIVERY_TAX', 'STORE_TAX', 'PICKUP_TAX');

-- CreateTable
CREATE TABLE "Pricing" (
    "id" SERIAL NOT NULL,
    "name" "PricingName" NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "Pricing_pkey" PRIMARY KEY ("id")
);
