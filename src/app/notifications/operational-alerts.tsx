import React from 'react';
import { useNavigate } from 'react-router';
import { useDelivery } from '../context/delivery-context-value';
import type { Delivery } from '../types/delivery.types';
import { playHaptic } from '../utils/haptics';
import { SENDI_PLUS_LABEL, isSendiPlusRestaurant } from '../utils/sendi-plus';
import { setPendingDeliveriesBadge } from './app-badge';
import { getAlertSoundPreset, type AlertSoundPreset } from './alert-sounds';
import { ALERT_PREFERENCES_EVENT, getAlertPreferences } from './alert-preferences';
import {
  showActionErrorToast,
  showActionToast,
  showDeliveryAlertToast,
} from './toast-helpers';
import { sendDeliveryPushNotification } from './web-push';

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;
const fallbackAudioElements = new Map<string, HTMLAudioElement>();
const fallbackAudioUrls = new Map<string, string>();

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;

  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) return null;

  audioContext = new AudioContextConstructor();
  return audioContext;
};

const isStandalonePwa = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
};

const writeAscii = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
};

const createDeliverySoundUrl = (preset: AlertSoundPreset) => {
  const cachedUrl = fallbackAudioUrls.get(preset.id);
  if (cachedUrl) return cachedUrl;
  if (typeof Blob === 'undefined' || typeof URL === 'undefined') return null;

  const sampleRate = 44100;
  const samples: number[] = [];

  preset.tones.forEach((tone) => {
    const sampleCount = Math.floor(sampleRate * tone.duration);
    for (let index = 0; index < sampleCount; index += 1) {
      if (tone.frequency <= 0 || tone.gain <= 0) {
        samples.push(0);
        continue;
      }

      const progress = index / sampleCount;
      const envelope = Math.sin(Math.PI * progress);
      samples.push(
        Math.sin((2 * Math.PI * tone.frequency * index) / sampleRate) *
          tone.gain *
          envelope,
      );
    }
  });

  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, Math.round(clamped * 32767), true);
  });

  const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  fallbackAudioUrls.set(preset.id, url);
  return url;
};

const getFallbackAudioElement = (preset: AlertSoundPreset) => {
  if (typeof Audio === 'undefined') return null;
  const cachedElement = fallbackAudioElements.get(preset.id);
  if (cachedElement) return cachedElement;

  const url = createDeliverySoundUrl(preset);
  if (!url) return null;

  const audioElement = new Audio(url);
  audioElement.preload = 'auto';
  audioElement.setAttribute('playsinline', 'true');
  fallbackAudioElements.set(preset.id, audioElement);
  return audioElement;
};

export const unlockAlertSound = () => {
  const soundPreset = getAlertSoundPreset(getAlertPreferences().newDeliverySoundId);
  const context = getAudioContext();
  const fallbackAudio = getFallbackAudioElement(soundPreset);

  if (context?.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }

  fallbackAudio?.load();

  return Boolean(context || fallbackAudio);
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

const playNewDeliveryToneSequence = (
  context: AudioContext,
  preset: AlertSoundPreset,
) => {
  const startAt = context.currentTime + 0.01;
  let offset = 0;

  preset.tones.forEach((tone) => {
    if (tone.frequency > 0 && tone.gain > 0) {
      playTone(context, tone.frequency, startAt + offset, tone.duration, tone.gain * 0.32);
    }

    offset += tone.duration;
  });
};

export const playNewDeliverySound = ({ force = false }: { force?: boolean } = {}) => {
  const preferences = getAlertPreferences();
  if (!force && !preferences.newDeliverySoundEnabled) return false;

  const soundPreset = getAlertSoundPreset(preferences.newDeliverySoundId);

  if (isStandalonePwa()) {
    const fallbackAudio = getFallbackAudioElement(soundPreset);
    if (fallbackAudio) {
      fallbackAudio.pause();
      fallbackAudio.currentTime = 0;
      void fallbackAudio.play().catch(() => undefined);
      return true;
    }
  }

  const context = getAudioContext();
  if (!context) return false;

  if (context.state === 'suspended') {
    void context
      .resume()
      .then(() => {
        if (context.state === 'running') {
          playNewDeliveryToneSequence(context, soundPreset);
        }
      })
      .catch(() => undefined);
    return true;
  }

  playNewDeliveryToneSequence(context, soundPreset);

  return true;
};

export const canUseBrowserNotifications = () =>
  typeof window !== 'undefined' && 'Notification' in window;

const formatOrderNumber = (orderNumber: Delivery['orderNumber']) => {
  const value = String(orderNumber ?? '').trim();
  if (!value) return '';
  return value.startsWith('#') ? value : `#${value}`;
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }

  return '';
};

const isSendiPlusAlertDelivery = (delivery: Delivery) =>
  isSendiPlusRestaurant(delivery.restaurantName) ||
  isSendiPlusRestaurant(delivery.rest_name);

const getDeliveryTitle = (delivery: Delivery) => {
  const orderNumber = formatOrderNumber(delivery.orderNumber);
  const prefix = isSendiPlusAlertDelivery(delivery) ? SENDI_PLUS_LABEL : 'משלוח רגיל';

  return `${prefix} ${orderNumber}`.trim();
};

const getDeliveryBody = (delivery: Delivery) => {
  const restaurantName = firstText(delivery.restaurantName, delivery.rest_name);
  const customerAddress = firstText(delivery.address, delivery.client_full_address);

  return [
    restaurantName ? `מ- ${restaurantName}` : '',
    customerAddress ? `ל- ${customerAddress}` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

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
    deliveryKind: isSendiPlusAlertDelivery(delivery) ? 'sendi-plus' : 'regular',
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
  const variant = isSendiPlusAlertDelivery(delivery) ? 'sendi-plus' : 'regular';

  showDeliveryAlertToast(getDeliveryTitle(delivery), {
    description: body || undefined,
    id: `new-delivery-${delivery.id}`,
    variant,
  });
};

export const requestNotificationPermission = async () => {
  unlockAlertSound();

  if (!canUseBrowserNotifications()) {
    showActionErrorToast('הדפדפן הזה לא תומך בהתראות מערכת');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    showActionToast('התראות למשלוחים חדשים הופעלו');
    playNewDeliverySound({ force: true });
    return true;
  }

  showActionErrorToast('לא התקבלה הרשאה להתראות');
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
      void sendDeliveryPushNotification(delivery, pendingDeliveryCount)
        .then((sent) => {
          if (sent) return;

          return showDeliveryNotification(delivery, pendingDeliveryCount, (notification) => {
            window.focus();
            navigate('/deliveries');
            notification.close();
          });
        })
        .catch(() => {
          // Some iOS/browser states expose Notification but still reject creation.
        });
    });
  }, [navigate, pendingDeliveryCount, state.deliveries]);

  React.useEffect(() => {
    const syncBadge = () => {
      void setPendingDeliveriesBadge(pendingDeliveryCount);
    };

    syncBadge();

    if (typeof window !== 'undefined') {
      window.addEventListener('pageshow', syncBadge);
      window.addEventListener(ALERT_PREFERENCES_EVENT, syncBadge);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', syncBadge);
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', syncBadge);
      void navigator.serviceWorker.ready.then(syncBadge).catch(() => undefined);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pageshow', syncBadge);
        window.removeEventListener(ALERT_PREFERENCES_EVENT, syncBadge);
      }

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', syncBadge);
      }

      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', syncBadge);
      }
    };
  }, [pendingDeliveryCount]);

  return null;
};
