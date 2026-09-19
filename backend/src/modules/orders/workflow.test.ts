import assert from 'node:assert/strict'
import test from 'node:test'
import { allowedOrderTransitions } from './workflow'

test('a fixed-price order follows the fulfillment lifecycle', () => {
  assert.ok(allowedOrderTransitions.REQUESTED.includes('PARTNER_ACCEPTED'))
  assert.ok(allowedOrderTransitions.PARTNER_ACCEPTED.includes('PREPARING'))
  assert.ok(allowedOrderTransitions.PREPARING.includes('READY'))
  assert.ok(allowedOrderTransitions.READY.includes('FULFILLMENT_STARTED'))
  assert.ok(allowedOrderTransitions.FULFILLMENT_STARTED.includes('COMPLETED'))
})

test('a quoted order waits for the client and terminal states cannot reopen', () => {
  assert.ok(allowedOrderTransitions.REQUESTED.includes('AWAITING_CLIENT_APPROVAL'))
  assert.ok(allowedOrderTransitions.AWAITING_CLIENT_APPROVAL.includes('CONFIRMED'))
  assert.deepEqual(allowedOrderTransitions.COMPLETED, [])
  assert.deepEqual(allowedOrderTransitions.CANCELLED, [])
  assert.deepEqual(allowedOrderTransitions.PARTNER_REJECTED, [])
})
