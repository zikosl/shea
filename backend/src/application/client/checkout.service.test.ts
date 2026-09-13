import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Prisma, PrismaClient } from '@prisma/client'
import { previewCheckout, submitCheckout } from './checkout.service'
import { DeliveryType, PricingName } from '../../types'

function fixture() {
  const product = { id: 7, price: 200, stock: 5, trackInventory: true, available: true, isActive: true, onlineVisible: true }
  const state = { created: 0, addressReads: 0, existing: null as any }
  const db: any = {
    partner: { findUnique: async () => ({ userId: 2, online: true }) },
    address: { findFirst: async () => { state.addressReads++; return { id: 3, latitude: 36, longitude: 7 } } },
    product: { findMany: async () => [product] },
    pricing: { findMany: async () => [{ name: PricingName.APP_TAX, price: 10 }, { name: PricingName.NORMAL_DELIVERY_TAX, price: 50 }] },
    order: {
      findUnique: async () => state.existing,
      create: async ({ data }: any) => { state.created++; state.existing = { id: 9, ...data }; return state.existing },
    },
    log: { create: async () => ({}) },
    pushToken: { findMany: async () => [] },
    $transaction: async (callback: any) => callback(db),
  }
  const input = { partnerId: 2, deliveryType: DeliveryType.NORMAL, requestKey: 'checkout_123', items: [{ productId: 7, quantity: 2, price: 200 }] }
  return { db: db as Prisma.TransactionClient & PrismaClient, product, input, state }
}

test('checkout uses catalog prices, quantities, and configured fees', async () => {
  const { db, input } = fixture()
  const result = await previewCheckout(db, 1, { ...input, items: [{ productId: 7, quantity: 2, price: 1 }] })
  assert.equal(result.subtotal, 400)
  assert.equal(result.total, 460)
})

test('pickup does not require or read a delivery address', async () => {
  const { db, input, state } = fixture()
  const result = await previewCheckout(db, 1, { ...input, deliveryType: DeliveryType.PICKUP })
  assert.equal(result.address, null)
  assert.equal(state.addressReads, 0)
  assert.equal(result.deliveryTax, 0)
})

test('duplicate lines cannot bypass stock checks', async () => {
  const { db, input } = fixture()
  await assert.rejects(previewCheckout(db, 1, { ...input, items: [{ productId: 7, quantity: 3 }, { productId: 7, quantity: 3 }] }), /INSUFFICIENT_STOCK/)
})

test('invalid quantities and unavailable products are rejected', async () => {
  const { db, input, product } = fixture()
  for (const quantity of [0, -1, 1.5, NaN]) {
    await assert.rejects(previewCheckout(db, 1, { ...input, items: [{ productId: 7, quantity }] }), /INVALID_ORDER/)
  }
  product.available = false
  await assert.rejects(previewCheckout(db, 1, input), /PRODUCT_UNAVAILABLE/)
})

test('a changed total never creates an order', async () => {
  const { db, input, state } = fixture()
  await assert.rejects(submitCheckout(db, 1, { ...input, expectedTotal: 400 }), /PRICE_CHANGED/)
  assert.equal(state.created, 0)
})

test('a retry returns the committed order without creating a duplicate', async () => {
  const { db, input, state } = fixture()
  const first = await submitCheckout(db, 1, { ...input, expectedTotal: 460 })
  const second = await submitCheckout(db, 1, { ...input, expectedTotal: 460 })
  assert.equal(first.id, second.id)
  assert.equal(state.created, 1)
  assert.equal(first.requestKey, '1:checkout_123')
})
