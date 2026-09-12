import { PrismaClient, ThemePreference } from '@prisma/client'
import { createBadRequestError, createNotFoundError } from '../../core/errors/app-error'
import { createSession } from '../auth/auth.service'
import { sendOtpViaPhoneServer } from '../../utils/phone'
import { env } from '../../core/config/env'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { UPLOAD_DIR } from '../../utils/const'

const phoneRegex = /^\+?[1-9]\d{1,14}$/

function normalizePhoneForComparison(phone: string) {
  const digits = phone.trim().replace(/\D/g, '')

  if (digits.startsWith('213') && digits.length === 12) {
    return digits.slice(3)
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return digits.slice(1)
  }

  return digits
}

function isAppReviewOtp(phone: string, code?: string) {
  if (!env.appReviewOtp.enabled) {
    return false
  }

  const configuredPhone = normalizePhoneForComparison(env.appReviewOtp.phone)
  const requestedPhone = normalizePhoneForComparison(phone)
  const phoneMatches = configuredPhone === requestedPhone

  if (!code) {
    return phoneMatches
  }

  return phoneMatches && code === env.appReviewOtp.code
}

async function consumeOtp(prisma: PrismaClient, phone: string, code: string) {
  const otpRecord = await prisma.otp.findUnique({ where: { phone } })

  if (!otpRecord) throw createNotFoundError('OTP_NOT_FOUND')
  if (otpRecord.verified) throw createBadRequestError('OTP_ALREADY_USED')
  if (otpRecord.expiresAt < new Date()) throw createBadRequestError('OTP_EXPIRED')
  if (otpRecord.attempts >= 3) throw createBadRequestError('TOO_MANY_ATTEMPTS')

  if (otpRecord.code !== code) {
    await prisma.otp.update({
      where: { phone },
      data: { attempts: { increment: 1 } },
    })
    throw createBadRequestError('INVALID_OTP')
  }

  await prisma.otp.update({
    where: { phone },
    data: { verified: true, updatedAt: new Date() },
  })
}

export async function sendOtp(prisma: PrismaClient, phone: string) {
  const isReviewPhone = isAppReviewOtp(phone)

  if (!isReviewPhone && !phoneRegex.test(phone)) {
    throw createBadRequestError('Invalid phone number format')
  }

  const expiresAt = new Date(Date.now() + 3 * 60 * 1000)
  const result = isReviewPhone
    ? { success: true, otp: env.appReviewOtp.code }
    : env.otpBypassCode
    ? { success: true, otp: env.otpBypassCode }
    : await sendOtpViaPhoneServer(phone)

  if (!result.success || !result.otp) {
    throw createBadRequestError(result.error ?? 'Failed to send OTP')
  }

  await prisma.otp.upsert({
    where: { phone },
    update: {
      code: result.otp,
      expiresAt,
      attempts: 0,
      verified: false,
    },
    create: {
      phone,
      code: result.otp,
      expiresAt,
      attempts: 0,
      verified: false,
    },
  })

  return true
}

export async function verifyOtp(prisma: PrismaClient, phone: string, code: string) {
  if (isAppReviewOtp(phone, code)) {
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000)

    await prisma.otp.upsert({
      where: { phone },
      update: {
        code: env.appReviewOtp.code,
        expiresAt,
        attempts: 0,
        verified: false,
      },
      create: {
        phone,
        code: env.appReviewOtp.code,
        expiresAt,
        attempts: 0,
        verified: false,
      },
    })
  }

  await consumeOtp(prisma, phone, code)

  let user = await prisma.user.findUnique({
    where: { phone },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        authMethod: 'OTP',
        role: 'CLIENT',
        client: {
          create: {},
        },
      },
    })
  }

  if (user.role !== 'CLIENT') {
    throw createBadRequestError('CLIENT_ACCOUNT_REQUIRED')
  }

  await prisma.client.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })

  return createSession(user, prisma)
}

export async function requestClientPhoneChange(
  prisma: PrismaClient,
  userId: number,
  phone: string,
) {
  if (!phoneRegex.test(phone)) {
    throw createBadRequestError('INVALID_PHONE_NUMBER')
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'CLIENT') {
    throw createBadRequestError('CLIENT_ACCOUNT_REQUIRED')
  }
  if (user.phone && normalizePhoneForComparison(user.phone) === normalizePhoneForComparison(phone)) {
    throw createBadRequestError('PHONE_UNCHANGED')
  }

  const owner = await prisma.user.findUnique({ where: { phone } })
  if (owner && owner.id !== userId) {
    throw createBadRequestError('PHONE_ALREADY_IN_USE')
  }

  return sendOtp(prisma, phone)
}

export async function verifyClientPhoneChange(
  prisma: PrismaClient,
  userId: number,
  phone: string,
  code: string,
) {
  const currentUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!currentUser || currentUser.role !== 'CLIENT') {
    throw createBadRequestError('CLIENT_ACCOUNT_REQUIRED')
  }

  const owner = await prisma.user.findUnique({ where: { phone } })
  if (owner && owner.id !== userId) {
    throw createBadRequestError('PHONE_ALREADY_IN_USE')
  }

  await consumeOtp(prisma, phone, code)

  const user = await prisma.user.update({
    where: { id: userId },
    data: { phone },
  })

  return createSession(user, prisma)
}

export async function updateClientProfile(
  prisma: PrismaClient,
  userId: number,
  args: {
    firstname?: string | null
    lastname?: string | null
    avatar?: string | null
    email?: string | null
    language?: string | null
    theme?: boolean | null
    themePreference?: ThemePreference | null
  },
) {
  const clientData: Record<string, unknown> = {}
  const userData: Record<string, unknown> = {}

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!existingUser) {
    throw createNotFoundError('User not found')
  }

  if (existingUser.role !== 'CLIENT') {
    throw createBadRequestError('CLIENT_ACCOUNT_REQUIRED')
  }

  if (args.firstname) clientData.firstname = args.firstname
  if (args.lastname) clientData.lastname = args.lastname
  if (args.avatar) clientData.avatar = args.avatar
  if (args.language) clientData.language = args.language.toLowerCase()
  if (args.theme !== undefined && args.theme !== null) clientData.theme = args.theme
  if (args.themePreference) clientData.themePreference = args.themePreference
  if (args.email) userData.email = args.email.toLowerCase()

  await prisma.client.upsert({
    where: { userId },
    update: clientData,
    create: {
      userId,
      ...clientData,
    },
  })

  if (Object.keys(userData).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: userData,
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw createNotFoundError('User not found')
  }

  return createSession(user, prisma)
}

async function removeClientAvatar(avatar: string | null | undefined) {
  if (!avatar?.startsWith('/uploads/')) return

  const filename = avatar.slice('/uploads/'.length)
  if (!filename || filename !== path.basename(filename)) return

  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename))
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
    if (code !== 'ENOENT') {
      console.error('[Account deletion] Could not remove client avatar', error)
    }
  }
}

export async function deleteClientAccount(prisma: PrismaClient, userId: number) {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      role: true,
      client: { select: { avatar: true } },
    },
  })

  if (!account || account.role !== 'CLIENT' || !account.client) {
    throw createNotFoundError('CLIENT_ACCOUNT_NOT_FOUND')
  }

  await prisma.$transaction(async (tx) => {
    const addresses = await tx.address.findMany({
      where: { userId },
      select: { id: true },
    })
    const addressIds = addresses.map(({ id }) => id)
    const orders = await tx.order.findMany({
      where: {
        OR: [
          { clientId: userId },
          ...(addressIds.length ? [{ addressId: { in: addressIds } }] : []),
        ],
      },
      select: { id: true },
    })
    const orderIds = orders.map(({ id }) => id)

    // Gift requests contain recipient details and messages, so remove them
    // instead of retaining an anonymous shell after deleting the profile.
    await tx.customOrder.deleteMany({ where: { clientId: userId } })

    if (orderIds.length) {
      const deliveries = await tx.delivery.findMany({
        where: { orderId: { in: orderIds } },
        select: { id: true },
      })
      const deliveryIds = deliveries.map(({ id }) => id)

      await tx.sale.updateMany({
        where: { sourceOrderId: { in: orderIds } },
        data: { sourceOrderId: null },
      })
      await tx.partnerDriverRequest.deleteMany({ where: { orderId: { in: orderIds } } })
      await tx.orderDispatch.deleteMany({
        where: {
          OR: [
            { orderId: { in: orderIds } },
            ...(deliveryIds.length ? [{ deliveryId: { in: deliveryIds } }] : []),
          ],
        },
      })
      await tx.delivery.deleteMany({ where: { orderId: { in: orderIds } } })
      await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
      await tx.order.deleteMany({ where: { id: { in: orderIds } } })
    }

    if (addressIds.length) {
      await tx.customOrder.updateMany({
        where: { addressId: { in: addressIds } },
        data: { addressId: null },
      })
      await tx.delivery.updateMany({
        where: { addressId: { in: addressIds } },
        data: { addressId: null },
      })
      await tx.address.deleteMany({ where: { id: { in: addressIds } } })
    }

    await tx.log.deleteMany({ where: { userId } })
    await tx.auditLog.updateMany({ where: { actorId: userId }, data: { actorId: null } })
    await tx.sale.updateMany({ where: { cashierId: userId }, data: { cashierId: null } })
    await tx.stockMovement.updateMany({ where: { userId }, data: { userId: null } })
    await tx.cashSession.updateMany({ where: { closedById: userId }, data: { closedById: null } })
    await tx.token.deleteMany({ where: { userId } })
    await tx.pushToken.deleteMany({ where: { userId } })
    if (account.phone) {
      await tx.otp.deleteMany({ where: { phone: account.phone } })
    }
    await tx.client.delete({ where: { userId } })
    await tx.user.delete({ where: { id: userId } })
  })

  await removeClientAvatar(account.client.avatar)
  return true
}
