import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./database";
import { config } from "./config";

export type GatewayRequest = Request & { store?: { id: string; partnerId: number } };

export const hashToken = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

function equal(left: string, right: string) {
  const a = Buffer.from(hashToken(left), "hex");
  const b = Buffer.from(hashToken(right), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function tokenMatchesHash(token: string, expectedHash: string) {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function bearer(request: Request) {
  return request.header("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
}

export function requireService(request: Request, response: Response, next: NextFunction) {
  if (!equal(bearer(request), config.serviceToken)) return response.status(401).json({ error: "SERVICE_AUTH_REQUIRED" });
  next();
}

export async function requireGateway(request: GatewayRequest, response: Response, next: NextFunction) {
  const storeId = request.header("x-store-id") || "";
  const token = bearer(request);
  if (!storeId || !token) return response.status(401).json({ error: "GATEWAY_AUTH_REQUIRED" });
  const store = await prisma.cloudStore.findUnique({ where: { id: storeId } });
  if (!store?.gatewayTokenHash || store.status !== "ACTIVE" || !tokenMatchesHash(token, store.gatewayTokenHash)) {
    return response.status(401).json({ error: "INVALID_GATEWAY_CREDENTIALS" });
  }
  request.store = { id: store.id, partnerId: store.partnerId };
  await prisma.cloudStore.update({ where: { id: store.id }, data: { gatewayLastSeenAt: new Date() } });
  next();
}
