import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js';
import { listSubscriptions } from '../_lib/push-store.js';
import { hasVapidConfig, sendPushPayload } from '../_lib/push-web.js';

const getOrderNumber = (delivery) =>
  delivery?.orderNumber || delivery?.api_short_order_id || delivery?.apiShortOrderId || '';

const firstText = (...values) => {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }

  return '';
};

const isSendiPlusRestaurant = (name, chainId) => {
  const text = `${name ?? ''} ${chainId ?? ''}`.toLowerCase();
  return (
    text.includes('מקדונלד') ||
    text.includes('mcdonald') ||
    text.includes('דומינו') ||
    text.includes('domino')
  );
};

const normalizeDeliveryPayload = (delivery = {}) => {
  const orderNumber = String(getOrderNumber(delivery) || '').replace(/^#/, '');
  const restaurantName = firstText(delivery.restaurantName, delivery.rest_name);
  const customerAddress = firstText(delivery.address, delivery.client_full_address);
  const isSendiPlus =
    delivery.isSendiPlus === true ||
    isSendiPlusRestaurant(restaurantName, delivery.chainId || delivery.chain_id);
  const displayOrderNumber = orderNumber ? `#${orderNumber}` : '';
  const notificationTitle = `${isSendiPlus ? 'סנדי פלוס' : 'משלוח רגיל'} ${displayOrderNumber}`.trim();
  const body = [
    restaurantName ? `מ- ${restaurantName}` : '',
    customerAddress ? `ל- ${customerAddress}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    type: 'delivery.new',
    deliveryId: delivery.id || null,
    orderNumber,
    api_short_order_id: delivery.api_short_order_id || delivery.apiShortOrderId || orderNumber,
    isSendiPlus,
    title: notificationTitle,
    restaurantName,
    rest_name: restaurantName,
    address: customerAddress,
    client_full_address: customerAddress,
    body,
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
