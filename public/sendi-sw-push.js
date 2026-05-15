const SENDI_DELIVERIES_URL = '/deliveries';

const toPositiveBadgeCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
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
  const body =
    payload.body ||
    [payload.restaurantName, payload.customerName, payload.address].filter(Boolean).join(' - ');

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
      pendingCount,
    },
  };
};

const showSendiNotification = async (payload) => {
  const title = payload.title || payload.notificationTitle || 'משלוח חדש';
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

self.addEventListener('message', (event) => {
  const payload = event.data || {};

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
