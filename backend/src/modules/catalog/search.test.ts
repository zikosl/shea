import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalogSearchTerms, previewSearchWhere, productSearchWhere, templateSearchWhere } from './search'

test('search normalizes words without requiring their original order', () => {
  assert.deepEqual(catalogSearchTerms('  Parfum, VANILLE parfum  '), ['parfum', 'vanille'])
  assert.deepEqual(catalogSearchTerms('عطر ورد'), ['عطر', 'ورد'])
  assert.deepEqual(catalogSearchTerms('ABC-123'), ['abc', '123'])
})

test('each term can match a different catalog field, including descriptions', () => {
  const terms = catalogSearchTerms('vanille 100ml')
  const preview = previewSearchWhere(terms)
  const product = productSearchWhere(terms)
  const template = templateSearchWhere(terms)
  assert.equal((preview.AND as unknown[]).length, 2)
  assert.ok(JSON.stringify(preview).includes('description_ar'))
  assert.ok(JSON.stringify(preview).includes('variant_name'))
  assert.ok(JSON.stringify(product).includes('customDescription'))
  assert.ok(JSON.stringify(template).includes('description'))
})

test('search rejects punctuation-only and unbounded queries', () => {
  assert.throws(() => catalogSearchTerms('!!!'), /SEARCH_INVALID/)
  assert.throws(() => catalogSearchTerms('x'.repeat(121)), /SEARCH_TOO_LONG/)
  assert.throws(() => catalogSearchTerms('a b c d e f g h i j k'), /SEARCH_TOO_MANY_TERMS/)
})
