# Docker Hub Deployment Guide

This guide describes how Docker images are published and how to deploy or update the WeddingSite stack from Docker Hub.

## 1. How Images Are Published

The GitHub Actions workflow `.github/workflows/deploy-docker.yml` runs on pushes to `main` and:

1. Verifies frontend and backend lint/tests.
2. Builds and pushes three Docker images.
3. Tags images with:
	- `<version>` from `package.json`
	- `latest`
	- `sha-<commit>`
4. Creates a GitHub Release tag `v<version>` if it does not exist.

Published repositories:

- `docker.io/<DOCKERHUB_USERNAME>/weddingsite-frontend`
- `docker.io/<DOCKERHUB_USERNAME>/weddingsite-backend`
- `docker.io/<DOCKERHUB_USERNAME>/weddingsite-postgres`

Required repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

## 2. Server Setup (First Time)

Copy deployment files to the server:

```bash
ssh user@your-server "sudo mkdir -p /weddingsite && sudo chown $USER:$USER /weddingsite"
scp docker-compose.dockerhub.yml deploy/deploy.sh user@your-server:/weddingsite/
```

SSH in and create `/weddingsite/.env`:

```bash
ssh user@your-server
nano /weddingsite/.env
```

Minimum `.env` values:

- `DOCKERHUB_USERNAME`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`

Recommended production values:

- `CORS_ORIGIN`
- `BIND_HOST`
- `VITE_BIND_HOST`
- `VITE_BIND_PORT`

## 3. Deploy / Update

Run on the server:

```bash
chmod +x /weddingsite/deploy.sh
/weddingsite/deploy.sh
```

What the script does:

1. Validates required files in `/weddingsite`.
2. Pulls latest images from Docker Hub.
3. Restarts services with `docker compose ... up -d --remove-orphans`.
4. Prints container status.

## 4. Deploy a Specific Image Tag

Set `APP_IMAGE_TAG` in `/weddingsite/.env` and redeploy:

```env
APP_IMAGE_TAG=1.0.4
```

Then run:

```bash
/weddingsite/deploy.sh
```

## 5. Rollback

1. Set `APP_IMAGE_TAG` to the previous known-good version.
2. Re-run `/weddingsite/deploy.sh`.
3. Confirm app health and logs:

```bash
docker compose -f /weddingsite/docker-compose.dockerhub.yml --env-file /weddingsite/.env ps
docker compose -f /weddingsite/docker-compose.dockerhub.yml --env-file /weddingsite/.env logs --tail=100
```

## 6. Documentation Update Checklist

When deployment behavior changes, update documentation in the same PR.

Required doc touchpoints:

1. `README.md` Docker Hub deploy and env var sections.
2. `deploy/DOCKERHUB_DEPLOYMENT.md` (this file).
3. `deploy/deploy.sh` header comments if script usage changed.
4. PR description notes for workflow behavior changes (trigger, tags, release behavior, required secrets).

## 7. Troubleshooting

- `docker: command not found`: install Docker Engine/CLI on server.
- `pull access denied`: verify `DOCKERHUB_USERNAME` and image visibility/tags.
- `401 unauthorized` on push in CI: check `DOCKERHUB_TOKEN` secret.
- backend fails auth requests: verify `JWT_SECRET` is set and unchanged unexpectedly.
- frontend cannot call API in browser: verify `CORS_ORIGIN` and reverse-proxy headers.
