import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildSchema, graphql } from 'graphql'
import { applyMiddleware } from 'graphql-middleware'
import { permissions } from './shield'

const schema = applyMiddleware(buildSchema(readFileSync(resolve(__dirname, '../../schema.graphql'), 'utf8')), permissions)
const run = (source: string, rootValue: object) => graphql({ schema, source, rootValue, contextValue: { req: { headers: {} } } })

test('guests can read niches and their translated names', async () => {
  const result = await run('{ findManyNiches(page:1,limit:10) { totalNiches niches { id name name_ar image } } }', {
    findManyNiches: () => ({ totalNiches: 1, niches: [{ id: 1, name: 'Perfumes', name_ar: 'عطور', image: null }] }),
  })
  assert.equal(result.errors, undefined)
  assert.equal((result.data?.findManyNiches as any).niches[0].name, 'Perfumes')
})

test('guests can read catalog cards, images and product variants', async () => {
  const result = await run('{ findManyProductPartners(page:1,limit:10) { totalProductPartners productPartners { product_id name price trackInventory images { url } products { id name price stock trackInventory } } } }', {
    findManyProductPartners: () => ({ totalProductPartners: 1, productPartners: [{ product_id: 7, name: 'Perfume', price: 200, trackInventory: false, images: [{ url: '/image.jpg' }], products: [{ id: 7, name: '50ml', price: 200, stock: 0, trackInventory: false }] }] }),
  })
  assert.equal(result.errors, undefined)
})

test('guests can open a product but cannot read its internal costs', async () => {
  const root = { findOneProduct: () => ({ id: 7, name: 'Perfume', costPrice: 80 }) }
  assert.equal((await run('{ findOneProduct(id:7) { id name } }', root)).errors, undefined)
  const privateResult = await run('{ findOneProduct(id:7) { id costPrice } }', root)
  assert.ok(privateResult.errors?.length)
  assert.equal((privateResult.data?.findOneProduct as any)?.costPrice, null)
})

test('guest catalog access does not permit checkout or private order history', async () => {
  let called = false
  const result = await run('{ findManyOrders { id } }', { findManyOrders: () => { called = true; return [] } })
  assert.ok(result.errors?.length)
  assert.equal(called, false)
  const checkout = await run('{ previewCheckout(data:{partnerId:2,deliveryType:PICKUP,items:[]}) { total } }', { previewCheckout: () => { called = true; return { total: 0 } } })
  assert.ok(checkout.errors?.length)
  assert.equal(called, false)
})
