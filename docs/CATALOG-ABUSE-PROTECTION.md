# Public catalog abuse protection

Public data cannot be made scrape-proof. These controls reduce bulk extraction and resource abuse while preserving guest browsing.

## Controls

- HTTP GraphQL budgets: 180 requests/minute and 2,400/hour per client IP by default. A 429 response includes Retry-After.
- Atomic Redis counters shared by backend replicas; bounded local fallback if Redis is unavailable. During outages limits are per process rather than shared.
- JSON body limit of 256 KiB; query text limit of 64 KiB. Multipart uploads are not covered by the JSON parser and still need edge upload limits.
- One GraphQL operation per request; HTTP batching disabled. Expanded fragment budget: 500 fields, 30 aliases, depth 12.
- Guest and customer catalog pages are limited to 100 records, 100 pages, and 120 search characters. isFull no longer bypasses pagination. Authenticated ADMIN/PARTNER operations retain full-list access.
- WebSockets accept subscriptions only, not catalog queries or mutations, with a 64 KiB frame limit and request budgets. Their budgets use the immediate peer address, which may be shared behind a proxy.
- Guest-only field permissions and hidden-product filtering remain in place.

## Deployment

Set backend environment values if necessary:

```ini
API_REQUESTS_PER_MINUTE=180
API_REQUESTS_PER_HOUR=2400
# Use actual trusted Caddy/proxy IPs or tightly scoped CIDRs, comma-separated.
# TRUSTED_PROXY_CIDRS=...
```

Never set broad proxy trust merely to obtain the leftmost X-Forwarded-For address. Restrict direct access to the backend port and ensure the trusted proxy sanitizes forwarded headers. Without TRUSTED_PROXY_CIDRS the HTTP limiter uses the direct peer address, so traffic behind Caddy shares one budget. Configure this before production rollout and load-test legitimate shared-network/mobile usage.

Deploy/restart the backend to activate these controls; no database migration is required for this protection. Earlier checkout changes may have separate migration requirements.

At the public proxy/CDN, add request, connection, and bandwidth limits for GraphQL, static images, uploads, and WebSocket upgrades. Application limits do not stop a distributed attack, rotating IPs, or slow scraping. Watch 429 rates and backend latency before tightening the defaults. Do not rely on CORS or a secret embedded in the mobile app as anti-scraping protection.

Run `npm run test:scraping` and `npm run test:guest-catalog` in backend. Device/staging and reverse-proxy validation are still required before rollout.
