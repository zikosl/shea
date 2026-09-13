// @ts-nocheck
import { nonNull, extendType, stringArg, intArg, booleanArg } from "nexus"
import { CapabilityCode, Prisma } from "@prisma/client"
import { Context } from "../../context"
import { getUserId } from "../../utils"
import { createBadRequestError } from "../../core/errors/app-error"
import { partnerUserIdsWithCapability } from '../../modules/capabilities/service'

export const Query = extendType({
    type: 'Query',
    definition(t) {
        t.nonNull.field('myPartnerProfile', {
            type: 'Partner',
            resolve: async (_parent, _args, ctx: Context) => {
                const userId = getUserId(ctx)
                return ctx.prisma.partner.findUnique({ where: { userId } })
            },
        })

        t.field('findOnePartner', {
            type: 'Partner',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                return ctx.prisma.partner.findUnique({
                    where: { id },
                })
            },
        })

        t.field('findManyPartners', {
            type: 'PartnerResult',
            args: {
                online: booleanArg(),
                niche_id: intArg(),
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, { search, page, limit, niche_id, online, isFull = false }, ctx: Context) => {
                if (page < 1 || limit < 1 || limit > 200) {
                    throw createBadRequestError("Page not valide")
                }

                const where: Prisma.PartnerWhereInput = search
                    ? {
                        OR: [
                            { companyName: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {};
                const args: Prisma.PartnerFindManyArgs = { where }
                if (online != null) where.online = online
                if (niche_id) {
                    where.partnerNiches = {
                        some: {
                            niche_id: niche_id
                        }
                    }
                }
                const [totalPartners, partners, giftPartnerIds] = await Promise.all([
                    ctx.prisma.partner.count({ where }),
                    ctx.prisma.partner.findMany({
                        ...args,
                        orderBy: { id: 'asc' },
                        ...(isFull ? {} : {
                            take: limit,
                            skip: limit * (page - 1),
                        }),
                    }),
                    partnerUserIdsWithCapability(ctx.prisma, CapabilityCode.GIFT_BUILDER, { onlineOnly: false }),
                ]);
                const giftPartners = new Set(giftPartnerIds)

                return {
                    partners: partners.map((partner) => ({
                        ...partner,
                        supportsGifts: giftPartners.has(partner.userId),
                    })),
                    totalPartners,
                };
            },
        });

        t.nonNull.list.field('findManyPartnerNiches', {
            type: 'PartnerNiche',
            resolve: async (_parent, _args, ctx: Context) => {
                const userId = getUserId(ctx);
                const partner = await ctx.prisma.partner.findUnique({
                    where: { userId: userId }
                })
                let data: Array<{ id: number; niche_id: number | null; partnerId: number | null }> = []
                if (partner)
                    data = await ctx.prisma.partner_Niche.findMany({
                        where: { partnerId: partner.id }
                    })

                // 4. Return the Partner profile (with user relation populated)
                return data;
            },
        })
        t.nonNull.field('partnerStatistics', {
            type: 'PartnerStatisticsResult',
            resolve: async (_parent, _args, ctx: Context) => {
                const partnerId = getUserId(ctx)
                const now = new Date()
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                const startOfWeek = new Date(startOfToday)
                startOfWeek.setDate(startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7))
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

                async function aggregate(from?: Date) {
                    const where: Prisma.OrderWhereInput = {
                        partnerId,
                        source: { not: 'DRIVER_REQUEST' },
                        ...(from ? { createdAt: { gte: from } } : {}),
                    }
                    const [sum, orders] = await Promise.all([
                        ctx.prisma.order.aggregate({
                            where,
                            _sum: {
                                partnerGross: true,
                                partnerFee: true,
                                partnerNet: true,
                            },
                        }),
                        ctx.prisma.order.count({ where }),
                    ])
                    const gross = Number(sum._sum.partnerGross ?? 0)
                    const fees = Number(sum._sum.partnerFee ?? 0)
                    const net = Number(sum._sum.partnerNet ?? 0)
                    return {
                        gross,
                        fees,
                        net,
                        orders,
                        averageOrderValue: orders > 0 ? gross / orders : 0,
                    }
                }

                async function aggregateDeliveries(from?: Date) {
                    const requests = await ctx.prisma.partnerDriverRequest.findMany({
                        where: {
                            partnerId,
                            ...(from ? { createdAt: { gte: from } } : {}),
                        },
                        include: { order: { include: { delivery: true } } },
                    })
                    const completed = requests.filter((request) => request.deliveredAt)
                    const canceled = requests.filter((request) => request.canceledAt)
                    const active = requests.length - completed.length - canceled.length
                    const assignmentDurations = requests
                        .filter((request) => request.assignedAt)
                        .map((request) => request.assignedAt.getTime() - request.createdAt.getTime())
                    const deliveryDurations = completed
                        .filter((request) => request.pickedUpAt)
                        .map((request) => request.deliveredAt.getTime() - request.pickedUpAt.getTime())
                    const averageMinutes = (values: number[]) => values.length
                        ? values.reduce((total, value) => total + value, 0) / values.length / 60_000
                        : 0

                    return {
                        totalRequests: requests.length,
                        activeRequests: active,
                        completedRequests: completed.length,
                        canceledRequests: canceled.length,
                        completionRate: requests.length ? (completed.length / requests.length) * 100 : 0,
                        fees: requests.reduce((total, request) => total + Number(request.order.delivery?.price ?? 0), 0),
                        cashCollected: completed.reduce((total, request) => total + Number(request.cashToCollect), 0),
                        averageAssignmentMinutes: averageMinutes(assignmentDurations),
                        averageDeliveryMinutes: averageMinutes(deliveryDurations),
                    }
                }

                return {
                    today: await aggregate(startOfToday),
                    week: await aggregate(startOfWeek),
                    month: await aggregate(startOfMonth),
                    allTime: await aggregate(),
                    deliveryMonth: await aggregateDeliveries(startOfMonth),
                    deliveryAllTime: await aggregateDeliveries(),
                }
            },
        })
    },
})

export default Query
