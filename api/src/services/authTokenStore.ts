import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

const PREFIX_ACCESS = 'auth:access:';
const PREFIX_REFRESH = 'auth:refresh:';

let redisClient: RedisClientType | null = null;

export async function getAuthStoreRedisClient(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (redisClient) return redisClient;
  try {
    redisClient = createClient({ url });
    await redisClient.connect();
    redisClient.on('error', (err) => console.error('Redis auth token store error:', err));
    return redisClient;
  } catch (err) {
    console.error('Redis auth token store connect failed:', err);
    return null;
  }
}

async function getRedisClient(): Promise<RedisClientType | null> {
  return getAuthStoreRedisClient();
}

/** Parse expiry string (e.g. "1h", "30d") to seconds. Default 1h / 30d. */
export function parseExpiryToSeconds(expiry: string | undefined, defaultSeconds: number): number {
  if (!expiry || typeof expiry !== 'string') return defaultSeconds;
  const m = expiry.trim().match(/^(\d+)([smhd])$/i);
  if (!m) return defaultSeconds;
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  if (u === 's') return n;
  if (u === 'm') return n * 60;
  if (u === 'h') return n * 3600;
  if (u === 'd') return n * 86400;
  return defaultSeconds;
}

const DEFAULT_ACCESS_TTL = 3600;       // 1h
const DEFAULT_REFRESH_TTL = 30 * 86400; // 30d

/**
 * Store access token by jti. Returns true if stored.
 */
export async function setAccessToken(jti: string, userId: string, ttlSeconds: number): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;
  try {
    await client.setEx(PREFIX_ACCESS + jti, ttlSeconds, userId);
    return true;
  } catch (err) {
    console.error('Auth token store setAccessToken failed:', err);
    return false;
  }
}

/**
 * Store refresh token by jti. Returns true if stored.
 */
export async function setRefreshToken(jti: string, userId: string, ttlSeconds: number): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;
  try {
    await client.setEx(PREFIX_REFRESH + jti, ttlSeconds, userId);
    return true;
  } catch (err) {
    console.error('Auth token store setRefreshToken failed:', err);
    return false;
  }
}

/**
 * Get userId for access jti. Returns null if not found (revoked or expired).
 */
export async function getAccessToken(jti: string): Promise<string | null> {
  const client = await getRedisClient();
  if (!client) return null;
  try {
    return await client.get(PREFIX_ACCESS + jti);
  } catch (err) {
    console.error('Auth token store getAccessToken failed:', err);
    return null;
  }
}

/**
 * Get userId for refresh jti. Returns null if not found.
 */
export async function getRefreshToken(jti: string): Promise<string | null> {
  const client = await getRedisClient();
  if (!client) return null;
  try {
    return await client.get(PREFIX_REFRESH + jti);
  } catch (err) {
    console.error('Auth token store getRefreshToken failed:', err);
    return null;
  }
}

/**
 * Revoke access token (e.g. on logout).
 */
export async function revokeAccessToken(jti: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  try {
    await client.del(PREFIX_ACCESS + jti);
  } catch (err) {
    console.error('Auth token store revokeAccessToken failed:', err);
  }
}

/**
 * Revoke refresh token (e.g. on refresh or logout).
 */
export async function revokeRefreshToken(jti: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  try {
    await client.del(PREFIX_REFRESH + jti);
  } catch (err) {
    console.error('Auth token store revokeRefreshToken failed:', err);
  }
}

export function createJti(): string {
  return uuidv4();
}

export const DEFAULT_ACCESS_TTL_SECONDS = DEFAULT_ACCESS_TTL;
export const DEFAULT_REFRESH_TTL_SECONDS = DEFAULT_REFRESH_TTL;
