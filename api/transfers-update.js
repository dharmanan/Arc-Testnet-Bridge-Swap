import { badRequest, json, methodNotAllowed, serverError } from './_lib/http.js';
import { redisExpire, redisGetJson, redisSetJson, redisSmembers, redisSrem } from './_lib/redis.js';
import { pendingSetKey, transferKey, TRANSFER_STATUS } from './_lib/transfers.js';
import { applyCors, enforceIdempotency, enforceRateLimit, enforceRequestBodySize } from './_lib/security.js';
import { isValidTxHash } from './_lib/validate.js';

// Completed transfers expire from Redis after 7 days — no manual cleanup needed.
const COMPLETED_TRANSFER_TTL_SECONDS = 7 * 24 * 60 * 60;

const WRITE_RATE_LIMIT = { windowSeconds: 60, maxRequests: 20 };
const BODY_LIMIT = { maxBytes: 4 * 1024 };

async function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export default async function handler(req, res) {
  try {
    const corsResponse = applyCors(req, res, ['POST', 'OPTIONS']);
    if (corsResponse) {
      return corsResponse;
    }

    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const bodyLimitResponse = enforceRequestBodySize(req, res, BODY_LIMIT);
    if (bodyLimitResponse) {
      return bodyLimitResponse;
    }

    const rateLimitResponse = await enforceRateLimit(req, res, 'transfers-update:post', WRITE_RATE_LIMIT);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const idempotencyResponse = await enforceIdempotency(req, res, 'transfers-update:post');
    if (idempotencyResponse) {
      return idempotencyResponse;
    }

    const body = await parseBody(req);
    const action = String(body.action || '');

    if (action === 'dismiss') {
      return await dismissTransfer(res, body);
    }

    if (action === 'dismiss_by_source') {
      return await dismissTransferBySource(res, body);
    }

    if (action === 'mark_minted') {
      return await markTransferMinted(res, body);
    }

    return badRequest(res, 'Unsupported action');
  } catch (error) {
    return serverError(res, error);
  }
}

async function dismissTransfer(res, body) {
  const id = String(body.id || '');
  if (!id) {
    return badRequest(res, 'Missing transfer id');
  }

  const key = transferKey(id);
  const transfer = await redisGetJson(key);
  if (!transfer) {
    return badRequest(res, 'Transfer not found');
  }

  transfer.status = TRANSFER_STATUS.DISMISSED;
  transfer.updatedAt = Date.now();
  await redisSetJson(key, transfer);
  await redisSrem(pendingSetKey(), id);
  await redisExpire(key, COMPLETED_TRANSFER_TTL_SECONDS);

  return json(res, 200, { transfer });
}

async function markTransferMinted(res, body) {
  const sourceTxHash = String(body.sourceTxHash || '').toLowerCase();
  const destinationTxHashRaw = String(body.destinationTxHash || '');
  const hasDestinationTxHash = Boolean(destinationTxHashRaw);

  if (!isValidTxHash(sourceTxHash)) {
    return badRequest(res, 'Invalid sourceTxHash');
  }

  if (hasDestinationTxHash && !isValidTxHash(destinationTxHashRaw)) {
    return badRequest(res, 'Invalid destinationTxHash');
  }

  const candidates = await redisSmembers(`bridge:source:${sourceTxHash}`);
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return json(res, 200, { ok: true, updated: false });
  }

  let updated = false;
  for (const id of candidates) {
    const key = transferKey(id);
    const transfer = await redisGetJson(key);
    if (!transfer) continue;

    transfer.status = TRANSFER_STATUS.MINTED;
    if (hasDestinationTxHash) {
      transfer.destinationTxHash = destinationTxHashRaw;
    }
    transfer.updatedAt = Date.now();
    await redisSetJson(key, transfer);
    await redisSrem(pendingSetKey(), id);
    await redisExpire(key, COMPLETED_TRANSFER_TTL_SECONDS);
    updated = true;
  }

  return json(res, 200, { ok: true, updated });
}

async function dismissTransferBySource(res, body) {
  const sourceTxHash = String(body.sourceTxHash || '').toLowerCase();
  if (!isValidTxHash(sourceTxHash)) {
    return badRequest(res, 'Invalid sourceTxHash');
  }

  const candidates = await redisSmembers(`bridge:source:${sourceTxHash}`);
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return json(res, 200, { ok: true, updated: false });
  }

  let updated = false;
  for (const id of candidates) {
    const key = transferKey(id);
    const transfer = await redisGetJson(key);
    if (!transfer) continue;

    transfer.status = TRANSFER_STATUS.DISMISSED;
    transfer.updatedAt = Date.now();
    await redisSetJson(key, transfer);
    await redisSrem(pendingSetKey(), id);
    await redisExpire(key, COMPLETED_TRANSFER_TTL_SECONDS);
    updated = true;
  }

  return json(res, 200, { ok: true, updated });
}
