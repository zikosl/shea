import { PrismaClient } from "@prisma/client";

const POS_EMAIL_DOMAIN = "pos.shea.local";
const POS_ADDRESS_LABEL = "POS Counter";

export function buildPartnerPosEmail(partnerUserId: number) {
  return `pos+partner-${partnerUserId}@${POS_EMAIL_DOMAIN}`;
}

export async function ensurePartnerPosIdentity(prisma: PrismaClient, partnerUserId: number) {
  const partner = await prisma.partner.findUnique({
    where: { userId: partnerUserId },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!partner) {
    throw new Error("Partner not found");
  }

  const email = buildPartnerPosEmail(partnerUserId);

  let user = await prisma.user.findUnique({
    where: { email },
    include: {
      client: true,
      addresses: true,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        authMethod: "EMAIL_PASSWORD",
        role: "CLIENT",
        client: {
          create: {
            firstname: "Walk-in",
            lastname: partner.companyName,
            language: "en",
          },
        },
      },
      include: {
        client: true,
        addresses: true,
      },
    });
  }

  let address = user.addresses.find((entry) => entry.label === POS_ADDRESS_LABEL);

  if (!address) {
    address = await prisma.address.create({
      data: {
        userId: user.id,
        label: POS_ADDRESS_LABEL,
        address: partner.address ?? partner.companyName,
        latitude: partner.latitude ?? 0,
        longitude: partner.longitude ?? 0,
        isDefault: true,
      },
    });
  }

  return {
    partner,
    user,
    client: user.client,
    address,
  };
}
