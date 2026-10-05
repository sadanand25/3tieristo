# ---------- Stage 1: Build (optional, if you have a build step) ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy source and build
COPY . .
RUN npm run build --if-present

# ---------- Stage 2: Runtime (nginx) ----------
FROM nginx:1.25-alpine AS runtime

# Remove default nginx config and static files
RUN rm -rf /usr/share/nginx/html/* && \
    rm -f /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files (built artifacts or raw HTML)
COPY --from=builder /app/dist /usr/share/nginx/html
# OR if you don't have a build step:
# COPY index.html /usr/share/nginx/html/index.html

# nginx runs as root by default in the official image; drop privileges
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]