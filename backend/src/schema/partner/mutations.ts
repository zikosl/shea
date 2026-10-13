// @ts-nocheck
import { nonNull, extendType, stringArg, intArg, booleanArg, floatArg, list, arg } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'
import {
  addPartnerNiches,
  createPartner,
  updatePartnerProfile,
  normalizePartnerPrimaryColor,
} from '../../application/partner/partner.service'
import { createBadRequestError } from '../../core/errors/app-error'
import {
    ensureEmailAvailable,
    throwAccountWriteError,
} from '../../application/auth/auth.service'
import { resetAccountAccessCode } from '../../application/auth/access-code.service'

export const PartnerMutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.nonNull.boolean('resetPartnerAccessCode', {
            args: { id: nonNull(intArg()) },
            resolve: async (_parent, { id }, ctx: Context) => resetAccountAccessCode(ctx.prisma, {
                actorId: getUserId(ctx),
                kind: 'PARTNER',
                profileId: id,
            }),
        })

        t.field('createPartner', {
            type: 'Partner',
            args: {
                email: nonNull(stringArg()),
                companyName: nonNull(stringArg()),
                niches: list(nonNull(intArg())),
                feeType: arg({ type: 'PartnerFeeType' }),
                feeRate: floatArg(),
                fixedFee: floatArg(),
                driverRequestFee: floatArg(),
                primaryColor: stringArg(),
            },
            resolve: async (_parent, { email: oldmail, companyName, niches, feeType, feeRate, fixedFee, driverRequestFee, primaryColor }, ctx: Context) => {
                const partner = await createPartner(ctx.prisma, {
                    email: oldmail,
                    companyName,
                    niches,
                    primaryColor,
                })
                if (feeType || typeof feeRate === 'number' || typeof fixedFee === 'number' || typeof driverRequestFee === 'number') {
                    return ctx.prisma.partner.update({
                        where: { id: partner.id },
                        data: {
                            feeType: feeType ?? undefined,
                            feeRate: feeRate ?? undefined,
                            fixedFee: fixedFee ?? undefined,
                            driverRequestFee: driverRequestFee ?? undefined,
                        },
                    })
                }
                return partner
            },
        })

        t.nonNull.list.field('addPartnerNiche', {
            type: 'PartnerNiche',
            args: {
                niches: nonNull(list(nonNull(intArg())))
            },

            resolve: async (_parent, { niches }, ctx: Context) => {
                const userId = getUserId(ctx);
                return addPartnerNiches(ctx.prisma, userId, niches)
            },
        })

        t.field('updatePartner', {
            type: 'Partner',
            args: {
                id: nonNull(intArg()),       // UUID
                email: stringArg(),
                companyName: stringArg(),
                niches: list(nonNull(intArg())),
                feeType: arg({ type: 'PartnerFeeType' }),
                feeRate: floatArg(),
                fixedFee: floatArg(),
                driverRequestFee: floatArg(),
                primaryColor: stringArg(),
                clientVisible: booleanArg(),
            },
            resolve: async (_parent, { id, email, companyName, niches, feeType, feeRate, fixedFee, driverRequestFee, primaryColor, clientVisible }, ctx: Context) => {
                const partner = await ctx.prisma.partner.findUnique({
                    where: { id },
                    select: { userId: true },
                })
                if (!partner) throw createBadRequestError('PARTNER_NOT_FOUND')

                const normalizedEmail = email
                    ? await ensureEmailAvailable(ctx.prisma, email, partner.userId)
                    : undefined

                let updated
                try {
                    updated = await ctx.prisma.partner.update({
                        where: { id },
                        data: {
                            companyName: companyName ?? undefined,
                            feeType: feeType ?? undefined,
                            feeRate: feeRate ?? undefined,
                            fixedFee: fixedFee ?? undefined,
                            driverRequestFee: driverRequestFee === null ? null : driverRequestFee ?? undefined,
                            primaryColor: normalizePartnerPrimaryColor(primaryColor),
                            clientVisible: clientVisible ?? undefined,
                            user: normalizedEmail
                                ? { update: { email: normalizedEmail } }
                                : undefined,
                        }
                    })
                } catch (error) {
                    throwAccountWriteError(error, 'PARTNER_UPDATE_FAILED')
                }
                if (niches) {
                    await ctx.prisma.partner_Niche.deleteMany({ where: { partnerId: id } })
                    await ctx.prisma.partner_Niche.createMany({
                        data: niches.map((v: number) => ({
                            niche_id: v,
                            partnerId: id
                        }
                        )),
                        skipDuplicates: true,
                    })
                }
                return updated
            },
        })


        t.field('updatePartnerProfile', {
            type: "AuthPayload",
            args: {
                companyName: stringArg(),
                address: stringArg(),
                avatar: stringArg(),
                online: booleanArg(),
                latitude: floatArg(),
                longitude: floatArg(),
                primaryColor: stringArg(),
                language: stringArg(),
            },
            resolve: async (_parent, { companyName, avatar, online, latitude, longitude, address, primaryColor, language }, context: Context) => {
                const userId = getUserId(context)
                return updatePartnerProfile(context.prisma, userId, {
                    companyName,
                    avatar,
                    online,
                    latitude,
                    longitude,
                    address,
                    primaryColor,
                    language,
                })
            },
        })

        t.field('deletePartner', {
            type: 'Partner',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                const partner = await ctx.prisma.partner.findUnique({ where: { id }, select: { userId: true } })
                if (!partner) throw createBadRequestError('PARTNER_NOT_FOUND')

                try {
                    return await ctx.prisma.$transaction(async (tx) => {
                        const [orders, sales, products, addresses, deliveries] = await Promise.all([
                            tx.order.findMany({ where: { partnerId: partner.userId }, select: { id: true } }),
                            tx.sale.findMany({ where: { partnerId: partner.userId }, select: { id: true } }),
                            tx.product.findMany({ where: { partnerId: partner.userId }, select: { id: true } }),
                            tx.address.findMany({ where: { userId: partner.userId }, select: { id: true } }),
                            tx.delivery.findMany({ where: { order: { partnerId: partner.userId } }, select: { id: true } }),
                        ])
                        const orderIds = orders.map(({ id }) => id)
                        const saleIds = sales.map(({ id }) => id)
                        const productIds = products.map(({ id }) => id)
                        const addressIds = addresses.map(({ id }) => id)
                        const deliveryIds = deliveries.map(({ id }) => id)

                        await tx.auditLog.updateMany({ where: { partnerId: partner.userId }, data: { partnerId: null } })
                        await tx.auditLog.updateMany({ where: { actorId: partner.userId }, data: { actorId: null } })
                        await tx.log.updateMany({ where: { userId: partner.userId }, data: { userId: null } })
                        await tx.sale.updateMany({ where: { sourceOrderId: { in: orderIds }, partnerId: { not: partner.userId } }, data: { sourceOrderId: null } })
                        await tx.sale.updateMany({ where: { cashierId: partner.userId }, data: { cashierId: null } })
                        await tx.stockMovement.updateMany({ where: { userId: partner.userId, partnerId: { not: partner.userId } }, data: { userId: null } })
                        await tx.cashSession.updateMany({ where: { closedById: partner.userId, partnerId: { not: partner.userId } }, data: { closedById: null } })
                        if (addressIds.length) {
                            await tx.order.updateMany({ where: { addressId: { in: addressIds }, partnerId: { not: partner.userId } }, data: { addressId: null } })
                            await tx.delivery.updateMany({ where: { addressId: { in: addressIds } }, data: { addressId: null } })
                            await tx.customOrder.updateMany({ where: { addressId: { in: addressIds }, partnerId: { not: partner.userId } }, data: { addressId: null } })
                        }
                        await tx.customOrder.deleteMany({ where: { partnerId: partner.userId } })
                        await tx.giftTemplate.deleteMany({ where: { partnerId: partner.userId } })
                        if (productIds.length) await tx.stockReservation.deleteMany({ where: { productId: { in: productIds } } })
                        const refundItemFilters = [
                            ...(productIds.length ? [{ productId: { in: productIds } }] : []),
                            ...(saleIds.length ? [{ refund: { saleId: { in: saleIds } } }] : []),
                        ]
                        if (refundItemFilters.length) await tx.saleRefundItem.deleteMany({ where: { OR: refundItemFilters } })
                        const saleItemFilters = [
                            ...(productIds.length ? [{ productId: { in: productIds } }] : []),
                            ...(saleIds.length ? [{ saleId: { in: saleIds } }] : []),
                        ]
                        if (saleItemFilters.length) await tx.saleItem.deleteMany({ where: { OR: saleItemFilters } })
                        const orderItemFilters = [
                            ...(productIds.length ? [{ productId: { in: productIds } }] : []),
                            ...(orderIds.length ? [{ orderId: { in: orderIds } }] : []),
                        ]
                        if (orderItemFilters.length) await tx.orderItem.deleteMany({ where: { OR: orderItemFilters } })
                        if (saleIds.length) await tx.saleRefund.deleteMany({ where: { saleId: { in: saleIds } } })
                        await tx.orderDispatch.deleteMany({ where: { OR: [
                            ...(orderIds.length ? [{ orderId: { in: orderIds } }] : []),
                            ...(deliveryIds.length ? [{ deliveryId: { in: deliveryIds } }] : []),
                        ] } })
                        if (deliveryIds.length) await tx.delivery.deleteMany({ where: { id: { in: deliveryIds } } })
                        await tx.sale.deleteMany({ where: { partnerId: partner.userId } })
                        await tx.order.deleteMany({ where: { partnerId: partner.userId } })
                        await tx.stockMovement.deleteMany({ where: { partnerId: partner.userId } })
                        await tx.product.deleteMany({ where: { partnerId: partner.userId } })
                        if (addressIds.length) await tx.address.deleteMany({ where: { id: { in: addressIds } } })
                        await tx.partner.delete({ where: { id } })
                        await tx.user.delete({ where: { id: partner.userId } })
                        return { id }
                    })
                } catch {
                    throw createBadRequestError('PARTNER_DELETE_FAILED')
                }
            },
        })
    },
})

export default PartnerMutation
