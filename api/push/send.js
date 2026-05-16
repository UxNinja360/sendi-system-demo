import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js';
import { listSubscriptions } from '../_lib/push-store.js';
import { hasVapidConfig, sendPushPayload } from '../_lib/push-web.js';

const getOrderNumber = (delivery) =>
  delivery?.orderNumber || delivery?.api_short_order_id || delivery?.apiShortOrderId || '';

const normalizeDeliveryPayload = (delivery = {}) => {
  const orderNumber = String(getOrderNumber(delivery) || '').replace(/^#/, '');

  return {
    type: 'delivery.new',
    deliveryId: delivery.id || null,
    orderNumber,
    api_short_order_id: delivery.api_short_order_id || delivery.apiShortOrderId || orderNumber,
    restaurantName: delivery.restaurantName || delivery.rest_name || '',
    rest_name: delivery.rest_name || delivery.restaurantName || '',
    customerName: delivery.customerName || delivery.client_name || '',
    client_name: delivery.client_name || delivery.customerName || '',
    address: delivery.address || delivery.client_full_address || '',
    client_full_address: delivery.client_full_address || delivery.address || '',
    createdAt: delivery.createdAt || delivery.creation_time || new Date().toISOString(),
    url: '/deliveries',
  };
};

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
    const deliveryPayload = normalizeDeliveryPayload(body.delivery);
    const pendingCount = Math.max(0, Math.floor(Number(body.pendingCount) || 0));
    const payload = {
      ...deliveryPayload,
      pendingCount,
      badgeCount: pendingCount,
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
      error: error?.message || 'push_send_failed',
    });
  }
}
