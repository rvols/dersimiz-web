import { createClient, RedisClientType } from 'redis';

const REDIS_PREFIX_SESSION = 'otp:session:';
const REDIS_PREFIX_PHONE = 'otp:phone:';
const TTL_SECONDS = 300; // 5 minutes
const MAX_ATTEMPTS = 5;

export interface OtpSession {
  phone_number: string;
  code: string;
  attempts: number;
}

let redisClient: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (redisClient) return redisClient;
  try {
    redisClient = createClient({ url });
    await redisClient.connect();
    redisClient.on('error', (err) => console.error('Redis OTP store error:', err));
    return redisClient;
  } catch (err) {
    console.error('Redis OTP store connect failed:', err);
    return null;
  }
}

// In-memory fallback when Redis is not available (e.g. local dev)
const memoryStore = new Map<string, { data: OtpSession; expiresAt: number }>();
const phoneToSession = new Map<string, string>();

function pruneExpiredMemory(): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
      if (entry.data.phone_number) phoneToSession.delete(entry.data.phone_number);
    }
  }
}

/**
 * Store an OTP session. Invalidates any existing OTP for the same phone_number.
 * Returns true if stored (Redis or memory), false on Redis error.
 */
export async function setOtpSession(
  sessionToken: string,
  phone_number: string,
  code: string
): Promise<boolean> {
  const data: OtpSession = { phone_number, code, attempts: 0 };
  const client = await getRedisClient();
  if (client) {
    try {
      const phoneKey = REDIS_PREFIX_PHONE + phone_number;
      const oldToken = await client.get(phoneKey);
      if (oldToken) {
        await client.del(REDIS_PREFIX_SESSION + oldToken);
      }
      await client.setEx(REDIS_PREFIX_SESSION + sessionToken, TTL_SECONDS, JSON.stringify(data));
      await client.setEx(phoneKey, TTL_SECONDS, sessionToken);
      return true;
    } catch (err) {
      console.error('OTP store set failed:', err);
      return false;
    }
  }
  const existingToken = phoneToSession.get(phone_number);
  if (existingToken) memoryStore.delete(existingToken);
  phoneToSession.set(phone_number, sessionToken);
  const expiresAt = Date.now() + TTL_SECONDS * 1000;
  memoryStore.set(sessionToken, { data, expiresAt });
  return true;
}

/**
 * Get session_token for a phone (current pending OTP). Returns null if none or expired.
 */
export async function getSessionTokenByPhone(phone_number: string): Promise<string | null> {
  const client = await getRedisClient();
  if (client) {
    try {
      return await client.get(REDIS_PREFIX_PHONE + phone_number);
    } catch (err) {
      console.error('OTP store getSessionTokenByPhone failed:', err);
      return null;
    }
  }
  pruneExpiredMemory();
  return phoneToSession.get(phone_number) ?? null;
}

/**
 * Get and optionally consume or update OTP session. Returns null if not found or expired.
 */
export async function getOtpSession(sessionToken: string): Promise<OtpSession | null> {
  const client = await getRedisClient();
  if (client) {
    try {
      const key = REDIS_PREFIX_SESSION + sessionToken;
      const raw = await client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as OtpSession;
    } catch (err) {
      console.error('OTP store get failed:', err);
      return null;
    }
  }
  pruneExpiredMemory();
  const entry = memoryStore.get(sessionToken);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) memoryStore.delete(sessionToken);
    return null;
  }
  return entry.data;
}

/**
 * Increment attempt count and optionally delete if max attempts reached.
 * Returns new attempts count, or -1 if session not found.
 */
export async function incrementOtpAttempts(sessionToken: string): Promise<number> {
  const client = await getRedisClient();
  if (client) {
    try {
      const key = REDIS_PREFIX_SESSION + sessionToken;
      const raw = await client.get(key);
      if (!raw) return -1;
      const data = JSON.parse(raw) as OtpSession;
      data.attempts += 1;
      if (data.attempts >= MAX_ATTEMPTS) {
        await client.del(key);
        await client.del(REDIS_PREFIX_PHONE + data.phone_number);
        return data.attempts;
      }
      await client.setEx(key, await client.ttl(key).then((t) => (t > 0 ? t : TTL_SECONDS)), JSON.stringify(data));
      return data.attempts;
    } catch (err) {
      console.error('OTP store increment failed:', err);
      return -1;
    }
  }
  pruneExpiredMemory();
  const entry = memoryStore.get(sessionToken);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) memoryStore.delete(sessionToken);
    return -1;
  }
  entry.data.attempts += 1;
  if (entry.data.attempts >= MAX_ATTEMPTS) {
    phoneToSession.delete(entry.data.phone_number);
    memoryStore.delete(sessionToken);
    return entry.data.attempts;
  }
  return entry.data.attempts;
}

/**
 * Delete OTP session (after successful verify). Also removes phone mapping. No-op if not found.
 */
export async function deleteOtpSession(sessionToken: string): Promise<void> {
  const client = await getRedisClient();
  if (client) {
    try {
      const raw = await client.get(REDIS_PREFIX_SESSION + sessionToken);
      if (raw) {
        const data = JSON.parse(raw) as OtpSession;
        await client.del(REDIS_PREFIX_PHONE + data.phone_number);
      }
      await client.del(REDIS_PREFIX_SESSION + sessionToken);
    } catch (err) {
      console.error('OTP store delete failed:', err);
    }
    return;
  }
  const entry = memoryStore.get(sessionToken);
  if (entry) {
    phoneToSession.delete(entry.data.phone_number);
    memoryStore.delete(sessionToken);
  }
}

export const OTP_TTL_SECONDS = TTL_SECONDS;
export const OTP_MAX_ATTEMPTS = MAX_ATTEMPTS;
