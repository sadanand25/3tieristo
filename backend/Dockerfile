# ---------- Stage 1: Dependencies ----------
FROM node:18-alpine AS deps

WORKDIR /app

COPY package*.json ./

# `npm install` creates package-lock.json if it doesn't exist
RUN npm install --omit=dev && npm cache clean --force

# ---------- Stage 2: Runtime ----------
FROM node:18-alpine

RUN apk add --no-cache curl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs app.js package.json ./

USER nodejs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "app.js"]