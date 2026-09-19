import { Prisma, PrismaClient, PartnerFeeType } from '@prisma/client'
import { sendNotification } from '../../servers/firebase'
import { GraphQLError } from 'graphql'
import { DeliveryStatus, DeliveryType, PricingName } from '../../types'
import { calculatePartnerFee } from '../../utils/partner-fees'
import { createOrderOutboxEvent } from '../../modules/orders/workflow'

type CheckoutInput = {
  partnerId?: number | null
  addressId?: number | null
  deliveryType: number
  requestKey?: string | null
  expectedTotal?: number | null
  items: ({ productId?: number | null; quantity?: number | null; price?: number | null } | null)[]
}
const money = (value: number) => Math.round(value * 100) / 100
const fail = (code: string): never => { throw new GraphQLError(code) }

export async function previewCheckout(tx: Prisma.TransactionClient, userId: number, input: CheckoutInput) {
  if (!input.partnerId || !input.items.length || input.items.length > 100) fail('INVALID_ORDER')
  if (![DeliveryType.PICKUP, DeliveryType.NORMAL, DeliveryType.GROUPED].includes(input.deliveryType)) fail('INVALID_ORDER')
  const quantities = new Map<number, number>()
  for (const item of input.items) {
    if (!item?.productId || !Number.isSafeInteger(item.quantity) || Number(item.quantity) <= 0) fail('INVALID_ORDER')
    quantities.set(item!.productId!, (quantities.get(item!.productId!) ?? 0) + Number(item!.quantity))
  }
  const partner = await tx.partner.findUnique({ where: { userId: input.partnerId! } })
  if (!partner?.online) fail('STORE_UNAVAILABLE')
  let address = null
  if (input.deliveryType !== DeliveryType.PICKUP) {
    address = await tx.address.findFirst({ where: { userId, ...(input.addressId ? { id: input.addressId } : { isDefault: true }) } })
    if (!address) fail('ADDRESS_REQUIRED')
    if (!Number.isFinite(address!.latitude) || !Number.isFinite(address!.longitude) || (address!.latitude === 0 && address!.longitude === 0)) fail('LOCATION_REQUIRED')
  }
  const products = await tx.product.findMany({
    where: { id: { in: [...quantities.keys()] }, partnerId: input.partnerId! },
    include: { variant: { include: { product: true } } },
  })
  if (products.length !== quantities.size) fail('PRODUCT_UNAVAILABLE')
  const items = products.map(product => {
    const quantity = quantities.get(product.id)!
    if (!product.available || !product.isActive || !product.onlineVisible) fail('PRODUCT_UNAVAILABLE')
    if (product.trackInventory && product.stock < quantity) fail('INSUFFICIENT_STOCK')
    if (!Number.isFinite(product.price) || product.price < 0) fail('INVALID_PRICE')
    return {
      productId: product.id,
      quantity,
      price: product.priceOnRequest ? 0 : money(product.price),
      priceOnRequest: product.priceOnRequest,
      nameSnapshot: product.customName?.trim() || product.variant.product.name,
      variantSnapshot: product.variant.name?.trim() || null,
      skuSnapshot: product.vendorSku?.trim() || product.variant.sku?.trim() || null,
    }
  })
  const deliveryName = input.deliveryType === DeliveryType.PICKUP ? PricingName.PICKUP_TAX : input.deliveryType === DeliveryType.GROUPED ? PricingName.GROUP_DELIVERY_TAX : PricingName.NORMAL_DELIVERY_TAX
  const pricing = await tx.pricing.findMany({ where: { name: { in: [PricingName.APP_TAX, PricingName.STORE_TAX, deliveryName] } } })
  const fee = (name: PricingName) => Math.max(0, pricing.find(p => p.name === name)?.price ?? 0)
  const subtotal = money(items.reduce((sum, item) => sum + item.price * item.quantity, 0))
  const pricingMode = items.some(item => item.priceOnRequest) ? 'QUOTE_REQUIRED' as const : 'FIXED' as const
  const appTax = fee(PricingName.APP_TAX)
  const deliveryTax = fee(deliveryName)
  return { partner: partner!, address, items, pricingMode, subtotal, appTax, deliveryTax, storeTax: fee(PricingName.STORE_TAX), total: money(subtotal + appTax + deliveryTax) }
}

export async function submitCheckout(prisma: PrismaClient, userId: number, input: CheckoutInput) {
  if (input.requestKey && !/^[a-zA-Z0-9_-]{8,120}$/.test(input.requestKey)) fail('INVALID_ORDER')
  const requestKey = input.requestKey ? `${userId}:${input.requestKey}` : null
  let created = false
  try {
    const result = await prisma.$transaction(async tx => {
      if (requestKey) {
        const existing = await tx.order.findUnique({ where: { requestKey } })
        if (existing) return existing
      }
      const quote = await previewCheckout(tx, userId, input)
      if (input.expectedTotal != null && money(input.expectedTotal) !== quote.total) fail('PRICE_CHANGED')
      if (input.items.some(item => {
        const line = quote.items.find(entry => entry.productId === item?.productId)
        return item?.price != null && !line?.priceOnRequest && money(item.price) !== line?.price
      })) fail('PRICE_CHANGED')
      const financials = calculatePartnerFee(quote.subtotal, quote.partner)
      const order = await tx.order.create({ data: {
        requestKey, clientId: userId, partnerId: quote.partner.userId, addressId: quote.address?.id,
        status: 'REQUESTED', kind: 'STANDARD', pricingMode: quote.pricingMode,
        deliveryTax: quote.deliveryTax, appTax: quote.appTax, storeTax: quote.storeTax,
        ...financials, partnerFeeType: financials.partnerFeeType as PartnerFeeType, paymentMethod: 'CASH',
        items: { create: quote.items.map(({ priceOnRequest: _priceOnRequest, ...item }) => item) },
        delivery: { create: { type: input.deliveryType, status: DeliveryStatus.PENDING, addressId: quote.address?.id } },
      } })
      await tx.orderStatusHistory.create({ data: { orderId: order.id, to: 'REQUESTED', actorId: userId } })
      await createOrderOutboxEvent(tx, order.id, 'REQUESTED', {
        clientId: userId,
        partnerId: quote.partner.userId,
        actorId: userId,
      })
      await tx.log.create({ data: { userId: quote.partner.userId, type: 0,
        title: `New order #${order.id}`, body: 'A customer placed an order.',
        title_ar: `طلب جديد #${order.id}`, body_ar: 'تم استلام طلب جديد من زبون.' } })
      created = true
      return order
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    if (created) {
      // Notification failure must never turn an already committed order into a failed checkout.
      void prisma.pushToken.findMany({ where: { userId: result.partnerId, isActive: true } }).then(tokens =>
        Promise.all(tokens.map(token => sendNotification({ tokens: token.token,
          title: `New order #${result.id}`, body: 'A customer placed an order.',
          data: { event: 'NEW_ORDER', orderId: String(result.id) },
        }))),
      ).catch(error => console.error('Order notification failed', error))
    }
    return result
  } catch (error) {
    if (requestKey && error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
      const existing = await prisma.order.findUnique({ where: { requestKey } })
      if (existing) return existing
    }
    throw error
  }
}
