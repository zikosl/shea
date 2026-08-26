// @ts-nocheck
import { nonNull, extendType, stringArg, intArg, booleanArg } from "nexus"
import { Prisma } from "@prisma/client"
import { Context } from "../../context"
import { getUserId } from "../../utils"
import { createBadRequestError } from "../../core/errors/app-error"

export const Query = extendType({
    type: 'Query',
    definition(t) {
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
                niche_id: intArg(),
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, { search, page, limit, niche_id, isFull = false }, ctx: Context) => {
                if (page > 1) {
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
                if (niche_id) {
                    where.partnerNiches = {
                        some: {
                            niche_id: niche_id
                        }
                    }
                }
                const totalPartners = await ctx.prisma.partner.count({ where });
                const partners = await ctx.prisma.partner.findMany({
                    ...args,
                    ...(isFull ? {} : {
                        take: limit,
                        skip: limit * (page - 1),
                    }),
                });

                return {
                    partners,
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

                return {
                    today: await aggregate(startOfToday),
                    week: await aggregate(startOfWeek),
                    month: await aggregate(startOfMonth),
                    allTime: await aggregate(),
                }
            },
        })
    },
})

export default Query
