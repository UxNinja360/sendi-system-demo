import {
  DEFAULT_ALERT_SOUND_ID,
  getAlertSoundPreset,
  type AlertSoundId,
} from './alert-sounds';

export type AlertPreferences = {
  newDeliverySoundEnabled: boolean;
  newDeliverySoundId: AlertSoundId;
  hapticFeedbackEnabled: boolean;
  newDeliveryHapticEnabled: boolean;
  browserNotificationsEnabled: boolean;
};

export const ALERT_PREFERENCES_EVENT = 'sendi-alert-preferences-change';

const NEW_DELIVERY_SOUND_KEY = 'sendi-new-delivery-sound-enabled-v1';
const NEW_DELIVERY_SOUND_ID_KEY = 'sendi-new-delivery-sound-id-v1';
const HAPTIC_FEEDBACK_KEY = 'sendi-haptic-feedback-enabled-v1';
const NEW_DELIVERY_HAPTIC_KEY = 'sendi-new-delivery-haptic-enabled-v1';
const BROWSER_NOTIFICATIONS_KEY = 'sendi-browser-notifications-enabled-v1';

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  newDeliverySoundEnabled: true,
  newDeliverySoundId: DEFAULT_ALERT_SOUND_ID,
  hapticFeedbackEnabled: true,
  newDeliveryHapticEnabled: true,
  browserNotificationsEnabled: true,
};

const readSoundPreference = (key: string, fallback: AlertSoundId): AlertSoundId => {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return getAlertSoundPreset(value ?? fallback).id;
  } catch {
    return fallback;
  }
};

const readBooleanPreference = (key: string, fallback: boolean) => {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    return value === 'true';
  } catch {
    return fallback;
  }
};

const writeBooleanPreference = (key: string, value: boolean) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Settings still update in-memory for the current render path.
  }
};

const writeStringPreference = (key: string, value: string) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Settings still update in-memory for the current render path.
  }
};

export const getAlertPreferences = (): AlertPreferences => ({
  newDeliverySoundEnabled: readBooleanPreference(
    NEW_DELIVERY_SOUND_KEY,
    DEFAULT_ALERT_PREFERENCES.newDeliverySoundEnabled,
  ),
  newDeliverySoundId: readSoundPreference(
    NEW_DELIVERY_SOUND_ID_KEY,
    DEFAULT_ALERT_PREFERENCES.newDeliverySoundId,
  ),
  hapticFeedbackEnabled: readBooleanPreference(
    HAPTIC_FEEDBACK_KEY,
    DEFAULT_ALERT_PREFERENCES.hapticFeedbackEnabled,
  ),
  newDeliveryHapticEnabled: readBooleanPreference(
    NEW_DELIVERY_HAPTIC_KEY,
    DEFAULT_ALERT_PREFERENCES.newDeliveryHapticEnabled,
  ),
  browserNotificationsEnabled: readBooleanPreference(
    BROWSER_NOTIFICATIONS_KEY,
    DEFAULT_ALERT_PREFERENCES.browserNotificationsEnabled,
  ),
});

export const setAlertPreference = <Key extends keyof AlertPreferences>(
  key: Key,
  value: AlertPreferences[Key],
) => {
  if (key === 'newDeliverySoundEnabled') {
    writeBooleanPreference(NEW_DELIVERY_SOUND_KEY, value);
  }

  if (key === 'newDeliverySoundId') {
    writeStringPreference(NEW_DELIVERY_SOUND_ID_KEY, value);
  }

  if (key === 'hapticFeedbackEnabled') {
    writeBooleanPreference(HAPTIC_FEEDBACK_KEY, value);
  }

  if (key === 'newDeliveryHapticEnabled') {
    writeBooleanPreference(NEW_DELIVERY_HAPTIC_KEY, value);
  }

  if (key === 'browserNotificationsEnabled') {
    writeBooleanPreference(BROWSER_NOTIFICATIONS_KEY, value);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<AlertPreferences>(ALERT_PREFERENCES_EVENT, {
        detail: getAlertPreferences(),
      }),
    );
  }
};
