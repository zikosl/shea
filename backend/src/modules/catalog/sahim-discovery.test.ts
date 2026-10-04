import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { discoverBarcode, externalBarcodeLookup, rankTemplate, searchWords } from './sahim-discovery'

const code = '3017620422003'

test('candidate search accepts shared words but ranks brand and size, not a common word alone', () => {
  assert.deepEqual(searchWords('Crème de cacao 250 g'), ['creme', 'cacao', '250', 'g'])
  const source = { name: 'Nivea Soft Cream', nameAr: '', description: '', brand: 'Nivea', quantity: '250 ml', imageUrl: null, sourceUrl: '', sourceName: 'Open Facts' }
  const strong = rankTemplate(source, { name: 'Soft Nivea cream', description: '', Brand: { name: 'Nivea' }, variants: [{ name: '250 ml' }] })
  const weak = rankTemplate(source, { name: 'Cream', description: '', Brand: { name: 'Other' }, variants: [{ name: '100 ml' }] })
  assert.ok(strong.score > weak.score)
  assert.match(strong.reason, /Brand matches/)
  assert.match(weak.reason, /Size may differ/)
})

test('worldwide lookup distinguishes a missing product from an unavailable provider', async () => {
  const missing = await externalBarcodeLookup('3017620422010', async () => new Response(null, { status: 404 }) as never)
  assert.equal(missing.status, 'NOT_FOUND')
  const unavailable = await externalBarcodeLookup('3017620422027', async () => { throw new Error('timeout') })
  assert.equal(unavailable.status, 'UNAVAILABLE')
})

test('worldwide lookup accepts v3 success and only a safe external image host', async () => {
  const fetcher = async () => new Response(JSON.stringify({ status: 'success', product: {
    product_name: 'Hazelnut Spread', brands: 'Test', quantity: '250 g', image_front_url: 'https://evil.example/image.jpg',
  } }), { status: 200 })
  const result = await externalBarcodeLookup(code, fetcher as typeof fetch)
  assert.equal(result.status, 'FOUND')
  assert.equal(result.suggestion?.imageUrl, null)
})

test('worldwide lookup refuses redirects outside Open Facts', async () => {
  let requests = 0
  const fetcher = async () => {
    requests += 1
    return new Response(null, { status: 302, headers: { location: 'https://evil.example/product' } })
  }
  const result = await externalBarcodeLookup('3017620422041', fetcher as typeof fetch)
  assert.equal(result.status, 'UNAVAILABLE')
  assert.equal(requests, 1)
})

test('Shea barcode and pending contribution take priority over external lookup', async () => {
  const prisma = {
    variant: { findUnique: async () => ({ id: 2, name: '250 g', product: { name: 'Existing' } }) },
  } as unknown as PrismaClient
  const existing = await discoverBarcode(prisma, code, async () => { throw new Error('external lookup must not run') })
  assert.equal(existing.status, 'EXISTING')
  const pendingPrisma = {
    variant: { findUnique: async () => null },
    catalogContribution: { findMany: async () => [{ payload: { variants: [{ barcode: code }] } }] },
  } as unknown as PrismaClient
  const pending = await discoverBarcode(pendingPrisma, code, async () => { throw new Error('external lookup must not run') })
  assert.equal(pending.status, 'PENDING')
})

test('new barcodes return ranked Shea templates with external details for human confirmation', async () => {
  const prisma = {
    variant: { findUnique: async () => null },
    catalogContribution: { findMany: async () => [] },
    productTemplate: { findMany: async () => [{ id: 7, name: 'Hazelnut Cream', name_ar: '', description: '', category_id: 4, category: { niche_id: 2 }, product_type_id: null, brand_id: 3, Brand: { name: 'Nutella' }, variants: [{ id: 8, name: '250 g', name_ar: null, barcode: null }] }] },
  } as unknown as PrismaClient
  const fetcher = async () => new Response(JSON.stringify({ status: 'success_with_errors', product: {
    product_name: 'Nutella Hazelnut Cream', brands: 'Nutella', quantity: '250 g',
    selected_images: { front: { display: { en: 'https://images.openfoodfacts.org/images/products/example.jpg' } } },
  } }), { status: 200 })
  const result = await discoverBarcode(prisma, '3017620422034', fetcher as typeof fetch)
  assert.equal(result.status, 'FOUND')
  assert.equal(result.matches[0]?.templateId, 7)
  assert.equal(result.matches[0]?.categoryId, 4)
  assert.match(result.matches[0]?.reason ?? '', /Brand matches/)
  assert.equal(result.external?.imageUrl, 'https://images.openfoodfacts.org/images/products/example.jpg')
})
