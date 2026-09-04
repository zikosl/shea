import { randomBytes, randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { Prisma, SyncSource } from "@prisma/client";
import {
  cloudStoreProvisionSchema,
  cursorUpdateSchema,
  POS_PROTOCOL_VERSION,
  productSnapshotSchema,
  syncPushSchema,
  type ProductSnapshot,
  type SyncEvent as ProtocolSyncEvent,
} from "@shea/pos-protocol";
import { config } from "./config";
import { prisma } from "./database";
import { type GatewayRequest, hashToken, requireGateway, requireService } from "./security";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "20mb" }));
app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-store");
  next();
});

const json = (value: unknown) => value as Prisma.InputJsonValue;

function productData(storeId: string, product: ProductSnapshot) {
  return {
    storeId,
    productId: product.id,
    variantId: product.variantId,
    name: product.name,
    nameAr: product.nameAr,
    variantName: product.variantName,
    sku: product.sku,
    image: product.image,
    price: product.price,
    costPrice: product.costPrice,
    discount: product.discount,
    stock: product.stock,
    reorderThreshold: product.reorderThreshold,
    trackInventory: product.trackInventory,
    available: product.available,
    visibleInPos: product.visibleInPos,
    sourceUpdatedAt: new Date(product.updatedAt),
  };
}

async function applyGatewayEvent(tx: Prisma.TransactionClient, storeId: string, event: ProtocolSyncEvent) {
  const payload = event.payload;
  if (event.operation === "SALE_COMPLETED") {
    if (typeof payload.id !== "string" || typeof payload.saleNumber !== "string" || !Array.isArray(payload.items)) {
      throw new Error("INVALID_SALE_EVENT");
    }
    const existing = await tx.cloudSale.findUnique({ where: { id: payload.id } });
    if (existing) return;
    const lines = payload.items as Array<Record<string, unknown>>;
    const subtotal = lines.reduce((sum, line) => sum + Number(line.total || 0), 0);
    const discountTotal = Number(payload.discountTotal || 0);
    const taxTotal = Number(payload.taxTotal || 0);
    await tx.cloudSale.create({
      data: {
        id: payload.id,
        storeId,
        saleNumber: payload.saleNumber,
        terminalId: typeof payload.terminalId === "string" ? payload.terminalId : null,
        cashierId: typeof payload.cashierId === "string" ? payload.cashierId : null,
        cashierName: typeof payload.cashierName === "string" ? payload.cashierName : null,
        customerName: typeof payload.customerName === "string" ? payload.customerName : null,
        subtotal,
        discountTotal,
        taxTotal,
        total: Number(payload.total ?? subtotal - discountTotal + taxTotal),
        paymentMethod: typeof payload.paymentMethod === "string" ? payload.paymentMethod : "CASH",
        occurredAt: new Date(typeof payload.createdAt === "string" ? payload.createdAt : event.occurredAt),
        items: {
          create: lines.map((line) => ({
            productId: Number(line.productId),
            productName: String(line.productName || "Product"),
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            discount: Number(line.discount || 0),
            tax: Number(line.tax || 0),
            total: Number(line.total || 0),
          })),
        },
      },
    });
    for (const line of lines) {
      const stockAfter = Number(line.stockAfter);
      if (Number.isFinite(stockAfter)) {
        await tx.cloudProduct.update({
          where: { storeId_productId: { storeId, productId: Number(line.productId) } },
          data: { stock: stockAfter },
        });
      }
    }
    return;
  }

  const updates = event.operation === "STOCK_BATCH_UPDATED" && Array.isArray(payload.lines)
    ? payload.lines as Array<Record<string, unknown>>
    : [payload];
  if (["STOCK_BATCH_UPDATED", "STOCK_ADJUSTED", "PRODUCT_UPDATED"].includes(event.operation)) {
    for (const update of updates) {
      const productId = Number(update.productId);
      if (!Number.isInteger(productId)) throw new Error("INVALID_PRODUCT_EVENT");
      await tx.cloudProduct.update({
        where: { storeId_productId: { storeId, productId } },
        data: {
          ...(Number.isFinite(Number(update.stockAfter ?? update.stock)) ? { stock: Number(update.stockAfter ?? update.stock) } : {}),
          ...(Number.isFinite(Number(update.costAfter ?? update.costPrice)) ? { costPrice: Number(update.costAfter ?? update.costPrice) } : {}),
          ...(Number.isFinite(Number(update.price)) ? { price: Number(update.price) } : {}),
          ...(Number.isFinite(Number(update.discount)) ? { discount: Number(update.discount) } : {}),
          ...(typeof update.available === "boolean" ? { available: update.available } : {}),
          ...(typeof update.visibleInPos === "boolean" ? { visibleInPos: update.visibleInPos } : {}),
        },
      });
    }
  }
}

app.get("/health", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: "ok", service: "shea-cloud-gateway", protocolVersion: POS_PROTOCOL_VERSION });
  } catch {
    response.status(503).json({ status: "error", service: "shea-cloud-gateway" });
  }
});

const internal = express.Router();
internal.use(requireService);
internal.post("/stores/provision", async (request, response) => {
  const input = cloudStoreProvisionSchema.parse(request.body);
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction(async (tx) => {
    await tx.cloudStore.upsert({
      where: { id: input.store.id },
      create: { ...input.store, gatewayTokenHash: hashToken(token), gatewayTokenIssuedAt: new Date() },
      update: { ...input.store, status: "ACTIVE", gatewayTokenHash: hashToken(token), gatewayTokenIssuedAt: new Date() },
    });
    for (const product of input.products) {
      const data = productData(input.store.id, product);
      await tx.cloudProduct.upsert({
        where: { storeId_productId: { storeId: input.store.id, productId: product.id } },
        create: data,
        update: data,
      });
    }
  });
  response.status(201).json({ storeId: input.store.id, token, issuedAt: new Date().toISOString() });
});
internal.put("/stores/:storeId/products", async (request, response) => {
  const products = productSnapshotSchema.array().max(100_000).parse(request.body?.products);
  await prisma.$transaction(async (tx) => {
    for (const product of products) {
      const data = productData(request.params.storeId, product);
      await tx.cloudProduct.upsert({
        where: { storeId_productId: { storeId: request.params.storeId, productId: product.id } },
        create: data,
        update: data,
      });
      await tx.syncEvent.upsert({
        where: { storeId_idempotencyKey: { storeId: request.params.storeId, idempotencyKey: `product:${product.id}:${product.updatedAt}` } },
        create: {
          eventId: randomUUID(), storeId: request.params.storeId,
          idempotencyKey: `product:${product.id}:${product.updatedAt}`,
          source: SyncSource.CLOUD, entityType: "Product", entityId: String(product.id),
          operation: "PRODUCT_UPDATED", payload: json(product), entityVersion: 1,
          occurredAt: new Date(product.updatedAt),
        },
        update: {},
      });
    }
  });
  response.json({ updated: products.length });
});
internal.get("/stores", async (_request, response) => {
  response.json({ stores: await prisma.cloudStore.findMany({ orderBy: { updatedAt: "desc" } }) });
});
internal.get("/stores/:storeId", async (request, response) => {
  const store = await prisma.cloudStore.findUnique({
    where: { id: request.params.storeId },
    select: { id: true, status: true, gatewayLastSeenAt: true, gatewayTokenIssuedAt: true, updatedAt: true },
  });
  if (!store) return response.status(404).json({ error: "STORE_NOT_FOUND" });
  response.json(store);
});
app.use("/internal/v1", internal);

const gateway = express.Router();
gateway.use(requireGateway);
gateway.get("/bootstrap", async (request: GatewayRequest, response) => {
  const store = await prisma.cloudStore.findUniqueOrThrow({ where: { id: request.store!.id } });
  const products = await prisma.cloudProduct.findMany({ where: { storeId: store.id }, orderBy: { productId: "asc" } });
  response.json({
    protocolVersion: POS_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    store: { id: store.id, name: store.name, code: store.code, timezone: store.timezone },
    products: products.map(({ productId, sourceUpdatedAt, storeId: _storeId, updatedAt: _updatedAt, ...product }) => ({
      ...product, id: productId, updatedAt: sourceUpdatedAt.toISOString(),
    })),
  });
});
gateway.post("/events", async (request: GatewayRequest, response) => {
  const input = syncPushSchema.parse(request.body);
  for (const event of input.events) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.syncEvent.create({ data: {
          eventId: event.eventId, storeId: request.store!.id, idempotencyKey: event.idempotencyKey,
          source: SyncSource.LOCAL_GATEWAY, entityType: event.entityType, entityId: event.entityId,
          operation: event.operation, payload: json(event.payload), entityVersion: event.entityVersion,
          occurredAt: new Date(event.occurredAt),
        } });
        await applyGatewayEvent(tx, request.store!.id, event);
      });
    } catch (error) {
      // A concurrent retry can win the unique idempotency-key insert. Treat it
      // as accepted; any other database failure must remain visible to callers.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const accepted = await prisma.syncEvent.findUnique({
        where: { storeId_idempotencyKey: { storeId: request.store!.id, idempotencyKey: event.idempotencyKey } },
        select: { eventId: true },
      });
      if (!accepted) throw error;
    }
  }
  const accepted = await prisma.syncEvent.findMany({
    where: { storeId: request.store!.id, idempotencyKey: { in: input.events.map((event) => event.idempotencyKey) } },
    select: { idempotencyKey: true, sequence: true },
  });
  response.json({ accepted });
});
gateway.get("/events", async (request: GatewayRequest, response) => {
  const after = Math.max(0, Number(request.query.after) || 0);
  const limit = Math.min(500, Math.max(1, Number(request.query.limit) || 200));
  const events = await prisma.syncEvent.findMany({
    where: { storeId: request.store!.id, source: SyncSource.CLOUD, sequence: { gt: after } },
    orderBy: { sequence: "asc" }, take: limit,
  });
  response.json({ events, nextCursor: events.at(-1)?.sequence ?? after, hasMore: events.length === limit });
});
gateway.post("/cursor", async (request: GatewayRequest, response) => {
  const input = cursorUpdateSchema.parse(request.body);
  const cursor = await prisma.syncCursor.upsert({
    where: { storeId_consumerId: { storeId: request.store!.id, consumerId: input.consumerId } },
    create: { storeId: request.store!.id, consumerId: input.consumerId, lastSequence: input.lastSequence },
    update: { lastSequence: input.lastSequence },
  });
  response.json(cursor);
});
app.use("/v1", gateway);

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  console.error("[cloud-gateway]", error);
  if ("issues" in error) return response.status(400).json({ error: "INVALID_REQUEST", details: error });
  response.status(500).json({ error: "INTERNAL_ERROR" });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`Shea cloud gateway listening on ${config.host}:${config.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
