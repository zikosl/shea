import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isValidGtin, normalizeGtin, requireGtin } from './barcodes'

test('accepts valid GTIN lengths and preserves leading zeros', () => {
  assert.equal(isValidGtin('4006381333931'), true)
  assert.equal(isValidGtin('036000291452'), true)
  assert.equal(isValidGtin('96385074'), true)
  assert.equal(requireGtin(' 4006-3813-3393-1 '), '4006381333931')
  assert.equal(normalizeGtin('0360 0029 1452'), '036000291452')
})

test('rejects a wrong check digit or an internal Shea SKU', () => {
  assert.equal(isValidGtin('4006381333932'), false)
  assert.equal(isValidGtin('SHEA-COS-D902204D44CE'), false)
  assert.throws(() => requireGtin('4006381333932'))
})
