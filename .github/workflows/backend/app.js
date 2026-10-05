/**
 * 3-Tier Application — Backend API
 * Uses only Node.js built-in modules (no external dependencies).
 * Listens on port 8080 and exposes:
 *   GET /health        - liveness/readiness probe
 *   GET /api/info      - service metadata + DB config
 *   GET /api/data      - sample data + in-memory cache demo
 *   GET /api/users     - sample user list
 *   GET /api/products  - sample product list
 */

const http = require('http');
const os = require('os');
const url = require('url');

const PORT = process.env.PORT || 8080;

// Simple in-memory cache (Redis would be used in production)
const cache = new Map();
const CACHE_TTL_MS = 5000;

// --- Helpers ---------------------------------------------------------------

function sendJSON(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'X-Served-By': os.hostname(),
  });
  res.end(body);
}

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value) {
  cache.set(key, { value, timestamp: Date.now() });
}

// --- Route handlers --------------------------------------------------------

function handleHealth(res) {
  sendJSON(res, 200, {
    status: 'healthy',
    service: 'backend-api',
    tier: 'application',
    pod: os.hostname(),
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
}

function handleInfo(res) {
  sendJSON(res, 200, {
    service: 'backend-api',
    version: '1.0.0',
    tier: 'application',
    pod: os.hostname(),
    node: process.version,
    databases: {
      postgres: {
        host: process.env.POSTGRES_HOST || 'not-set',
        port: process.env.POSTGRES_PORT || '5432',
      },
      mysql: {
        host: process.env.MYSQL_HOST || 'not-set',
        port: process.env.MYSQL_PORT || '3306',
      },
      redis: {
        host: process.env.REDIS_HOST || 'not-set',
        port: process.env.REDIS_PORT || '6379',
      },
    },
  });
}

function handleData(res) {
  const cacheKey = 'api-data';
  const cached = getCache(cacheKey);

  if (cached) {
    sendJSON(res, 200, {
      source: 'cache',
      pod: os.hostname(),
      data: cached,
    });
    return;
  }

  const data = {
    message: 'Data from backend API',
    timestamp: new Date().toISOString(),
    databases: {
      postgres: {
        host: process.env.POSTGRES_HOST || 'not-set',
        port: process.env.POSTGRES_PORT || '5432',
        status: 'configured',
      },
      mysql: {
        host: process.env.MYSQL_HOST || 'not-set',
        port: process.env.MYSQL_PORT || '3306',
        status: 'configured',
      },
      redis: {
        host: process.env.REDIS_HOST || 'not-set',
        port: process.env.REDIS_PORT || '6379',
        status: 'configured',
      },
    },
  };

  setCache(cacheKey, data);
  sendJSON(res, 200, { source: 'database', pod: os.hostname(), data });
}

function handleUsers(res) {
  sendJSON(res, 200, {
    users: [
      { id: 1, name: 'Alice',   role: 'admin' },
      { id: 2, name: 'Bob',     role: 'user'  },
      { id: 3, name: 'Charlie', role: 'user'  },
    ],
    pod: os.hostname(),
    timestamp: new Date().toISOString(),
  });
}

function handleProducts(res) {
  sendJSON(res, 200, {
    products: [
      { id: 101, name: 'Laptop', price: 999.99, stock: 50  },
      { id: 102, name: 'Phone',  price: 699.99, stock: 100 },
      { id: 103, name: 'Tablet', price: 399.99, stock: 75  },
    ],
    pod: os.hostname(),
    timestamp: new Date().toISOString(),
  });
}

function handleRoot(res) {
  sendJSON(res, 200, {
    service: 'backend-api',
    tier: 'application',
    pod: os.hostname(),
    endpoints: [
      'GET /health',
      'GET /api/info',
      'GET /api/data',
      'GET /api/users',
      'GET /api/products',
    ],
  });
}

// --- Server ----------------------------------------------------------------

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;
  const method = req.method;

  // Structured access log
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      method,
      path,
      pod: os.hostname(),
      userAgent: req.headers['user-agent'] || '-',
    })
  );

  // Only allow GET
  if (method !== 'GET') {
    sendJSON(res, 405, { error: 'Method Not Allowed', method });
    return;
  }

  switch (path) {
    case '/health':
      handleHealth(res);
      break;
    case '/api/info':
      handleInfo(res);
      break;
    case '/api/data':
      handleData(res);
      break;
    case '/api/users':
      handleUsers(res);
      break;
    case '/api/products':
      handleProducts(res);
      break;
    case '/':
      handleRoot(res);
      break;
    default:
      sendJSON(res, 404, { error: 'Not Found', path });
  }
});

// --- Lifecycle -------------------------------------------------------------

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    JSON.stringify({
      event: 'server-start',
      port: PORT,
      pod: os.hostname(),
      node: process.version,
      timestamp: new Date().toISOString(),
    })
  );
});

// Graceful shutdown for Kubernetes SIGTERM
function shutdown(signal) {
  console.log(
    JSON.stringify({
      event: 'shutdown',
      signal,
      pod: os.hostname(),
      timestamp: new Date().toISOString(),
    })
  );
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  // Force exit if connections don't drain in 10s
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Safety net
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});