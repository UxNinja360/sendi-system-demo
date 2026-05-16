import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js';
import {
  deleteSubscriptionByEndpoint,
  getPushStorageMode,
  saveSubscription,
} from '../_lib/push-store.js';
import { hasVapidConfig } from '../_lib/push-web.js';

export default async function handler(request, response) {
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    return methodNotAllowed(response, ['POST', 'DELETE']);
  }

  try {
    const body = await readJsonBody(request);

    if (request.method === 'DELETE') {
      const deleted = await deleteSubscriptionByEndpoint(body.endpoint);
      return json(response, 200, {
        ok: true,
        deleted,
        storage: getPushStorageMode(),
      });
    }

    if (!hasVapidConfig()) {
      return json(response, 503, {
        ok: false,
        error: 'vapid_not_configured',
        message: 'Missing VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.',
      });
    }

    const record = await saveSubscription({
      subscription: body.subscription,
      businessId: body.businessId,
      userAgent: request.headers['user-agent'] || '',
    });

    return json(response, 200, {
      ok: true,
      id: record.id,
      storage: getPushStorageMode(),
    });
  } catch (error) {
    return json(response, 400, {
      ok: false,
      error: error?.message || 'subscription_failed',
    });
  }
}
