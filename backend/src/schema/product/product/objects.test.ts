import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getProductViewImages } from './objects'

const variantImage = { id: 1, url: '/variant.jpg', altText: null, variantId: 3, product_template_id: null }
const templateImage = { id: 2, url: '/template.jpg', altText: null, variantId: null, product_template_id: 7 }

test('product view prefers variant photos and reuses the result for image and images fields', async () => {
  let calls = 0
  const parent = { variantId: 3, product_template_id: 7 }
  const ctx = { prisma: { productImage: { findMany: async () => { calls += 1; return [variantImage, templateImage] } } } }
  assert.deepEqual(await getProductViewImages(parent, ctx), [variantImage])
  assert.deepEqual(await getProductViewImages(parent, ctx), [variantImage])
  assert.equal(calls, 1)
})

test('product view falls back to template photos when a variant has none', async () => {
  const parent = { variantId: 4, product_template_id: 7 }
  const ctx = { prisma: { productImage: { findMany: async () => [templateImage] } } }
  assert.deepEqual(await getProductViewImages(parent, ctx), [templateImage])
})
