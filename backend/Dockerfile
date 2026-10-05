# ---------- Stage 1: Dependencies ----------
FROM node:18-alpine AS deps

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# ---------- Stage 2: Runtime ----------
FROM node:18-alpine AS runtime

# Add security updates and create non-root user
RUN apk add --no-cache curl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs app.js package.json ./

# Switch to non-root user
USER nodejs

# Expose the application port
EXPOSE 8080

# Health check — used by Kubernetes liveness/readiness too
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "app.js"]