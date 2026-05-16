import type { Delivery } from '../types/delivery.types';

export type DeliveryPushStatus =
  | 'unsupported'
  | 'not-configured'
  | 'permission-denied'
  | 'permission-needed'
  | 'ready'
  | 'subscribed'
  | 'error';

export type DeliveryPushResult = {
  ok: boolean;
  status: DeliveryPushStatus;
  message?: string;
};

type PublicKeyResponse = {
  ok?: boolean;
  configured?: boolean;
  publicKey?: string;
};

const BUSINESS_ID = 'default';

const canUseDeliveryPushApis = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

const fetchPublicKey = async () => {
  const response = await fetch('/api/push/public-key', {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    return { configured: false, publicKey: '' };
  }

  const payload = (await response.json()) as PublicKeyResponse;
  return {
    configured: Boolean(payload.configured && payload.publicKey),
    publicKey: payload.publicKey || '',
  };
};

const getReadyServiceWorkerRegistration = async () => {
  const registration = await navigator.serviceWorker.ready;
  if (!registration.pushManager) return null;
  return registration;
};

export const getDeliveryPushStatus = async (): Promise<DeliveryPushResult> => {
  if (!canUseDeliveryPushApis()) {
    return { ok: false, status: 'unsupported' };
  }

  if (Notification.permission === 'denied') {
    return { ok: false, status: 'permission-denied' };
  }

  const keyConfig = await fetchPublicKey().catch(() => null);
  if (!keyConfig?.configured) {
    return { ok: false, status: 'not-configured' };
  }

  if (Notification.permission !== 'granted') {
    return { ok: false, status: 'permission-needed' };
  }

  const registration = await getReadyServiceWorkerRegistration().catch(() => null);
  const subscription = await registration?.pushManager.getSubscription();

  return subscription
    ? { ok: true, status: 'subscribed' }
    : { ok: true, status: 'ready' };
};

export const subscribeToDeliveryPushNotifications = async (): Promise<DeliveryPushResult> => {
  if (!canUseDeliveryPushApis()) {
    return { ok: false, status: 'unsupported' };
  }

  const keyConfig = await fetchPublicKey().catch(() => null);
  if (!keyConfig?.configured) {
    return { ok: false, status: 'not-configured' };
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    return {
      ok: false,
      status: permission === 'denied' ? 'permission-denied' : 'permission-needed',
    };
  }

  const registration = await getReadyServiceWorkerRegistration();
  if (!registration) {
    return { ok: false, status: 'unsupported' };
  }

  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyConfig.publicKey),
    }));

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      businessId: BUSINESS_ID,
      subscription: subscription.toJSON(),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    return {
      ok: false,
      status: 'error',
      message: payload?.message || payload?.error || 'push_subscribe_failed',
    };
  }

  return { ok: true, status: 'subscribed' };
};

export const sendDeliveryPushNotification = async (
  delivery: Delivery,
  pendingCount: number,
) => {
  const response = await fetch('/api/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      businessId: BUSINESS_ID,
      delivery,
      pendingCount,
    }),
  });

  if (!response.ok) return false;

  const payload = await response.json().catch(() => null);
  return Boolean(payload?.ok && payload?.sent > 0);
};

export const sendTestDeliveryPushNotification = async () => {
  const response = await fetch('/api/push/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      businessId: BUSINESS_ID,
      pendingCount: 1,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    return {
      ok: false,
      message: payload?.message || payload?.error || 'push_test_failed',
    };
  }

  const payload = await response.json().catch(() => null);
  return {
    ok: Boolean(payload?.ok && payload?.sent > 0),
    message:
      payload?.targeted === 0
        ? 'no_subscriptions'
        : payload?.sent > 0
          ? 'sent'
          : 'not_sent',
  };
};
