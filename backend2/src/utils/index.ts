import { PrismaClient } from '@prisma/client'
import { Context } from '../context'
import {
  getOptionalUserIdFromRequest,
  getRequiredUserIdFromRequest,
  getUserIdFromRefreshToken,
} from '../core/auth/current-user'
import { createSession } from '../application/auth/auth.service'

export async function checkUser(
  context: Context,
): Promise<'CLIENT' | 'PARTNER' | 'DRIVER' | 'ADMIN' | undefined> {
  const id = getRequiredUserIdFromRequest(context.req)
  const user = await context.prisma.user.findUnique({
    where: { id },
    include: {
      client: true,
      partner: true,
      driver: true,
      admin: true,
    },
  })

  if (user?.client) return 'CLIENT'
  if (user?.partner) return 'PARTNER'
  if (user?.driver) return 'DRIVER'
  if (user?.admin) return 'ADMIN'
  return undefined
}

export function getUserId(context: Context) {
  return getRequiredUserIdFromRequest(context.req)
}

export function getUserIdByToken(token: string) {
  return getUserIdFromRefreshToken(token)
}

export async function handleSignIn(user: any, prisma: PrismaClient) {
  return createSession(user, prisma)
}

export function getOptionalUserId(context: Context) {
  return getOptionalUserIdFromRequest(context.req)
}
