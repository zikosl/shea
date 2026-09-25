import assert from 'node:assert/strict'
import test from 'node:test'
import { createOrderInboxNotifications, getOrderPushCopy } from './order'

test('order notifications target the counterpart and use deterministic event keys', async () => {
  const writes: any[] = []
  const tx: any = { log: { upsert: async (input: any) => { writes.push(input); return input.create } } }

  await createOrderInboxNotifications(tx, {
    orderId: 42,
    status: 'AWAITING_CLIENT_APPROVAL',
    clientId: 10,
    partnerId: 20,
    actorId: 20,
  })

  assert.equal(writes.length, 1)
  assert.equal(writes[0].create.userId, 10)
  assert.equal(writes[0].create.action, 'REVIEW_QUOTE')
  assert.equal(writes[0].create.priority, 'HIGH')
  assert.equal(writes[0].create.entityType, 'ORDER')
  assert.equal(writes[0].create.eventKey, 'order:42:status:AWAITING_CLIENT_APPROVAL:user:10')
})

test('order push copy respects the recipient language', () => {
  assert.match(getOrderPushCopy('READY', 42, 'en').title, /#42/)
  assert.match(getOrderPushCopy('READY', 42, 'ar-DZ').title, /42/)
  assert.match(getOrderPushCopy('READY', 42, 'ar-DZ').body, /جاهز/)
})
