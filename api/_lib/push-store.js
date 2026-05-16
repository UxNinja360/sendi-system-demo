import { createHash } from 'node:crypto';

const STORE_KEY = 'sendi:push-subscriptions:v1';

const getRedisConfig = () => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  return url && token ? { url, token } : null;
};

const getMemoryStore = () => {
  if (!globalThis.__sendiPushSubscriptions) {
    globalThis.__sendiPushSubscriptions = new Map();
  }

  return globalThis.__sendiPushSubscriptions;
};

const redisCommand = async (command) => {
  const config = getRedisConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Redis command failed with ${response.status}`);
  }

  const payload = await response.json();
  return payload.result;
};

export const getPushStorageMode = () => (getRedisConfig() ? 'redis' : 'memory');

export const getSubscriptionId = (subscription) =>
  createHash('sha256').update(String(subscription.endpoint || '')).digest('base64url');

const normalizeSubscription = (subscription) => {
  if (!subscription || typeof subscription !== 'object') return null;
  if (typeof subscription.endpoint !== 'string' || !subscription.endpoint) return null;
  if (!subscription.keys?.p256dh || !subscription.keys?.auth) return null;

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };
};

export const saveSubscription = async ({ subscription, businessId, userAgent }) => {
  const normalized = normalizeSubscription(subscription);
  if (!normalized) {
    throw new Error('invalid_subscription');
  }

  const id = getSubscriptionId(normalized);
  const now = new Date().toISOString();
  const existing = await getSubscription(id);
  const record = {
    id,
    subscription: normalized,
    businessId: businessId || 'default',
    userAgent: userAgent || '',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (getRedisConfig()) {
    await redisCommand(['HSET', STORE_KEY, id, JSON.stringify(record)]);
  } else {
    getMemoryStore().set(id, record);
  }

  return record;
};

export const getSubscription = async (id) => {
  if (!id) return null;

  if (getRedisConfig()) {
    const value = await redisCommand(['HGET', STORE_KEY, id]);
    if (!value) return null;
    return JSON.parse(value);
  }

  return getMemoryStore().get(id) || null;
};

export const listSubscriptions = async ({ businessId } = {}) => {
  let records = [];

  if (getRedisConfig()) {
    const value = await redisCommand(['HGETALL', STORE_KEY]);
    if (Array.isArray(value)) {
      for (let index = 1; index < value.length; index += 2) {
        try {
          records.push(JSON.parse(value[index]));
        } catch {
          // Ignore malformed records so one bad row does not block all pushes.
        }
      }
    } else if (value && typeof value === 'object') {
      records = Object.values(value).flatMap((record) => {
        try {
          return [typeof record === 'string' ? JSON.parse(record) : record];
        } catch {
          return [];
        }
      });
    }
  } else {
    records = Array.from(getMemoryStore().values());
  }

  if (!businessId) return records;
  return records.filter((record) => record.businessId === businessId);
};

export const deleteSubscriptions = async (ids) => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return 0;

  if (getRedisConfig()) {
    await redisCommand(['HDEL', STORE_KEY, ...uniqueIds]);
  } else {
    const store = getMemoryStore();
    uniqueIds.forEach((id) => store.delete(id));
  }

  return uniqueIds.length;
};

export const deleteSubscriptionByEndpoint = async (endpoint) => {
  if (!endpoint) return 0;

  const id = getSubscriptionId({ endpoint });
  return deleteSubscriptions([id]);
};
