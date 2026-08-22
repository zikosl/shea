import { enumType, objectType } from 'nexus'

const Log = objectType({
  name: 'Log',
  definition(t) {
    t.nonNull.int('id')
    t.string('title')
    t.string('body')
    t.string('title_ar')
    t.boolean('read')
    t.string('body_ar')
    t.field('type', { type: 'LogStatus' })
    t.field('date', { type: 'DateTime', resolve: () => new Date() })
    t.int('userId')
    t.field('user', {
      type: 'User',
      resolve: async (parent, _args, ctx) => {
        return ctx.prisma.user.findUnique({
          where: { id: parent.userId ?? undefined },
        })
      },
    })
  },
})

const LogStatus = enumType({
  name: 'LogStatus',
  members: {
    ORDER_UPDATE: 0,
    NEW_PRODUCT: 1,
    NEW_PARTNER: 2,
  },
})

const QueryOrder = enumType({
  name: 'QueryOrder',
  members: ['asc', 'desc'],
})

export default { Log, LogStatus, QueryOrder }
