// @ts-nocheck
import { arg, intArg, nonNull, extendType } from "nexus"
import { Context } from "../../context"
import { getUserId } from "../../utils"
import { GraphQLError } from "graphql"
import { DispatchStatus, DeliveryStatus, DeliveryType, LogSatus, PricingName } from "../../types"
import { pickSchedule, todayAt } from "../../utils/order"
import { sendNotification } from "../../servers/firebase"
import { ensurePartnerPosIdentity } from "./pos"
import { calculatePartnerFee } from "../../utils/partner-fees"
// import { DeliveryStatus } from "../../types"

const Mutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.field('createOrder', {
            type: 'Order',
            args: {
                data: nonNull(arg({ type: "OrderInput" }))
            },
            resolve: async (_parent, { data }, ctx: Context) => {
                const userId = getUserId(ctx)

                if (data.items.length === 0) {
                    throw new GraphQLError("INVALID_ORDER")
                }
                let addressId = data.addressId;
                if (!addressId) {
                    const address = await ctx.prisma.address.findFirst({
                        where: {
                            userId,
                            isDefault: true,
                        },
                        orderBy: { createdAt: 'desc' },
                    })
                    if (!address) {
                        throw new GraphQLError("ADDRESS_REQUIRED")
                    }
                    addressId = address.id;
                }
                return ctx.prisma.$transaction(async (tx: any) => {
                    const partner = await tx.partner.findUnique({
                        where: {
                            userId: data.partnerId
                        },
                        include: {
                            user: {
                                include: {
                                    pushTokens: {
                                        orderBy: { createdAt: 'desc' },
                                        take: 1,
                                        select: { id: true, token: true, userId: true },
                                    }
                                }
                            }
                        }
                    })
                    if (partner) {
                        if (partner.latitude == 0 || partner.longitude == 0 || !partner.online)
                            throw new GraphQLError("STORE_UNAVAILABLE")
                    }
                    else throw new GraphQLError("PARTNER_NOT_FOUND")
                    const deliveryPricingName = data.deliveryType == DeliveryType.PICKUP
                        ? PricingName.PICKUP_TAX
                        : data.deliveryType == DeliveryType.GROUPED
                            ? PricingName.GROUP_DELIVERY_TAX
                            : PricingName.NORMAL_DELIVERY_TAX
                    const pricing: any[] = await tx.pricing.findMany({
                        where: {
                            name: {
                                in: [
                                    PricingName.APP_TAX,
                                    PricingName.STORE_TAX,
                                    deliveryPricingName,
                                ]
                            }
                        }
                    })
                    const subtotal = data.items.reduce((sum: number, item: any) => {
                        return sum + (Number(item.price ?? 0) * Number(item.quantity ?? 0))
                    }, 0)
                    const financials = calculatePartnerFee(subtotal, partner)
                    const order = await tx.order.create({
                        data: {
                            clientId: userId,
                            partnerId: data.partnerId,
                            addressId,
                            status: DeliveryStatus.PENDING,
                            deliveryTax: pricing.find(v => v.name == deliveryPricingName)?.price ?? 0,
                            appTax: pricing.find(v => v.name == PricingName.APP_TAX)?.price ?? 0,
                            storeTax: pricing.find(v => v.name == PricingName.STORE_TAX)?.price ?? 0,
                            ...financials,
                            items: {
                                create: data.items,
                            }
                        }
                    })
                    sendNotification({
                        tokens: partner.user.pushTokens[0]?.token,
                        title: "New Order Placed",
                        body: "A customer has placed a new order at your store. Accept now to fulfill this order!",
                        androidChannelId: "new-order-alerts",
                        sound: "new_order.wav",
                        data: {
                            event: "NEW_ORDER",
                            orderId: `${order.id}`,
                        }
                    })
                    await tx.delivery.create({
                        data: {
                            orderId: order.id,
                            type: data.deliveryType,
                            addressId: data.deliveryType === DeliveryType.PICKUP ? null : addressId,
                        }
                    })

                    await tx.log.create({
                        data: {
                            title: `New Order #${order.id} Created`,
                            body: `A new order has been placed.`,
                            title_ar: `تم إنشاء طلب جديد`,
                            body_ar: `تم تقديم طلب جديد`,
                            type: LogSatus.ORDER_UPDATE,
                            userId: data.partnerId
                        }
                    })

                    return order
                })
            }
        })

        t.field('driverOrder', {
            type: 'OrderDispatch',
            args: {
                id: nonNull(intArg()),
                status: nonNull(arg({ type: "DispatchStatus" }))
            },
            resolve: async (_parent, { status, id }: OrderDispatch, ctx: Context) => {
                if (status !== DispatchStatus.SENT) {
                    const dispatch = await ctx.prisma.orderDispatch.update({
                        data: {
                            status: status
                        },
                        where: {
                            id
                        }
                    })
                    if (status === DispatchStatus.ACCEPTED) {
                        const order = await ctx.prisma.delivery.update({
                            where: { id: dispatch.deliveryId },
                            data: {
                                status: DeliveryStatus.ASSIGNED,
                                driverId: dispatch.driverId
                            }
                        })
                        // Log assignment for both client and partner
                        await ctx.prisma.log.create({
                            data: {
                                title: `Order #${order.orderId} has been assigned`,
                                body: `Order (ID: ${order.orderId}) has been assigned to a delivery driver.`,
                                title_ar: `تم تعيين الطلب رقم #${order.orderId}`,
                                body_ar: `تم تعيين الطلب (رقم: ${order.orderId}) إلى سائق التوصيل.`,
                                type: LogSatus.ORDER_UPDATE,
                                userId: order.clientId
                            }
                        })
                    }
                    return dispatch
                }
                return new GraphQLError("Invalid State")
            },
        })

        t.field('pickOrder', {
            type: 'OrderDispatch',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }: OrderDispatch, ctx: Context) => {
                const userId = getUserId(ctx)
                const order = await ctx.prisma.orderDispatch.findFirst({
                    where: {
                        id: id,
                        driverId: userId,
                        status: DispatchStatus.ACCEPTED
                    },
                    include: {
                        order: {
                            include: {
                                client: {
                                    select: {
                                        user: {
                                            select: {
                                                pushTokens: {
                                                    orderBy: { createdAt: 'desc' },
                                                    take: 1,
                                                    select: { id: true, token: true, userId: true },
                                                },
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                })
                if (order.order) {
                    await ctx.prisma.delivery.update({
                        where: {
                            id: order.order.id,
                            driverId: userId,
                        },
                        data: {
                            status: DeliveryStatus.PICKED
                        }
                    })
                    sendNotification({
                        tokens: order.order.client.user.pushTokens[0].token,
                        title: "New Order Placed",
                        body: "A customer has placed a new order at your store. Accept now to fulfill this order!",
                        data: {
                            event: "NEW_ORDER",
                            orderId: `${id}`,
                        }
                    })
                    await ctx.prisma.log.create({
                        data: {
                            title: `Order #${order.id} has been Picked`,
                            body: `Order (ID: ${order.id}) has been Picked by a delivery driver.`,
                            title_ar: `تم استلام الطلب رقم #${order.id}`,
                            body_ar: `تم استلام الطلب (رقم: ${order.id}) بواسطة سائق التوصيل.`,
                            type: LogSatus.ORDER_UPDATE,
                            userId: order.clientId
                        }
                    })
                    return order;
                }
                return new GraphQLError("Not Allowed")
            },
        })

        t.field('deliverOrder', {
            type: 'OrderDispatch',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }: OrderDispatch, ctx: Context) => {
                const userId = getUserId(ctx)
                const order = await ctx.prisma.orderDispatch.findFirst({
                    where: {
                        id: id,
                        driverId: userId,
                        status: DispatchStatus.ACCEPTED
                    },
                    include: {
                        order: true
                    }
                })
                if (order.order) {
                    await ctx.prisma.delivery.update({
                        where: {
                            id: order.order.id,
                            driverId: userId
                        },
                        data: {
                            status: DeliveryStatus.DELIVERED
                        }
                    })
                    await ctx.prisma.log.create({
                        data: {
                            title: `Order #${order.id} has been Delivered`,
                            body: `Order (ID: ${order.id}) has been Delivered by a delivery driver.`,
                            title_ar: `تم تسليم الطلب رقم #${order.id}`,
                            body_ar: `تم تسليم الطلب (رقم: ${order.id}) بواسطة سائق التوصيل.`,
                            type: LogSatus.ORDER_UPDATE,
                            userId: order.clientId
                        }
                    })
                    return order;
                }
                return new GraphQLError("Not Allowed")
            },
        })

        t.field('partnerOrder', {
            type: 'Order',
            args: {
                id: nonNull(intArg()),
                status: nonNull(arg({ type: "DeliveryStatus" }))
            },
            resolve: async (_parent, { status, id }: Order, ctx: Context) => {
                const partnerId = getUserId(ctx)
                if (status === DeliveryStatus.DELIVERED) {
                    const order = await ctx.prisma.delivery.update({
                        where: {
                            orderId: id,
                            type: DeliveryType.PICKUP
                        },
                        data: {
                            status: status
                        },
                        include: {
                            order: true
                        }
                    })
                    await ctx.prisma.log.create({
                        data: {
                            title: `Order #${order.orderId} has been Picked`,
                            body: `Order (ID: ${order.orderId}) has been Picked from the Partner.`,
                            title_ar: `تم اخذ الطلب رقم #${order.orderId}`,
                            body_ar: `تم اخذ الطلب (رقم: ${order.orderId}) من قبل الشريك.`,
                            type: LogSatus.ORDER_UPDATE,
                            userId: order.order.clientId
                        }
                    })
                    return order?.order
                }

                if (status === DeliveryStatus.CANCELED) {
                    const order = await ctx.prisma.delivery.update({
                        where: {
                            orderId: id
                        },
                        data: {
                            status: status
                        },
                        include: {
                            order: true
                        }
                    })
                    await ctx.prisma.log.create({
                        data: {
                            title: `Order #${order.orderId} has been Rejected`,
                            body: `Order (ID: ${order.orderId}) has been Rejected by the Partner.`,
                            title_ar: `تم رفض الطلب رقم #${order.orderId}`,
                            body_ar: `تم رفض الطلب (رقم: ${order.orderId}) من قبل الشريك.`,
                            type: LogSatus.ORDER_UPDATE,
                            userId: order.order.clientId
                        }
                    })
                    return order.order
                }

                if (status === DeliveryStatus.ACCEPTED) {
                    const order = await ctx.prisma.delivery.update({
                        where: {
                            orderId: id
                        },
                        data: {
                            status: status
                        },
                        include: {
                            order: true
                        }
                    })
                    await ctx.prisma.log.create({
                        data: {
                            title: `Order #${order.orderId} has been Accepted`,
                            body: `Order (ID: ${order.orderId}) has been Accepted by the Partner.`,
                            title_ar: `تم قبول الطلب رقم #${order.orderId}`,
                            body_ar: `تم قبول الطلب (رقم: ${order.orderId}) من قبل الشريك.`,
                            type: LogSatus.ORDER_UPDATE,
                            userId: order.order.clientId
                        }
                    })
                    return order.order
                }
                if (status == DeliveryStatus.READY) {

                    const res = ctx.prisma.$transaction(async (tx) => {
                        const delivery = await tx.delivery.update({
                            where: {
                                orderId: id
                            },
                            data: {
                                status: status
                            },
                            include: {
                                order: true
                            }
                        })
                        if (delivery.type === DeliveryType.PICKUP) {
                            await tx.log.create({
                                data: {
                                    title: `Order #${delivery.order.id} is Ready for Pickup`,
                                    body: `Order (ID: ${delivery.order.id}) is ready and can be picked up.`,
                                    title_ar: `الطلب رقم #${delivery.order.id} جاهز للاستلام`,
                                    body_ar: `الطلب (رقم: ${delivery.order.id}) جاهز ويمكن استلامه.`,
                                    type: LogSatus.ORDER_UPDATE,
                                    userId: delivery.order.clientId,
                                },
                            });
                        }
                        if (delivery.type === DeliveryType.GROUPED) {
                            const res = tx.prisma.$transaction(async (tx: Context) => {
                                const schedules = await tx.partnerDeliverySchedule.findMany({
                                    where: {
                                        partnerId,
                                        isActive: true
                                    }
                                })
                                const schedule = pickSchedule(schedules)

                                if (!schedule)
                                    throw 'No schedule yet'

                                const scheduledAt = todayAt(schedule.time)

                                let group = await tx.deliveryGroup.findFirst({
                                    where: {
                                        partnerId,
                                        scheduledAt,
                                        status: 0 // OPEN
                                    }
                                })

                                if (!group) {
                                    group = await tx.deliveryGroup.create({
                                        data: {
                                            partnerId,
                                            scheduledAt
                                        }
                                    })
                                }


                                await ctx.prisma.log.create({
                                    data: {
                                        title: `Order #${delivery.orderId} has been Accepted`,
                                        body: `Order (ID: ${delivery.orderId}) has been accepted and scheduled for group delivery on ${scheduledAt}.`,
                                        title_ar: `تم قبول الطلب رقم #${delivery.orderId}`,
                                        body_ar: `تم قبول الطلب (رقم: ${delivery.orderId}) وجدولته للتوصيل الجماعي يوم ${scheduledAt}.`,
                                        type: LogSatus.ORDER_UPDATE,
                                        userId: delivery.order.clientId,
                                    },
                                });
                                await tx.delivery.update({
                                    where: {
                                        id: delivery.id
                                    },
                                    date: {
                                        deliveryGroupId: group.id,
                                        scheduledAt
                                    }
                                })
                            })
                        }

                        if (delivery.type === DeliveryType.NORMAL) {
                            await ctx.dispatchQueue.add('dispatch-order', {
                                orderId: delivery.orderId,
                                attempt: 1,
                            });
                        }
                        return delivery.order
                    });
                    return res
                }
                if ([DeliveryStatus.ACCEPTED, DeliveryStatus.READY, DeliveryStatus.CANCELED, DeliveryStatus.DELIVERED].includes(status)) {
                    const client = await ctx.prisma.order.findUnique({
                        where: {
                            id
                        },
                        select: {
                            client: {
                                select: {
                                    user: {
                                        select: {
                                            pushTokens: {
                                                orderBy: { createdAt: 'desc' },
                                                take: 1,
                                                select: { id: true, token: true, userId: true },
                                            },
                                        }
                                    }
                                }
                            }
                        }
                    })
                    sendNotification({
                        tokens: client.client.user.pushTokens[0].token,
                        title: "New Order Placed",
                        body: "A customer has placed a new order at your store. Accept now to fulfill this order!",
                        data: {
                            event: "NEW_ORDER",
                            orderId: `${id}`,
                        }
                    })
                }
                return new GraphQLError("Invalid State")
            },
        })
        t.field('createPartnerPosOrder', {
            type: 'Order',
            args: {
                data: nonNull(arg({ type: "PartnerPosOrderInput" }))
            },
            resolve: async (_parent, { data }, ctx: Context) => {
                const partnerId = getUserId(ctx)

                if (!data.items?.length) {
                    throw new GraphQLError("INVALID_POS_ORDER")
                }

                return ctx.prisma.$transaction(async (tx: any) => {
                    const identity = await ensurePartnerPosIdentity(tx, partnerId)
                    const productIds = data.items.map((item: any) => item.productId)
                    const products = await tx.product.findMany({
                        where: {
                            id: {
                                in: productIds
                            },
                            partnerId,
                        },
                        include: {
                            variant: {
                                include: {
                                    product: true,
                                }
                            }
                        }
                    })

                    for (const item of data.items) {
                        const product = products.find((entry: any) => entry.id === item.productId)
                        if (!product) {
                            throw new GraphQLError("PRODUCT_NOT_FOUND")
                        }
                        if (!product.available) {
                            throw new GraphQLError("PRODUCT_UNAVAILABLE")
                        }
                        if (product.stock < item.quantity) {
                            throw new GraphQLError("INSUFFICIENT_STOCK")
                        }
                    }

                    const saleSubtotal = data.items.reduce((sum: number, item: any) => {
                        const product = products.find((entry: any) => entry.id === item.productId)
                        return sum + ((item.price ?? product?.price ?? 0) * item.quantity)
                    }, 0)
                    const partner = await tx.partner.findUnique({
                        where: { userId: partnerId },
                    })
                    const financials = calculatePartnerFee(saleSubtotal, partner)
                    const order = await tx.order.create({
                        data: {
                            partnerId,
                            clientId: identity.user.id,
                            addressId: identity.address.id,
                            deliveryTax: 0,
                            appTax: 0,
                            storeTax: 0,
                            discount: data.discount ?? 0,
                            ...financials,
                            source: "POS",
                            walkInCustomerName: data.customerName ?? null,
                            note: data.note ?? null,
                            paymentMethod: data.paymentMethod ?? null,
                            items: {
                                create: data.items.map((item: any) => ({
                                    productId: item.productId,
                                    quantity: item.quantity,
                                    price: item.price,
                                })),
                            },
                        },
                    })

                    const paymentMethod = ['CASH', 'CARD', 'MIXED', 'OTHER'].includes(String(data.paymentMethod ?? '').toUpperCase())
                        ? String(data.paymentMethod).toUpperCase()
                        : 'OTHER'

                    const sale = await tx.sale.create({
                        data: {
                            saleNumber: `POS-${partnerId}-${order.id}`,
                            partnerId,
                            cashierId: partnerId,
                            sourceOrderId: order.id,
                            customerName: data.customerName ?? null,
                            note: data.note ?? null,
                            subtotal: saleSubtotal,
                            discountTotal: data.discount ?? 0,
                            taxTotal: 0,
                            total: Math.max(0, saleSubtotal - (data.discount ?? 0)),
                            completedAt: new Date(),
                            items: {
                                create: data.items.map((item: any) => {
                                    const product = products.find((entry: any) => entry.id === item.productId)
                                    return {
                                        productId: item.productId,
                                        quantity: item.quantity,
                                        unitPrice: item.price,
                                        total: item.price * item.quantity,
                                        productName: product?.customName ?? product?.variant?.product?.name ?? `Product #${item.productId}`,
                                        variantName: product?.variant?.name,
                                    }
                                })
                            },
                            payments: {
                                create: {
                                    method: paymentMethod,
                                    amount: Math.max(0, saleSubtotal - (data.discount ?? 0)),
                                    reference: order.id.toString(),
                                }
                            }
                        }
                    })

                    for (const item of data.items) {
                        const product = products.find((entry: any) => entry.id === item.productId)
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                stock: {
                                    decrement: item.quantity,
                                },
                            },
                        })
                        await tx.stockMovement.create({
                            data: {
                                productId: item.productId,
                                partnerId,
                                userId: partnerId,
                                saleId: sale.id,
                                type: 'SALE',
                                quantityDelta: -item.quantity,
                                stockBefore: product.stock,
                                stockAfter: product.stock - item.quantity,
                                reason: `POS order #${order.id}`,
                                reference: sale.saleNumber,
                            }
                        })
                    }

                    await tx.delivery.create({
                        data: {
                            orderId: order.id,
                            type: DeliveryType.PICKUP,
                            status: DeliveryStatus.DELIVERED,
                            addressId: identity.address.id,
                            price: 0,
                        }
                    })

                    await tx.log.create({
                        data: {
                            title: `POS sale #${order.id} created`,
                            body: `An in-store point-of-sale order has been completed${data.customerName ? ` for ${data.customerName}` : ""}.`,
                            title_ar: `تم إنشاء عملية بيع نقطة بيع رقم #${order.id}`,
                            body_ar: `تم إتمام طلب نقطة بيع داخل المتجر${data.customerName ? ` للعميل ${data.customerName}` : ""}.`,
                            type: LogSatus.ORDER_UPDATE,
                            userId: partnerId
                        }
                    })

                    return tx.order.findUnique({
                        where: {
                            id: order.id
                        }
                    })
                })
            },
        })
    },
})

export default Mutation
