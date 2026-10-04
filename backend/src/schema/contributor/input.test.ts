import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeInput } from './index'

const photo = '/uploads/sahim/11111111-1111-4111-8111-111111111111.jpg'

test('barcode contributions accept the scanned GTIN without reopening the camera', () => {
  assert.deepEqual(normalizeInput('BARCODE', JSON.stringify({ variantId: 4, barcode: '4006381333931' })), {
    variantId: 4, barcode: '4006381333931',
  })
  assert.deepEqual(normalizeInput('BARCODE', JSON.stringify({ variantId: 4, barcode: '4006381333931', image: photo })), {
    variantId: 4, barcode: '4006381333931', image: photo,
  })
  assert.throws(() => normalizeInput('BARCODE', JSON.stringify({ variantId: 0, barcode: '4006381333931' })))
  assert.throws(() => normalizeInput('BARCODE', JSON.stringify({ variantId: 4, barcode: '4006381333932', image: photo })))
  assert.throws(() => normalizeInput('BARCODE', JSON.stringify({ variantId: 4, barcode: '4006381333931', image: 'https://untrusted.test/pic.jpg' })))
})

test('product contributions generate SKU and reject duplicate variant codes', () => {
  const base = { name: 'Rose perfume', categoryId: 3, image: photo, variants: [{ name: '50 ml', tags: ['Rose', '50 ml'], barcode: '4006381333931' }] }
  const result = normalizeInput('PRODUCT', JSON.stringify(base)) as any
  assert.match(result.variants[0].sku, /^ROSE-PERFUME-ROSE-50-ML-/)
  assert.throws(() => normalizeInput('PRODUCT', JSON.stringify({ ...base, variants: [base.variants[0], base.variants[0]] })), /DUPLICATE_BARCODE/)
})

test('product suggestions retain reviewed description and template choice without trusting arbitrary image URLs', () => {
  const input = { name: 'Rose perfume', description: 'Floral scent', categoryId: 3, mergeTemplateId: 42,
    sourceUrl: 'https://world.openbeautyfacts.org/product/4006381333931',
    sourceImageUrl: 'https://untrusted.example/pic.jpg', image: photo,
    variants: [{ name: '50 ml', tags: ['Rose', '50 ml'], barcode: '4006381333931' }] }
  const result = normalizeInput('PRODUCT', JSON.stringify(input)) as any
  assert.equal(result.mergeTemplateId, 42)
  assert.equal(result.description, 'Floral scent')
  assert.equal(result.sourceUrl, input.sourceUrl)
  assert.equal(result.sourceImageUrl, undefined)
  assert.equal(result.image, photo)
})

test('variant-only requests preserve the existing template and may omit a template image', () => {
  const input = { name: 'Nutella', categoryId: 3, mergeTemplateId: 42,
    variants: [{ name: 'Nutella', tags: ['Hazelnut spread'], barcode: '4006381333931' }] }
  const result = normalizeInput('PRODUCT', JSON.stringify(input)) as any
  assert.equal(result.image, undefined)
  assert.equal(result.variants[0].image, undefined)
  assert.throws(() => normalizeInput('PRODUCT', JSON.stringify({ ...input, mergeTemplateId: undefined })), /PACKAGE_IMAGE_REQUIRED/)
})

test('imported suggested images keep their source for admin review', () => {
  const input = { name: 'Nutella', categoryId: 3, image: photo, imageSource: 'EXTERNAL',
    sourceImageUrl: 'https://images.openfoodfacts.org/images/products/example.jpg',
    variants: [{ name: 'Nutella', tags: ['hazelnut spread'], image: photo, imageSource: 'EXTERNAL' }] }
  const result = normalizeInput('PRODUCT', JSON.stringify(input)) as any
  assert.equal(result.image, photo)
  assert.equal(result.imageSource, 'EXTERNAL')
  assert.equal(result.variants[0].imageSource, 'EXTERNAL')
  assert.equal(result.sourceImageUrl, input.sourceImageUrl)
})
