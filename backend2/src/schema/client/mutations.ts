import { booleanArg, extendType, nonNull, stringArg } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'
import { sendOtp, updateClientProfile, verifyOtp } from '../../application/client/client.service'

const Mutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.boolean('sendOtp', {
      args: {
        phone: nonNull(stringArg()),
      },
      resolve: async (_parent, { phone }, context: Context) => {
        return sendOtp(context.prisma, phone)
      },
    })

    t.field('verifyOtp', {
      type: 'AuthPayload',
      args: {
        phone: nonNull(stringArg()),
        code: nonNull(stringArg()),
      },
      resolve: async (_parent, { phone, code }, context: Context) => {
        return verifyOtp(context.prisma, phone, code)
      },
    })

    t.field('updateClientProfile', {
      type: 'AuthPayload',
      args: {
        firstname: stringArg(),
        lastname: stringArg(),
        avatar: stringArg(),
        email: stringArg(),
        language: stringArg(),
        theme: booleanArg(),
      },
      resolve: async (_parent, args, context: Context) => {
        const userId = getUserId(context)
        return updateClientProfile(context.prisma, userId, args)
      },
    })
  },
})

export default Mutation
