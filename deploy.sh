#!/usr/bin/env bash
# ─── Shea Production Deploy Script ────────────────────────────────────────
# Run on the server after pulling latest code:
#   chmod +x deploy.sh
#   ./deploy.sh

set -euo pipefail

COMPOSE="docker compose"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Shea Deploy — $TIMESTAMP   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ─── Pre-flight checks ────────────────────────────────────────────────────────
echo "▶ Checking prerequisites..."

command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not found"; exit 1; }
$COMPOSE version >/dev/null 2>&1   || { echo "ERROR: docker compose not found"; exit 1; }

[ -f .env ] || {
  echo "ERROR: .env file not found."
  echo "       Copy .env.example to .env and fill in all values."
  exit 1
}

# Validate required env vars are not still at example values
REQUIRED_VARS=(
  SHEA_DOMAIN ACME_EMAIL NEXT_PUBLIC_API_URL
  POSTGRES_PASSWORD
  JWT_ACCESS_SECRET JWT_REFRESH_SECRET
)
source .env
for var in "${REQUIRED_VARS[@]}"; do
  val="${!var:-}"
  if [ -z "$val" ] || [[ "$val" == *"CHANGE_THIS"* ]]; then
    echo "ERROR: $var is not set or still has placeholder value."
    exit 1
  fi
done
echo "  ✓ Environment looks good"

# ─── Backup database before deploy ───────────────────────────────────────────
echo "▶ Backing up database..."
mkdir -p backups
if $COMPOSE ps postgres --quiet 2>/dev/null | grep -q .; then
  $COMPOSE exec -T postgres pg_dump \
    -U "${POSTGRES_USER:-shea}" \
    "${POSTGRES_DB:-shea}" \
    | gzip > "backups/pre_deploy_${TIMESTAMP}.sql.gz"
  echo "  ✓ Backup saved: backups/pre_deploy_${TIMESTAMP}.sql.gz"
else
  echo "  ℹ  Postgres not running — skipping backup (first deploy?)"
fi

# ─── Pull latest images (if using registry) ───────────────────────────────────
# Uncomment if you push to a registry instead of building on the server:
# echo "▶ Pulling latest images..."
# $COMPOSE pull --ignore-pull-failures

# ─── Build fresh images ───────────────────────────────────────────────────────
echo "▶ Building images..."
$COMPOSE build --no-cache --pull
echo "  ✓ Images built"

# ─── Rolling restart ──────────────────────────────────────────────────────────
echo "▶ Starting services..."
$COMPOSE up -d --remove-orphans
echo "  ✓ Services started"

# ─── Wait for health checks ───────────────────────────────────────────────────
echo "▶ Waiting for services to be healthy..."
RETRIES=30
for service in postgres backend admin; do
  echo -n "  Waiting for $service"
  for i in $(seq 1 $RETRIES); do
    STATUS=$($COMPOSE ps --format json "$service" 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    if [ "$STATUS" = "healthy" ]; then
      echo " ✓"
      break
    fi
    if [ "$i" = "$RETRIES" ]; then
      echo " ✗ TIMEOUT"
      echo "ERROR: $service did not become healthy. Check: docker compose logs $service"
      exit 1
    fi
    echo -n "."
    sleep 3
  done
done

# ─── Cleanup old images ───────────────────────────────────────────────────────
echo "▶ Cleaning up dangling images..."
docker image prune -f --filter "until=24h" >/dev/null 2>&1 || true
echo "  ✓ Cleanup done"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Deploy complete ✓                  ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  App:    https://${SHEA_DOMAIN}"
echo "  API:    https://${SHEA_DOMAIN}/api/health"
echo "  Logs:   docker compose logs -f"
echo ""
