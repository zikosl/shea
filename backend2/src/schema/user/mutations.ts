import { extendType, nonNull, stringArg } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'
import {
  logoutUser,
  refreshUserSession,
  signInWithEmailPassword,
} from '../../application/auth/auth.service'

const Mutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('signIn', {
      type: 'AuthPayload',
      args: {
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      resolve: async (_parent, args, context: Context) => {
        return signInWithEmailPassword(context.prisma, args.email, args.password)
      },
    })

    t.boolean('logout', {
      resolve: async (_parent, _args, context: Context) => {
        const userId = getUserId(context)
        return logoutUser(context.prisma, userId)
      },
    })

    t.field('refreshToken', {
      type: 'AuthPayload',
      args: {
        data: nonNull(stringArg()),
      },
      resolve: async (_parent, { data }, ctx: Context) => {
        return refreshUserSession(ctx.prisma, data)
      },
    })
  },
})

export default Mutation
