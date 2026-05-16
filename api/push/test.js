import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js';
import { listSubscriptions } from '../_lib/push-store.js';
import { hasVapidConfig, sendPushPayload } from '../_lib/push-web.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return methodNotAllowed(response, ['POST']);
  }

  try {
    if (!hasVapidConfig()) {
      return json(response, 503, {
        ok: false,
        error: 'vapid_not_configured',
        message: 'Missing VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.',
      });
    }

    const body = await readJsonBody(request);
    const subscriptions = await listSubscriptions({ businessId: body.businessId || 'default' });
    const payload = {
      type: 'delivery.test',
      title: 'בדיקת פוש Sendi',
      body: 'אם ראית את זה, הפוש האמיתי מחובר.',
      orderNumber: 'TEST',
      pendingCount: Math.max(1, Math.floor(Number(body.pendingCount) || 1)),
      badgeCount: Math.max(1, Math.floor(Number(body.pendingCount) || 1)),
      url: '/deliveries',
      timestamp: Date.now(),
    };

    const result = await sendPushPayload(subscriptions, payload);

    return json(response, 200, {
      ok: true,
      targeted: subscriptions.length,
      ...result,
    });
  } catch (error) {
    return json(response, 500, {
      ok: false,
      error: error?.message || 'push_test_failed',
    });
  }
}
