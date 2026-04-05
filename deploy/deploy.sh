#!/usr/bin/env bash
# deploy.sh — run on your production server to deploy or update the wedding site.
# See deploy/DOCKERHUB_DEPLOYMENT.md for full deployment and rollback documentation.
#
# FIRST-TIME SETUP
# ----------------
# 1. Copy this file and docker-compose.dockerhub.yml to the server:
#      scp deploy/deploy.sh docker-compose.dockerhub.yml user@your-server:~/weddingsite/
#
# 2. SSH into the server:
#      ssh user@your-server
#
# 3. Create the .env file from your local .env.example:
#      nano ~/weddingsite/.env
#    Fill in all required values (see .env.example for reference).
#    Make sure DOCKERHUB_USERNAME, JWT_SECRET, POSTGRES_PASSWORD, etc. are set.
#
# 4. Run this script:
#      chmod +x ~/weddingsite/deploy.sh
#      ~/weddingsite/deploy.sh
#
# SUBSEQUENT UPDATES
# ------------------
# After a new release is pushed to DockerHub, just re-run on the server:
#      ~/weddingsite/deploy.sh

set -euo pipefail

DEPLOY_DIR="/weddingsite"
COMPOSE_FILE="docker-compose.dockerhub.yml"
ENV_FILE=".env"

echo "==> Checking deploy directory..."
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "ERROR: $COMPOSE_FILE not found in $DEPLOY_DIR"
  echo "Copy it from the repo: scp docker-compose.dockerhub.yml user@server:~/weddingsite/"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env not found in $DEPLOY_DIR"
  echo "Create it from .env.example and fill in your production secrets."
  exit 1
fi

echo "==> Pulling latest Docker images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull

echo "==> Starting / restarting services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo "==> Service status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo "Deployment complete!"
