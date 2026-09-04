CREATE TABLE "gateway_meta" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "terminals" (
  "id" UUID NOT NULL PRIMARY KEY,
  "terminal_key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "last_seen_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "products" (
  "cloud_id" INTEGER NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "name_ar" TEXT,
  "variant_name" TEXT,
  "sku" TEXT,
  "image" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cost_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reorder_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "track_inventory" BOOLEAN NOT NULL DEFAULT true,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "visible_in_pos" BOOLEAN NOT NULL DEFAULT true,
  "cloud_updated_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "sales" (
  "id" UUID NOT NULL PRIMARY KEY,
  "sale_number" TEXT NOT NULL UNIQUE,
  "terminal_id" UUID NOT NULL REFERENCES "terminals"("id"),
  "cashier_id" TEXT,
  "cashier_name" TEXT,
  "customer_name" TEXT,
  "subtotal" DOUBLE PRECISION NOT NULL,
  "discount_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tax_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL,
  "payment_method" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "synced_at" TIMESTAMPTZ
);
CREATE TABLE "sale_items" (
  "id" UUID NOT NULL PRIMARY KEY,
  "sale_id" UUID NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
  "product_id" INTEGER NOT NULL REFERENCES "products"("cloud_id"),
  "product_name" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit_price" DOUBLE PRECISION NOT NULL,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL,
  "stock_before" DOUBLE PRECISION NOT NULL,
  "stock_after" DOUBLE PRECISION NOT NULL
);
CREATE TABLE "sync_outbox" (
  "id" UUID NOT NULL PRIMARY KEY,
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "entity_version" INTEGER NOT NULL DEFAULT 1,
  "occurred_at" TIMESTAMPTZ NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ,
  "last_error" TEXT,
  "synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "sync_outbox_synced_at_next_attempt_at_created_at_idx" ON "sync_outbox"("synced_at", "next_attempt_at", "created_at");
CREATE TABLE "sync_inbox" (
  "sequence" INTEGER NOT NULL PRIMARY KEY,
  "event_id" UUID NOT NULL UNIQUE,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "entity_version" INTEGER NOT NULL,
  "occurred_at" TIMESTAMPTZ NOT NULL,
  "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
