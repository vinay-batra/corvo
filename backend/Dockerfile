# Dormant Dockerfile - prepared for a Fly.io migration off Railway.
# Railway currently uses Procfile + railway.toml, this file is only read by
# `fly deploy` so it stays out of the way until we actually cut over.
#
# Multi-stage build keeps the runtime image lean by isolating compile-time
# system libs from the runtime image. numpy / pandas / scipy / pillow ship
# manylinux wheels so they don't need build-essential, but curl_cffi and
# reportlab pull native libs we still want around at runtime.

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

FROM python:3.11-slim
WORKDIR /app
# Runtime-only system libs. Everything heavy (build-essential, *-dev) lives
# only in the deps stage above.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libcurl4 \
      libssl3 \
      libjpeg62-turbo \
      libfreetype6 \
      zlib1g \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /install /usr/local
COPY main.py .

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

EXPOSE 8080

# Fly Machines respect $PORT; default 8080 for local docker run.
# Single worker is intentional - the FastAPI lifespan starts 8 asyncio
# background loops (price alerts, EOD snapshots, etc.) that must run in
# exactly one process or every loop runs N times with the same Supabase
# data and writes duplicate rows.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
