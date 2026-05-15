import React from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useDelivery } from '../context/delivery-context-value';
import type { Delivery } from '../types/delivery.types';
import { getAlertPreferences } from './alert-preferences';

const ALERT_PERMISSION_PROMPT_KEY = 'sendi-alert-permission-prompted-v1';
const ALERT_TOAST_ID = 'sendi-alert-permission';

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

const getDeliveryTitle = (delivery: Delivery, totalNew: number) => {
  if (totalNew > 1) return `${totalNew.toLocaleString('he-IL')} משלוחים חדשים`;
  return `משלוח חדש #${delivery.orderNumber}`;
};

const getDeliveryBody = (delivery: Delivery) =>
  [delivery.restaurantName, delivery.customerName, delivery.address]
    .filter(Boolean)
    .join(' · ');

const shouldShowBrowserNotification = () => {
  if (!getAlertPreferences().browserNotificationsEnabled) return false;

  if (!canUseBrowserNotifications() || Notification.permission !== 'granted') {
    return false;
  }

  return typeof document === 'undefined' || document.hidden || !document.hasFocus();
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

const promptForNotificationsOnce = () => {
  if (!getAlertPreferences().browserNotificationsEnabled) return;
  if (!canUseBrowserNotifications() || Notification.permission !== 'default') return;

  try {
    if (window.localStorage.getItem(ALERT_PERMISSION_PROMPT_KEY) === 'true') return;
    window.localStorage.setItem(ALERT_PERMISSION_PROMPT_KEY, 'true');
  } catch {
    // If localStorage is unavailable, still avoid blocking the app.
  }

  window.setTimeout(() => {
    toast('להפעיל התראות למשלוחים חדשים?', {
      id: ALERT_TOAST_ID,
      description: 'נשמיע צליל קצר ונציג התראת מערכת כשהטאב לא בפוקוס.',
      duration: 12000,
      action: {
        label: 'הפעל',
        onClick: () => {
          void requestNotificationPermission();
        },
      },
    });
  }, 1200);
};

export const OperationalAlerts: React.FC = () => {
  const { state } = useDelivery();
  const navigate = useNavigate();
  const knownDeliveryIdsRef = React.useRef<Set<string> | null>(null);

  React.useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAlertSound();
    };

    window.addEventListener('pointerdown', handleFirstInteraction, {
      once: true,
      passive: true,
    });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    promptForNotificationsOnce();

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  React.useEffect(() => {
    const currentDeliveryIds = new Set(state.deliveries.map((delivery) => delivery.id));
    const knownDeliveryIds = knownDeliveryIdsRef.current;

    if (!knownDeliveryIds) {
      knownDeliveryIdsRef.current = currentDeliveryIds;
      return;
    }

    const newDeliveries = state.deliveries.filter(
      (delivery) => !knownDeliveryIds.has(delivery.id),
    );

    knownDeliveryIdsRef.current = currentDeliveryIds;

    if (newDeliveries.length === 0) return;

    playNewDeliverySound();

    if (!shouldShowBrowserNotification()) return;

    const newestDelivery = newDeliveries[newDeliveries.length - 1];
    const notification = new Notification(
      getDeliveryTitle(newestDelivery, newDeliveries.length),
      {
        body: getDeliveryBody(newestDelivery),
        icon: '/app-icon-192.png',
        badge: '/app-icon-192.png',
        dir: 'rtl',
        tag: 'sendi-new-delivery',
      },
    );

    notification.onclick = () => {
      window.focus();
      navigate('/deliveries');
      notification.close();
    };
  }, [navigate, state.deliveries]);

  return null;
};
