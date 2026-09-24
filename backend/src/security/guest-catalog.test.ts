import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildSchema, graphql } from 'graphql'
import { applyMiddleware } from 'graphql-middleware'
import { permissions } from './shield'
import { getOptionalUserId } from '../utils'
import { catalogGuard } from './catalog-guard'

const schema = applyMiddleware(buildSchema(readFileSync(resolve(__dirname, '../../schema.graphql'), 'utf8')), permissions, catalogGuard)
const run = (source: string, rootValue: object) => graphql({ schema, source, rootValue, contextValue: { req: { headers: {} } } })

test('an expired or malformed stored token is treated as anonymous for public catalog reads', () => {
  assert.equal(getOptionalUserId({ req: { headers: { authorization: 'Bearer expired-token' } } } as any), undefined)
})

test('guests can read niches and their translated names', async () => {
  const result = await run('{ findManyNiches(page:1,limit:10) { totalNiches niches { id name name_ar image } } }', {
    findManyNiches: () => ({ totalNiches: 1, niches: [{ id: 1, name: 'Perfumes', name_ar: 'عطور', image: null }] }),
  })
  assert.equal(result.errors, undefined)
  assert.equal((result.data?.findManyNiches as any).niches[0].name, 'Perfumes')
})

test('guests can scope catalog filters to a store', async () => {
  const result = await run(`{
    categories: findManyCategories(partnerId: 12, page: 1, limit: 10) { totalCategories }
    brands: findManyBrands(partnerId: 12, page: 1, limit: 10) { totalBrands }
    productTypes: findManyProductTypes(partnerId: 12, category_id: 4, page: 1, limit: 10) { totalProductTypes }
  }`, {
    findManyCategories: ({ partnerId }: { partnerId: number }) => ({ totalCategories: partnerId === 12 ? 1 : 0, categories: [] }),
    findManyBrands: ({ partnerId }: { partnerId: number }) => ({ totalBrands: partnerId === 12 ? 1 : 0, brands: [] }),
    findManyProductTypes: ({ partnerId }: { partnerId: number }) => ({ totalProductTypes: partnerId === 12 ? 1 : 0, productTypes: [] }),
  })
  assert.equal(result.errors, undefined)
  assert.equal((result.data?.categories as any).totalCategories, 1)
  assert.equal((result.data?.brands as any).totalBrands, 1)
  assert.equal((result.data?.productTypes as any).totalProductTypes, 1)
})

test('guests can read catalog cards, store identity, pricing mode, images and product variants', async () => {
  const result = await run('{ findManyProductPartners(page:1,limit:10) { totalProductPartners productPartners { product_id name price priceOnRequest trackInventory partner { id companyName avatar } images { url } products { id name price priceOnRequest stock trackInventory } } } }', {
    findManyProductPartners: () => ({ totalProductPartners: 1, productPartners: [{ product_id: 7, name: 'Perfume', price: 0, priceOnRequest: true, trackInventory: false, partner: { id: 2, companyName: 'Shea Store', avatar: '/store.jpg' }, images: [{ url: '/image.jpg' }], products: [{ id: 7, name: '50ml', price: 0, priceOnRequest: true, stock: 0, trackInventory: false }] }] }),
  })
  assert.equal(result.errors, undefined)
  assert.equal((result.data?.findManyProductPartners as any).productPartners[0].priceOnRequest, true)
  assert.equal((result.data?.findManyProductPartners as any).productPartners[0].partner.companyName, 'Shea Store')
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
