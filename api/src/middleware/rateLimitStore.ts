import { createClient, RedisClientType } from 'redis';
import type { Options, IncrementResponse, Store } from 'express-rate-limit';

const PREFIX = 'rl:';

/**
 * Redis-backed store for express-rate-limit. Uses REDIS_URL.
 * Shares state across API instances; when Redis is unavailable, use memory store instead.
 */
export function createRedisRateLimitStore(redisUrl: string): Store {
  let client: RedisClientType | null = null;
  let windowMs = 60 * 60 * 1000;

  async function getClient(): Promise<RedisClientType> {
    if (client) return client;
    client = createClient({ url: redisUrl });
    await client.connect();
    client.on('error', (err) => console.error('Redis rate-limit store error:', err));
    return client;
  }

  const key = (k: string) => PREFIX + k;

  return {
    localKeys: false,
    prefix: PREFIX,

    init(options: Options): void {
      windowMs = options.windowMs ?? windowMs;
    },

    async increment(k: string): Promise<IncrementResponse> {
      const c = await getClient();
      const rk = key(k);
      const totalHits = await c.incr(rk);
      const ttl = await c.ttl(rk);
      if (ttl === -1) {
        await c.expire(rk, Math.ceil(windowMs / 1000));
      }
      const ttlAfter = await c.ttl(rk);
      const resetTime = ttlAfter > 0 ? new Date(Date.now() + ttlAfter * 1000) : undefined;
      return { totalHits, resetTime };
    },

    async decrement(k: string): Promise<void> {
      const c = await getClient();
      await c.decr(key(k));
    },

    async resetKey(k: string): Promise<void> {
      const c = await getClient();
      await c.del(key(k));
    },

    async shutdown(): Promise<void> {
      if (client) {
        await client.quit();
        client = null;
      }
    },
  };
}
