import { z } from "zod";

export const POS_PROTOCOL_VERSION = 1;
export const MINIMUM_POS_PROTOCOL_VERSION = 1;

export const protocolEnvelopeSchema = z.object({
  protocolVersion: z.number().int().min(MINIMUM_POS_PROTOCOL_VERSION).max(POS_PROTOCOL_VERSION),
});

export const syncEventSchema = protocolEnvelopeSchema.extend({
  eventId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(160),
  entityType: z.string().min(1).max(80),
  entityId: z.string().min(1).max(160),
  operation: z.string().min(1).max(80),
  payload: z.record(z.string(), z.unknown()),
  entityVersion: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
});

export const syncPushSchema = protocolEnvelopeSchema.extend({
  events: z.array(syncEventSchema).min(1).max(500),
});

export const cursorUpdateSchema = protocolEnvelopeSchema.extend({
  consumerId: z.string().min(1).max(160),
  lastSequence: z.number().int().nonnegative(),
});

export const terminalPairSchema = protocolEnvelopeSchema.extend({
  pairingCode: z.string().min(4).max(160),
  terminalKey: z.string().min(1).max(160),
  name: z.string().trim().min(1).max(120),
});

export const saleLineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
});

export const saleRequestSchema = protocolEnvelopeSchema.extend({
  id: z.string().uuid(),
  saleNumber: z.string().min(1).max(160),
  cashierId: z.string().nullish(),
  cashierName: z.string().max(160).nullish(),
  customerName: z.string().max(200).nullish(),
  note: z.string().max(1000).nullish(),
  discountTotal: z.number().nonnegative().default(0),
  taxTotal: z.number().nonnegative().default(0),
  paymentMethod: z.enum(["CASH", "CARD", "MIXED", "OTHER"]).default("CASH"),
  createdAt: z.iso.datetime(),
  items: z.array(saleLineSchema).min(1).max(500),
});

export const stockAdjustmentSchema = protocolEnvelopeSchema.extend({
  id: z.string().uuid(),
  productId: z.number().int().positive(),
  mode: z.enum(["RECEIVE", "REMOVE", "SET"]),
  quantity: z.number().nonnegative(),
  reason: z.string().trim().min(1).max(200),
});

export const stockBatchSchema = protocolEnvelopeSchema.extend({
  id: z.string().uuid(),
  operation: z.enum(["RECEIPT", "REVERSE"]),
  reference: z.string().max(160).optional(),
  lines: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().positive(),
    unitCost: z.number().nonnegative(),
  })).min(1).max(500),
});

export const productUpdateSchema = protocolEnvelopeSchema.extend({
  id: z.string().uuid(),
  price: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  stock: z.number().nonnegative().optional(),
  reorderThreshold: z.number().nonnegative().optional(),
  trackInventory: z.boolean().optional(),
  available: z.boolean().optional(),
  visibleInPos: z.boolean().optional(),
});

export const productSnapshotSchema = z.object({
  id: z.number().int().positive(),
  variantId: z.number().int().positive().optional(),
  name: z.string().min(1),
  nameAr: z.string().nullish(),
  variantName: z.string().nullish(),
  sku: z.string().nullish(),
  image: z.string().nullish(),
  price: z.number().nonnegative(),
  costPrice: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  stock: z.number().nonnegative(),
  reorderThreshold: z.number().nonnegative().default(0),
  trackInventory: z.boolean().default(true),
  available: z.boolean().default(true),
  visibleInPos: z.boolean().default(true),
  updatedAt: z.iso.datetime(),
});

export const storeBootstrapSchema = protocolEnvelopeSchema.extend({
  generatedAt: z.iso.datetime(),
  store: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    code: z.string().min(1),
    timezone: z.string().min(1),
  }),
  products: z.array(productSnapshotSchema),
});

export const cloudStoreProvisionSchema = protocolEnvelopeSchema.extend({
  store: z.object({
    id: z.string().min(1),
    partnerId: z.number().int().positive(),
    name: z.string().min(1).max(120),
    code: z.string().min(1).max(40),
    timezone: z.string().min(1).max(80),
  }),
  products: z.array(productSnapshotSchema).max(100_000).default([]),
});

export type SyncEvent = z.infer<typeof syncEventSchema>;
export type SaleRequest = z.infer<typeof saleRequestSchema>;
export type ProductSnapshot = z.infer<typeof productSnapshotSchema>;
export type StoreBootstrap = z.infer<typeof storeBootstrapSchema>;

export const gatewayErrorCodes = [
  "PROTOCOL_VERSION_UNSUPPORTED",
  "TERMINAL_AUTH_REQUIRED",
  "INVALID_TERMINAL_TOKEN",
  "GATEWAY_AUTH_REQUIRED",
  "INVALID_GATEWAY_CREDENTIALS",
  "PAIRING_RATE_LIMITED",
  "INVALID_PAIRING_CODE",
  "INVALID_TERMINAL",
  "INVALID_SALE",
  "PRODUCT_NOT_FOUND",
  "PRODUCT_UNAVAILABLE",
  "INSUFFICIENT_STOCK",
  "INVALID_STOCK_ADJUSTMENT",
  "INVALID_STOCK_BATCH",
  "INVALID_PRODUCT_UPDATE",
] as const;

export type GatewayErrorCode = typeof gatewayErrorCodes[number];
