# Dormant Dockerfile - prepared for a Fly.io migration off Railway.
# Railway currently uses Procfile + railway.toml, this file is only read by
# `fly deploy` so it stays out of the way until we actually cut over.
#
# Multi-stage build keeps the runtime image lean by isolating compile-time
# system libs from the runtime image. numpy / pandas / scipy / pillow ship
# manylinux wheels so they don't need build-essential, but curl_cffi and
# reportlab pull native libs we still want around at runtime.

# Base image pin (Finding 4 / supply-chain): the `3.11-slim` tag floats, so
# builds are non-reproducible and a trojaned upstream rebuild would be pulled
# silently on the next deploy. To pin by digest, resolve the current one:
#   docker pull python:3.11-slim
#   docker inspect --format='{{index .RepoDigests 0}}' python:3.11-slim
# then replace BOTH `FROM python:3.11-slim` lines below with the SAME
#   FROM python@sha256:<digest-you-got-above>
# (use one digest for deps + runtime so they share a base layer). Tag kept
# here so the build doesn't break - do NOT invent a sha256.
FROM python:3.11-slim AS deps
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      gcc \
      libcurl4-openssl-dev \
      libssl-dev \
      libjpeg-dev \
      libfreetype6-dev \
      zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# See the deps stage above for the digest-pin instructions; pin this line to
# the SAME python@sha256:<digest> when you want reproducible builds.
FROM python:3.11-slim
WORKDIR /app
# Runtime-only system libs. Everything heavy (build-essential, *-dev) lives
# only in the deps stage above. `curl` is added for the HEALTHCHECK below.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libcurl4 \
      libssl3 \
      libjpeg62-turbo \
      libfreetype6 \
      zlib1g \
      ca-certificates \
      curl \
    && rm -rf /var/lib/apt/lists/*

# Create an unprivileged user and own the app dir (Finding 2 / CWE-250).
# Running as uid 1001 instead of root means an RCE in the app (yfinance,
# Pillow, ReportLab all parse untrusted input) lands as a confined user.
RUN groupadd --system --gid 1001 corvo \
    && useradd --system --uid 1001 --gid corvo --no-create-home corvo

COPY --from=deps /install /usr/local
COPY main.py .
RUN chown -R corvo:corvo /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

EXPOSE 8080

# Drop privileges - app runs as uid 1001, not root.
USER corvo

# Container-level liveness probe (Finding 3 / CWE-754). Fly's edge check in
# fly.toml covers the HTTP path; this covers plain `docker run` / Compose /
# Swarm where a wedged-but-listening process would otherwise never restart.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT:-8080}/health" || exit 1

# Fly Machines respect $PORT; default 8080 for local docker run.
# Single worker is intentional - the FastAPI lifespan starts 8 asyncio
# background loops (price alerts, EOD snapshots, etc.) that must run in
# exactly one process or every loop runs N times with the same Supabase
# data and writes duplicate rows.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
