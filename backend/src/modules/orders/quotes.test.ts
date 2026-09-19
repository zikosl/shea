import assert from 'node:assert/strict'
import test from 'node:test'
import { createOrderQuotation, respondToOrderQuotation } from './quotes'

function fixture() {
  const order: any = {
    id: 41,
    partnerId: 2,
    clientId: 3,
    pricingMode: 'QUOTE_REQUIRED',
    status: 'REQUESTED',
    version: 1,
    appTax: 10,
    deliveryTax: 50,
    discount: 0,
    partner: { feeType: 'PERCENTAGE', feeRate: 10, fixedFee: 0 },
    items: [
      { id: 71, productId: 7, quantity: 2, price: 0, nameSnapshot: 'Rose perfume' },
      { id: 72, productId: 8, quantity: 1, price: 0, nameSnapshot: 'Gift box' },
    ],
  }
  let quotation: any = null
  const history: any[] = []
  const db: any = {
    order: {
      findFirst: async ({ where }: any) => where.id === order.id && where.partnerId === order.partnerId ? order : null,
      findUnique: async () => quotation ? { ...quotation, order } : null,
      findUniqueOrThrow: async () => order,
      updateMany: async ({ where, data }: any) => {
        if (where.id !== order.id || where.version !== order.version || where.status !== order.status) return { count: 0 }
        order.status = data.status
        order.version += data.version?.increment ?? 0
        Object.assign(order, Object.fromEntries(Object.entries(data).filter(([key]) => !['status', 'version'].includes(key))))
        return { count: 1 }
      },
    },
    orderQuotation: {
      updateMany: async ({ where, data }: any) => {
        if (where.id) {
          if (!quotation || quotation.id !== where.id || quotation.status !== where.status || quotation.version !== where.version) return { count: 0 }
          quotation.status = data.status
          quotation.version += data.version?.increment ?? 0
          return { count: 1 }
        }
        return { count: 0 }
      },
      create: async ({ data }: any) => {
        quotation = { id: 'quote-1', version: 1, ...data, lines: data.lines.create }
        return quotation
      },
      findUnique: async () => quotation ? { ...quotation, order } : null,
    },
    orderItem: { update: async ({ where, data }: any) => {
      const item = order.items.find((candidate: any) => candidate.id === where.id)
      item.price = data.price
      return item
    } },
    orderStatusHistory: { create: async ({ data }: any) => { history.push(data); return data } },
    outboxEvent: { upsert: async ({ create }: any) => create },
    $transaction: async (callback: any) => callback(db),
  }
  return { db, order, history, getQuotation: () => quotation }
}

test('partner quotation prices every item and waits for client approval', async () => {
  const { db, order, history, getQuotation } = fixture()
  const quote = await createOrderQuotation(db, 2, {
    orderId: order.id,
    expectedVersion: 1,
    lines: [{ orderItemId: 71, unitPrice: 125 }, { orderItemId: 72, unitPrice: 50 }],
  })

  assert.equal(quote.subtotal, 300)
  assert.equal(quote.total, 360)
  assert.equal(order.status, 'AWAITING_CLIENT_APPROVAL')
  assert.equal(order.version, 2)
  assert.deepEqual(order.items.map((item: any) => item.price), [125, 50])
  assert.equal(getQuotation().status, 'SENT')
  assert.equal(history[0].to, 'AWAITING_CLIENT_APPROVAL')
})

test('only the owning client can accept the active quotation once', async () => {
  const { db, order, getQuotation } = fixture()
  await createOrderQuotation(db, 2, {
    orderId: order.id,
    expectedVersion: 1,
    lines: [{ orderItemId: 71, unitPrice: 125 }, { orderItemId: 72, unitPrice: 50 }],
  })

  await assert.rejects(respondToOrderQuotation(db, 99, {
    quotationId: getQuotation().id, accepted: true, expectedOrderVersion: 2, expectedQuoteVersion: 1,
  }), /QUOTATION_NOT_FOUND/)

  await respondToOrderQuotation(db, 3, {
    quotationId: getQuotation().id, accepted: true, expectedOrderVersion: 2, expectedQuoteVersion: 1,
  })
  assert.equal(order.status, 'CONFIRMED')
  assert.equal(order.version, 3)
  assert.equal(getQuotation().status, 'ACCEPTED')
  await assert.rejects(respondToOrderQuotation(db, 3, {
    quotationId: getQuotation().id, accepted: true, expectedOrderVersion: 2, expectedQuoteVersion: 1,
  }), /QUOTATION_VERSION_CONFLICT/)
})

test('a quotation rejects missing item prices and stale order versions', async () => {
  const { db, order } = fixture()
  await assert.rejects(createOrderQuotation(db, 2, {
    orderId: order.id, expectedVersion: 1, lines: [{ orderItemId: 71, unitPrice: 125 }],
  }), /QUOTATION_MUST_PRICE_ALL_ITEMS/)
  await assert.rejects(createOrderQuotation(db, 2, {
    orderId: order.id, expectedVersion: 99,
    lines: [{ orderItemId: 71, unitPrice: 125 }, { orderItemId: 72, unitPrice: 50 }],
  }), /ORDER_VERSION_CONFLICT/)
})
