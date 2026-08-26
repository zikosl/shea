import { nonNull, objectType } from "nexus"
import { Context } from "../../context"
import { AdminDashboardStats } from "./objects"

function startOfDay(date: Date) {
    const next = new Date(date)
    next.setHours(0, 0, 0, 0)
    return next
}

function addDays(date: Date, days: number) {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
}

function formatDay(date: Date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function money(value: number | null | undefined) {
    return Number((value ?? 0).toFixed(2))
}

export const Query = objectType({
    name: 'Query',
    definition(t) {
        t.nonNull.list.field('findManyPricing', {
            type: 'Pricing',
            resolve: async (_, __, ctx) => {
                return ctx.prisma.pricing.findMany({});
            },
        })
        t.nonNull.list.field('findManySchedule', {
            type: 'PartnerDeliverySchedule',
            resolve: async (_, __, ctx) => {
                return ctx.prisma.partnerDeliverySchedule.findMany({
                    where: {
                        isActive: true
                    }
                });
            },
        })
        t.nonNull.field('adminDashboardStats', {
            type: AdminDashboardStats,
            resolve: async (_, __, ctx: Context) => {
                const now = new Date()
                const todayStart = startOfDay(now)
                const tomorrowStart = addDays(todayStart, 1)
                const weekStart = addDays(todayStart, -6)
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

                const buildWindow = async (from: Date, to?: Date) => {
                    const where = {
                        createdAt: {
                            gte: from,
                            ...(to ? { lt: to } : {}),
                        },
                    }
                    const [orders, aggregate] = await Promise.all([
                        ctx.prisma.order.count({ where }),
                        ctx.prisma.order.aggregate({
                            where,
                            _sum: {
                                subtotal: true,
                                partnerGross: true,
                                partnerFee: true,
                                partnerNet: true,
                            },
                        }),
                    ])
                    const grossRevenue = money(aggregate._sum.partnerGross || aggregate._sum.subtotal)
                    const partnerFees = money(aggregate._sum.partnerFee)
                    const netRevenue = money(aggregate._sum.partnerNet || (grossRevenue - partnerFees))

                    return {
                        orders,
                        grossRevenue,
                        partnerFees,
                        netRevenue,
                        averageOrderValue: orders ? money(grossRevenue / orders) : 0,
                    }
                }

                const trendOrders = await ctx.prisma.order.findMany({
                    where: { createdAt: { gte: weekStart } },
                    select: {
                        createdAt: true,
                        subtotal: true,
                        partnerGross: true,
                    },
                })

                const ordersTrend = Array.from({ length: 7 }).map((_, index) => {
                    const day = addDays(weekStart, index)
                    const nextDay = addDays(day, 1)
                    const dayOrders = trendOrders.filter((order) => order.createdAt >= day && order.createdAt < nextDay)
                    return {
                        label: formatDay(day),
                        orders: dayOrders.length,
                        revenue: money(dayOrders.reduce((total, order) => total + (order.partnerGross || order.subtotal || 0), 0)),
                    }
                })

                const [
                    today,
                    week,
                    month,
                    totalOrders,
                    pendingDeliveries,
                    completedDeliveries,
                    canceledDeliveries,
                    clientsCount,
                    partnersCount,
                    activePartners,
                    driversCount,
                    activeDrivers,
                    nichesCount,
                    categoriesCount,
                    productTemplatesCount,
                    productsCount,
                    lowStockCandidates,
                    outOfStockProducts,
                    pendingProductRequests,
                    recentOrders,
                    partnerOrderGroups,
                    templateNiches,
                ] = await Promise.all([
                    buildWindow(todayStart, tomorrowStart),
                    buildWindow(weekStart),
                    buildWindow(monthStart),
                    ctx.prisma.order.count(),
                    ctx.prisma.delivery.count({ where: { status: 1 } }),
                    ctx.prisma.delivery.count({ where: { status: 3 } }),
                    ctx.prisma.delivery.count({ where: { status: 4 } }),
                    ctx.prisma.client.count(),
                    ctx.prisma.partner.count(),
                    ctx.prisma.partner.count({ where: { online: true } }),
                    ctx.prisma.driver.count(),
                    ctx.prisma.driver.count({ where: { online: true, isAvailable: true } }),
                    ctx.prisma.niche.count(),
                    ctx.prisma.category.count(),
                    ctx.prisma.productTemplate.count(),
                    ctx.prisma.product.count(),
                    ctx.prisma.product.findMany({
                        where: {
                            stock: { gt: 0 },
                            isActive: true,
                            reorderThreshold: { gt: 0 },
                        },
                        select: { stock: true, reorderThreshold: true },
                    }),
                    ctx.prisma.product.count({ where: { stock: { lte: 0 }, isActive: true } }),
                    ctx.prisma.productTemplateRequest.count({ where: { status: 'PENDING' } }),
                    ctx.prisma.order.findMany({
                        take: 6,
                        orderBy: { createdAt: 'desc' },
                        include: {
                            partner: true,
                            client: true,
                        },
                    }),
                    ctx.prisma.order.groupBy({
                        by: ['partnerId'],
                        _count: { _all: true },
                        _sum: { partnerGross: true, subtotal: true },
                        orderBy: { _count: { partnerId: 'desc' } },
                        take: 5,
                    }),
                    ctx.prisma.productTemplateView.findMany({
                        select: { niche_id: true },
                    }),
                ])

                const lowStockProductsCount = lowStockCandidates.filter(
                    (product) => product.stock <= product.reorderThreshold,
                ).length

                const topPartnerIds = partnerOrderGroups.map((group) => group.partnerId)
                const partners = topPartnerIds.length
                    ? await ctx.prisma.partner.findMany({
                        where: { userId: { in: topPartnerIds } },
                        select: { userId: true, companyName: true },
                    })
                    : []
                const partnerNameById = new Map(partners.map((partner) => [partner.userId, partner.companyName]))

                const topPartners = partnerOrderGroups.map((group) => ({
                    id: String(group.partnerId),
                    name: partnerNameById.get(group.partnerId) ?? `Partner #${group.partnerId}`,
                    count: group._count._all,
                    value: money(group._sum.partnerGross || group._sum.subtotal),
                }))

                const nicheCounts = templateNiches.reduce<Record<number, number>>((acc, template) => {
                    if (template.niche_id) {
                        acc[template.niche_id] = (acc[template.niche_id] ?? 0) + 1
                    }
                    return acc
                }, {})
                const topNicheIds = Object.entries(nicheCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([id]) => Number(id))
                const niches = topNicheIds.length
                    ? await ctx.prisma.niche.findMany({
                        where: { id: { in: topNicheIds } },
                        select: { id: true, name: true },
                    })
                    : []
                const nicheNameById = new Map(niches.map((niche) => [niche.id, niche.name]))

                return {
                    today,
                    week,
                    month,
                    totalOrders,
                    pendingDeliveries,
                    completedDeliveries,
                    canceledDeliveries,
                    clientsCount,
                    partnersCount,
                    activePartners,
                    driversCount,
                    activeDrivers,
                    nichesCount,
                    categoriesCount,
                    productTemplatesCount,
                    productsCount,
                    lowStockProducts: lowStockProductsCount,
                    outOfStockProducts,
                    pendingProductRequests,
                    ordersTrend,
                    topPartners,
                    topNiches: topNicheIds.map((id) => ({
                        id: String(id),
                        name: nicheNameById.get(id) ?? `Niche #${id}`,
                        count: nicheCounts[id] ?? 0,
                        value: nicheCounts[id] ?? 0,
                    })),
                    recentOrders: recentOrders.map((order) => ({
                        id: order.id,
                        date: order.createdAt.toISOString(),
                        total: money(order.partnerGross || order.subtotal),
                        source: order.source,
                        partnerName: order.partner?.companyName ?? null,
                        clientName: [order.client?.firstname, order.client?.lastname].filter(Boolean).join(' ') || null,
                    })),
                }
            },
        })
    },
})

export default Query
