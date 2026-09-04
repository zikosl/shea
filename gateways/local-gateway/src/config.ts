import { readFileSync } from "node:fs";
import path from "node:path";
import { config as loadEnvironment } from "dotenv";

function dataDirectory() {
  const dataRoot = process.platform === "win32"
    ? process.env.PROGRAMDATA || "C:\\ProgramData"
    : process.env.XDG_CONFIG_HOME || "/etc";
  return path.join(dataRoot, "Shea", "Local Gateway");
}

loadEnvironment({ path: process.env.SHEA_GATEWAY_ENV || path.join(dataDirectory(), "gateway.env") });

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function configurationPath() {
  if (process.env.SHEA_GATEWAY_CONFIG) return path.resolve(process.env.SHEA_GATEWAY_CONFIG);
  return path.join(dataDirectory(), "gateway.config.json");
}

type RuntimeConfiguration = {
  host?: string;
  port?: number;
  cloudGatewayUrl: string;
  storeId: string;
  gatewayToken: string;
  pairingCode: string;
  syncIntervalMs?: number;
  bootstrapIntervalMs?: number;
};

function runtimeConfiguration(): RuntimeConfiguration {
  try {
    return JSON.parse(readFileSync(configurationPath(), "utf8")) as RuntimeConfiguration;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`LOCAL_GATEWAY_NOT_CONFIGURED: ${configurationPath()} (${detail})`);
  }
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const runtime = runtimeConfiguration();
for (const key of ["cloudGatewayUrl", "storeId", "gatewayToken", "pairingCode"] as const) {
  if (!runtime[key]?.trim()) throw new Error(`LOCAL_GATEWAY_CONFIG_INVALID: ${key}`);
}

export const config = {
  configPath: configurationPath(),
  host: runtime.host?.trim() || "0.0.0.0",
  port: positiveInteger(runtime.port, 3510),
  databaseUrl: requiredEnvironment("DATABASE_URL"),
  cloudBaseUrl: runtime.cloudGatewayUrl.replace(/\/$/, ""),
  storeId: runtime.storeId,
  gatewayToken: runtime.gatewayToken,
  pairingCode: runtime.pairingCode,
  syncIntervalMs: positiveInteger(runtime.syncIntervalMs, 10_000),
  bootstrapIntervalMs: positiveInteger(runtime.bootstrapIntervalMs, 60_000),
};
