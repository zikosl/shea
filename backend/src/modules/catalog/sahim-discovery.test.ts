import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { discoverBarcode, externalBarcodeLookup, rankTemplate, searchWords } from './sahim-discovery'

const code = '3017620422003'

test('matching favors identity evidence and rejects generic words from a different brand', () => {
  assert.deepEqual(searchWords('Crème de cacao 250 g'), ['creme', 'cacao', '250', 'g'])
  const source = { name: 'Nivea Soft Cream', nameAr: '', description: '', brand: 'Nivea', quantity: '250 ml', imageUrl: null, sourceUrl: '', sourceName: 'Open Facts' }
  const strong = rankTemplate(source, { name: 'Soft Nivea cream', description: '', Brand: { name: 'Nivea' }, variants: [{ name: '250 ml' }] })
  const weak = rankTemplate(source, { name: 'Cream', description: '', Brand: { name: 'Other' }, variants: [{ name: '100 ml' }] })
  assert.ok(strong.score > weak.score)
  assert.match(strong.reason, /Brand matches/)
  assert.equal(weak.score, 0)
  const partial = rankTemplate(source, { name: 'Nivea Soft', description: '', Brand: { name: 'Other' }, variants: [{ name: null }] })
  assert.ok(partial.score >= 10)
  assert.doesNotMatch(partial.reason, /Size may differ/)
  const unrelated = rankTemplate(source, { name: 'Nivea Shampoo', description: '', Brand: { name: 'Nivea' }, variants: [{ name: '250 ml' }] })
  assert.equal(unrelated.score, 0)
  const differentSize = rankTemplate(source, { name: 'Soft Cream', description: '', Brand: { name: 'Nivea' }, variants: [{ name: '100 ml' }] })
  assert.ok(differentSize.score > 0)
  assert.match(differentSize.reason, /Size differs/)
  const equivalentSize = rankTemplate(source, { name: 'Soft Cream', description: '', Brand: { name: 'Nivea' }, variants: [{ name: '0.25 l' }] })
  assert.match(equivalentSize.reason, /Size matches a variant/)
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
    productTemplate: { findMany: async () => [{ id: 7, name: 'Hazelnut Cream', name_ar: '', description: '', category_id: 4, category: { niche_id: 2 }, product_type_id: null, brand_id: 3, Brand: { name: 'Nutella' }, variants: [{ id: 9, name: '100 g', name_ar: null, barcode: null }, { id: 8, name: '250 g', name_ar: null, barcode: null }] }] },
  } as unknown as PrismaClient
  const fetcher = async () => new Response(JSON.stringify({ status: 'success_with_errors', product: {
    product_name: 'Nutella Hazelnut Cream', brands: 'Nutella', quantity: '250 g',
    selected_images: { front: { display: { en: 'https://images.openfoodfacts.org/images/products/example.jpg' } } },
  } }), { status: 200 })
  const result = await discoverBarcode(prisma, '3017620422034', fetcher as typeof fetch)
  assert.equal(result.status, 'FOUND')
  assert.equal(result.matches[0]?.templateId, 7)
  assert.equal(result.matches[0]?.categoryId, 4)
  assert.equal(result.matches[0]?.description, '')
  assert.match(result.matches[0]?.reason ?? '', /Brand matches/)
  assert.equal(result.matches[0]?.variants[0]?.id, 8)
  assert.equal(result.matches[0]?.variants[0]?.sizeHint, 'MATCH')
  assert.equal(result.matches[0]?.variants[1]?.sizeHint, 'DIFFERENT')
  assert.equal(result.external?.imageUrl, 'https://images.openfoodfacts.org/images/products/example.jpg')
})

test('accented Shea names are searched without losing a plausible match to a broad first page', async () => {
  const queries: string[] = []
  const prisma = {
    variant: { findUnique: async () => null },
    catalogContribution: { findMany: async () => [] },
    productTemplate: { findMany: async (args: { where: unknown }) => {
      const query = JSON.stringify(args.where)
      queries.push(query)
      return query.includes('"contains":"crème"')
        ? [{ id: 21, name: 'Crème Douce', name_ar: '', description: 'Hydrating face cream', category_id: 4, category: { niche_id: 2 }, product_type_id: null, brand_id: null, Brand: null, variants: [{ id: 22, name: null, name_ar: null, barcode: null }] }]
        : []
    } },
  } as unknown as PrismaClient
  const fetcher = async () => new Response(JSON.stringify({ status: 'success', product: {
    product_name: 'Crème Douce', quantity: '250 ml',
  } }), { status: 200 })
  const result = await discoverBarcode(prisma, '3017620422072', fetcher as typeof fetch)
  assert.ok(queries.some(query => query.includes('"contains":"crème"') && query.includes('"contains":"creme"')))
  assert.equal(result.matches[0]?.templateId, 21)
  assert.equal(result.matches[0]?.description, 'Hydrating face cream')
})

test('provider rate limits expose a retry delay and prevent immediate repeat calls', async () => {
  let calls = 0
  const fetcher = async () => {
    calls += 1
    return new Response(null, { status: 429, headers: { 'retry-after': '120' } })
  }
  const limited = await externalBarcodeLookup('3017620422058', fetcher as typeof fetch)
  assert.equal(limited.status, 'RATE_LIMITED')
  assert.equal(limited.retryAfterSeconds, 120)
  const repeated = await externalBarcodeLookup('3017620422065', fetcher as typeof fetch)
  assert.equal(repeated.status, 'RATE_LIMITED')
  assert.ok(repeated.retryAfterSeconds > 0)
  assert.equal(calls, 1)
})
