import assert from 'node:assert/strict'
import test from 'node:test'
import { getExpoPushReceipts, sendNotification } from './firebase'

test('Expo push tickets are delivered without requiring Firebase messaging', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    const messages = JSON.parse(String(init?.body))
    assert.equal(messages[0].to, 'ExpoPushToken[test-device]')
    assert.equal(messages[0].data.orderId, '42')
    return { ok: true, json: async () => ({ data: [{ status: 'ok', id: 'ticket-1' }] }) } as Response
  }) as typeof fetch

  try {
    const result = await sendNotification({
      tokens: 'ExpoPushToken[test-device]',
      title: 'Order ready',
      body: 'Your order is ready.',
      data: { orderId: '42' },
    })
    assert.equal(result.sent, 1)
    assert.deepEqual(result.transientFailureTokens, [])
    assert.deepEqual(result.expoTickets, [{ id: 'ticket-1', token: 'ExpoPushToken[test-device]' }])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Expo receipts distinguish delivery, pending, and invalid devices', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    assert.deepEqual(JSON.parse(String(init?.body)), { ids: ['ok', 'missing', 'invalid', 'rate-limited'] })
    return {
      ok: true,
      json: async () => ({ data: {
        ok: { status: 'ok' },
        invalid: { status: 'error', details: { error: 'DeviceNotRegistered' } },
        'rate-limited': { status: 'error', details: { error: 'MessageRateExceeded' } },
      } }),
    } as Response
  }) as typeof fetch

  try {
    assert.deepEqual(await getExpoPushReceipts(['ok', 'missing', 'invalid', 'rate-limited']), [
      { ticketId: 'ok', status: 'DELIVERED' },
      { ticketId: 'missing', status: 'PENDING' },
      { ticketId: 'invalid', status: 'PERMANENT_FAILURE', error: 'DeviceNotRegistered' },
      { ticketId: 'rate-limited', status: 'TRANSIENT_FAILURE', error: 'MessageRateExceeded' },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Expo permanently rejects tokens for unregistered devices', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] }),
  }) as Response) as typeof fetch

  try {
    const result = await sendNotification({
      tokens: 'ExponentPushToken[old-device]',
      title: 'Order update',
      body: 'Updated',
    })
    assert.deepEqual(result.permanentFailureTokens, ['ExponentPushToken[old-device]'])
  } finally {
    globalThis.fetch = originalFetch
  }
})
