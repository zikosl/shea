// @ts-nocheck
import { extendType, intArg, nonNull } from "nexus"
import { Context } from "../../context"
import { getUserId } from "../../utils"
import { DispatchStatus, DeliveryStatus, DeliveryType } from "../../types"

export const Query = extendType({
    type: 'Query',
    definition(t) {
        t.nonNull.list.field('findManyOrders', {
            type: 'Order',
            resolve: async (_parent, _, ctx: Context) => {
                const id = getUserId(ctx);
                return ctx.prisma.order.findMany({
                    where: {
                        clientId: id,
                    },
                    orderBy: {
                        id: "desc"
                    }
                })
            },
        })
        t.nonNull.list.field('listActiveDriverDeliveries', {
            type: 'Delivery',
            resolve: async (_p, _, ctx) => {
                const id = getUserId(ctx)
                return ctx.prisma.delivery.findMany({
                    where: {
                        driverId: id,
                        status: {
                            notIn: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELED]
                        }
                    }
                })
            }
        })
        t.nonNull.list.field('listOrders', {
            type: 'Order',
            resolve: async (_parent, _, ctx: Context) => {
                const partnerId = getUserId(ctx)
                console.log(partnerId)
                return ctx.prisma.order.findMany({
                    where: {
                        partnerId,
                        delivery: {
                            OR: [
                                {
                                    status: {
                                        in: [DeliveryStatus.PENDING, DeliveryStatus.ACCEPTED]
                                    }
                                },
                                {
                                    status: DeliveryStatus.READY,
                                    type: DeliveryType.PICKUP
                                }
                            ]
                        }
                    }
                })
            },
        })
        t.field('getOrder', {
            type: 'Order',
            args: {
                id: nonNull(intArg())
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                return ctx.prisma.order.findUnique({
                    where: {
                        id: id
                    }
                })
            },
        })
        t.field('getOrderDispatchByOrder', {
            type: 'OrderDispatch',
            args: {
                orderId: nonNull(intArg()),
            },
            resolve: async (_parent, { orderId }, ctx: Context) => {
                const driverId = getUserId(ctx)
                return ctx.prisma.orderDispatch.findFirst({
                    where: {
                        orderId,
                        driverId,
                    },
                    orderBy: {
                        id: "desc"
                    }
                })
            },
        })
        t.nonNull.list.field('listClientOrders', {
            type: 'Order',
            resolve: async (_parent, _, ctx: Context) => {
                const id = getUserId(ctx)
                return ctx.prisma.order.findMany({
                    where: { clientId: id },
                })
            },
        })

        t.nonNull.list.field('listDriverOrderHistory', {
            type: 'Order',
            resolve: async (_parent, _, ctx: Context) => {
                const id = getUserId(ctx)
                return ctx.prisma.order.findMany({
                    where: {
                        delivery: {
                            status: DeliveryStatus.DELIVERED,
                            driverId: id
                        }
                    },
                })
            },
        })
        t.nonNull.list.field('listActiveDriverOrders', {
            type: 'OrderDispatch',
            resolve: async (_parent, _, ctx: Context) => {
                const id = getUserId(ctx)
                return ctx.prisma.orderDispatch.findMany({
                    where: {
                        driverId: id,
                        status: DispatchStatus.ACCEPTED,
                        order: {
                            delivery: {
                                NOT: {
                                    OR: [
                                        { status: DeliveryStatus.DELIVERED },
                                        { status: DeliveryStatus.CANCELED }
                                    ]
                                }
                            }
                        }
                    },
                    orderBy: {
                        id: "desc"
                    }
                })
            },
        })
        t.field('getOrderDispatch', {
            type: 'OrderDispatch',
            args: {
                id: nonNull(intArg())
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                const driverId = getUserId(ctx)
                return ctx.prisma.orderDispatch.findFirst({
                    where: {
                        driverId: driverId,
                        id: id
                    }
                })
            },
        })
        t.nonNull.list.field('listDriverOrders', {
            type: 'OrderDispatch',
            resolve: async (_parent, _, ctx: Context) => {
                const id = getUserId(ctx)
                return ctx.prisma.orderDispatch.findMany({
                    where: {
                        driverId: id,
                        status: DispatchStatus.SENT,
                        expiresAt: {
                            gt: new Date()
                        }
                    },
                    orderBy: {
                        id: "desc"
                    }
                })
            },
        })
    },
})

export default Query
