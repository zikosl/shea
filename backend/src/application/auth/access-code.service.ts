import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createBadRequestError, createNotFoundError } from '../../core/errors/app-error'
import { sendAccessCodeEmail } from '../../utils/mailer'
import { generateAccessCode } from '../../utils/password'

type AccountKind = 'PARTNER' | 'DRIVER'

type ResetAccessCodeInput = {
  actorId: number
  kind: AccountKind
  profileId: number
}

export async function resetAccountAccessCode(
  prisma: PrismaClient,
  { actorId, kind, profileId }: ResetAccessCodeInput,
) {
  const account = kind === 'PARTNER'
    ? await prisma.partner.findUnique({
        where: { id: profileId },
        select: {
          userId: true,
          companyName: true,
          user: { select: { email: true } },
        },
      }).then((partner) => partner && ({
        userId: partner.userId,
        name: partner.companyName,
        email: partner.user.email,
      }))
    : await prisma.driver.findUnique({
        where: { id: profileId },
        select: {
          userId: true,
          firstname: true,
          lastname: true,
          user: { select: { email: true } },
        },
      }).then((driver) => driver && ({
        userId: driver.userId,
        name: `${driver.firstname} ${driver.lastname}`.trim(),
        email: driver.user.email,
      }))

  if (!account) {
    throw createNotFoundError(`${kind}_NOT_FOUND`)
  }

  const email = account.email?.trim()
  if (!email) {
    throw createBadRequestError('ACCOUNT_EMAIL_REQUIRED')
  }

  const accessCode = generateAccessCode()
  const passwordHash = await bcrypt.hash(accessCode, 12)

  try {
    await sendAccessCodeEmail({
      email,
      password: accessCode,
      name: account.name,
      purpose: 'reset',
    })
  } catch (error) {
    console.error(`[Mail] ${kind} access-code reset failed for user ${account.userId}`, error)
    throw createBadRequestError('ACCESS_CODE_EMAIL_FAILED')
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: account.userId },
      data: {
        authMethod: 'EMAIL_PASSWORD',
        passwordHash,
      },
    })
    await tx.token.deleteMany({ where: { userId: account.userId } })
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'ACCESS_CODE_RESET',
        entity: kind,
        entityId: String(profileId),
        metadata: {
          accountUserId: account.userId,
          refreshSessionsRevoked: true,
        },
      },
    })
  })

  return true
}
