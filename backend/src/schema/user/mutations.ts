import { extendType, nonNull, stringArg } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'
import {
  logoutUser,
  refreshUserSession,
  revokeOtherUserSessions,
  revokeUserSession,
  signInWithEmailPassword,
} from '../../application/auth/auth.service'

function header(context: Context, name: string) {
  const headers = context.req.headers
  if (!headers) return undefined
  if ('get' in headers && typeof headers.get === 'function') return headers.get(name) ?? undefined
  const value = (headers as Record<string, string | string[] | undefined>)[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

function requestMetadata(context: Context, input: { deviceKey?: string | null; deviceName?: string | null; platform?: string | null; appVersion?: string | null }) {
  return {
    deviceKey: input.deviceKey,
    deviceName: input.deviceName,
    platform: input.platform,
    appVersion: input.appVersion,
    userAgent: header(context, 'user-agent'),
    ipAddress: header(context, 'x-forwarded-for')?.split(',')[0]?.trim() || header(context, 'x-real-ip'),
  }
}

const Mutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('signIn', {
      type: 'AuthPayload',
      args: {
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
        deviceKey: stringArg(),
        deviceName: stringArg(),
        platform: stringArg(),
        appVersion: stringArg(),
      },
      resolve: async (_parent, args, context: Context) => {
        return signInWithEmailPassword(context.prisma, args.email, args.password, requestMetadata(context, args))
      },
    })

    t.boolean('logout', {
      args: { tokenId: stringArg() },
      resolve: async (_parent, { tokenId }, context: Context) => {
        const userId = getUserId(context)
        return logoutUser(context.prisma, userId, tokenId)
      },
    })

    t.field('refreshToken', {
      type: 'AuthPayload',
      args: {
        data: nonNull(stringArg()),
      },
      resolve: async (_parent, { data }, ctx: Context) => {
        return refreshUserSession(ctx.prisma, data, requestMetadata(ctx, {}))
      },
    })

    t.nonNull.boolean('revokeSession', {
      args: { tokenId: nonNull(stringArg()) },
      resolve: async (_parent, { tokenId }, context: Context) =>
        revokeUserSession(context.prisma, getUserId(context), tokenId),
    })

    t.nonNull.boolean('revokeOtherSessions', {
      args: { currentTokenId: nonNull(stringArg()) },
      resolve: async (_parent, { currentTokenId }, context: Context) =>
        revokeOtherUserSessions(context.prisma, getUserId(context), currentTokenId),
    })
  },
})

export default Mutation
