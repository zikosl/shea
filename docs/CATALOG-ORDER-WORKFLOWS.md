# Catalog and order workflows

## Catalog contribution

Partner and POS product creation stays immediately usable inside the partner workspace as an `INTERNAL` provisional product. A `CatalogSubmission` groups new category, product-type, and product-template requests under one review unit. Public storefront queries continue to expose only canonical products.

Admin reviews dependencies in this order: category, product type, then product. Each dependency can be approved as new or merged into an existing record. Product approval creates or links the partner's canonical variants, promotes provisional products to `PUBLIC`, and lets POS bootstrap reconcile local IDs without replacing local rows.

## Order lifecycle

`Order.status` is the business lifecycle and `Delivery.status` remains a compatibility/fulfillment field. All new transitions use optimistic `version` checks, append `OrderStatusHistory`, and write a durable `OutboxEvent` in the same transaction.

Fixed-price orders follow:

`REQUESTED -> PARTNER_ACCEPTED -> CONFIRMED -> PREPARING -> READY -> FULFILLMENT_STARTED -> COMPLETED`

Quoted orders use `AWAITING_CLIENT_APPROVAL` before `CONFIRMED`. Cancellation and rejection require a reason. Actor role and order ownership are checked server-side.

Gift orders preserve the requested date, the partner's proposed date, the client's confirmed date, and the preparation start. Accepted future gifts become `SCHEDULED`; the workflow worker moves them to `PREPARATION_DUE` when preparation should begin.

## POS consistency

POS stores business status and delivery status separately. Online orders can be accepted and advanced through preparation from the order drawer, while `QUOTE_REQUIRED` orders open an item-by-item quotation editor and wait for client approval. Gift quotations use the same explicit price and proposed-date review rather than silently reusing zero-price lines.

These actions remain offline-first: SQLite updates optimistically, records a pending outbox command, and exposes pending or failed sync state to staff. The backend version check remains authoritative, so a stale terminal cannot overwrite a newer transition. Product `priceOnRequest` is preserved through bootstrap, local SQLite, the shared protocol, and both gateways.

## Production rollout

1. Back up PostgreSQL and deploy the backend migration with `npx prisma migrate deploy` from `backend`.
2. Deploy backend and Redis workers together. Redis must be reachable before accepting traffic.
3. Apply the checked-in Prisma migrations in both gateway projects before restarting those services. The gateways use their configured PostgreSQL databases and do not create a database container.
4. Deploy admin, partner, client, and POS builds after the backend health check succeeds. POS applies its additive SQLite migrations on launch.
5. Publish `@zikosl/shea-pos-protocol@1.1.0`, then update gateways and POS in a rolling release. The wire protocol remains version 1, so old and new gateway binaries interoperate.
6. Verify one category merge, one new product approval, one fixed order, one quoted order, one POS-initiated quotation, and one scheduled gift in staging before production traffic.

Do not run `prisma db push` in production. Use the checked-in migration so the existing-order backfill and status history are applied consistently.
