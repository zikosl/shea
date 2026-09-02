// @ts-nocheck
import { enumType, inputObjectType, objectType } from 'nexus'

const StockMovementType = enumType({
  name: 'StockMovementType',
  members: ['SALE', 'RETURN', 'RECEIPT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT'],
})

const SaleStatus = enumType({
  name: 'SaleStatus',
  members: ['DRAFT', 'COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'VOIDED'],
})

const PaymentMethod = enumType({
  name: 'PaymentMethod',
  members: ['CASH', 'CARD', 'MIXED', 'OTHER'],
})

const PaymentStatus = enumType({
  name: 'PaymentStatus',
  members: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
})

const CashSessionStatus = enumType({
  name: 'CashSessionStatus',
  members: ['OPEN', 'CLOSED'],
})

const SyncEventStatus = enumType({
  name: 'SyncEventStatus',
  members: ['PENDING', 'PROCESSING', 'SYNCED', 'ERROR', 'CONFLICT'],
})

const SyncEventAction = enumType({
  name: 'SyncEventAction',
  members: ['CREATE', 'UPDATE', 'DELETE', 'ARCHIVE'],
})

const Device = objectType({
  name: 'Device',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.string('deviceKey')
    t.nonNull.int('partnerId')
    t.string('name')
    t.nonNull.field('platform', { type: 'Platform' })
    t.string('appVersion')
    t.field('lastSyncAt', { type: 'DateTime' })
    t.field('revokedAt', { type: 'DateTime' })
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
  },
})

const Sale = objectType({
  name: 'Sale',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.string('saleNumber')
    t.nonNull.int('partnerId')
    t.string('deviceId')
    t.int('cashierId')
    t.int('sourceOrderId')
    t.nonNull.field('status', { type: 'SaleStatus' })
    t.string('customerName')
    t.string('note')
    t.nonNull.float('subtotal')
    t.nonNull.float('discountTotal')
    t.nonNull.float('taxTotal')
    t.nonNull.float('total')
    t.nonNull.float('costTotal')
    t.nonNull.float('grossProfit')
    t.nonNull.float('partnerFee')
    t.nonNull.float('netProfit')
    t.field('completedAt', { type: 'DateTime' })
    t.string('voidReason')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
    t.nonNull.list.nonNull.field('items', {
      type: 'SaleItem',
      resolve: (parent, _args, ctx) => ctx.prisma.saleItem.findMany({ where: { saleId: parent.id } }),
    })
    t.nonNull.list.nonNull.field('payments', {
      type: 'Payment',
      resolve: (parent, _args, ctx) => ctx.prisma.payment.findMany({ where: { saleId: parent.id } }),
    })
  },
})

const SaleItem = objectType({
  name: 'SaleItem',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.string('saleId')
    t.nonNull.int('productId')
    t.nonNull.float('quantity')
    t.nonNull.float('unitPrice')
    t.nonNull.float('discount')
    t.nonNull.float('tax')
    t.nonNull.float('total')
    t.nonNull.float('costPrice')
    t.nonNull.float('profit')
    t.nonNull.string('productName')
    t.string('variantName')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.field('product', {
      type: 'ProductView',
      resolve: (parent, _args, ctx) => ctx.prisma.productView.findUnique({ where: { id: parent.productId } }),
    })
  },
})

const Payment = objectType({
  name: 'Payment',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.string('saleId')
    t.nonNull.field('method', { type: 'PaymentMethod' })
    t.nonNull.field('status', { type: 'PaymentStatus' })
    t.nonNull.float('amount')
    t.string('reference')
    t.nonNull.field('createdAt', { type: 'DateTime' })
  },
})

const StockMovement = objectType({
  name: 'StockMovement',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.int('productId')
    t.nonNull.int('partnerId')
    t.int('userId')
    t.string('saleId')
    t.nonNull.field('type', { type: 'StockMovementType' })
    t.nonNull.float('quantityDelta')
    t.nonNull.int('stockBefore')
    t.nonNull.int('stockAfter')
    t.string('reason')
    t.string('reference')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.field('product', {
      type: 'ProductView',
      resolve: (parent, _args, ctx) => ctx.prisma.productView.findUnique({ where: { id: parent.productId } }),
    })
  },
})

const CashSession = objectType({
  name: 'CashSession',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.int('partnerId')
    t.string('deviceId')
    t.nonNull.int('openedById')
    t.int('closedById')
    t.nonNull.field('status', { type: 'CashSessionStatus' })
    t.nonNull.float('openingAmount')
    t.nonNull.float('cashIn')
    t.nonNull.float('cashOut')
    t.nonNull.float('expectedCash')
    t.float('countedCash')
    t.float('difference')
    t.string('note')
    t.nonNull.field('openedAt', { type: 'DateTime' })
    t.field('closedAt', { type: 'DateTime' })
  },
})

const SyncEvent = objectType({
  name: 'SyncEvent',
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.int('partnerId')
    t.string('deviceId')
    t.nonNull.string('idempotencyKey')
    t.nonNull.string('entity')
    t.nonNull.field('action', { type: 'SyncEventAction' })
    t.nonNull.string('payload', {
      resolve: (parent) => JSON.stringify(parent.payload ?? {}),
    })
    t.nonNull.field('status', { type: 'SyncEventStatus' })
    t.string('error')
    t.nonNull.int('attempts')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.field('processedAt', { type: 'DateTime' })
  },
})

const PosBootstrap = objectType({
  name: 'PosBootstrap',
  definition(t) {
    t.nonNull.string('cursor')
    t.nonNull.field('generatedAt', { type: 'DateTime' })
    t.nonNull.field('offlineUntil', { type: 'DateTime' })
    t.nonNull.string('payload')
  },
})

const SalePaymentInput = inputObjectType({
  name: 'SalePaymentInput',
  definition(t) {
    t.nonNull.field('method', { type: 'PaymentMethod' })
    t.float('amount')
    t.string('reference')
  },
})

const PosSaleItemInput = inputObjectType({
  name: 'PosSaleItemInput',
  definition(t) {
    t.nonNull.int('productId')
    t.nonNull.float('quantity')
    t.float('unitPrice')
    t.float('discount')
    t.float('tax')
  },
})

const CreateSaleInput = inputObjectType({
  name: 'CreateSaleInput',
  definition(t) {
    t.string('saleNumber')
    t.string('deviceId')
    t.string('customerName')
    t.string('note')
    t.float('discountTotal')
    t.float('taxTotal')
    t.nonNull.list.nonNull.field('items', { type: 'PosSaleItemInput' })
    t.field('payment', { type: 'SalePaymentInput' })
  },
})

export default {
  StockMovementType,
  SaleStatus,
  PaymentMethod,
  PaymentStatus,
  CashSessionStatus,
  SyncEventStatus,
  SyncEventAction,
  Device,
  Sale,
  SaleItem,
  Payment,
  StockMovement,
  CashSession,
  SyncEvent,
  PosBootstrap,
  SalePaymentInput,
  PosSaleItemInput,
  CreateSaleInput,
}
