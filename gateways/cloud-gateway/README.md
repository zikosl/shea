# Shea Cloud Gateway

Independent POS synchronization data plane. It owns a separate Prisma/PostgreSQL schema and is deployed with Docker against an externally managed PostgreSQL database.

It exposes `/v1` to provisioned local gateways and `/internal/v1` to the SaaS control plane.

## Deploy

Create a dedicated PostgreSQL database, then configure this service without adding that database to Docker:

```bash
cp .env.example .env
npm ci
npm run db:deploy
docker compose up -d --build
```

The Compose service joins the external `proxy-network`. Shea Caddy joins the same network and exposes it at `/api/pos-sync`; override `CLOUD_GATEWAY_UPSTREAM` only when the gateway is reachable under another DNS name. The cloud database and gateway lifecycle remain independent from the SaaS backend database.
