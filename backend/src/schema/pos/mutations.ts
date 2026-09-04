// @ts-nocheck
import { arg, extendType, floatArg, nonNull, stringArg } from 'nexus'
import { GraphQLError } from 'graphql'
import { Context } from '../../context'
import { getUserId } from '../../utils'
import { attachDeviceToStore } from '../../modules/store-network/service'

function buildSaleNumber(partnerId: number) {
  return `POS-${partnerId}-${Date.now()}`
}

async function assertPartner(ctx: Context, userId: number) {
  const partner = await ctx.prisma.partner.findUnique({ where: { userId } })
  if (!partner) throw new GraphQLError('PARTNER_REQUIRED')
  return partner
}

const Mutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('registerDevice', {
      type: 'Device',
      args: {
        deviceKey: nonNull(stringArg()),
        platform: nonNull(arg({ type: 'Platform' })),
        name: stringArg(),
        appVersion: stringArg(),
        storeId: stringArg(),
      },
      resolve: async (_parent, args: any, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)

        const existingDevice = await ctx.prisma.device.findUnique({ where: { deviceKey: args.deviceKey } })
        if (existingDevice && existingDevice.partnerId !== partnerId) {
          throw new GraphQLError('DEVICE_ALREADY_REGISTERED_TO_ANOTHER_PARTNER')
        }
        if (existingDevice?.revokedAt) {
          throw new GraphQLError('POS_DEVICE_REVOKED')
        }

        const device = await ctx.prisma.device.upsert({
          where: { deviceKey: args.deviceKey },
          create: {
            deviceKey: args.deviceKey,
            partnerId,
            platform: args.platform,
            name: args.name ?? undefined,
            appVersion: args.appVersion ?? undefined,
            lastSyncAt: new Date(),
          },
          update: {
            platform: args.platform,
            name: args.name ?? undefined,
            appVersion: args.appVersion ?? undefined,
            lastSyncAt: new Date(),
          },
        })
        await attachDeviceToStore(ctx.prisma, partnerId, device, args.storeId)
        return device
      },
    })

    t.field('createSale', {
      type: 'Sale',
      args: {
        data: nonNull(arg({ type: 'CreateSaleInput' })),
      },
      resolve: async (_parent, { data }: any, ctx: Context) => {
        const partnerId = getUserId(ctx)
        const partner = await assertPartner(ctx, partnerId)

        if (!data.items?.length) throw new GraphQLError('SALE_ITEMS_REQUIRED')

        const saleNumber = data.saleNumber ?? buildSaleNumber(partnerId)
        const existingSale = await ctx.prisma.sale.findUnique({ where: { saleNumber } })
        if (existingSale) return existingSale

        const productIds = data.items.map((item: any) => item.productId)

        return ctx.prisma.$transaction(async (tx) => {
          const products = await tx.product.findMany({
            where: { id: { in: productIds }, partnerId, isActive: true, isVisibleInPos: true },
            include: { variant: { include: { product: true } } },
          })

          const subtotal = data.items.reduce((sum: number, item: any) => {
            const product = products.find((entry) => entry.id === item.productId)
            if (!product) throw new GraphQLError('PRODUCT_NOT_FOUND')
            if (!product.available) throw new GraphQLError('PRODUCT_UNAVAILABLE')
            if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new GraphQLError('INVALID_QUANTITY')
            if (product.trackInventory && product.stock < item.quantity) throw new GraphQLError('INSUFFICIENT_STOCK')

            const unitPrice = item.unitPrice ?? product.price
            return sum + unitPrice * item.quantity - (item.discount ?? 0) + (item.tax ?? 0)
          }, 0)

          const discountTotal = data.discountTotal ?? 0
          const taxTotal = data.taxTotal ?? 0
          const total = Math.max(0, subtotal - discountTotal + taxTotal)
          const costTotal = data.items.reduce((sum: number, item: any) => {
            const product = products.find((entry) => entry.id === item.productId)
            return sum + (product?.costPrice ?? 0) * item.quantity
          }, 0)
          const grossProfit = total - taxTotal - costTotal
          const percentageFee = partner.feeType === 'PERCENTAGE' || partner.feeType === 'MIXED' ? total * (partner.feeRate / 100) : 0
          const fixedFee = partner.feeType === 'FIXED' || partner.feeType === 'MIXED' ? partner.fixedFee : 0
          const partnerFee = percentageFee + fixedFee
          const netProfit = grossProfit - partnerFee
          const paymentAmount = data.payment?.amount ?? total

          const sale = await tx.sale.create({
            data: {
              saleNumber,
              partnerId,
              deviceId: data.deviceId ?? undefined,
              cashierId: partnerId,
              customerName: data.customerName ?? undefined,
              note: data.note ?? undefined,
              subtotal,
              discountTotal,
              taxTotal,
              total,
              costTotal,
              grossProfit,
              partnerFee,
              netProfit,
              completedAt: new Date(),
              items: {
                create: data.items.map((item: any) => {
                  const product = products.find((entry) => entry.id === item.productId)
                  if (!product) throw new GraphQLError('PRODUCT_NOT_FOUND')

                  const unitPrice = item.unitPrice ?? product.price
                  const discount = item.discount ?? 0
                  const tax = item.tax ?? 0

                  return {
                    productId: product.id,
                    quantity: item.quantity,
                    unitPrice,
                    discount,
                    tax,
                    total: unitPrice * item.quantity - discount + tax,
                    costPrice: product.costPrice ?? 0,
                    profit: unitPrice * item.quantity - discount - (product.costPrice ?? 0) * item.quantity,
                    productName: product.customName ?? product.variant.product.name,
                    variantName: product.variant.name,
                  }
                }),
              },
              payments: {
                create: {
                  method: data.payment?.method ?? 'CASH',
                  amount: paymentAmount,
                  reference: data.payment?.reference ?? undefined,
                },
              },
            },
          })

          for (const item of data.items) {
            const product = products.find((entry) => entry.id === item.productId)
            if (!product) throw new GraphQLError('PRODUCT_NOT_FOUND')

            if (product.trackInventory) {
              const stockAfter = product.stock - item.quantity
              await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: item.quantity } } })
              await tx.stockMovement.create({
                data: { productId: product.id, partnerId, userId: partnerId, saleId: sale.id, type: 'SALE', quantityDelta: -item.quantity, stockBefore: product.stock, stockAfter, reason: `POS sale ${sale.saleNumber}`, reference: sale.saleNumber },
              })
            }
          }

          if ((data.payment?.method ?? 'CASH') === 'CASH') {
            const openCashSession = await tx.cashSession.findFirst({
              where: {
                partnerId,
                deviceId: data.deviceId ?? undefined,
                status: 'OPEN',
              },
              orderBy: { openedAt: 'desc' },
            })

            if (openCashSession) {
              await tx.cashSession.update({
                where: { id: openCashSession.id },
                data: { expectedCash: { increment: paymentAmount } },
              })
            }
          }

          await tx.auditLog.create({
            data: {
              actorId: partnerId,
              partnerId,
              action: 'CREATE_SALE',
              entity: 'Sale',
              entityId: sale.id,
              after: { saleNumber, total },
            },
          })

          return sale
        })
      },
    })

    t.field('openCashSession', {
      type: 'CashSession',
      args: {
        deviceId: stringArg(),
        openingAmount: floatArg(),
        note: stringArg(),
      },
      resolve: async (_parent, args, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)

        const openSession = await ctx.prisma.cashSession.findFirst({
          where: {
            partnerId,
            deviceId: args.deviceId ?? undefined,
            status: 'OPEN',
          },
        })
        if (openSession) return openSession

        return ctx.prisma.cashSession.create({
          data: {
            partnerId,
            deviceId: args.deviceId ?? undefined,
            openedById: partnerId,
            openingAmount: args.openingAmount ?? 0,
            expectedCash: args.openingAmount ?? 0,
            note: args.note ?? undefined,
          },
        })
      },
    })

    t.field('closeCashSession', {
      type: 'CashSession',
      args: {
        id: nonNull(stringArg()),
        countedCash: nonNull(floatArg()),
        note: stringArg(),
      },
      resolve: async (_parent, args, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)

        const session = await ctx.prisma.cashSession.findFirst({
          where: { id: args.id, partnerId, status: 'OPEN' },
        })
        if (!session) throw new GraphQLError('OPEN_CASH_SESSION_NOT_FOUND')

        return ctx.prisma.cashSession.update({
          where: { id: session.id },
          data: {
            status: 'CLOSED',
            closedById: partnerId,
            countedCash: args.countedCash,
            difference: args.countedCash - session.expectedCash,
            note: args.note ?? session.note,
            closedAt: new Date(),
          },
        })
      },
    })

    t.field('recordSyncEvent', {
      type: 'SyncEvent',
      args: {
        deviceId: stringArg(),
        idempotencyKey: nonNull(stringArg()),
        entity: nonNull(stringArg()),
        action: nonNull(arg({ type: 'SyncEventAction' })),
        payload: nonNull(stringArg()),
      },
      resolve: async (_parent, args: any, ctx: Context) => {
        const partnerId = getUserId(ctx)
        await assertPartner(ctx, partnerId)

        return ctx.prisma.syncEvent.upsert({
          where: {
            partnerId_idempotencyKey: {
              partnerId,
              idempotencyKey: args.idempotencyKey,
            },
          },
          create: {
            partnerId,
            deviceId: args.deviceId ?? undefined,
            idempotencyKey: args.idempotencyKey,
            entity: args.entity,
            action: args.action,
            payload: JSON.parse(args.payload),
          },
          update: {},
        })
      },
    })
  },
})

export default Mutation
