#!/bin/bash

set -e

echo "🛑 Stopping all running containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

echo "🗑️ Removing all containers..."
docker rm -f $(docker ps -aq) 2>/dev/null || true

echo "🖼️ Removing all images..."
docker rmi -f $(docker images -aq) 2>/dev/null || true

echo "💾 Removing all volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null || true

echo "🌐 Removing custom networks..."
docker network ls --filter "type=custom" -q | xargs -r docker network rm 2>/dev/null || true

echo "🧱 Cleaning build cache..."
docker builder prune -a -f 2>/dev/null || true

echo "🧹 Final system prune..."
docker system prune -a --volumes -f 2>/dev/null || true

echo "🧹 clean backups..."
rm -rf backups/*

echo "✅ Docker cleanup complete!"