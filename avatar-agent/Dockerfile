# syntax=docker/dockerfile:1
# Based on LiveKit's agent-starter-node Dockerfile. `lk agent create` / `lk agent deploy` build this.

ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV HOME="/app"

# The LiveKit SDK's native core reads the system CA bundle, which the slim image doesn't ship
RUN apt-get update -qq && apt-get install --no-install-recommends -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Same major version as the lockfile was written with
RUN npm install -g pnpm@12

# --- Build stage ---
FROM base AS build
WORKDIR /app

# Dependency files first, for layer caching. pnpm-workspace.yaml lists the install scripts
# that are allowed to run (the LiveKit native modules).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Pre-download any model files the installed plugins need
RUN npx livekit-agents download-files

COPY . .
RUN pnpm prune --prod

# --- Production stage ---
FROM base

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/app" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    appuser

WORKDIR /app
COPY --from=build --chown=appuser:appuser /app /app
USER appuser

ENV NODE_ENV=production

# Node as PID 1 so SIGTERM reaches the worker and active calls can drain
CMD [ "node", "src/main.ts", "start" ]
