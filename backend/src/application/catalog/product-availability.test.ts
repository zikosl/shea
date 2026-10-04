import assert from 'node:assert/strict'
import test from 'node:test'
import type { PrismaClient } from '@prisma/client'
import { setProductsAvailability } from './product.service'

test('bulk availability updates only products owned by the partner', async () => {
  const updated: Array<{ where: unknown; data: unknown }> = []
  const prisma = {
    product: {
      findMany: async ({ where }: { where: { id: { in: number[] }; partnerId: number } }) =>
        where.id.in.filter(id => id === 1 && where.partnerId === 7).map(id => ({ id })),
      updateMany: async (args: { where: unknown; data: unknown }) => {
        updated.push(args)
        return { count: 1 }
      },
    },
  } as unknown as PrismaClient

  const result = await setProductsAvailability(prisma, 7, [1, 2], false)
  assert.deepEqual(result, { updatedIds: [1], failedIds: [2] })
  assert.deepEqual(updated, [{ where: { id: { in: [1] }, partnerId: 7 }, data: { available: false, onlineVisible: false } }])
})

test('bulk availability rejects oversized selections before querying', async () => {
  let queried = false
  const prisma = { product: { findMany: async () => { queried = true; return [] } } } as unknown as PrismaClient
  await assert.rejects(setProductsAvailability(prisma, 7, Array.from({ length: 101 }, (_, index) => index + 1), true))
  assert.equal(queried, false)
})
