import { PrismaClient, User } from '@prisma/client'
import bcrypt, { hash } from 'bcryptjs'
import { GraphQLError } from 'graphql'
import {
  getAccessExpiry,
  getRefreshExpiry,
  signAccessToken,
  signRefreshToken,
} from '../../core/auth/token.service'
import { getUserIdFromRefreshToken } from '../../core/auth/current-user'
import { createBadRequestError, createUnauthorizedError } from '../../core/errors/app-error'

type AuthUser = Pick<User, 'id' | 'email' | 'phone' | 'role'>

export async function createSession(user: AuthUser, prisma: PrismaClient) {
  const refreshToken = signRefreshToken(user.id, user)
  const accessToken = signAccessToken(user.id, user)
  const refreshTokenHash = await hash(refreshToken, 10)

  await prisma.token.deleteMany({
    where: { userId: user.id },
  })

  const token = await prisma.token.create({
    data: {
      expiresAt: getRefreshExpiry(),
      refreshToken: refreshTokenHash,
      user: {
        connect: { id: user.id },
      },
    },
  })

  return {
    accessToken,
    refreshToken,
    tokenId: token.id,
    accessTokenExpires: getAccessExpiry(),
    user,
  }
}

export async function signInWithEmailPassword(
  prisma: PrismaClient,
  email: string,
  password: string,
) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user || !user.passwordHash) {
    throw createUnauthorizedError('Invalid credentials')
  }

  if (!bcrypt.compareSync(password, user.passwordHash)) {
    throw createUnauthorizedError('Invalid credentials')
  }

  return createSession(user, prisma)
}

export async function refreshUserSession(prisma: PrismaClient, refreshToken: string) {
  try {
    const userId = getUserIdFromRefreshToken(refreshToken)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw createUnauthorizedError('Invalid refresh token')
    }

    return createSession(user, prisma)
  } catch (error) {
    if (error instanceof GraphQLError) {
      throw error
    }

    throw createUnauthorizedError('Invalid refresh token')
  }
}

export async function logoutUser(prisma: PrismaClient, userId: number) {
  await prisma.token.deleteMany({
    where: { userId },
  })

  return true
}

export function ensureEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)

  if (!isValid) {
    throw createBadRequestError('Invalid email address')
  }

  return normalizedEmail
}
