# Shea POS deployment architecture

Shea uses three independently deployable applications and one shared protocol package.

```text
Solo POS SQLite --------------------------> SaaS authenticated sync

Multi POS SQLite -> Local Gateway -> Local PostgreSQL
                         |
                         +---------------> Cloud Gateway -> Cloud PostgreSQL

Admin -> SaaS Backend (control plane) ---> Cloud Gateway internal API
```

## Database ownership

- The SaaS backend database owns partners, stores, subscriptions, deployment mode, and configured gateway URLs.
- The cloud gateway database owns cloud POS replicas, gateway credentials, sales, sync events, and cursors.
- A multi-POS store's local PostgreSQL owns live shared stock and sales.
- Every terminal retains SQLite for its local read model, printing, images, and operator state.
- No POS process connects directly to PostgreSQL.

## First installation

Shea POS asks whether the register is single or multi-POS before activation.

- Single register selects SQLite and keeps the existing authenticated SaaS synchronization path; it needs no local PostgreSQL or gateway service.
- Multiple registers records the local gateway LAN URL. After activation, pair the terminal from Settings using the store pairing code.

## Cloud gateway

The cloud gateway is deployed independently and connects to an existing PostgreSQL server. It does not bundle PostgreSQL.

```bash
cd gateways/cloud-gateway
cp .env.example .env
npm ci
npm run db:deploy
docker compose up -d --build
```

Expose it through Caddy at `/api/pos-sync`. Configure the same `SAAS_SERVICE_TOKEN` on the cloud gateway and `CLOUD_GATEWAY_SERVICE_TOKEN` on the SaaS backend.
Both Compose projects join the external `proxy-network`; create it once with `docker network create proxy-network` before their first deployment.

In Admin, open **Store Networks**, enable cloud synchronization, and enter:

- Cloud API: `https://your-domain.example/api/pos-sync`
- Suggested LAN API: `http://192.168.1.10:3510`

Provisioning returns a one-time Store ID, cloud URL, and gateway token.

## Local gateway

The local gateway is installed on one Windows store server. PostgreSQL must already be reachable from that machine.

```powershell
cd gateways\local-gateway
npm ci
npm run dist:win
```

The generated installer is in `installer/output`. Its configuration wizard asks for the PostgreSQL URL, cloud URL, Store ID, one-time token, and a POS pairing code. It then deploys Prisma migrations and installs an automatically starting Windows service.

Only `DATABASE_URL` is stored in `gateway.env`. Store and cloud settings are stored separately in `gateway.config.json` under `%PROGRAMDATA%\Shea\Local Gateway`.

## Safety rules

- Restrict LAN port `3510` to the store's trusted VLAN.
- Never expose PostgreSQL port `5432` to terminals or the internet.
- Multi-POS checkout stops when the local gateway is unavailable to prevent overselling.
- Internet loss does not stop store operations; the local gateway outbox retries later.
- Rotate provisioning and pairing credentials after setup.
- Back up local and cloud PostgreSQL independently.
- Run `prisma migrate deploy` before starting a new gateway release.

## Shared protocol

`packages/pos-protocol` is compiled into Shea POS and both gateways. It validates sales, stock changes, terminal pairing, event envelopes, cursors, and protocol versions. It contains no database or transport implementation.

## Current support boundary

The production multi-POS path is terminal SQLite -> local gateway -> local PostgreSQL -> cloud gateway. Solo mode intentionally keeps the existing SaaS synchronization path for compatibility. A future direct solo-to-cloud path should use per-terminal cloud credentials; it must not reuse the store gateway credential on every register.
