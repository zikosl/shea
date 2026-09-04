import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function targetPath() {
  if (process.env.SHEA_GATEWAY_CONFIG) return path.resolve(process.env.SHEA_GATEWAY_CONFIG);
  const dataRoot = process.platform === "win32"
    ? process.env.PROGRAMDATA || "C:\\ProgramData"
    : process.env.XDG_CONFIG_HOME || "/etc";
  return path.join(dataRoot, "Shea", "Local Gateway", "gateway.config.json");
}

const cloudGatewayUrl = argument("cloud-url");
const storeId = argument("store-id");
const gatewayToken = argument("gateway-token") || process.env.SHEA_CONFIG_GATEWAY_TOKEN?.trim();
const databaseUrl = argument("database-url") || process.env.SHEA_CONFIG_DATABASE_URL?.trim();
if (!cloudGatewayUrl || !storeId || !gatewayToken || !databaseUrl) {
  console.error("Usage: configure --cloud-url <https://...> --store-id <id> [--database-url <postgresql://...>] [--gateway-token <token>] [--pairing-code <code>]");
  process.exit(2);
}

const parsedUrl = new URL(cloudGatewayUrl);
if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") {
  throw new Error("The cloud gateway must use HTTPS outside local development");
}

const destination = targetPath();
mkdirSync(path.dirname(destination), { recursive: true });
writeFileSync(path.join(path.dirname(destination), "gateway.env"), `DATABASE_URL=${databaseUrl}\n`, { encoding: "utf8", mode: 0o600 });
writeFileSync(destination, JSON.stringify({
  host: "0.0.0.0",
  port: 3510,
  cloudGatewayUrl: parsedUrl.toString().replace(/\/$/, ""),
  storeId,
  gatewayToken,
  pairingCode: argument("pairing-code") || randomBytes(6).toString("base64url"),
  syncIntervalMs: 10_000,
  bootstrapIntervalMs: 60_000,
}, null, 2), { encoding: "utf8", mode: 0o600 });
console.log(`Gateway configuration written to ${destination}`);
