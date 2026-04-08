// @ts-nocheck
import { enumType, inputObjectType, objectType } from "nexus"

const Order = objectType({
    name: 'Order',
    definition(t) {
        t.nonNull.int('id')
        t.field('date', { type: "DateTime" })
        t.int('partnerId')
        t.float('appTax')
        t.float('deliveryTax')
        t.float('storeTax')
        t.float('price')
        t.int('addressId')
        t.field('address', {
            type: 'Address',
            resolve: (parent, _, ctx) =>
                ctx.prisma.address.findUnique({
                    where: { id: parent.addressId }
                })
        })
        t.field('delivery', {
            type: 'Delivery',
            resolve: (parent, _, ctx) =>
                ctx.prisma.delivery.findUnique({
                    where: { orderId: parent.id }
                })
        })
        t.float('total', {
            resolve: async (parent, _args, ctx) => {
                const res: any = await ctx.prisma.$queryRaw`
                SELECT SUM(quantity * price) as total
                    FROM "OrderItem"
                    WHERE "orderId" = ${parent.id};
                `
                return res[0].total
            }
        })
        t.field('partner', {
            type: 'Partner',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.partner.findUnique({
                    where: { userId: parent.partnerId },
                })
            }
        })
        t.int('clientId')
        t.field('client', {
            type: 'Client',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.client.findUnique({
                    where: { userId: parent.clientId },
                })
            }
        })
        t.nonNull.list.field('items', {
            type: 'OrderItem',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.orderItem.findMany({
                    where: { orderId: parent.id },
                })
            }
        })
    },
})


const OrderItem = objectType({
    name: 'OrderItem',
    definition(t) {
        t.nonNull.int('id')
        t.int('quantity')
        t.float('price')
        t.int('productId')
        t.int('orderId')
        t.field('product', {
            type: 'ProductView',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.productView.findUnique({
                    where: { id: parent.productId },
                })
            }
        })
    },
})


const Delivery = objectType({
    name: 'Delivery',
    definition(t) {
        t.nonNull.int('id')
        t.field('type', { type: 'DeliveryType' })
        t.field('status', { type: 'DeliveryStatus' })
        t.float('price')
        t.int('orderId')
        t.int('driverId')
        t.int('addressId')
    }
})


const OrderDispatch = objectType({
    name: 'OrderDispatch',
    definition(t) {
        t.nonNull.int('id')
        t.int('orderId')
        t.int('driverId')
        t.field('sentAt', { type: "DateTime" })
        t.field('expiresAt', { type: "DateTime" })
        t.field('status', { type: "DispatchStatus" })
        t.int('deliveryId')
        t.field('delivery', {
            type: 'Delivery',
            resolve: (parent, _, ctx) =>
                ctx.prisma.delivery.findUnique({
                    where: { id: parent.deliveryId }
                })
        })
        t.field('order', {
            type: 'Order',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.order.findUnique({
                    where: { id: parent.orderId },
                })
            }
        })
        t.field('driver', {
            type: 'Driver',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.driver.findUnique({
                    where: { id: parent.driverId },
                })
            }
        })
    },
})



const DeliveryStatus = enumType({
    name: 'DeliveryStatus',
    members: {
        PENDING: 0,
        ACCEPTED: 1,
        READY: 2,
        ASSIGNED: 3,
        PICKED: 4,
        DELIVERED: 5,
        CANCELED: 6
    }
});

const DeliveryType = enumType({
    name: 'DeliveryType',

    members: {
        PICKUP: 0,
        NORMAL: 1,
        GROUPED: 2,
    }
});



const DispatchStatus = enumType({
    name: 'DispatchStatus',
    members: {
        SENT: 0,
        EXPIRED: 1,
        ACCEPTED: 2,
        REJECTED: 3,
    }
});


const OrderResult = objectType({
    name: 'OrderResult',
    definition(t) {
        t.nonNull.list.nonNull.field('orders', { type: 'Order' })
        t.int('totalOrders')
    },
})

const OrderInput = inputObjectType({
    name: "OrderInput",
    definition(t) {
        t.int('partnerId')
        t.int('addressId')
        t.nonNull.list.field('items', { type: OrderItemInput })
        t.nonNull.field('deliveryType', { type: 'DeliveryType' })
        t.int('addressId')
        t.float('deliveryPrice')
    }
})

const OrderItemInput = inputObjectType({
    name: "OrderItemInput",
    definition(t) {
        t.float('price')
        t.int('quantity')
        t.int('productId')
    }
})
export default { DeliveryStatus, DeliveryType, Delivery, OrderDispatch, DispatchStatus, OrderItemInput, OrderInput, OrderResult, Order, OrderItem } 
