import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createBadRequestError, createNotFoundError } from '../../core/errors/app-error'
import { generateRandomPassword } from '../../utils/password'
import { sendEmailPassword } from '../../utils/mailer'
import { createSession, ensureEmail } from '../auth/auth.service'
import { LogSatus } from '../../types'

export const DEFAULT_PARTNER_PRIMARY_COLOR = '#CC6F98'

export function normalizePartnerLanguage(value?: string | null) {
  if (value == null) return undefined
  if (value !== 'en' && value !== 'ar') {
    throw createBadRequestError('Language must be en or ar')
  }
  return value
}

export function normalizePartnerPrimaryColor(value?: string | null) {
  if (value === undefined || value === null) return undefined

  const normalized = value.trim().toUpperCase()
  if (!/^#[0-9A-F]{6}$/.test(normalized)) {
    throw createBadRequestError('Primary color must use the #RRGGBB format')
  }

  return normalized
}

export async function createPartner(
  prisma: PrismaClient,
  input: { email: string; companyName: string; niches?: number[] | null; primaryColor?: string | null },
) {
  const email = ensureEmail(input.email)
  const password = generateRandomPassword(12)
  const passwordHash = await bcrypt.hash(password, 10)
  const userWithPartner = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: 'PARTNER',
        authMethod: 'EMAIL_PASSWORD',
        partner: {
          create: {
            companyName: input.companyName,
            primaryColor: normalizePartnerPrimaryColor(input.primaryColor) ?? DEFAULT_PARTNER_PRIMARY_COLOR,
          },
        },
      },
      include: {
        partner: true,
      },
    })

    if (input.niches && input.niches.length > 0) {
      await tx.partner_Niche.createMany({
        data: input.niches.map((nicheId) => ({
          niche_id: nicheId,
          partnerId: createdUser.partner!.id,
        })),
        skipDuplicates: true,
      })
    }

    await tx.log.create({
      data: {
        title: 'New Partner Has Been Created',
        body: `A new partner for "${input.companyName}" has been created.`,
        title_ar: 'تم إنشاء شريك جديد',
        body_ar: `تم إنشاء شريك جديد للشركة "${input.companyName}".`,
        type: LogSatus.NEW_PARTNER,
      },
    })

    return createdUser
  })

  try {
    const messageId = await sendEmailPassword({
      email,
      password,
      name: input.companyName,
    })
    console.log(`[Mail] Partner invite sent to ${email}: ${messageId}`)
  } catch (error) {
    console.error(`[Mail] Partner invite failed for ${email}`, error)
  }

  return userWithPartner.partner
}

export async function addPartnerNiches(
  prisma: PrismaClient,
  userId: number,
  niches: number[],
) {
  const partner = await prisma.partner.findUnique({
    where: { userId },
  })

  if (!partner) {
    throw createNotFoundError('Partner not found')
  }

  await prisma.partner_Niche.createMany({
    data: niches.map((nicheId) => ({
      niche_id: nicheId,
      partnerId: partner.id,
    })),
    skipDuplicates: true,
  })

  return prisma.partner_Niche.findMany({
    where: { partnerId: partner.id },
  })
}

export async function updatePartnerProfile(
  prisma: PrismaClient,
  userId: number,
  data: {
    companyName?: string | null
    address?: string | null
    avatar?: string | null
    online?: boolean | null
    latitude?: number | null
    longitude?: number | null
    primaryColor?: string | null
    language?: string | null
  },
) {
  await prisma.partner.update({
    where: { userId },
    data: {
      companyName: data.companyName ?? undefined,
      address: data.address ?? undefined,
      avatar: data.avatar ?? undefined,
      online: data.online ?? undefined,
      latitude: data.latitude ?? undefined,
      longitude: data.longitude ?? undefined,
      primaryColor: normalizePartnerPrimaryColor(data.primaryColor),
      language: normalizePartnerLanguage(data.language),
    },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw createNotFoundError('User not found')
  }

  return createSession(user, prisma)
}
