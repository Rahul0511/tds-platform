# TDS Platform: one container with the Angular app, the API and Chromium for the PDF export.
# Used by Render (render.yaml); also runs locally: docker build -t tds . && docker run -p 3000:3000 tds

# ---- Angular client ----
FROM node:22-bookworm-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Server dependencies (better-sqlite3 is a native module) ----
FROM node:22-bookworm-slim AS server-deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ---- Runtime ----
FROM node:22-bookworm-slim
# Chromium prints the PDFs (puppeteer-core uses it, nothing is downloaded); the fonts cover DE/FR text.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-dejavu-core ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    TDS_BROWSER_PATH=/usr/bin/chromium \
    TDS_BROWSER_ARGS="--no-sandbox --disable-dev-shm-usage"

WORKDIR /app
COPY --from=server-deps /app/server/node_modules server/node_modules
COPY server/package.json server/
COPY server/src server/src
COPY --from=client /app/client/dist/client/browser client/dist/client/browser

WORKDIR /app/server
EXPOSE 3000
CMD ["node", "src/index.js"]
