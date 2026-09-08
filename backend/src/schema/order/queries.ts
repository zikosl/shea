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
        t.nonNull.field('adminDispatchBoard', {
            type: 'AdminDispatchBoard',
            resolve: async (_parent, _, ctx: Context) => {
                const now = new Date()
                const attentionBefore = new Date(now.getTime() - 10 * 60 * 1000)
                const [deliveries, drivers] = await Promise.all([
                    ctx.prisma.delivery.findMany({
                        where: {
                            type: DeliveryType.NORMAL,
                            status: { in: [DeliveryStatus.READY, DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED] },
                        },
                        include: {
                            order: {
                                include: {
                                    partner: true,
                                    client: { include: { user: true } },
                                    driverRequest: true,
                                    address: true,
                                    items: {
                                        include: {
                                            product: { include: { variant: { include: { product: true } } } },
                                        },
                                    },
                                },
                            },
                            dispatches: { orderBy: { sentAt: 'desc' } },
                        },
                        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
                    }),
                    ctx.prisma.driver.findMany({
                        include: {
                            user: true,
                            deliveries: {
                                where: { status: { in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED] } },
                                select: { id: true },
                            },
                        },
                        orderBy: [{ online: 'desc' }, { isAvailable: 'desc' }, { firstname: 'asc' }],
                    }),
                ])

                return {
                    generatedAt: now,
                    orders: deliveries.map((delivery) => {
                        const activeOffers = delivery.dispatches.filter((entry) => entry.status === DispatchStatus.SENT && entry.expiresAt > now)
                        const lastDispatch = delivery.dispatches[0]
                        const driverRequest = delivery.order.driverRequest
                        const total = driverRequest
                            ? Number(driverRequest.cashToCollect)
                            : delivery.order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
                        return {
                            orderId: delivery.orderId,
                            deliveryId: delivery.id,
                            status: delivery.status,
                            type: delivery.type,
                            createdAt: delivery.createdAt,
                            scheduledAt: delivery.scheduledAt,
                            total,
                            partnerName: delivery.order.partner.companyName,
                            partnerAddress: delivery.order.partner.address,
                            partnerLatitude: delivery.order.partner.latitude,
                            partnerLongitude: delivery.order.partner.longitude,
                            clientName: driverRequest?.recipientName ?? (`${delivery.order.client.firstname} ${delivery.order.client.lastname}`.trim() || 'Customer'),
                            clientPhone: driverRequest?.recipientPhone ?? delivery.order.client.user.phone,
                            destinationAddress: delivery.order.address.address || delivery.order.address.label,
                            destinationLatitude: delivery.order.address.latitude,
                            destinationLongitude: delivery.order.address.longitude,
                            assignedDriverId: delivery.driverId,
                            dispatchCount: delivery.dispatches.length,
                            activeOfferCount: activeOffers.length,
                            lastDispatchAt: lastDispatch?.sentAt,
                            needsAttention: delivery.status === DeliveryStatus.READY && activeOffers.length === 0 && (!lastDispatch || lastDispatch.sentAt < attentionBefore),
                            items: driverRequest
                                ? [{ id: 0, name: driverRequest.packageDescription, quantity: 1, price: driverRequest.cashToCollect }]
                                : delivery.order.items.map((item) => ({
                                    id: item.id,
                                    name: item.product.customName || item.product.variant.name || item.product.variant.product.name,
                                    quantity: item.quantity,
                                    price: item.price,
                                })),
                        }
                    }),
                    drivers: drivers.map((driver) => {
                        const hasLocation = Number.isFinite(driver.latitude) && Number.isFinite(driver.longitude) && !(driver.latitude === 0 && driver.longitude === 0)
                        const stale = Boolean(driver.locationUpdatedAt && driver.locationUpdatedAt < new Date(now.getTime() - 5 * 60 * 1000))
                        const activeDeliveryCount = driver.deliveries.length
                        const state = !driver.online ? 'OFFLINE' : !hasLocation || stale ? 'STALE' : activeDeliveryCount > 0 ? 'IN_DELIVERY' : !driver.isAvailable ? 'UNAVAILABLE' : 'AVAILABLE'
                        return {
                            userId: driver.userId,
                            name: `${driver.firstname} ${driver.lastname}`.trim(),
                            phone: driver.user.phone,
                            email: driver.user.email,
                            latitude: driver.latitude,
                            longitude: driver.longitude,
                            online: driver.online,
                            isAvailable: driver.isAvailable,
                            locationUpdatedAt: driver.locationUpdatedAt,
                            activeDeliveryCount,
                            state,
                        }
                    }),
                }
            },
        })
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
