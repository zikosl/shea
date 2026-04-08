# ─── Shea Docker Makefile ──────────────────────────────────────────────────
.PHONY: help up down build restart logs ps shell-backend shell-db \
        migrate seed backup restore clean \
        dev dev-build dev-down dev-clean dev-logs dev-ps \
        dev-shell-backend dev-shell-db dev-migrate dev-seed

# Default target
help:
	@echo ""
	@echo "  Shea Docker Commands"
	@echo "  ─────────────────────────────────────────────────"
	@echo "  Production:"
	@echo "    make up          Start all services"
	@echo "    make down        Stop all services"
	@echo "    make build       Rebuild images"
	@echo "    make restart     Rebuild and restart"
	@echo "    make logs        Tail all logs"
	@echo "    make ps          Show service status"
	@echo ""
	@echo "  Development:"
	@echo "    make dev              Start in dev mode (hot reload)"
	@echo "    make dev-build        Rebuild dev images and start"
	@echo "    make dev-down         Stop dev services"
	@echo "    make dev-clean        Stop dev + wipe dev volumes"
	@echo "    make dev-logs         Tail dev logs"
	@echo "    make dev-migrate      Run a new Prisma migration (dev)"
	@echo "    make dev-shell-backend   Shell into dev backend"
	@echo "    make dev-shell-db        psql into dev database"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate     Run pending migrations"
	@echo "    make seed        Seed the database"
	@echo "    make backup      Backup database to ./backups/"
	@echo "    make restore F=backup.sql  Restore from file"
	@echo ""
	@echo "  Maintenance:"
	@echo "    make shell-backend   Shell into backend container"
	@echo "    make shell-db        psql shell into database"
	@echo "    make clean           Remove containers, volumes, images"
	@echo ""

# ─── Production ───────────────────────────────────────────────────────────────

up:
	@[ -f .env ] || { echo "ERROR: .env not found. Copy .env.example and fill in values."; exit 1; }
	docker compose up -d --remove-orphans

down:
	docker compose down

build:
	@[ -f .env ] || { echo "ERROR: .env not found."; exit 1; }
	docker compose build --no-cache

restart: build
	docker compose up -d --remove-orphans

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

# ─── Development ──────────────────────────────────────────────────────────────

DEV_COMPOSE = docker compose -f docker-compose.dev.yml

dev:
	@[ -f .env ] || { echo "ERROR: .env not found. Copy .env.example and fill in values."; exit 1; }
	$(DEV_COMPOSE) up

dev-build:
	$(DEV_COMPOSE) up --build

dev-down:
	$(DEV_COMPOSE) down

dev-clean:
	$(DEV_COMPOSE) down -v

dev-logs:
	$(DEV_COMPOSE) logs -f --tail=100

dev-ps:
	$(DEV_COMPOSE) ps

dev-shell-backend:
	$(DEV_COMPOSE) exec backend sh

dev-shell-db:
	$(DEV_COMPOSE) exec postgres psql -U $$(grep POSTGRES_USER .env | cut -d= -f2) $$(grep POSTGRES_DB .env | cut -d= -f2)

dev-migrate:
	$(DEV_COMPOSE) exec backend npx prisma migrate dev

dev-seed:
	$(DEV_COMPOSE) run --rm --build shea-seed

# ─── Database ─────────────────────────────────────────────────────────────────

migrate:
	docker compose exec backend npx prisma migrate deploy

seed:
	docker compose run --rm \
	  -e DATABASE_URL=postgresql://$$(grep POSTGRES_USER .env | cut -d= -f2):$$(grep POSTGRES_PASSWORD .env | cut -d= -f2)@postgres:5432/$$(grep POSTGRES_DB .env | cut -d= -f2)?schema=public \
	  --build shea-seed

backup:
	@mkdir -p backups
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	docker compose exec -T postgres pg_dump \
	  -U $$(grep POSTGRES_USER .env | cut -d= -f2) \
	  $$(grep POSTGRES_DB .env | cut -d= -f2) \
	  | gzip > backups/shea_$$TIMESTAMP.sql.gz; \
	echo "Backup saved: backups/shea_$$TIMESTAMP.sql.gz"

restore:
	@[ -n "$(F)" ] || { echo "Usage: make restore F=backups/shea_TIMESTAMP.sql.gz"; exit 1; }
	@echo "Restoring from $(F)..."
	gunzip -c $(F) | docker compose exec -T postgres psql \
	  -U $$(grep POSTGRES_USER .env | cut -d= -f2) \
	  $$(grep POSTGRES_DB .env | cut -d= -f2)
	@echo "Restore complete."

# ─── Maintenance ──────────────────────────────────────────────────────────────

shell-backend:
	docker compose exec backend sh

shell-db:
	docker compose exec postgres psql \
	  -U $$(grep POSTGRES_USER .env | cut -d= -f2) \
	  $$(grep POSTGRES_DB .env | cut -d= -f2)

clean:
	@echo "WARNING: This will delete all containers, volumes, and built images."
	@read -p "Are you sure? [y/N] " ans && [ "$$ans" = "y" ]
	docker compose down -v --rmi local
	@echo "Clean complete."
