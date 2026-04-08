import { PrismaClient } from '@prisma/client'
import { createBadRequestError, createNotFoundError } from '../../core/errors/app-error'
import { createSession } from '../auth/auth.service'
import { sendOtpViaPhoneServer } from '../../utils/phone'
import { env } from '../../core/config/env'

const phoneRegex = /^\+?[1-9]\d{1,14}$/

export async function sendOtp(prisma: PrismaClient, phone: string) {
  if (!phoneRegex.test(phone)) {
    throw createBadRequestError('Invalid phone number format')
  }

  const expiresAt = new Date(Date.now() + 3 * 60 * 1000)
  const result = env.otpBypassCode
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
  const otpRecord = await prisma.otp.findUnique({
    where: { phone },
  })

  if (!otpRecord) {
    throw createNotFoundError('OTP_NOT_FOUND')
  }

  if (otpRecord.verified) {
    throw createBadRequestError('OTP_ALREADY_USED')
  }

  if (otpRecord.expiresAt < new Date()) {
    throw createBadRequestError('OTP_EXPIRED')
  }

  if (otpRecord.attempts >= 3) {
    throw createBadRequestError('TOO_MANY_ATTEMPTS')
  }

  if (otpRecord.code !== code) {
    await prisma.otp.update({
      where: { phone },
      data: { attempts: { increment: 1 } },
    })

    throw createBadRequestError('INVALID_OTP')
  }

  await prisma.otp.update({
    where: { phone },
    data: {
      verified: true,
      updatedAt: new Date(),
    },
  })

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
  },
) {
  const clientData: Record<string, unknown> = {}
  const userData: Record<string, unknown> = {}

  if (args.firstname) clientData.firstname = args.firstname
  if (args.lastname) clientData.lastname = args.lastname
  if (args.avatar) clientData.avatar = args.avatar
  if (args.language) clientData.language = args.language.toLowerCase()
  if (args.theme !== undefined && args.theme !== null) clientData.theme = args.theme
  if (args.email) userData.email = args.email.toLowerCase()

  if (Object.keys(clientData).length > 0) {
    await prisma.client.update({
      where: { userId },
      data: clientData,
    })
  }

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
