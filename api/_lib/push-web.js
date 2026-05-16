import webpush from 'web-push';
import { deleteSubscriptions } from './push-store.js';

const getVapidConfig = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:ops@sendi.local';

  return publicKey && privateKey ? { publicKey, privateKey, subject } : null;
};

export const getPublicVapidKey = () => getVapidConfig()?.publicKey || '';

export const hasVapidConfig = () => Boolean(getVapidConfig());

const configureWebPush = () => {
  const config = getVapidConfig();
  if (!config) return false;

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return true;
};

export const sendPushPayload = async (subscriptions, payload) => {
  if (!configureWebPush()) {
    return {
      sent: 0,
      failed: 0,
      expired: 0,
      configured: false,
      results: [],
    };
  }

  const expiredIds = [];
  const results = await Promise.allSettled(
    subscriptions.map(async (record) => {
      try {
        await webpush.sendNotification(record.subscription, JSON.stringify(payload), {
          TTL: 60 * 60,
          urgency: 'high',
        });
        return { id: record.id, ok: true };
      } catch (error) {
        const statusCode = error?.statusCode;
        const expired = statusCode === 404 || statusCode === 410;
        if (expired) expiredIds.push(record.id);

        return {
          id: record.id,
          ok: false,
          expired,
          statusCode: statusCode || null,
        };
      }
    }),
  );

  if (expiredIds.length > 0) {
    await deleteSubscriptions(expiredIds);
  }

  const normalizedResults = results.map((result) =>
    result.status === 'fulfilled'
      ? result.value
      : { ok: false, expired: false, statusCode: null },
  );

  return {
    sent: normalizedResults.filter((result) => result.ok).length,
    failed: normalizedResults.filter((result) => !result.ok).length,
    expired: normalizedResults.filter((result) => result.expired).length,
    configured: true,
    results: normalizedResults,
  };
};
