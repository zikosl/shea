import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeInput } from './index'

const photo = '/uploads/sahim/11111111-1111-4111-8111-111111111111.jpg'

test('barcode contributions require a real package photo and valid GTIN', () => {
  assert.deepEqual(normalizeInput('BARCODE', JSON.stringify({ variantId: 4, barcode: '4006381333931', image: photo })), {
    variantId: 4, barcode: '4006381333931', image: photo,
  })
  assert.throws(() => normalizeInput('BARCODE', JSON.stringify({ variantId: 4, barcode: '4006381333932', image: photo })))
  assert.throws(() => normalizeInput('BARCODE', JSON.stringify({ variantId: 4, barcode: '4006381333931', image: 'https://untrusted.test/pic.jpg' })))
})

test('product contributions generate SKU and reject duplicate variant codes', () => {
  const base = { name: 'Rose perfume', categoryId: 3, image: photo, variants: [{ name: '50 ml', tags: ['Rose', '50 ml'], barcode: '4006381333931' }] }
  const result = normalizeInput('PRODUCT', JSON.stringify(base)) as any
  assert.match(result.variants[0].sku, /^ROSE-PERFUME-ROSE-50-ML-/)
  assert.throws(() => normalizeInput('PRODUCT', JSON.stringify({ ...base, variants: [base.variants[0], base.variants[0]] })), /DUPLICATE_BARCODE/)
})
