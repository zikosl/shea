import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeSessionMetadata, type SessionMetadata } from './auth.service'

test('session metadata excludes credentials and unknown GraphQL arguments', () => {
  const input = {
    deviceKey: ' device-1 ',
    deviceName: 'Register one',
    platform: 'desktop',
    appVersion: '1.2.3',
    ipAddress: '127.0.0.1',
    userAgent: 'node',
    email: 'owner@example.com',
    password: 'never-persist-this',
  } as SessionMetadata

  assert.deepEqual(sanitizeSessionMetadata(input), {
    deviceKey: 'device-1',
    deviceName: 'Register one',
    platform: 'desktop',
    appVersion: '1.2.3',
    ipAddress: '127.0.0.1',
    userAgent: 'node',
  })
})

test('session metadata ignores empty values and bounds untrusted strings', () => {
  const result = sanitizeSessionMetadata({
    deviceKey: '   ',
    userAgent: 'x'.repeat(1_000),
  })

  assert.equal(result.deviceKey, undefined)
  assert.equal(result.userAgent?.length, 512)
})
