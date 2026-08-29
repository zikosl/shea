// @ts-nocheck
import { extendType, floatArg, intArg, nonNull } from "nexus"
import { Context } from "../../context"
import { getUserId } from "../../utils"
import { DispatchStatus, DeliveryStatus, DeliveryType } from "../../types"
import { buildPartnerPosEmail } from "./pos"
import { computeDrivingRoute, isValidRouteCoordinate } from "../../application/maps/driver-route.service"
import { createBadRequestError, createNotFoundError } from "../../core/errors/app-error"

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
        t.nonNull.list.field('listPartnerPosOrders', {
            type: 'Order',
            resolve: async (_parent, _, ctx: Context) => {
                const partnerId = getUserId(ctx)
                return ctx.prisma.order.findMany({
                    where: {
                        partnerId,
                        OR: [
                            {
                                source: 'POS',
                            },
                            {
                                client: {
                                    user: {
                                        email: buildPartnerPosEmail(partnerId),
                                    },
                                },
                            },
                        ],
                    },
                    orderBy: {
                        id: "desc"
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
                const userId = getUserId(ctx)
                return ctx.prisma.order.findFirst({
                    where: {
                        id,
                        OR: [
                            { partnerId: userId },
                            { clientId: userId },
                            {
                                delivery: {
                                    driverId: userId,
                                },
                            },
                        ],
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
        t.field('getDriverRoute', {
            type: 'DriverRoute',
            args: {
                dispatchId: nonNull(intArg()),
                originLatitude: nonNull(floatArg()),
                originLongitude: nonNull(floatArg()),
            },
            resolve: async (_parent, { dispatchId, originLatitude, originLongitude }, ctx: Context) => {
                const driverId = getUserId(ctx)
                const dispatch = await ctx.prisma.orderDispatch.findFirst({
                    where: {
                        id: dispatchId,
                        driverId,
                        status: DispatchStatus.ACCEPTED,
                        order: {
                            delivery: {
                                driverId,
                                status: {
                                    in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED],
                                },
                            },
                        },
                    },
                    include: {
                        order: {
                            include: {
                                address: true,
                                partner: true,
                                delivery: true,
                            },
                        },
                    },
                })

                if (!dispatch?.order?.delivery) {
                    throw createNotFoundError('Active delivery was not found')
                }

                const origin = {
                    latitude: originLatitude,
                    longitude: originLongitude,
                }
                const pickupStep = dispatch.order.delivery.status === DeliveryStatus.ASSIGNED
                const destination = pickupStep
                    ? {
                        latitude: dispatch.order.partner.latitude,
                        longitude: dispatch.order.partner.longitude,
                    }
                    : {
                        latitude: dispatch.order.address.latitude,
                        longitude: dispatch.order.address.longitude,
                    }

                if (!isValidRouteCoordinate(origin) || !isValidRouteCoordinate(destination)) {
                    throw createBadRequestError('Valid route coordinates are required')
                }

                return computeDrivingRoute(origin, destination)
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
