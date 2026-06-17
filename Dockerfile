# 提货管理应用 / Pickup management app
FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies first for better layer caching.
# better-sqlite3 ships prebuilt binaries, so no build toolchain is needed.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Default port; platforms usually override via the PORT env var.
EXPOSE 3000

# SQLite data lives here — mount a persistent volume at /data in production.
ENV DB_PATH=/data/app.sqlite
VOLUME ["/data"]

CMD ["node", "server/index.js"]
