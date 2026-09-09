import { PrismaClient, PricingName } from '@prisma/client'

export async function resolveDriverRequestFee(prisma: PrismaClient, partnerId: number) {
  const partner = await prisma.partner.findUniqueOrThrow({
    where: { userId: partnerId },
    select: { driverRequestFee: true },
  })

  if (partner.driverRequestFee !== null) {
    return { amount: partner.driverRequestFee, source: 'PARTNER' as const }
  }

  const globalPricing = await prisma.pricing.findUnique({
    where: { name: PricingName.DRIVER_REQUEST_FEE },
  })
  return { amount: Number(globalPricing?.price ?? 0), source: 'GLOBAL' as const }
}
