const SENDI_DELIVERIES_URL = '/deliveries';
const SENDI_APP_UPDATE_AVAILABLE_MESSAGE = 'SENDI_APP_UPDATE_AVAILABLE';

const notifyAppUpdateAvailable = async () => {
  try {
    if (!self.registration.active) return;

    const windowClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    windowClients.forEach((client) => {
      client.postMessage({
        type: SENDI_APP_UPDATE_AVAILABLE_MESSAGE,
      });
    });
  } catch {
    // The update flow must never block service worker installation.
  }
};

const toPositiveBadgeCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
};

const formatOrderNumber = (orderNumber) => {
  const value = String(orderNumber || '').trim();
  if (!value) return '';
  return value.startsWith('#') ? value : `#${value}`;
};

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

const isSendiPlusPayload = (payload) =>
  payload.isSendiPlus === true ||
  isSendiPlusRestaurant(
    payload.restaurantName || payload.rest_name,
    payload.chainId || payload.chain_id,
  );

const getNotificationTitle = (payload) => {
  if (payload.title || payload.notificationTitle) {
    return payload.title || payload.notificationTitle;
  }

  const orderNumber = formatOrderNumber(payload.orderNumber || payload.api_short_order_id);
  const prefix = isSendiPlusPayload(payload) ? 'סנדי פלוס' : 'משלוח רגיל';
  return `${prefix} ${orderNumber}`.trim();
};

const readPushPayload = (event) => {
  if (!event.data) return {};

  try {
    return event.data.json();
  } catch {
    try {
      return { body: event.data.text() };
    } catch {
      return {};
    }
  }
};

const setSendiBadge = async (count) => {
  const safeCount = toPositiveBadgeCount(count);
  const badgeNavigator = self.navigator;

  if (safeCount > 0 && 'setAppBadge' in badgeNavigator) {
    await badgeNavigator.setAppBadge(safeCount);
    return;
  }

  if (safeCount === 0 && 'clearAppBadge' in badgeNavigator) {
    await badgeNavigator.clearAppBadge();
    return;
  }

  if (safeCount === 0 && 'setAppBadge' in badgeNavigator) {
    await badgeNavigator.setAppBadge(0);
  }
};

const buildNotificationOptions = (payload) => {
  const deliveryId = payload.deliveryId || payload.id || null;
  const pendingCount = toPositiveBadgeCount(
    payload.pendingCount ?? payload.badgeCount ?? payload.unreadCount ?? payload.badge,
  );
  const restaurantName = firstText(payload.restaurantName, payload.rest_name);
  const customerAddress = firstText(payload.address, payload.client_full_address);
  const body =
    payload.body ||
    [
      restaurantName ? `מ- ${restaurantName}` : '',
      customerAddress ? `ל- ${customerAddress}` : '',
    ].filter(Boolean).join(' ');

  return {
    body,
    icon: payload.icon || '/app-icon-192.png',
    badge: payload.badgeIcon || '/app-icon-192.png',
    dir: 'rtl',
    tag: payload.tag || `sendi-new-delivery-${deliveryId || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: Number(payload.timestamp) || Date.now(),
    data: {
      url: payload.url || SENDI_DELIVERIES_URL,
      deliveryId,
      deliveryKind: isSendiPlusPayload(payload) ? 'sendi-plus' : 'regular',
      pendingCount,
    },
  };
};

const showSendiNotification = async (payload) => {
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  const hasVisibleClient = windowClients.some(
    (client) => client.focused || client.visibilityState === 'visible',
  );

  if (hasVisibleClient) {
    windowClients.forEach((client) => {
      client.postMessage({
        type: 'SENDI_DELIVERY_PUSH_RECEIVED',
        payload,
      });
    });
    return;
  }

  const title = getNotificationTitle(payload);
  await self.registration.showNotification(title, buildNotificationOptions(payload));
};

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event);
  const pendingCount = toPositiveBadgeCount(
    payload.pendingCount ?? payload.badgeCount ?? payload.unreadCount ?? payload.badge,
  );

  event.waitUntil(
    Promise.allSettled([
      setSendiBadge(pendingCount),
      showSendiNotification(payload),
    ]),
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil?.(notifyAppUpdateAvailable());
});

self.addEventListener('message', (event) => {
  const payload = event.data || {};

  if (payload.type === 'SKIP_WAITING') {
    event.waitUntil?.(self.skipWaiting());
    return;
  }

  if (payload.type === 'SENDI_SET_BADGE') {
    event.waitUntil?.(setSendiBadge(payload.count));
    return;
  }

  if (payload.type === 'SENDI_SHOW_DELIVERY_NOTIFICATION') {
    event.waitUntil?.(
      Promise.allSettled([
        setSendiBadge(payload.pendingCount),
        showSendiNotification(payload),
      ]),
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  const url = event.notification.data?.url || SENDI_DELIVERIES_URL;
  const targetUrl = new URL(url, self.location.origin).href;

  event.notification.close();

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of windowClients) {
      if (new URL(client.url).origin !== self.location.origin) continue;

      await client.focus();
      if ('navigate' in client) {
        await client.navigate(targetUrl);
      }
      return;
    }

    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});
