# Shea — Docker Production Setup

## Prerequisites

- VPS with Ubuntu 22.04+ (2 vCPU / 4 GB RAM minimum)
- Docker 24+ and Docker Compose v2
- A domain with DNS A record pointing to your server IP
- Ports 80 and 443 open in your firewall

---

## First-time setup

### 1. Install Docker (if needed)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone your repo and enter the docker folder

```bash
git clone <your-repo> shea
cd shea
```

### 3. Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in every value. Generate JWT secrets with:

```bash
openssl rand -hex 32
```

Run that command **2 times** — once for each JWT secret.

For URL-related values:

- `SHEA_DOMAIN` should be the site host only, for example `app.example.com`
- `NEXT_PUBLIC_API_URL` should be the public Caddy route, for example `https://app.example.com/api`
- `NEXT_PUBLIC_PUBLIC_URL` should be the site origin, for example `https://app.example.com`
- `PARTNER_PWA_GRAPHQL_URL` should be the public GraphQL endpoint, for example `https://app.example.com/api/graphql`
- `PARTNER_PWA_BASE_PATH` should stay `/store` unless you intentionally want a different mounted path

### 4. Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

That's it. Caddy automatically provisions HTTPS certificates on first request.

---

## Common commands

```bash
make up            # Start all services
make down          # Stop all services
make restart       # Rebuild images and restart
make logs          # Tail all logs
make ps            # Show service health status

make backup        # Backup the database
make restore F=backups/shea_20260101_120000.sql.gz

make shell-backend # Shell into the backend container
make shell-db      # psql into the database

make dev           # Start in development mode
```

---

## Vendor custom domains

When the super admin assigns a custom domain to a vendor (e.g. `gamezone.com`):

1. Tell the vendor to add a DNS record at their registrar:
   ```
   Type:  CNAME
   Name:  @  (or the subdomain they want, e.g. app)
   Value: app.yoursaas.com
   ```
2. In the super admin panel, go to Vendors → click the Globe icon → enter the domain → Save → Verify DNS.
3. Caddy automatically provisions a Let's Encrypt certificate for that domain on the next request. No server changes needed.

---

## Updating to a new version

```bash
git pull
./deploy.sh
```

The deploy script automatically backs up the database before every deploy.

---

## Backups

Backups are stored in `./backups/` as compressed SQL files.

Set up a cron job for automatic daily backups:

```bash
crontab -e
# Add:
0 3 * * * cd /path/to/shea && make backup >> /var/log/shea-backup.log 2>&1
```

---

## Directory structure

```
.
├── docker-compose.yml          Main compose file (production)
├── docker-compose.dev.yml      Main compose file (development)
├── .env.example                Environment template
├── .env                        Your secrets (not in git)
├── deploy.sh                   Production deploy script
├── Makefile                    Common commands
├── backups/                    Database backups (not in git)
├── docker/
│   ├── caddy/
│   │   ├── Caddyfile           Production reverse proxy + SSL config
│   │   └── Caddyfile.dev       Development (no TLS)
│   └── postgres/
│       └── init.sql            DB initialization (extensions, etc.)
├── backend/
│   ├── Dockerfile
│   ├── Dockerfile.seed
│   └── .dockerignore
├── partner-pwa/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── .dockerignore
└── admin/
    ├── Dockerfile
    └── .dockerignore
```

---

## Troubleshooting

**Caddy can't get a certificate**
- Make sure port 80 and 443 are open on your firewall
- Verify DNS has propagated: `dig +short yourdomain.com`
- Check Caddy logs: `docker compose logs caddy`

**Backend won't start**
- Check all JWT secrets are set in `.env`
- Check DB connection: `docker compose logs postgres`
- Check Redis is running: `docker compose logs redis`
- Run migrations manually: `make migrate`

**"CHANGE_THIS" error on deploy**
- You haven't filled in all values in `.env`
- Run `cp .env.example .env` again and fill everything in

**Reset everything and start fresh**
```bash
make clean   # WARNING: deletes all data
./deploy.sh
```
