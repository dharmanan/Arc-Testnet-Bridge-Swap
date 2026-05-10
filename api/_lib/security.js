import crypto from 'node:crypto';
import { json } from './http.js';
import { redisExpire, redisIncr, redisSetNx } from './redis.js';

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 60;
const DEFAULT_IDEMPOTENCY_TTL_SECONDS = 5 * 60;
const DEFAULT_MAX_REQUEST_BODY_BYTES = 8 * 1024;

// In-memory cache: blocked IP+scope keys → expiry timestamp (ms).
// Persists within a warm serverless instance so repeated spam requests
// from the same IP are rejected without touching Redis.
const _rateLimitBlockCache = new Map();
const BLOCK_CACHE_MAX_SIZE = 2000;

function _isBlockedInMemory(key, now) {
  const expiry = _rateLimitBlockCache.get(key);
  if (expiry === undefined) return false;
  if (now >= expiry) {
    _rateLimitBlockCache.delete(key);
    return false;
  }
  return true;
}

function _markBlockedInMemory(key, expiryMs) {
  if (_rateLimitBlockCache.size >= BLOCK_CACHE_MAX_SIZE) {
    // Evict oldest entry to keep memory bounded.
    const firstKey = _rateLimitBlockCache.keys().next().value;
    _rateLimitBlockCache.delete(firstKey);
  }
  _rateLimitBlockCache.set(key, expiryMs);
}

const DEVELOPMENT_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function splitHeaderValue(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  return value.split(',')[0].trim();
}

function appendVaryHeader(res, value) {
  const current = res.getHeader('Vary');
  if (!current) {
    res.setHeader('Vary', value);
    return;
  }

  const next = String(current)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!next.includes(value)) {
    next.push(value);
    res.setHeader('Vary', next.join(', '));
  }
}

function normalizeOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

function getRequestHost(req) {
  return splitHeaderValue(req.headers['x-forwarded-host']) || splitHeaderValue(req.headers.host);
}

function getRequestProtocol(req) {
  return splitHeaderValue(req.headers['x-forwarded-proto']) || 'https';
}

function isSameOriginRequest(req, origin) {
  const host = getRequestHost(req);
  if (!host) {
    return false;
  }

  try {
    const url = new URL(origin);
    return url.host === host && url.protocol === `${getRequestProtocol(req)}:`;
  } catch {
    return false;
  }
}

function isDevelopmentOrigin(origin) {
  return process.env.NODE_ENV !== 'production' && DEVELOPMENT_ORIGINS.has(origin);
}

function setRateLimitHeaders(res, { windowSeconds, maxRequests, count, resetSeconds }) {
  const remaining = Math.max(0, maxRequests - count);
  const policy = `${maxRequests};w=${windowSeconds}`;
  const reset = String(Math.max(1, resetSeconds));

  res.setHeader('RateLimit-Limit', String(maxRequests));
  res.setHeader('RateLimit-Remaining', String(remaining));
  res.setHeader('RateLimit-Reset', reset);
  res.setHeader('RateLimit-Policy', policy);

  // Keep legacy headers for scanners and clients that still expect the older format.
  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', reset);
}

function getClientIp(req) {
  const forwarded = splitHeaderValue(req.headers['x-forwarded-for']);
  if (forwarded) {
    return forwarded;
  }

  const realIp = splitHeaderValue(req.headers['x-real-ip']);
  if (realIp) {
    return realIp;
  }

  const vercelForwarded = splitHeaderValue(req.headers['x-vercel-forwarded-for']);
  if (vercelForwarded) {
    return vercelForwarded;
  }

  return 'unknown';
}

function parseAllowlist() {
  const raw = process.env.CORS_ALLOWLIST || '';
  return raw
    .split(',')
    .map((item) => normalizeOrigin(item.trim()))
    .filter(Boolean);
}

export function applyCors(req, res, allowedMethods = ['GET', 'POST', 'OPTIONS']) {
  const allowlist = parseAllowlist();
  const origin = normalizeOrigin(typeof req.headers.origin === 'string' ? req.headers.origin : '');

  if (origin) {
    appendVaryHeader(res, 'Origin');
  }

  if (origin && (isSameOriginRequest(req, origin) || allowlist.includes(origin) || isDevelopmentOrigin(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin && !allowlist.includes(origin)) {
    return json(res, 403, { error: 'Origin is not allowed' });
  }

  res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Idempotency-Key, X-Request-Timestamp, X-Request-Signature');
  res.setHeader('Access-Control-Max-Age', '600');

  if (req.method === 'OPTIONS') {
    return json(res, 200, { ok: true });
  }

  return null;
}

export async function enforceRateLimit(req, res, routeScope, options = {}) {
  const windowSeconds = Number(options.windowSeconds || process.env.API_RATE_LIMIT_WINDOW_SECONDS || DEFAULT_RATE_LIMIT_WINDOW_SECONDS);
  const maxRequests = Number(options.maxRequests || process.env.API_RATE_LIMIT_MAX_REQUESTS || DEFAULT_RATE_LIMIT_MAX_REQUESTS);
  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const nowWindow = Math.floor(now / windowMs);
  const key = `ratelimit:${routeScope}:${ip}:${nowWindow}`;
  const windowExpiry = (nowWindow + 1) * windowMs;
  const resetSeconds = Math.ceil((windowExpiry - now) / 1000);

  // Fast path: if this IP+scope is already known to be over-limit in memory,
  // reject immediately without spending a Redis command.
  if (_isBlockedInMemory(key, now)) {
    setRateLimitHeaders(res, { windowSeconds, maxRequests, count: maxRequests + 1, resetSeconds });
    res.setHeader('Retry-After', String(Math.max(1, resetSeconds)));
    return json(res, 429, { error: 'Too many requests. Please retry shortly.' });
  }

  const count = Number(await redisIncr(key));
  if (count === 1) {
    await redisExpire(key, windowSeconds);
  }

  setRateLimitHeaders(res, { windowSeconds, maxRequests, count, resetSeconds });

  if (count > maxRequests) {
    // Cache the block decision so subsequent requests from this IP skip Redis.
    _markBlockedInMemory(key, windowExpiry);
    res.setHeader('Retry-After', String(Math.max(1, resetSeconds)));
    return json(res, 429, { error: 'Too many requests. Please retry shortly.' });
  }

  return null;
}

export function enforceRequestBodySize(req, res, options = {}) {
  const maxBytes = Number(options.maxBytes || process.env.API_MAX_REQUEST_BODY_BYTES || DEFAULT_MAX_REQUEST_BODY_BYTES);
  const contentLengthHeader = splitHeaderValue(req.headers['content-length']);
  const contentLength = Number(contentLengthHeader);

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return json(res, 413, { error: `Request body exceeds ${maxBytes} bytes` });
  }

  if (typeof req.body === 'string' && Buffer.byteLength(req.body, 'utf8') > maxBytes) {
    return json(res, 413, { error: `Request body exceeds ${maxBytes} bytes` });
  }

  return null;
}

export async function enforceIdempotency(req, res, routeScope, options = {}) {
  const headerValue = req.headers['x-idempotency-key'];
  const idempotencyKey = typeof headerValue === 'string' ? headerValue.trim() : '';

  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return json(res, 400, { error: 'Missing or invalid X-Idempotency-Key header' });
  }

  const ttl = Number(options.ttlSeconds || process.env.API_IDEMPOTENCY_TTL_SECONDS || DEFAULT_IDEMPOTENCY_TTL_SECONDS);
  const redisKey = `idempotency:${routeScope}:${idempotencyKey}`;
  const created = await redisSetNx(redisKey, String(Date.now()), ttl);

  if (created !== 'OK') {
    return json(res, 409, { error: 'Duplicate request detected for this idempotency key' });
  }

  return null;
}

function stableBodyString(body) {
  if (!body) return '';
  if (typeof body === 'string') return body;
  try {
    return JSON.stringify(body);
  } catch {
    return '';
  }
}

export function enforceRequestSignature(req, res) {
  const secret = process.env.BRIDGE_API_SIGNING_SECRET;
  if (!secret) {
    return null;
  }

  const timestamp = typeof req.headers['x-request-timestamp'] === 'string' ? req.headers['x-request-timestamp'] : '';
  const signature = typeof req.headers['x-request-signature'] === 'string' ? req.headers['x-request-signature'] : '';

  if (!timestamp || !signature) {
    return json(res, 401, { error: 'Missing request signature headers' });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > 300) {
    return json(res, 401, { error: 'Request signature timestamp is out of range' });
  }

  const payload = `${timestamp}.${req.method}.${req.url}.${stableBodyString(req.body)}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return json(res, 401, { error: 'Invalid request signature' });
  }

  return null;
}
