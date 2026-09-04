import { randomUUID } from 'crypto'
import express, { NextFunction, Request, Response } from 'express'
import { config } from './config'
import { pairTerminal, requireTerminal, secureEqual, TerminalRequest } from './auth'
import { pool, transaction, verifyDatabase } from './database'
import { refreshBootstrap, synchronize } from './sync'
import { productUpdateSchema, saleRequestSchema, stockAdjustmentSchema, stockBatchSchema, terminalPairSchema } from '@shea/pos-protocol'

const app = express()
const pairingAttempts = new Map<string, { count: number; resetAt: number }>()
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))
app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Cache-Control', 'no-store')
  next()
})

app.get('/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1')
    const bootstrap = await pool.query("SELECT value FROM gateway_meta WHERE key='last_bootstrap_at'")
    const ready = Boolean(bootstrap.rows[0]?.value)
    response.status(ready ? 200 : 503).json({
      status: ready ? 'ok' : 'initializing',
      service: 'shea-local-gateway',
      storeId: config.storeId,
      lastBootstrapAt: bootstrap.rows[0]?.value || null,
    })
  } catch {
    response.status(503).json({ status: 'error', service: 'shea-local-gateway' })
  }
})

app.post('/v1/terminals/pair', async (request, response) => {
  const clientKey = request.ip || request.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const attempts = pairingAttempts.get(clientKey)
  if (attempts && attempts.resetAt > now && attempts.count >= 8) {
    return response.status(429).json({ error: 'PAIRING_RATE_LIMITED' })
  }
  const pairing = terminalPairSchema.parse(request.body)
  const pairingCode = pairing.pairingCode
  const terminalKey = pairing.terminalKey
  const name = pairing.name
  if (!secureEqual(pairingCode, config.pairingCode)) {
    pairingAttempts.set(clientKey, {
      count: attempts && attempts.resetAt > now ? attempts.count + 1 : 1,
      resetAt: attempts && attempts.resetAt > now ? attempts.resetAt : now + 10 * 60_000,
    })
    return response.status(401).json({ error: 'INVALID_PAIRING_CODE' })
  }
  if (!terminalKey || terminalKey.length > 160 || !name || name.length > 120) {
    return response.status(400).json({ error: 'INVALID_TERMINAL' })
  }
  pairingAttempts.delete(clientKey)
  response.status(201).json(await pairTerminal(terminalKey, name))
})

app.use('/v1', requireTerminal)

app.get('/v1/status', async (request: TerminalRequest, response) => {
  const meta = await pool.query('SELECT key,value,updated_at FROM gateway_meta')
  const pending = await pool.query('SELECT count(*)::int count FROM sync_outbox WHERE synced_at IS NULL')
  response.json({
    storeId: config.storeId,
    terminal: request.terminal,
    pendingEvents: pending.rows[0].count,
    state: Object.fromEntries(meta.rows.map((row) => [row.key, row.value])),
  })
})

app.get('/v1/products', async (_request, response) => {
  const result = await pool.query(
    `SELECT cloud_id AS "cloudId",name,name_ar AS "nameAr",variant_name AS "variantName",sku,image,
      price,cost_price AS "costPrice",discount,stock,reorder_threshold AS "reorderThreshold",
      track_inventory AS "trackInventory",available,visible_in_pos AS "visibleInPos",updated_at AS "updatedAt"
     FROM products WHERE visible_in_pos=true ORDER BY name`,
  )
  response.json({ products: result.rows })
})

app.post('/v1/stock-adjustments', async (request: TerminalRequest, response) => {
  const body = stockAdjustmentSchema.parse(request.body)
  const productId = Number(body.productId)
  const quantity = Number(body.quantity)
  if (!uuidPattern.test(String(body.id)) || !Number.isInteger(productId) || productId < 1 || !Number.isFinite(quantity) || quantity < 0 ||
      !['RECEIVE', 'REMOVE', 'SET'].includes(body.mode) || typeof body.reason !== 'string') {
    return response.status(400).json({ error: 'INVALID_STOCK_ADJUSTMENT' })
  }
  const result = await transaction(async (client) => {
    const duplicate = await client.query('SELECT payload FROM sync_outbox WHERE idempotency_key=$1', [`stock:${body.id}`])
    if (duplicate.rows[0]) return duplicate.rows[0].payload
    const found = await client.query('SELECT * FROM products WHERE cloud_id=$1 FOR UPDATE', [productId])
    const product = found.rows[0]
    if (!product) throw new Error('PRODUCT_NOT_FOUND')
    const before = Number(product.stock)
    const after = body.mode === 'RECEIVE' ? before + quantity : body.mode === 'REMOVE' ? before - quantity : quantity
    if (after < 0) throw new Error('INSUFFICIENT_STOCK')
    await client.query('UPDATE products SET stock=$1,updated_at=now() WHERE cloud_id=$2', [after, productId])
    const payload = { id: body.id, productId, mode: body.mode, quantity, reason: body.reason.slice(0, 200), stockBefore: before, stockAfter: after }
    await client.query(
      `INSERT INTO sync_outbox(id,idempotency_key,entity_type,entity_id,operation,payload,occurred_at)
       VALUES($1,$2,'Product',$3,'STOCK_ADJUSTED',$4,now())`,
      [randomUUID(), `stock:${body.id}`, String(productId), payload],
    )
    return payload
  })
  void synchronize().catch(() => undefined)
  response.status(201).json(result)
})

app.post('/v1/stock-batches', async (request: TerminalRequest, response) => {
  const body = stockBatchSchema.parse(request.body)
  if (!uuidPattern.test(String(body.id)) || !['RECEIPT', 'REVERSE'].includes(body.operation) ||
      !Array.isArray(body.lines) || !body.lines.length || body.lines.length > 500) {
    return response.status(400).json({ error: 'INVALID_STOCK_BATCH' })
  }
  const result = await transaction(async (client) => {
    const key = `stock-batch:${body.id}`
    const duplicate = await client.query('SELECT payload FROM sync_outbox WHERE idempotency_key=$1', [key])
    if (duplicate.rows[0]) return duplicate.rows[0].payload
    const productIds = body.lines.map((line: any) => Number(line.productId))
    const found = await client.query('SELECT * FROM products WHERE cloud_id=ANY($1) FOR UPDATE', [productIds])
    const byId = new Map(found.rows.map((product) => [product.cloud_id, product]))
    const updated = []
    for (const line of body.lines) {
      const product = byId.get(Number(line.productId))
      const quantity = Number(line.quantity)
      const unitCost = Number(line.unitCost)
      if (!product || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
        throw new Error('INVALID_STOCK_BATCH')
      }
      const before = Number(product.stock)
      const costBefore = Number(product.cost_price)
      const stockAfter = body.operation === 'RECEIPT' ? before + quantity : before - quantity
      if (stockAfter < 0) throw new Error('INSUFFICIENT_STOCK')
      const valueAfter = body.operation === 'RECEIPT'
        ? before * costBefore + quantity * unitCost
        : before * costBefore - quantity * unitCost
      const costAfter = stockAfter > 0 ? Math.max(0, valueAfter / stockAfter) : 0
      await client.query('UPDATE products SET stock=$1,cost_price=$2,updated_at=now() WHERE cloud_id=$3', [stockAfter, costAfter, product.cloud_id])
      updated.push({ productId: product.cloud_id, quantity, unitCost, stockBefore: before, stockAfter, costBefore, costAfter })
    }
    const payload = { id: body.id, operation: body.operation, reference: String(body.reference || '').slice(0, 160), lines: updated }
    await client.query(
      `INSERT INTO sync_outbox(id,idempotency_key,entity_type,entity_id,operation,payload,occurred_at)
       VALUES($1,$2,'StockBatch',$3,'STOCK_BATCH_UPDATED',$4,now())`,
      [randomUUID(), key, body.id, payload],
    )
    return payload
  })
  void synchronize().catch(() => undefined)
  response.status(201).json(result)
})

app.patch('/v1/products/:productId', async (request: TerminalRequest, response) => {
  const productId = Number(request.params.productId)
  const body = productUpdateSchema.parse(request.body)
  const allowed = ['price', 'costPrice', 'discount', 'stock', 'reorderThreshold', 'trackInventory', 'available', 'visibleInPos']
  const values = Object.fromEntries(Object.entries(body).filter(([key, value]) => allowed.includes(key) && value !== undefined))
  if (!uuidPattern.test(String(body.id)) || !Number.isInteger(productId) || productId < 1 || !Object.keys(values).length) {
    return response.status(400).json({ error: 'INVALID_PRODUCT_UPDATE' })
  }
  const result = await transaction(async (client) => {
    const duplicate = await client.query('SELECT payload FROM sync_outbox WHERE idempotency_key=$1', [`product:${body.id}`])
    if (duplicate.rows[0]) return duplicate.rows[0].payload
    const found = await client.query('SELECT * FROM products WHERE cloud_id=$1 FOR UPDATE', [productId])
    if (!found.rows[0]) throw new Error('PRODUCT_NOT_FOUND')
    const current = found.rows[0]
    const next = {
      price: values.price ?? current.price,
      costPrice: values.costPrice ?? current.cost_price,
      discount: values.discount ?? current.discount,
      stock: values.stock ?? current.stock,
      reorderThreshold: values.reorderThreshold ?? current.reorder_threshold,
      trackInventory: values.trackInventory ?? current.track_inventory,
      available: values.available ?? current.available,
      visibleInPos: values.visibleInPos ?? current.visible_in_pos,
    }
    if ([next.price, next.costPrice, next.discount, next.stock, next.reorderThreshold].some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) {
      throw new Error('INVALID_PRODUCT_UPDATE')
    }
    await client.query(
      `UPDATE products SET price=$1,cost_price=$2,discount=$3,stock=$4,reorder_threshold=$5,
       track_inventory=$6,available=$7,visible_in_pos=$8,updated_at=now() WHERE cloud_id=$9`,
      [next.price, next.costPrice, next.discount, next.stock, next.reorderThreshold,
        next.trackInventory, next.available, next.visibleInPos, productId],
    )
    const payload = { id: body.id, productId, ...next }
    await client.query(
      `INSERT INTO sync_outbox(id,idempotency_key,entity_type,entity_id,operation,payload,occurred_at)
       VALUES($1,$2,'Product',$3,'PRODUCT_UPDATED',$4,now())`,
      [randomUUID(), `product:${body.id}`, String(productId), payload],
    )
    return payload
  })
  void synchronize().catch(() => undefined)
  response.json(result)
})

app.post('/v1/sales', async (request: TerminalRequest, response) => {
  const body = saleRequestSchema.parse(request.body)
  if (!uuidPattern.test(String(body.id)) || typeof body.saleNumber !== 'string' || !body.saleNumber || body.saleNumber.length > 160 ||
      !Array.isArray(body.items) || !body.items.length || body.items.length > 500) {
    return response.status(400).json({ error: 'INVALID_SALE' })
  }
  const result = await transaction(async (client) => {
    const existing = await client.query('SELECT * FROM sales WHERE id=$1 OR sale_number=$2', [body.id, body.saleNumber])
    if (existing.rows[0]) return { sale: existing.rows[0], duplicate: true }

    const productIds = body.items.map((item: any) => Number(item.productId))
    const products = await client.query('SELECT * FROM products WHERE cloud_id=ANY($1) FOR UPDATE', [productIds])
    const byId = new Map(products.rows.map((product) => [product.cloud_id, product]))
    let subtotal = 0
    const lines = body.items.map((item: any) => {
      const product = byId.get(Number(item.productId))
      const quantity = Number(item.quantity)
      if (!product) throw new Error('PRODUCT_NOT_FOUND')
      if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('INVALID_QUANTITY')
      if (!product.available) throw new Error('PRODUCT_UNAVAILABLE')
      if (product.track_inventory && Number(product.stock) < quantity) throw new Error('INSUFFICIENT_STOCK')
      const unitPrice = Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : Number(product.price)
      const discount = Math.max(0, Number(item.discount) || 0)
      const tax = Math.max(0, Number(item.tax) || 0)
      if (unitPrice < 0 || discount > unitPrice * quantity || tax < 0) throw new Error('INVALID_SALE_TOTALS')
      const total = unitPrice * quantity - discount + tax
      subtotal += total
      return { product, quantity, unitPrice, discount, tax, total, stockBefore: Number(product.stock), stockAfter: Number(product.stock) - quantity }
    })
    const discountTotal = Math.max(0, Number(body.discountTotal) || 0)
    const taxTotal = Math.max(0, Number(body.taxTotal) || 0)
    const total = Math.max(0, subtotal - discountTotal + taxTotal)
    const createdAt = body.createdAt && !Number.isNaN(Date.parse(body.createdAt)) ? new Date(body.createdAt) : new Date()
    await client.query(
      `INSERT INTO sales(id,sale_number,terminal_id,cashier_id,cashier_name,customer_name,subtotal,discount_total,tax_total,total,payment_method,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [body.id, body.saleNumber, request.terminal!.id, body.cashierId || null, body.cashierName || null,
        body.customerName || null, subtotal, discountTotal, taxTotal, total, body.paymentMethod || 'CASH', createdAt],
    )
    for (const line of lines) {
      await client.query(
        `INSERT INTO sale_items(id,sale_id,product_id,product_name,quantity,unit_price,discount,tax,total,stock_before,stock_after)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [randomUUID(), body.id, line.product.cloud_id, line.product.name, line.quantity, line.unitPrice,
          line.discount, line.tax, line.total, line.stockBefore, line.stockAfter],
      )
      if (line.product.track_inventory) {
        await client.query('UPDATE products SET stock=$1,updated_at=now() WHERE cloud_id=$2', [line.stockAfter, line.product.cloud_id])
      }
    }
    const eventPayload = {
      ...body,
      subtotal,
      discountTotal,
      taxTotal,
      total,
      terminalId: request.terminal!.id,
      items: lines.map((line: {
        product: Record<string, any>;
        quantity: number;
        unitPrice: number;
        discount: number;
        tax: number;
        total: number;
        stockBefore: number;
        stockAfter: number;
      }) => ({
        productId: line.product.cloud_id,
        productName: line.product.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
        tax: line.tax,
        total: line.total,
        stockBefore: line.stockBefore,
        stockAfter: line.stockAfter,
      })),
      createdAt: createdAt.toISOString(),
    }
    await client.query(
      `INSERT INTO sync_outbox(id,idempotency_key,entity_type,entity_id,operation,payload,occurred_at)
       VALUES($1,$2,'Sale',$3,'SALE_COMPLETED',$4,$5)`,
      [randomUUID(), `sale:${body.id}`, body.id, eventPayload, createdAt],
    )
    return { sale: { id: body.id, saleNumber: body.saleNumber, total, createdAt }, duplicate: false }
  })
  void synchronize().catch(() => undefined)
  response.status(result.duplicate ? 200 : 201).json(result)
})

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  if ('issues' in error) return response.status(400).json({ error: 'INVALID_REQUEST' })
  const safeErrors = new Set([
    'PRODUCT_NOT_FOUND',
    'PRODUCT_UNAVAILABLE',
    'INVALID_QUANTITY',
    'INVALID_SALE_TOTALS',
    'INVALID_STOCK_BATCH',
    'INVALID_PRODUCT_UPDATE',
    'INSUFFICIENT_STOCK',
  ])
  const message = safeErrors.has(error.message) ? error.message : 'INTERNAL_ERROR'
  if (message === 'INTERNAL_ERROR') console.error('[gateway]', error)
  response.status(message === 'INTERNAL_ERROR' ? 500 : 409).json({ error: message })
})

async function start() {
  await verifyDatabase()
  await refreshBootstrap().catch((error) => console.warn('[bootstrap] cloud unavailable during startup:', error.message))
  await synchronize().catch((error) => console.warn('[sync] initial synchronization failed:', error.message))
  setInterval(() => void synchronize().catch((error) => console.warn('[sync]', error.message)), config.syncIntervalMs).unref()
  setInterval(() => void refreshBootstrap().catch((error) => console.warn('[bootstrap]', error.message)), config.bootstrapIntervalMs).unref()
  app.listen(config.port, config.host, () => console.log(`Shea store gateway listening on ${config.host}:${config.port}`))
}

async function shutdown() {
  await pool.end()
  process.exit(0)
}

process.once('SIGTERM', () => void shutdown())
process.once('SIGINT', () => void shutdown())

void start().catch((error) => {
  console.error('[startup]', error)
  process.exitCode = 1
})
