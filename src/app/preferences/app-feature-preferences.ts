import { useCallback, useEffect, useState } from 'react';

export type AppFeaturePreferences = {
  mobileFloatingDockEnabled: boolean;
};

export type AppFeaturePreferenceKey = keyof AppFeaturePreferences;

const APP_FEATURE_PREFERENCES_STORAGE_KEY = 'sendi:app-feature-preferences-v1';
const APP_FEATURE_PREFERENCES_EVENT = 'sendi:app-feature-preferences-change';

const defaultAppFeaturePreferences: AppFeaturePreferences = {
  mobileFloatingDockEnabled: true,
};

const normalizeAppFeaturePreferences = (value: unknown): AppFeaturePreferences => {
  if (!value || typeof value !== 'object') return defaultAppFeaturePreferences;

  const preferences = value as Partial<AppFeaturePreferences>;

  return {
    mobileFloatingDockEnabled:
      typeof preferences.mobileFloatingDockEnabled === 'boolean'
        ? preferences.mobileFloatingDockEnabled
        : defaultAppFeaturePreferences.mobileFloatingDockEnabled,
  };
};

export const getAppFeaturePreferences = (): AppFeaturePreferences => {
  if (typeof window === 'undefined') return defaultAppFeaturePreferences;

  try {
    const raw = window.localStorage.getItem(APP_FEATURE_PREFERENCES_STORAGE_KEY);
    return normalizeAppFeaturePreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultAppFeaturePreferences;
  }
};

const writeAppFeaturePreferences = (preferences: AppFeaturePreferences) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    APP_FEATURE_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );
  window.dispatchEvent(new Event(APP_FEATURE_PREFERENCES_EVENT));
};

export const setAppFeaturePreference = <Key extends AppFeaturePreferenceKey>(
  key: Key,
  value: AppFeaturePreferences[Key],
) => {
  writeAppFeaturePreferences({
    ...getAppFeaturePreferences(),
    [key]: value,
  });
};

export const useAppFeaturePreferences = () => {
  const [preferences, setPreferences] = useState<AppFeaturePreferences>(() =>
    getAppFeaturePreferences(),
  );

  useEffect(() => {
    const syncPreferences = () => setPreferences(getAppFeaturePreferences());

    window.addEventListener(APP_FEATURE_PREFERENCES_EVENT, syncPreferences);
    window.addEventListener('storage', syncPreferences);

    return () => {
      window.removeEventListener(APP_FEATURE_PREFERENCES_EVENT, syncPreferences);
      window.removeEventListener('storage', syncPreferences);
    };
  }, []);

  const setPreference = useCallback(
    <Key extends AppFeaturePreferenceKey>(key: Key, value: AppFeaturePreferences[Key]) => {
      setAppFeaturePreference(key, value);
    },
    [],
  );

  return { preferences, setPreference };
};
