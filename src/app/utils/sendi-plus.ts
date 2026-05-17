import type { Restaurant } from '../types/delivery.types';
import { isSendiGoRestaurant } from './restaurant-branding';

export const SENDI_PLUS_LABEL = '\u05e1\u05e0\u05d3\u05d9 \u05e4\u05dc\u05d5\u05e1';
export const SENDI_PLUS_RADIUS_STORAGE_KEY = 'sendi-plus-radius-km';
export const SENDI_PLUS_RADIUS_CHANGE_EVENT = 'sendi-plus-radius-change';
export const LEGACY_SENDI_GO_RADIUS_STORAGE_KEY = 'sendi-go-radius-km';
export const DEFAULT_SENDI_PLUS_RADIUS_KM = 5;
export const MAX_SENDI_PLUS_RADIUS_KM = 10;

type RadiusStorageReader = Pick<Storage, 'getItem'>;
type RadiusStorageWriter = Pick<Storage, 'getItem' | 'setItem'>;

export const isSendiPlusRestaurant = isSendiGoRestaurant;

export const clampSendiPlusRadius = (value: number) =>
  Math.min(MAX_SENDI_PLUS_RADIUS_KM, Math.max(0, Math.round(value * 2) / 2));

export const formatSendiPlusRadiusKm = (value: number) =>
  value.toLocaleString('he-IL', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  });

const getRadiusStorage = <TStorage extends RadiusStorageReader | RadiusStorageWriter>(
  storage?: TStorage | null,
): TStorage | Storage | null => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
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

export const canReceiveSendiPlusDeliveries = (radiusKm: number) =>
  clampSendiPlusRadius(radiusKm) > 0;

export const isRestaurantEligibleForDeliveryIntake = (
  restaurant: Pick<Restaurant, 'chainId' | 'isActive' | 'name'>,
  sendiPlusRadiusKm: number,
) =>
  restaurant.isActive &&
  (!isSendiPlusRestaurant(restaurant.name, restaurant.chainId) ||
    canReceiveSendiPlusDeliveries(sendiPlusRadiusKm));
