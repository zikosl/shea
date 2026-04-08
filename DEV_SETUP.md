# Shea — Development Environment

## How it works

```
Your editor (host machine)
  │
  ├── backend/src/   ──volume mount──▶  backend container (nodemon watches)
  └── admin/         ──volume mount──▶  admin container   (Next.js HMR)
```

You edit files on your host machine using your normal editor. Changes are
reflected inside the containers instantly — no rebuild needed.

---

## First-time setup

### 1. Make sure your backend has a dev script with nodemon

In `backend/package.json`, the `dev` script must use nodemon or ts-node-dev.
A typical setup:

```json
"scripts": {
  "dev": "nodemon --watch src --ext ts --exec ts-node src/index.ts",
  "dev:debug": "nodemon --watch src --ext ts --exec \"node --inspect=0.0.0.0:9229 -r ts-node/register src/index.ts\""
}
```

If you want the debugger, use `dev:debug` as the command in `Dockerfile.dev`:
```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev:debug"]
```

### 2. Make sure your admin has a dev script

In `admin/package.json`:
```json
"scripts": {
  "dev": "next dev"
}
```

This is standard Next.js — it should already be there.

### 3. Start the dev environment

```bash
make dev
```

This starts: PostgreSQL + Backend (hot reload) + Admin (HMR) + Caddy (port 80 proxy)

### 4. Access

| Service         | URL                        | Notes                        |
|-----------------|----------------------------|------------------------------|
| Admin frontend  | http://localhost:3000      | Direct Next.js               |
| Backend API     | http://localhost:3001/api  | Direct Express               |
| Via Caddy proxy | http://localhost           | Same as production routing   |
| PostgreSQL      | localhost:5432             | For TablePlus / DBeaver etc. |

---

## Common commands

```bash
make dev                  # Start all dev services
make dev-build            # Rebuild images first (after package.json changes)
make dev-down             # Stop all dev services
make dev-clean            # Stop + delete dev volumes (fresh DB)
make dev-logs             # Tail logs from all dev services
make dev-shell-backend    # Open a shell in the backend container
make dev-shell-db         # Open psql in the database container
make dev-migrate          # Create and run a new Prisma migration
```

---

## Rebuilding dev images

You only need to rebuild when you change:
- `package.json` (added/removed packages)
- `Dockerfile.dev`
- `prisma/schema.prisma` (Prisma client needs regenerating)

```bash
make dev-build
```

For everything else (source code changes), the volume mounts handle it automatically.

---

## Database

Dev uses a **separate database** (`shea_dev`) and a **separate named volume**
(`dev_postgres_data`) so it never touches production data.

**Connect from your host:**
```
Host:     localhost
Port:     5432
User:     shea
Password: shea_dev_password
Database: shea_dev
```

**Run a new migration** (after editing `prisma/schema.prisma`):
```bash
make dev-migrate
# You'll be prompted to name the migration
```

**Reset the database completely:**
```bash
make dev-clean   # wipes the dev_postgres_data volume
make dev         # starts fresh — migrations run automatically on boot
```

**Seed the database:**
```bash
make dev-seed
```

---

## Debugging the backend with VS Code

Port `9229` is exposed from the backend container.

1. Update the `dev` script in `backend/package.json` to include `--inspect`:
   ```
   "dev": "nodemon --watch src --ext ts --exec \"node --inspect=0.0.0.0:9229 -r ts-node/register src/index.ts\""
   ```
2. Start dev: `make dev`
3. In VS Code: **Run → Start Debugging** → select **"Attach to Backend (Docker)"**
4. Set breakpoints anywhere in `backend/src/` — they work.

The `.vscode/launch.json` is already configured in this repo.

---

## Troubleshooting

**Hot reload not working for backend**
- Make sure `nodemon` is in `devDependencies` of `backend/package.json`
- Check the dev script uses `--watch src`
- Check logs: `make dev-logs`

**Next.js HMR not working (frontend changes don't appear)**
- `WATCHPACK_POLLING=true` is already set in `docker-compose.dev.yml` — this handles
  file system events inside Docker on macOS/Windows where inotify doesn't work
- If still broken: `make dev-build` to rebuild the admin image

**"Cannot connect to database"**
- Postgres takes ~5s to start. The backend waits for the healthcheck, but if
  you see this error, wait a few seconds and it resolves itself
- Check: `docker compose -f docker-compose.dev.yml logs postgres`

**Port already in use**
- Something on your host is using 3000, 3001, or 5432
- Find it: `lsof -i :3001` and kill it, or change the port in `docker-compose.dev.yml`

**`node_modules` issues / "module not found"**
- The `- /app/node_modules` volume in the compose file keeps the container's
  `node_modules` isolated from your host. If you see module errors, rebuild:
  ```bash
  make dev-build
  ```
