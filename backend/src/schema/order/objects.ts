// @ts-nocheck
import { enumType, inputObjectType, objectType } from "nexus"

const Order = objectType({
    name: 'Order',
    definition(t) {
        t.nonNull.int('id')
        t.field('date', { type: "DateTime" })
        t.string('source')
        t.string('walkInCustomerName')
        t.string('note')
        t.string('paymentMethod')
        t.float('discount')
        t.int('partnerId')
        t.float('appTax')
        t.float('deliveryTax')
        t.float('storeTax')
        t.float('subtotal')
        t.float('partnerGross')
        t.float('partnerFee')
        t.float('partnerNet')
        t.field('partnerFeeType', { type: 'PartnerFeeType' })
        t.float('partnerFeeRate')
        t.float('partnerFixedFee')
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

const DriverRoute = objectType({
    name: 'DriverRoute',
    definition(t) {
        t.nonNull.string('encodedPolyline')
        t.nonNull.int('distanceMeters')
        t.nonNull.int('durationSeconds')
    },
})

const AdminDispatchLine = objectType({
    name: 'AdminDispatchLine',
    definition(t) {
        t.nonNull.int('id')
        t.nonNull.string('name')
        t.nonNull.int('quantity')
        t.nonNull.float('price')
    },
})

const AdminDispatchOrder = objectType({
    name: 'AdminDispatchOrder',
    definition(t) {
        t.nonNull.int('orderId')
        t.nonNull.int('deliveryId')
        t.nonNull.field('status', { type: 'DeliveryStatus' })
        t.nonNull.field('type', { type: 'DeliveryType' })
        t.nonNull.field('createdAt', { type: 'DateTime' })
        t.field('scheduledAt', { type: 'DateTime' })
        t.nonNull.float('total')
        t.nonNull.string('partnerName')
        t.string('partnerAddress')
        t.nonNull.float('partnerLatitude')
        t.nonNull.float('partnerLongitude')
        t.nonNull.string('clientName')
        t.string('clientPhone')
        t.string('destinationAddress')
        t.float('destinationLatitude')
        t.float('destinationLongitude')
        t.int('assignedDriverId')
        t.nonNull.int('dispatchCount')
        t.nonNull.int('activeOfferCount')
        t.field('lastDispatchAt', { type: 'DateTime' })
        t.nonNull.boolean('needsAttention')
        t.nonNull.list.nonNull.field('items', { type: 'AdminDispatchLine' })
    },
})

const AdminDispatchDriver = objectType({
    name: 'AdminDispatchDriver',
    definition(t) {
        t.nonNull.int('userId')
        t.nonNull.string('name')
        t.string('phone')
        t.string('email')
        t.nonNull.float('latitude')
        t.nonNull.float('longitude')
        t.nonNull.boolean('online')
        t.nonNull.boolean('isAvailable')
        t.field('locationUpdatedAt', { type: 'DateTime' })
        t.nonNull.int('activeDeliveryCount')
        t.nonNull.string('state')
    },
})

const AdminDispatchBoard = objectType({
    name: 'AdminDispatchBoard',
    definition(t) {
        t.nonNull.field('generatedAt', { type: 'DateTime' })
        t.nonNull.list.nonNull.field('orders', { type: 'AdminDispatchOrder' })
        t.nonNull.list.nonNull.field('drivers', { type: 'AdminDispatchDriver' })
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

const PartnerPosOrderInput = inputObjectType({
    name: "PartnerPosOrderInput",
    definition(t) {
        t.string('customerName')
        t.string('note')
        t.string('paymentMethod')
        t.float('discount')
        t.nonNull.list.field('items', { type: OrderItemInput })
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
export default { AdminDispatchBoard, AdminDispatchDriver, AdminDispatchLine, AdminDispatchOrder, DriverRoute, DeliveryStatus, DeliveryType, Delivery, OrderDispatch, DispatchStatus, OrderItemInput, OrderInput, PartnerPosOrderInput, OrderResult, Order, OrderItem }
