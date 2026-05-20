import type { Restaurant } from '../types/delivery.types';
import { isSendiGoRestaurant } from './restaurant-branding';

export const SENDI_PLUS_LABEL = '\u05e1\u05e0\u05d3\u05d9 \u05e4\u05dc\u05d5\u05e1';
export const SENDI_PLUS_RADIUS_STORAGE_KEY = 'sendi-plus-radius-km';
export const SENDI_PLUS_RADIUS_CHANGE_EVENT = 'sendi-plus-radius-change';
export const SENDI_PLUS_TERMS_ACCEPTED_STORAGE_KEY = 'sendi-plus-terms-accepted';
export const SENDI_PLUS_TERMS_ACCEPTED_CHANGE_EVENT = 'sendi-plus-terms-accepted-change';
export const LEGACY_SENDI_GO_RADIUS_STORAGE_KEY = 'sendi-go-radius-km';
export const DEFAULT_SENDI_PLUS_RADIUS_KM = 0;
export const SENDI_PLUS_RADIUS_STEP_KM = 0.5;
export const MAX_SENDI_PLUS_RADIUS_KM = 10;

type RadiusStorageReader = Pick<Storage, 'getItem'>;
type RadiusStorageWriter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

let sendiPlusTermsAcceptedFallback = false;

export const isSendiPlusRestaurant = isSendiGoRestaurant;

export const clampSendiPlusRadius = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_SENDI_PLUS_RADIUS_KM;

  return Math.min(
    MAX_SENDI_PLUS_RADIUS_KM,
    Math.max(0, Math.round(value / SENDI_PLUS_RADIUS_STEP_KM) * SENDI_PLUS_RADIUS_STEP_KM),
  );
};

export const formatSendiPlusRadiusKm = (value: number) => {
  const radius = clampSendiPlusRadius(value);
  if (radius >= MAX_SENDI_PLUS_RADIUS_KM) return `${MAX_SENDI_PLUS_RADIUS_KM}+`;

  return radius.toLocaleString('he-IL', {
    minimumFractionDigits: Number.isInteger(radius) ? 0 : 1,
    maximumFractionDigits: 1,
  });
};

const getRadiusStorage = <TStorage extends RadiusStorageReader | RadiusStorageWriter>(
  storage?: TStorage | null,
): TStorage | Storage | null => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
};

export const readStoredSendiPlusRadius = (storage?: RadiusStorageReader | null) => {
  const targetStorage = getRadiusStorage(storage);
  if (!targetStorage) return DEFAULT_SENDI_PLUS_RADIUS_KM;

  const stored =
    targetStorage.getItem(SENDI_PLUS_RADIUS_STORAGE_KEY) ??
    targetStorage.getItem(LEGACY_SENDI_GO_RADIUS_STORAGE_KEY);
  if (!stored) return DEFAULT_SENDI_PLUS_RADIUS_KM;

  const parsed = Number(stored);
  return Number.isFinite(parsed) ? clampSendiPlusRadius(parsed) : DEFAULT_SENDI_PLUS_RADIUS_KM;
};

export const writeStoredSendiPlusRadius = (
  value: number,
  storage?: RadiusStorageWriter | null,
) => {
  const targetStorage = getRadiusStorage(storage);
  if (!targetStorage || !('setItem' in targetStorage)) return;

  const radius = String(clampSendiPlusRadius(value));
  targetStorage.setItem(SENDI_PLUS_RADIUS_STORAGE_KEY, radius);
  targetStorage.setItem(LEGACY_SENDI_GO_RADIUS_STORAGE_KEY, radius);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SENDI_PLUS_RADIUS_CHANGE_EVENT));
  }
};

export const clearStoredSendiPlusRadius = (storage?: RadiusStorageWriter | null) => {
  const targetStorage = getRadiusStorage(storage);
  if (!targetStorage || !('removeItem' in targetStorage)) return;

  targetStorage.removeItem(SENDI_PLUS_RADIUS_STORAGE_KEY);
  targetStorage.removeItem(LEGACY_SENDI_GO_RADIUS_STORAGE_KEY);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SENDI_PLUS_RADIUS_CHANGE_EVENT));
  }
};

export const readStoredSendiPlusTermsAccepted = (storage?: RadiusStorageReader | null) => {
  const targetStorage = getRadiusStorage(storage);
  if (!targetStorage) return sendiPlusTermsAcceptedFallback;

  try {
    return targetStorage.getItem(SENDI_PLUS_TERMS_ACCEPTED_STORAGE_KEY) === 'true';
  } catch {
    return sendiPlusTermsAcceptedFallback;
  }
};

export const writeStoredSendiPlusTermsAccepted = (
  value: boolean,
  storage?: RadiusStorageWriter | null,
) => {
  sendiPlusTermsAcceptedFallback = value;
  const targetStorage = getRadiusStorage(storage);
  if (targetStorage && 'setItem' in targetStorage) {
    targetStorage.setItem(SENDI_PLUS_TERMS_ACCEPTED_STORAGE_KEY, value ? 'true' : 'false');
  }

  if (!value) {
    clearStoredSendiPlusRadius(storage);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SENDI_PLUS_TERMS_ACCEPTED_CHANGE_EVENT));
  }
};

export const canReceiveSendiPlusDeliveries = (
  radiusKm: number,
  termsAccepted = readStoredSendiPlusTermsAccepted(),
) => termsAccepted && clampSendiPlusRadius(radiusKm) > 0;

export const isRestaurantActiveForDisplay = (
  restaurant: Pick<Restaurant, 'chainId' | 'isActive' | 'name'>,
  termsAccepted = readStoredSendiPlusTermsAccepted(),
) =>
  restaurant.isActive &&
  (!isSendiPlusRestaurant(restaurant.name, restaurant.chainId) || termsAccepted);

export const isRestaurantEligibleForDeliveryIntake = (
  restaurant: Pick<Restaurant, 'chainId' | 'isActive' | 'name'>,
  sendiPlusRadiusKm: number,
) =>
  restaurant.isActive &&
  (!isSendiPlusRestaurant(restaurant.name, restaurant.chainId) ||
    canReceiveSendiPlusDeliveries(sendiPlusRadiusKm));
