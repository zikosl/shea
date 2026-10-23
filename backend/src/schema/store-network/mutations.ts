// @ts-nocheck
import { arg, booleanArg, extendType, intArg, nonNull, stringArg } from 'nexus'
import { GraphQLError } from 'graphql'
import { getUserId } from '../../utils'
import { issueGatewayToken, normalizeGatewayUrl } from '../../modules/store-network/service'

const normalizeCode = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')

export default extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('authorizePosDeviceTransfer', {
      type: 'AdminPosDevice',
      args: { deviceId: nonNull(stringArg()), targetPartnerId: nonNull(intArg()) },
      resolve: async (_parent, { deviceId, targetPartnerId }, ctx) => {
        const [device, target] = await Promise.all([
          ctx.prisma.device.findFirst({ where: { id: deviceId, platform: 'DESKTOP', revokedAt: null }, include: { partner: true, storeTerminal: { include: { store: true } } } }),
          ctx.prisma.partner.findUnique({ where: { userId: targetPartnerId } }),
        ])
        if (!device) throw new GraphQLError('POS_DEVICE_NOT_FOUND_OR_REVOKED')
        if (!target) throw new GraphQLError('TRANSFER_TARGET_PARTNER_NOT_FOUND')
        if (device.partnerId === targetPartnerId) throw new GraphQLError('TRANSFER_TARGET_IS_CURRENT_PARTNER')

        const authorizedAt = new Date()
        await ctx.prisma.$transaction([
          ctx.prisma.device.update({ where: { id: device.id }, data: { transferTargetPartnerId: targetPartnerId, transferAuthorizedAt: authorizedAt } }),
          ctx.prisma.auditLog.create({ data: {
            actorId: getUserId(ctx), partnerId: device.partnerId, action: 'AUTHORIZE_POS_DEVICE_TRANSFER', entity: 'Device', entityId: device.id,
            before: { transferTargetPartnerId: device.transferTargetPartnerId }, after: { transferTargetPartnerId: targetPartnerId, transferAuthorizedAt: authorizedAt.toISOString() },
          } }),
        ])
        return { ...device, transferTargetPartnerId: targetPartnerId, transferAuthorizedAt: authorizedAt, partnerName: device.partner.companyName, storeName: device.storeTerminal?.store.name ?? null }
      },
    })

    t.nonNull.field('cancelPosDeviceTransfer', {
      type: 'Boolean',
      args: { deviceId: nonNull(stringArg()) },
      resolve: async (_parent, { deviceId }, ctx) => {
        const device = await ctx.prisma.device.findFirst({ where: { id: deviceId, platform: 'DESKTOP', revokedAt: null } })
        if (!device) throw new GraphQLError('POS_DEVICE_NOT_FOUND_OR_REVOKED')
        if (!device.transferTargetPartnerId) return true
        await ctx.prisma.$transaction([
          ctx.prisma.device.update({ where: { id: device.id }, data: { transferTargetPartnerId: null, transferAuthorizedAt: null } }),
          ctx.prisma.auditLog.create({ data: {
            actorId: getUserId(ctx), partnerId: device.partnerId, action: 'CANCEL_POS_DEVICE_TRANSFER', entity: 'Device', entityId: device.id,
            before: { transferTargetPartnerId: device.transferTargetPartnerId }, after: { transferTargetPartnerId: null },
          } }),
        ])
        return true
      },
    })

    t.nonNull.field('completePosDeviceTransfer', {
      type: 'Boolean',
      args: { deviceKey: nonNull(stringArg()) },
      resolve: async (_parent, { deviceKey }, ctx) => {
        const partnerId = getUserId(ctx)
        const device = await ctx.prisma.device.findFirst({ where: { deviceKey, platform: 'DESKTOP', revokedAt: null, transferTargetPartnerId: partnerId, transferAuthorizedAt: { not: null } } })
        if (!device) throw new GraphQLError('POS_DEVICE_TRANSFER_NOT_AUTHORIZED')
        const now = new Date()
        await ctx.prisma.$transaction(async (tx) => {
          const result = await tx.device.updateMany({
            where: { id: device.id, revokedAt: null, transferTargetPartnerId: partnerId, transferAuthorizedAt: { not: null } },
            data: { revokedAt: now, transferTargetPartnerId: null, transferAuthorizedAt: null },
          })
          if (!result.count) throw new GraphQLError('POS_DEVICE_TRANSFER_NOT_AUTHORIZED')
          await tx.storeTerminal.updateMany({ where: { deviceId: device.id }, data: { status: 'REVOKED' } })
          await tx.auditLog.create({ data: {
            actorId: partnerId, partnerId: device.partnerId, action: 'COMPLETE_POS_DEVICE_TRANSFER', entity: 'Device', entityId: device.id,
            before: { partnerId: device.partnerId, name: device.name }, after: { transferTargetPartnerId: partnerId, revokedAt: now.toISOString() },
          } })
        })
        return true
      },
    })

    t.nonNull.field('createStore', {
      type: 'Store',
      args: { name: nonNull(stringArg()), code: nonNull(stringArg()), timezone: stringArg() },
      resolve: async (_parent, args, ctx) => {
        const partnerId = getUserId(ctx)
        const code = normalizeCode(args.code)
        if (!code || code.length > 40) throw new GraphQLError('INVALID_STORE_CODE')
        const name = args.name.trim()
        if (!name || name.length > 120) throw new GraphQLError('INVALID_STORE_NAME')
        return ctx.prisma.store.create({
          data: { partnerId, name, code, timezone: args.timezone?.trim() || 'Africa/Algiers' },
        })
      },
    })

    t.nonNull.field('setStoreDeploymentMode', {
      type: 'Store',
      args: { storeId: nonNull(stringArg()), mode: nonNull(arg({ type: 'StoreDeploymentMode' })) },
      resolve: async (_parent, { storeId, mode }, ctx) => {
        const partnerId = getUserId(ctx)
        const store = await ctx.prisma.store.findFirst({ where: { id: storeId, partnerId } })
        if (!store) throw new GraphQLError('STORE_NOT_FOUND')
        return ctx.prisma.store.update({
          where: { id: store.id },
          data: {
            deploymentMode: mode,
            ...(mode === 'SOLO' ? { gatewayLastSeenAt: null } : {}),
          },
        })
      },
    })

    t.nonNull.field('configureStoreNetwork', {
      type: 'Store',
      args: {
        storeId: nonNull(stringArg()),
        cloudSyncEnabled: nonNull(booleanArg()),
        cloudGatewayUrl: stringArg(),
        localGatewayUrl: stringArg(),
      },
      resolve: async (_parent, args, ctx) => {
        const store = await ctx.prisma.store.findUnique({ where: { id: args.storeId } })
        if (!store) throw new GraphQLError('STORE_NOT_FOUND')
        const cloudGatewayUrl = args.cloudSyncEnabled ? normalizeGatewayUrl(args.cloudGatewayUrl) : null
        if (args.cloudSyncEnabled && !cloudGatewayUrl) throw new GraphQLError('CLOUD_GATEWAY_URL_REQUIRED')
        return ctx.prisma.store.update({
          where: { id: store.id },
          data: {
            cloudSyncEnabled: args.cloudSyncEnabled,
            cloudGatewayUrl,
            localGatewayUrl: args.localGatewayUrl?.trim() || null,
            ...(!args.cloudSyncEnabled ? { gatewayProvisionedAt: null, gatewayLastSeenAt: null } : {}),
          },
        })
      },
    })

    t.nonNull.field('provisionStoreGateway', {
      type: 'StoreGatewayCredential',
      args: { storeId: nonNull(stringArg()) },
      resolve: async (_parent, { storeId }, ctx) => {
        const partnerId = getUserId(ctx)
        try {
          return await issueGatewayToken(ctx.prisma, storeId, partnerId)
        } catch (error) {
          throw new GraphQLError(error instanceof Error ? error.message : 'GATEWAY_PROVISION_FAILED')
        }
      },
    })

    t.nonNull.field('revokeStoreTerminal', {
      type: 'StoreTerminal',
      args: { terminalId: nonNull(stringArg()) },
      resolve: async (_parent, { terminalId }, ctx) => {
        const partnerId = getUserId(ctx)
        const terminal = await ctx.prisma.storeTerminal.findFirst({
          where: { id: terminalId, store: { partnerId } },
        })
        if (!terminal) throw new GraphQLError('TERMINAL_NOT_FOUND')
        if (terminal.deviceId) {
          await ctx.prisma.device.update({ where: { id: terminal.deviceId }, data: { revokedAt: new Date() } })
        }
        return ctx.prisma.storeTerminal.update({
          where: { id: terminal.id },
          data: { status: 'REVOKED' },
        })
      },
    })
  },
})
