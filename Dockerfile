# Sistema de Reportes de Promoción (MSP) — imagen de producción
FROM node:22-bookworm-slim

# Chromium para Puppeteer + fuentes métricamente compatibles con Arial/Cambria/Times
# (Liberation Sans ≈ Arial, Caladea ≈ Cambria, Liberation Serif ≈ Times New Roman)
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium fonts-liberation fonts-crosextra-caladea fonts-crosextra-carlito fontconfig ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    DATABASE_URL="file:./storage/reportes.db" \
    STORAGE_DIR="./storage" \
    TZ="America/Guayaquil" \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3100

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npx prisma generate && npx next build

ENV NODE_ENV=production
EXPOSE 3100
VOLUME ["/app/storage"]

# Crea/actualiza el esquema y siembra los datos de ejemplo sólo si la base no existía.
CMD ["sh", "-c", "mkdir -p storage && FIRST=$([ -f storage/reportes.db ] && echo 0 || echo 1) && npx prisma db push && if [ \"$FIRST\" = 1 ]; then npx tsx prisma/seed.ts; fi && npx next start --port ${PORT}"]
