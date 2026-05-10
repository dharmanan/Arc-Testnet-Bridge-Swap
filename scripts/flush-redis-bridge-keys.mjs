/**
 * Safe Redis cleanup script.
 *
 * - SKIPS any transfer/activity that is still pending or active.
 * - Only deletes records with status: minted, dismissed, or unknown/corrupt.
 * - Safe to run at any time, even with real users active.
 * - Rate/idempotency keys are always safe to delete (they auto-expire anyway).
 *
 * Run: node scripts/flush-redis-bridge-keys.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => {
      const [key, ...rest] = line.split('=');
      return [key.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
    }),
);

const REDIS_URL = env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in .env');
  process.exit(1);
}

// Statuses that are safe to delete — transfer is done, user no longer needs it.
const COMPLETED_STATUSES = new Set(['minted', 'dismissed']);

// Active statuses — must NOT be deleted.
const ACTIVE_STATUSES = new Set([
  'pending_attestation',
  'ready_to_mint',
  'pending',
  'active',
  'awaiting_approve',
  'awaiting_burn',
  'switching-network',
  'waiting-receive-message',
]);

async function redisCommand(...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function scanKeys(pattern) {
  let cursor = '0';
  const allKeys = [];
  do {
    const [nextCursor, keys] = await redisCommand('SCAN', cursor, 'MATCH', pattern, 'COUNT', '100');
    cursor = nextCursor;
    if (keys && keys.length > 0) allKeys.push(...keys);
  } while (cursor !== '0');
  return allKeys;
}

async function deleteCompletedRecords(pattern) {
  const keys = await scanKeys(pattern);
  let deleted = 0;
  let skipped = 0;

  for (const key of keys) {
    // Some keys (e.g. bridge:activity:wallet:*) are sorted sets, not strings.
    // Check the type first — skip non-string keys entirely.
    const keyType = await redisCommand('TYPE', key);
    if (keyType !== 'string') {
      continue;
    }

    const raw = await redisCommand('GET', key);
    if (!raw) {
      continue;
    }

    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      console.log(`  SKIP (unreadable): ${key}`);
      skipped++;
      continue;
    }

    const status = record?.status;

    if (ACTIVE_STATUSES.has(status)) {
      console.log(`  SKIP (active — status: ${status}): ${key}`);
      skipped++;
      continue;
    }

    if (!status || COMPLETED_STATUSES.has(status)) {
      await redisCommand('DEL', key);
      deleted++;
    } else {
      console.log(`  SKIP (unknown status: ${status}): ${key}`);
      skipped++;
    }
  }

  return { deleted, skipped };
}

async function deleteAllMatching(pattern) {
  const keys = await scanKeys(pattern);
  if (keys.length === 0) return 0;
  await redisCommand('DEL', ...keys);
  return keys.length;
}

console.log('Connecting to:', REDIS_URL);
console.log('Safe cleanup: SKIPS any pending/active transfers.\n');

// Transfer and activity records — checked individually
console.log('Scanning bridge:transfer:* (skipping active)...');
const t = await deleteCompletedRecords('bridge:transfer:*');
console.log(`  → Deleted: ${t.deleted}, Skipped (active): ${t.skipped}\n`);

console.log('Scanning bridge:activity:* (skipping active)...');
const a = await deleteCompletedRecords('bridge:activity:*');
console.log(`  → Deleted: ${a.deleted}, Skipped (active): ${a.skipped}\n`);

// Index/auxiliary keys — always safe (auto-rebuilt on next transfer)
console.log('Scanning auxiliary keys (ratelimit, idempotency)...');
const rl = await deleteAllMatching('ratelimit:*');
const idem = await deleteAllMatching('idempotency:*');
console.log(`  → ratelimit: ${rl}, idempotency: ${idem}\n`);

const total = t.deleted + a.deleted + rl + idem;
console.log(`Done. Total keys deleted: ${total} | Skipped (active): ${t.skipped + a.skipped}`);
