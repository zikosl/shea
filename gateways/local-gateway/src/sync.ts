import { pool, transaction } from './database'
import { config } from './config'
import { POS_PROTOCOL_VERSION, storeBootstrapSchema, syncPushSchema } from '@shea/pos-protocol'

const headers = () => ({
  authorization: `Bearer ${config.gatewayToken}`,
  'content-type': 'application/json',
  'x-store-id': config.storeId,
})

async function cloudRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${config.cloudBaseUrl}/v1${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
    signal: AbortSignal.timeout(15_000),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || `Cloud returned ${response.status}`)
  return body
}

export async function refreshBootstrap() {
  const body = storeBootstrapSchema.parse(await cloudRequest('/bootstrap'))
  await transaction(async (client) => {
    for (const product of body.products || []) {
      await client.query(
        `INSERT INTO products(cloud_id,name,name_ar,variant_name,sku,image,price,cost_price,discount,stock,reorder_threshold,track_inventory,available,visible_in_pos,cloud_updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT(cloud_id) DO UPDATE SET
           name=excluded.name,name_ar=excluded.name_ar,variant_name=excluded.variant_name,sku=excluded.sku,image=excluded.image,
           price=excluded.price,cost_price=excluded.cost_price,discount=excluded.discount,reorder_threshold=excluded.reorder_threshold,
           track_inventory=excluded.track_inventory,available=excluded.available,visible_in_pos=excluded.visible_in_pos,
           cloud_updated_at=excluded.cloud_updated_at,updated_at=now()`,
        [product.id, product.name, product.nameAr, product.variantName, product.sku, product.image,
          product.price, product.costPrice, product.discount, product.stock, product.reorderThreshold,
          product.trackInventory, product.available, product.visibleInPos, product.updatedAt],
      )
    }
    await client.query(
      `INSERT INTO gateway_meta(key,value) VALUES ('last_bootstrap_at',$1)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()`,
      [body.generatedAt],
    )
  })
}

export async function pushOutbox() {
  const rows = await pool.query(
    `SELECT * FROM sync_outbox
     WHERE synced_at IS NULL AND (next_attempt_at IS NULL OR next_attempt_at<=now())
     ORDER BY created_at LIMIT 100`,
  )
  if (!rows.rowCount) return
  try {
    const result = await cloudRequest('/events', {
      method: 'POST',
      body: JSON.stringify(syncPushSchema.parse({ protocolVersion: POS_PROTOCOL_VERSION, events: rows.rows.map((row) => ({
        protocolVersion: POS_PROTOCOL_VERSION,
        eventId: row.id,
        idempotencyKey: row.idempotency_key,
        entityType: row.entity_type,
        entityId: row.entity_id,
        operation: row.operation,
        payload: row.payload,
        entityVersion: row.entity_version,
        occurredAt: new Date(String(row.occurred_at)).toISOString(),
      })) })),
    })
    const accepted = (result.accepted || []).map((entry: any) => entry.idempotencyKey)
    if (accepted.length) {
      await pool.query('UPDATE sync_outbox SET synced_at=now(),last_error=NULL WHERE idempotency_key=ANY($1)', [accepted])
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'Sync failed'
    await pool.query(
      `UPDATE sync_outbox SET attempts=attempts+1,last_error=$1,
       next_attempt_at=now() + make_interval(secs => LEAST(300, power(2, LEAST(attempts+1,8))::int))
       WHERE id=ANY($2)`,
      [message, rows.rows.map((row) => row.id)],
    )
    throw error
  }
}

export async function pullEvents() {
  const cursorResult = await pool.query("SELECT value FROM gateway_meta WHERE key='cloud_cursor'")
  let cursor = Number(cursorResult.rows[0]?.value || 0)
  const body = await cloudRequest(`/events?after=${cursor}&limit=500`)
  await transaction(async (client) => {
    for (const event of body.events || []) {
      const inserted = await client.query(
        `INSERT INTO sync_inbox(sequence,event_id,entity_type,entity_id,operation,payload,entity_version,occurred_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(sequence) DO NOTHING`,
        [event.sequence, event.eventId, event.entityType, event.entityId, event.operation, event.payload, event.entityVersion, event.occurredAt],
      )
      if (inserted.rowCount && event.operation === 'CLOUD_SALE_COMPLETED') {
        for (const item of event.payload?.items || []) {
          await client.query(
            `UPDATE products SET stock=stock-$1,updated_at=now()
             WHERE cloud_id=$2 AND track_inventory=true`,
            [Number(item.quantity), Number(item.productId)],
          )
        }
      }
      if (inserted.rowCount && event.operation === 'PRODUCT_UPDATED') {
        const product = event.payload || {}
        await client.query(
          `UPDATE products SET
             price=COALESCE($1,price),cost_price=COALESCE($2,cost_price),discount=COALESCE($3,discount),
             stock=COALESCE($4,stock),reorder_threshold=COALESCE($5,reorder_threshold),
             available=COALESCE($6,available),visible_in_pos=COALESCE($7,visible_in_pos),updated_at=now()
           WHERE cloud_id=$8`,
          [product.price, product.costPrice, product.discount, product.stock, product.reorderThreshold,
            product.available, product.isVisibleInPos, Number(event.entityId)],
        )
      }
      cursor = Math.max(cursor, event.sequence)
    }
    await client.query(
      `INSERT INTO gateway_meta(key,value) VALUES('cloud_cursor',$1)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()`,
      [String(cursor)],
    )
  })
  await cloudRequest('/cursor', { method: 'POST', body: JSON.stringify({ protocolVersion: POS_PROTOCOL_VERSION, consumerId: 'local-gateway', lastSequence: cursor }) })
}

let syncing = false
export async function synchronize() {
  if (syncing) return
  syncing = true
  try {
    await pushOutbox()
    await pullEvents()
    await pool.query(
      `INSERT INTO gateway_meta(key,value) VALUES('last_sync_at',$1)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()`,
      [new Date().toISOString()],
    )
  } finally {
    syncing = false
  }
}
