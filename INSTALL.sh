#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
fi

if ! docker network ls | grep -qE "\bproxy\b"; then
  docker network create proxy
fi

( cd infra/traefik && docker compose --env-file ../../.env up -d )

echo "Traefik is up. Now set up .env in repo root, then run:" 
echo "docker compose -f docker-compose.frontend.yml up -d --build"
echo "docker compose -f docker-compose.bot.yml up -d --build"