// @ts-nocheck
import { arg, booleanArg, extendType, intArg, nonNull, stringArg } from 'nexus'
import { GraphQLError } from 'graphql'
import { Context } from '../../context'
import { getUserId } from '../../utils'
import { CapabilityCode } from '@prisma/client'
import { effectiveCapabilities } from '../../modules/capabilities/service'
import { giftOrderInclude } from '../../modules/gift-store/service'

async function assertPartner(ctx: Context, userId: number) {
  const partner = await ctx.prisma.partner.findUnique({ where: { userId } })
  if (!partner) throw new GraphQLError('PARTNER_REQUIRED')
  return partner
}

const Query = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.field('posBootstrap', {
      type: 'PosBootstrap',
      args: { deviceKey: nonNull(stringArg()) },
      resolve: async (_parent, { deviceKey }, ctx: Context) => {
        const partnerId = getUserId(ctx)
        const partner = await ctx.prisma.partner.findUnique({
          where: { userId: partnerId },
          include: { partnerNiches: true },
        })
        if (!partner) throw new GraphQLError('PARTNER_REQUIRED')

        const device = await ctx.prisma.device.findFirst({ where: { deviceKey, partnerId } })
        if (!device) throw new GraphQLError('POS_DEVICE_NOT_REGISTERED')
        if (device.revokedAt) throw new GraphQLError('POS_DEVICE_REVOKED')

        const nicheIds = partner.partnerNiches
          .map((entry) => entry.niche_id)
          .filter((id): id is number => typeof id === 'number')
        const catalogScope = nicheIds.length ? { niche_id: { in: nicheIds } } : { id: { equals: -1 } }

        const capabilities = await effectiveCapabilities(ctx.prisma, partnerId)
        const enabledCapabilities = capabilities.filter((entry) => entry.enabled).map((entry) => entry.code)
        const hasCapability = (code: CapabilityCode) => enabledCapabilities.includes(code)

        const [niches, categories, productTypes, brands, templates, products, proposals, productRequests, orders, openCashSession, customOrders, giftTemplates] = await Promise.all([
          ctx.prisma.niche.findMany({ where: { id: { in: nicheIds } }, orderBy: { name: 'asc' } }),
          ctx.prisma.category.findMany({ where: catalogScope, orderBy: { name: 'asc' } }),
          ctx.prisma.productType.findMany({ where: { category: catalogScope }, orderBy: { name: 'asc' } }),
          ctx.prisma.brand.findMany({ where: { niche_id: { in: nicheIds } }, orderBy: { name: 'asc' } }),
          ctx.prisma.productTemplate.findMany({
            where: { category: catalogScope },
            include: {
              category: true,
              productType: true,
              Brand: true,
              images: true,
              variants: { include: { tags: true, images: true } },
            },
            orderBy: { name: 'asc' },
          }),
          ctx.prisma.product.findMany({
            where: { partnerId },
            include: { variant: { include: { tags: true, images: true, product: { include: { images: true } } } } },
            orderBy: { id: 'asc' },
          }),
          ctx.prisma.catalogProposal.findMany({ where: { partnerId }, orderBy: { createdAt: 'desc' } }),
          ctx.prisma.productTemplateRequest.findMany({
            where: { partnerId, posLocalId: { not: null } },
            include: { variants: true },
            orderBy: { createdAt: 'desc' },
          }),
          ctx.prisma.order.findMany({
            where: { partnerId },
            include: { items: true, delivery: true, address: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
          }),
          ctx.prisma.cashSession.findFirst({ where: { partnerId, deviceId: device.id, status: 'OPEN' }, orderBy: { openedAt: 'desc' } }),
          hasCapability(CapabilityCode.CUSTOM_ORDERS)
            ? ctx.prisma.customOrder.findMany({
                where: { partnerId, status: { notIn: ['FULFILLED', 'CANCELLED'] } },
                include: giftOrderInclude,
                orderBy: { updatedAt: 'desc' },
              })
            : [],
          hasCapability(CapabilityCode.GIFT_TEMPLATES)
            ? ctx.prisma.giftTemplate.findMany({
                where: { partnerId, active: true },
                include: { items: { orderBy: { sortOrder: 'asc' } } },
                orderBy: { name: 'asc' },
              })
            : [],
        ])

        const generatedAt = new Date()
        const offlineUntil = new Date(generatedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
        await ctx.prisma.device.update({ where: { id: device.id }, data: { lastSyncAt: generatedAt } })

        return {
          cursor: generatedAt.toISOString(),
          generatedAt,
          offlineUntil,
          payload: JSON.stringify({
            schemaVersion: 2,
            partner: {
              userId: partner.userId,
              companyName: partner.companyName,
              avatar: partner.avatar,
              feeType: partner.feeType,
              feeRate: partner.feeRate,
              fixedFee: partner.fixedFee,
              capabilities: enabledCapabilities,
            },
            device: { id: device.id, deviceKey: device.deviceKey, name: device.name },
            catalog: { niches, categories, productTypes, brands, templates },
            products,
            proposals,
            productRequests,
            orders,
            openCashSession,
            extensions: {
              giftStore: hasCapability(CapabilityCode.CUSTOM_ORDERS)
                ? { orders: customOrders, templates: giftTemplates }
                : null,
            },
          }),
        }
      },
    })

    t.nonNull.list.nonNull.field('listDevices', {
      type: 'Device',
      resolve: async (_parent, _args, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.device.findMany({ where: { partnerId }, orderBy: { createdAt: 'desc' } })
      },
    })

    t.nonNull.list.nonNull.field('listSales', {
      type: 'Sale',
      args: {
        status: arg({ type: 'SaleStatus' }),
        page: intArg(),
        limit: intArg(),
      },
      resolve: async (_parent, { status, page = 1, limit = 25 }: any, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.sale.findMany({
          where: { partnerId, status: status ?? undefined },
          take: limit,
          skip: limit * (page - 1),
          orderBy: { createdAt: 'desc' },
        })
      },
    })

    t.field('getSale', {
      type: 'Sale',
      args: {
        id: nonNull(stringArg()),
      },
      resolve: async (_parent, { id }, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.sale.findFirst({ where: { id, partnerId } })
      },
    })

    t.nonNull.list.nonNull.field('listStockMovements', {
      type: 'StockMovement',
      args: {
        productId: intArg(),
        type: arg({ type: 'StockMovementType' }),
        page: intArg(),
        limit: intArg(),
      },
      resolve: async (_parent, { productId, type, page = 1, limit = 25 }: any, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.stockMovement.findMany({
          where: {
            partnerId,
            productId: productId ?? undefined,
            type: type ?? undefined,
          },
          take: limit,
          skip: limit * (page - 1),
          orderBy: { createdAt: 'desc' },
        })
      },
    })

    t.nonNull.list.nonNull.field('listCashSessions', {
      type: 'CashSession',
      args: {
        isOpen: booleanArg(),
        deviceId: stringArg(),
      },
      resolve: async (_parent, { isOpen, deviceId }, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.cashSession.findMany({
          where: {
            partnerId,
            deviceId: deviceId ?? undefined,
            status: isOpen === undefined || isOpen === null ? undefined : isOpen ? 'OPEN' : 'CLOSED',
          },
          orderBy: { openedAt: 'desc' },
        })
      },
    })

    t.nonNull.list.nonNull.field('listSyncEvents', {
      type: 'SyncEvent',
      args: {
        status: arg({ type: 'SyncEventStatus' }),
        deviceId: stringArg(),
        page: intArg(),
        limit: intArg(),
      },
      resolve: async (_parent, { status, deviceId, page = 1, limit = 25 }: any, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)
        return ctx.prisma.syncEvent.findMany({
          where: {
            partnerId,
            deviceId: deviceId ?? undefined,
            status: status ?? undefined,
          },
          take: limit,
          skip: limit * (page - 1),
          orderBy: { createdAt: 'desc' },
        })
      },
    })
  },
})

export default Query
