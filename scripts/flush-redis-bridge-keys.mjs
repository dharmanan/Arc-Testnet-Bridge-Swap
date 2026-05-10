/**
 * Deletes all bridge-related Redis keys (transfers, activities, rate-limit, etc.)
 * Uses Upstash REST API — no extra dependencies needed.
 *
 * Run: node scripts/flush-redis-bridge-keys.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency)
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

async function scanAndDelete(pattern) {
  let cursor = '0';
  let totalDeleted = 0;

  do {
    const [nextCursor, keys] = await redisCommand('SCAN', cursor, 'MATCH', pattern, 'COUNT', '100');
    cursor = nextCursor;

    if (keys && keys.length > 0) {
      await redisCommand('DEL', ...keys);
      totalDeleted += keys.length;
      console.log(`  Deleted ${keys.length} keys matching "${pattern}" (total so far: ${totalDeleted})`);
    }
  } while (cursor !== '0');

  return totalDeleted;
}

const PATTERNS = [
  'bridge:transfer:*',
  'bridge:activity:*',
  'bridge:wallet:*',
  'bridge:pending',
  'bridge:source:*',
  'ratelimit:*',
  'idempotency:*',
];

console.log('Connecting to:', REDIS_URL);
console.log('Starting Redis bridge key cleanup...\n');

let grandTotal = 0;
for (const pattern of PATTERNS) {
  console.log(`Scanning: ${pattern}`);
  const count = await scanAndDelete(pattern);
  grandTotal += count;
}

console.log(`\nDone. Total keys deleted: ${grandTotal}`);
