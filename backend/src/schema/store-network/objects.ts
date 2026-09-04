// @ts-nocheck
import { enumType, objectType } from 'nexus'
import { cloudStoreStatus } from '../../modules/store-network/service'

const StoreDeploymentMode = enumType({ name: 'StoreDeploymentMode', members: ['SOLO', 'MULTI_POS'] })
const StoreStatus = enumType({ name: 'StoreStatus', members: ['ACTIVE', 'SUSPENDED'] })
const StoreTerminalStatus = enumType({ name: 'StoreTerminalStatus', members: ['ACTIVE', 'REVOKED'] })

const Store = objectType({
  name: 'Store',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.int('partnerId')
    t.nonNull.string('code')
    t.nonNull.string('name')
    t.nonNull.string('partnerName', {
      resolve: async (parent, _args, ctx) => {
        const partner = await ctx.prisma.partner.findUnique({ where: { userId: parent.partnerId } })
        return partner?.companyName || 'Unknown partner'
      },
    })
    t.nonNull.string('timezone')
    t.nonNull.field('deploymentMode', { type: 'StoreDeploymentMode' })
    t.nonNull.field('status', { type: 'StoreStatus' })
    t.nonNull.boolean('cloudSyncEnabled')
    t.string('cloudGatewayUrl')
    t.string('localGatewayUrl')
    t.field('gatewayProvisionedAt', { type: 'DateTime' })
    t.field('gatewayLastSeenAt', {
      type: 'DateTime',
      resolve: async (parent) => {
        if (!parent.cloudSyncEnabled) return null
        const status = await cloudStoreStatus(parent.cloudGatewayUrl, parent.id)
        return status?.gatewayLastSeenAt ? new Date(status.gatewayLastSeenAt) : parent.gatewayLastSeenAt
      },
    })
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
    t.nonNull.list.nonNull.field('terminals', {
      type: 'StoreTerminal',
      resolve: (parent, _args, ctx) => ctx.prisma.storeTerminal.findMany({
        where: { storeId: parent.id },
        orderBy: { createdAt: 'asc' },
      }),
    })
  },
})

const StoreTerminal = objectType({
  name: 'StoreTerminal',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.string('storeId')
    t.string('deviceId')
    t.nonNull.string('name')
    t.nonNull.field('status', { type: 'StoreTerminalStatus' })
    t.field('lastSeenAt', { type: 'DateTime' })
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
  },
})

const StoreGatewayCredential = objectType({
  name: 'StoreGatewayCredential',
  definition(t) {
    t.nonNull.string('storeId')
    t.nonNull.string('token')
    t.nonNull.string('cloudGatewayUrl')
    t.nonNull.field('issuedAt', { type: 'DateTime' })
  },
})

export default { StoreDeploymentMode, StoreStatus, StoreTerminalStatus, Store, StoreTerminal, StoreGatewayCredential }
