import { createHash } from 'node:crypto'
import { GraphQLError } from 'graphql'
import { extendType, nonNull, objectType, stringArg } from 'nexus'
import { Context } from '../../context'
import { normalizeTestFlightEmail } from '../../modules/testflight/validation'
import { redis } from '../../servers'
import { getUserId } from '../../utils'

async function reserveRequestBudget(email: string): Promise<void> {
  if (redis.status !== 'ready') throw new GraphQLError('TESTFLIGHT_REQUEST_UNAVAILABLE')
  const hour = Math.floor(Date.now() / 3_600_000)
  const day = Math.floor(Date.now() / 86_400_000)
  const emailHash = createHash('sha256').update(email).digest('hex')
  const script = "local a=redis.call('INCR',KEYS[1]); if a==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; local b=redis.call('INCR',KEYS[2]); if b==1 then redis.call('PEXPIRE',KEYS[2],ARGV[2]) end; if a>tonumber(ARGV[3]) or b>tonumber(ARGV[4]) then return 0 end; return 1"
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const allowed = await Promise.race([
      redis.eval(script, 2, `shea:testflight:global:${hour}`, `shea:testflight:email:${emailHash}:${day}`, 3_600_000, 86_400_000, 300, 3),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('RATE_LIMIT_TIMEOUT')), 750) }),
    ])
    if (Number(allowed) !== 1) throw new GraphQLError('TESTFLIGHT_REQUEST_RATE_LIMITED')
  } catch (error) {
    if (error instanceof GraphQLError) throw error
    throw new GraphQLError('TESTFLIGHT_REQUEST_UNAVAILABLE')
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const TestFlightRequest = objectType({
  name: 'TestFlightInviteRequest',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.string('email')
    t.nonNull.string('status')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.field('invitedAt', { type: 'DateTime' })
  },
})

const Query = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('adminTestFlightRequests', {
      type: TestFlightRequest,
      resolve: async (_parent, _args, ctx: Context) => {
        const [waiting, invited] = await Promise.all([
          ctx.prisma.testFlightRequest.findMany({ where: { status: 'REQUESTED' }, orderBy: { createdAt: 'desc' }, take: 200 }),
          ctx.prisma.testFlightRequest.findMany({ where: { status: 'INVITED' }, orderBy: { invitedAt: 'desc' }, take: 100 }),
        ])
        return [...waiting, ...invited]
      },
    })
  },
})

const Mutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.boolean('requestTestFlightInvite', {
      args: { email: nonNull(stringArg()) },
      resolve: async (_parent, { email }, ctx: Context) => {
        const normalized = normalizeTestFlightEmail(email)
        await reserveRequestBudget(normalized)
        await ctx.prisma.testFlightRequest.upsert({
          where: { email: normalized },
          create: { email: normalized },
          update: {},
        })
        return true
      },
    })
    t.nonNull.field('markTestFlightInvitationSent', {
      type: TestFlightRequest,
      args: { id: nonNull(stringArg()) },
      resolve: async (_parent, { id }, ctx: Context) => ctx.prisma.$transaction(async (tx) => {
        const request = await tx.testFlightRequest.findUnique({ where: { id } })
        if (!request) throw new GraphQLError('TESTFLIGHT_REQUEST_NOT_FOUND')
        if (request.status === 'INVITED') return request
        const updated = await tx.testFlightRequest.update({ where: { id }, data: { status: 'INVITED', invitedAt: new Date() } })
        await tx.auditLog.create({ data: { actorId: getUserId(ctx), action: 'TESTFLIGHT_INVITATION_SENT', entity: 'TestFlightRequest', entityId: id } })
        return updated
      }),
    })
  },
})

export default [TestFlightRequest, Query, Mutation]
