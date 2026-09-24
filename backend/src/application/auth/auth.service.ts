import { PrismaClient, User } from '@prisma/client'
import bcrypt, { hash } from 'bcryptjs'
import dayjs from 'dayjs'
import { GraphQLError } from 'graphql'
import { getAccessExpiry, getRefreshExpiry, signAccessToken, signRefreshToken } from '../../core/auth/token.service'
import { getUserIdFromRefreshToken } from '../../core/auth/current-user'
import { createBadRequestError, createUnauthorizedError } from '../../core/errors/app-error'

type AuthUser = Pick<User, 'id' | 'email' | 'phone' | 'role'>

export type SessionMetadata = {
  deviceKey?: string | null
  deviceName?: string | null
  platform?: string | null
  appVersion?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

function compactMetadata(metadata: SessionMetadata) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => typeof value === 'string' && value.trim()),
  ) as SessionMetadata
}

export async function createSession(
  user: AuthUser,
  prisma: PrismaClient,
  metadata: SessionMetadata = {},
  existingTokenId?: string,
) {
  const refreshToken = signRefreshToken(user.id, user)
  const refreshTokenHash = await hash(refreshToken, 10)
  const now = new Date()
  const cleanMetadata = compactMetadata(metadata)

  await prisma.token.deleteMany({
    where: { userId: user.id, OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }] },
  })

  const reusable = existingTokenId
    ? await prisma.token.findFirst({ where: { id: existingTokenId, userId: user.id, revokedAt: null } })
    : cleanMetadata.deviceKey
      ? await prisma.token.findFirst({ where: { userId: user.id, deviceKey: cleanMetadata.deviceKey, revokedAt: null } })
      : null

  const token = reusable
    ? await prisma.token.update({
        where: { id: reusable.id },
        data: { refreshToken: refreshTokenHash, expiresAt: getRefreshExpiry(), lastSeenAt: now, ...cleanMetadata },
      })
    : await prisma.token.create({
        data: {
          expiresAt: getRefreshExpiry(),
          refreshToken: refreshTokenHash,
          lastSeenAt: now,
          ...cleanMetadata,
          user: { connect: { id: user.id } },
        },
      })

  const excess = await prisma.token.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { lastSeenAt: 'desc' },
    skip: 20,
    select: { id: true },
  })
  if (excess.length) await prisma.token.deleteMany({ where: { id: { in: excess.map(({ id }) => id) } } })

  const accessToken = signAccessToken(user.id, user, token.id)
  return { accessToken, refreshToken, tokenId: token.id, accessTokenExpires: getAccessExpiry(), user }
}

export async function signInWithEmailPassword(
  prisma: PrismaClient,
  email: string,
  password: string,
  metadata: SessionMetadata = {},
) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash))
    throw createUnauthorizedError('Invalid credentials')
  return createSession(user, prisma, metadata)
}

export async function refreshUserSession(
  prisma: PrismaClient,
  refreshToken: string,
  metadata: SessionMetadata = {},
) {
  try {
    const userId = getUserIdFromRefreshToken(refreshToken)
    const persistedTokens = await prisma.token.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: dayjs().toDate() } },
      orderBy: { lastSeenAt: 'desc' },
    })
    let matchingToken: (typeof persistedTokens)[number] | null = null
    for (const token of persistedTokens) {
      if (await bcrypt.compare(refreshToken, token.refreshToken)) {
        matchingToken = token
        break
      }
    }
    if (!matchingToken) throw createUnauthorizedError('Invalid refresh token')
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw createUnauthorizedError('Invalid refresh token')
    return createSession(user, prisma, { ...metadata, deviceKey: matchingToken.deviceKey }, matchingToken.id)
  } catch (error) {
    if (error instanceof GraphQLError) throw error
    throw createUnauthorizedError('Invalid refresh token')
  }
}

export async function logoutUser(prisma: PrismaClient, userId: number, tokenId?: string | null) {
  if (tokenId)
    await prisma.token.updateMany({ where: { id: tokenId, userId }, data: { revokedAt: new Date() } })
  else
    await prisma.token.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
  return true
}

export async function revokeUserSession(prisma: PrismaClient, userId: number, tokenId: string) {
  const result = await prisma.token.updateMany({
    where: { id: tokenId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  if (!result.count) throw createBadRequestError('Session not found')
  return true
}

export async function revokeOtherUserSessions(prisma: PrismaClient, userId: number, currentTokenId: string) {
  await prisma.token.updateMany({
    where: { userId, id: { not: currentTokenId }, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return true
}

export function ensureEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    throw createBadRequestError('Invalid email address')
  return normalizedEmail
}

export const EMAIL_ALREADY_IN_USE = 'EMAIL_ALREADY_IN_USE'

export async function ensureEmailAvailable(
  prisma: PrismaClient,
  email: string,
  excludeUserId?: number,
) {
  const normalizedEmail = ensureEmail(email)
  const existingUser = await prisma.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: 'insensitive' },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  })
  if (existingUser) throw createBadRequestError(EMAIL_ALREADY_IN_USE)
  return normalizedEmail
}

export function throwAccountWriteError(error: unknown, fallbackMessage: string): never {
  if (error instanceof GraphQLError) throw error
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')
    throw createBadRequestError(EMAIL_ALREADY_IN_USE)
  throw createBadRequestError(fallbackMessage)
}
