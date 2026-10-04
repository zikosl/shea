import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeTestFlightEmail } from './validation'

test('TestFlight invitation emails are normalized for deduplication', () => {
  assert.equal(normalizeTestFlightEmail('  Tester@Example.com  '), 'tester@example.com')
})

test('TestFlight invitation emails must have a valid shape and safe length', () => {
  for (const value of ['', 'someone', 'someone@example', 'a\nb@example.com', `${'a'.repeat(250)}@example.com`]) {
    assert.throws(() => normalizeTestFlightEmail(value), /INVALID_TESTFLIGHT_EMAIL/)
  }
})
