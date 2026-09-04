import { PrismaClient } from '@prisma/client'
import { env } from '../../core/config/env'

type PrismaLike = PrismaClient | any

function validatedCloudUrl(value: string) {
  const url = new URL(value.trim())
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('CLOUD_GATEWAY_HTTPS_REQUIRED')
  }
  return url.toString().replace(/\/$/, '')
}

async function productSnapshots(prisma: PrismaLike, partnerId: number) {
  const products = await prisma.product.findMany({
    where: { partnerId, isActive: true },
    include: { variant: { include: { product: { include: { images: true } }, images: true } } },
    orderBy: { id: 'asc' },
  })
  return products.map((product: any) => ({
    id: product.id,
    variantId: product.variantId,
    name: product.customName || product.variant.product.name,
    nameAr: product.variant.product.name_ar,
    variantName: product.variant.name,
    sku: product.variant.sku,
    image: product.variant.images[0]?.url || product.variant.product.images[0]?.url || null,
    price: product.price,
    costPrice: product.costPrice,
    discount: product.discount,
    stock: product.stock,
    reorderThreshold: product.reorderThreshold,
    trackInventory: product.trackInventory,
    available: product.available,
    visibleInPos: product.isVisibleInPos,
    updatedAt: product.updatedAt.toISOString(),
  }))
}

async function cloudRequest(url: string, path: string, init: RequestInit) {
  if (!env.cloudGatewayServiceToken) throw new Error('CLOUD_GATEWAY_SERVICE_TOKEN_REQUIRED')
  const response = await fetch(`${validatedCloudUrl(url)}/internal/v1${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.cloudGatewayServiceToken}`,
      'content-type': 'application/json',
      ...init.headers,
    },
    signal: AbortSignal.timeout(20_000),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || `CLOUD_GATEWAY_${response.status}`)
  return body
}

export async function ensureDefaultStore(prisma: PrismaLike, partnerId: number) {
  const existing = await prisma.store.findFirst({
    where: { partnerId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (existing) return existing
  const partner = await prisma.partner.findUnique({ where: { userId: partnerId } })
  if (!partner) throw new Error('PARTNER_REQUIRED')
  return prisma.store.create({ data: { partnerId, code: 'main', name: partner.companyName, deploymentMode: 'SOLO' } })
}

export async function attachDeviceToStore(
  prisma: PrismaLike,
  partnerId: number,
  device: { id: string; deviceKey: string; name?: string | null },
  requestedStoreId?: string | null,
) {
  const store = requestedStoreId
    ? await prisma.store.findFirst({ where: { id: requestedStoreId, partnerId, status: 'ACTIVE' } })
    : await ensureDefaultStore(prisma, partnerId)
  if (!store) throw new Error('STORE_NOT_FOUND')
  return prisma.storeTerminal.upsert({
    where: { terminalKey: device.deviceKey },
    create: { storeId: store.id, deviceId: device.id, terminalKey: device.deviceKey, name: device.name || 'POS terminal', lastSeenAt: new Date() },
    update: { storeId: store.id, deviceId: device.id, name: device.name || 'POS terminal', status: 'ACTIVE', lastSeenAt: new Date() },
  })
}

export async function issueGatewayToken(prisma: PrismaLike, storeId: string, partnerId: number) {
  const store = await prisma.store.findFirst({ where: { id: storeId, partnerId }, include: { partner: true } })
  if (!store) throw new Error('STORE_NOT_FOUND')
  if (!store.cloudSyncEnabled || !store.cloudGatewayUrl) throw new Error('CLOUD_GATEWAY_NOT_CONFIGURED')
  const result = await cloudRequest(store.cloudGatewayUrl, '/stores/provision', {
    method: 'POST',
    body: JSON.stringify({
      protocolVersion: 1,
      store: { id: store.id, partnerId, name: store.name, code: store.code, timezone: store.timezone },
      products: await productSnapshots(prisma, partnerId),
    }),
  })
  const issuedAt = new Date(result.issuedAt)
  await prisma.store.update({
    where: { id: store.id },
    data: { deploymentMode: 'MULTI_POS', gatewayProvisionedAt: issuedAt, gatewayLastSeenAt: null },
  })
  return { storeId: store.id, token: result.token, issuedAt, cloudGatewayUrl: store.cloudGatewayUrl }
}

export async function publishStoreProducts(prisma: PrismaLike, storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } })
  if (!store?.cloudSyncEnabled || !store.cloudGatewayUrl) return
  await cloudRequest(store.cloudGatewayUrl, `/stores/${store.id}/products`, {
    method: 'PUT',
    body: JSON.stringify({ products: await productSnapshots(prisma, store.partnerId) }),
  })
}

export async function cloudStoreStatus(url: string | null | undefined, storeId: string) {
  if (!url || !env.cloudGatewayServiceToken) return null
  try {
    return await cloudRequest(url, `/stores/${storeId}`, { method: 'GET' })
  } catch {
    return null
  }
}

export function normalizeGatewayUrl(value?: string | null) {
  return value?.trim() ? validatedCloudUrl(value) : null
}
