export type AlertPreferences = {
  newDeliverySoundEnabled: boolean;
  browserNotificationsEnabled: boolean;
};

export const ALERT_PREFERENCES_EVENT = 'sendi-alert-preferences-change';

const NEW_DELIVERY_SOUND_KEY = 'sendi-new-delivery-sound-enabled-v1';
const BROWSER_NOTIFICATIONS_KEY = 'sendi-browser-notifications-enabled-v1';

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  newDeliverySoundEnabled: true,
  browserNotificationsEnabled: true,
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

export const getAlertPreferences = (): AlertPreferences => ({
  newDeliverySoundEnabled: readBooleanPreference(
    NEW_DELIVERY_SOUND_KEY,
    DEFAULT_ALERT_PREFERENCES.newDeliverySoundEnabled,
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

