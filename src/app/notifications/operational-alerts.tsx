import React from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useDelivery } from '../context/delivery-context-value';
import type { Delivery } from '../types/delivery.types';
import { playHaptic } from '../utils/haptics';
import { setPendingDeliveriesBadge } from './app-badge';
import { getAlertPreferences } from './alert-preferences';

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;

  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) return null;

  audioContext = new AudioContextConstructor();
  return audioContext;
};

export const unlockAlertSound = () => {
  const context = getAudioContext();
  if (!context) return false;

  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }

  return true;
};

const playTone = (
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  peakGain: number,
) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
};

export const playNewDeliverySound = ({ force = false }: { force?: boolean } = {}) => {
  if (!force && !getAlertPreferences().newDeliverySoundEnabled) return false;

  const context = getAudioContext();
  if (!context) return false;

  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined);
    return false;
  }

  const startAt = context.currentTime + 0.01;
  playTone(context, 880, startAt, 0.12, 0.085);
  playTone(context, 1174.66, startAt + 0.12, 0.16, 0.075);

  return true;
};

export const canUseBrowserNotifications = () =>
  typeof window !== 'undefined' && 'Notification' in window;

const formatOrderNumber = (orderNumber: Delivery['orderNumber']) => {
  const value = String(orderNumber ?? '').trim();
  if (!value) return '';
  return value.startsWith('#') ? value : `#${value}`;
};

const getDeliveryTitle = (delivery: Delivery) =>
  `משלוח חדש ${formatOrderNumber(delivery.orderNumber)}`.trim();

const getDeliveryBody = (delivery: Delivery) =>
  [
    delivery.restaurantName ?? delivery.rest_name,
    delivery.customerName ?? delivery.client_name,
    delivery.address ?? delivery.client_full_address,
  ]
    .filter(Boolean)
    .join(' \u00b7 ');

const getDeliveryTimestamp = (delivery: Delivery) => {
  const value = delivery.createdAt ?? delivery.creation_time;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
};

const shouldShowBrowserNotification = () => {
  if (!getAlertPreferences().browserNotificationsEnabled) return false;

  if (!canUseBrowserNotifications() || Notification.permission !== 'granted') {
    return false;
  }

  return true;
};

const isAppInForeground = () => {
  if (typeof document === 'undefined') return true;

  const isVisible = document.visibilityState === 'visible';
  const hasFocus =
    typeof document.hasFocus === 'function' ? document.hasFocus() : true;

  return isVisible && hasFocus;
};

const getPendingDeliveryCount = (deliveries: Delivery[]) =>
  deliveries.filter((delivery) => delivery.status === 'pending').length;

const getNotificationOptions = (delivery: Delivery, pendingCount: number): NotificationOptions => ({
  body: getDeliveryBody(delivery),
  icon: '/app-icon-192.png',
  badge: '/app-icon-192.png',
  dir: 'rtl',
  tag: `sendi-new-delivery-${delivery.id}`,
  renotify: true,
  requireInteraction: true,
  silent: false,
  timestamp: getDeliveryTimestamp(delivery),
  data: {
    url: '/deliveries',
    deliveryId: delivery.id,
    pendingCount,
  },
});

const showDeliveryNotification = async (
  delivery: Delivery,
  pendingCount: number,
  onClick: (notification: Notification) => void,
) => {
  const title = getDeliveryTitle(delivery);
  const options = getNotificationOptions(delivery, pendingCount);

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('showNotification' in registration) {
        await registration.showNotification(title, options);
        return;
      }
    } catch {
      // Fall back to the page-level Notification constructor below.
    }
  }

  const notification = new Notification(title, options);
  notification.onclick = () => onClick(notification);
};

const showInAppDeliveryAlert = (delivery: Delivery) => {
  const body = getDeliveryBody(delivery);

  toast.success(getDeliveryTitle(delivery), {
    description: body || undefined,
    duration: 3600,
  });
};

export const requestNotificationPermission = async () => {
  unlockAlertSound();

  if (!canUseBrowserNotifications()) {
    toast.error('הדפדפן הזה לא תומך בהתראות מערכת');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    toast.success('התראות למשלוחים חדשים הופעלו');
    playNewDeliverySound({ force: true });
    return true;
  }

  toast.error('לא התקבלה הרשאה להתראות');
  return false;
};

export const OperationalAlerts: React.FC = () => {
  const { state } = useDelivery();
  const navigate = useNavigate();
  const knownDeliveryIdsRef = React.useRef<Set<string> | null>(null);
  const pendingDeliveryCount = getPendingDeliveryCount(state.deliveries);

  React.useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAlertSound();
    };

    window.addEventListener('pointerdown', handleFirstInteraction, {
      once: true,
      passive: true,
    });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  React.useEffect(() => {
    const currentDeliveryIds = new Set(state.deliveries.map((delivery) => delivery.id));
    const knownDeliveryIds = knownDeliveryIdsRef.current;
    void setPendingDeliveriesBadge(pendingDeliveryCount);

    if (!knownDeliveryIds) {
      knownDeliveryIdsRef.current = currentDeliveryIds;
      return;
    }

    const newDeliveries = state.deliveries.filter(
      (delivery) => !knownDeliveryIds.has(delivery.id),
    );

    knownDeliveryIdsRef.current = currentDeliveryIds;

    if (newDeliveries.length === 0) return;

    if (isAppInForeground()) {
      playNewDeliverySound();
      if (getAlertPreferences().newDeliveryHapticEnabled) {
        playHaptic('success', { force: true });
      }
      newDeliveries.forEach(showInAppDeliveryAlert);
      return;
    }

    if (!shouldShowBrowserNotification()) return;

    newDeliveries.forEach((delivery) => {
      void showDeliveryNotification(delivery, pendingDeliveryCount, (notification) => {
        window.focus();
        navigate('/deliveries');
        notification.close();
      }).catch(() => {
        // Some iOS/browser states expose Notification but still reject creation.
      });
    });
  }, [navigate, pendingDeliveryCount, state.deliveries]);

  return null;
};
