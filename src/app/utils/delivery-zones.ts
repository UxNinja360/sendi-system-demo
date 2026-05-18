import { DELIVERY_STORAGE_KEYS } from '../context/delivery-storage';

export type DeliveryZoneLatLng = [number, number];

export interface StoredDeliveryZone {
  id: string;
  name: string;
  color: string;
  latlngs: DeliveryZoneLatLng[];
  isActive?: boolean;
}

export type SendiPlusZonePermissions = Record<string, string[]>;

export const DELIVERY_ZONES_CHANGE_EVENT = 'delivery-zones-change';
export const SENDI_PLUS_ZONE_PERMISSIONS_CHANGE_EVENT = 'sendi-plus-zone-permissions-change';

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'getItem' | 'setItem'>;

const getStorage = <TStorage extends StorageReader | StorageWriter>(
  storage?: TStorage | null,
): TStorage | Storage | null => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const dispatchBrowserEvent = (eventName: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(eventName));
};

export const loadStoredDeliveryZones = (storage?: StorageReader | null): StoredDeliveryZone[] => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return [];

  try {
    const raw = targetStorage.getItem(DELIVERY_STORAGE_KEYS.deliveryZones);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (zone): zone is StoredDeliveryZone =>
            typeof zone?.id === 'string' &&
            typeof zone?.name === 'string' &&
            typeof zone?.color === 'string' &&
            Array.isArray(zone?.latlngs) &&
            (zone?.isActive === undefined || typeof zone.isActive === 'boolean'),
        )
      : [];
  } catch {
    return [];
  }
};

export const saveStoredDeliveryZones = (
  zones: StoredDeliveryZone[],
  storage?: StorageWriter | null,
) => {
  const targetStorage = getStorage(storage);
  if (!targetStorage || !('setItem' in targetStorage)) return;

  targetStorage.setItem(DELIVERY_STORAGE_KEYS.deliveryZones, JSON.stringify(zones));
  dispatchBrowserEvent(DELIVERY_ZONES_CHANGE_EVENT);
};

export const isDeliveryZoneActive = (zone: StoredDeliveryZone) => zone.isActive !== false;

export const readSendiPlusZonePermissions = (
  storage?: StorageReader | null,
): SendiPlusZonePermissions => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return {};

  try {
    const raw = targetStorage.getItem(DELIVERY_STORAGE_KEYS.sendiPlusZonePermissions);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([restaurantId, zoneIds]) => typeof restaurantId === 'string' && Array.isArray(zoneIds))
        .map(([restaurantId, zoneIds]) => [
          restaurantId,
          (zoneIds as unknown[]).filter((zoneId): zoneId is string => typeof zoneId === 'string'),
        ]),
    );
  } catch {
    return {};
  }
};

export const writeSendiPlusZonePermissions = (
  permissions: SendiPlusZonePermissions,
  storage?: StorageWriter | null,
) => {
  const targetStorage = getStorage(storage);
  if (!targetStorage || !('setItem' in targetStorage)) return;

  targetStorage.setItem(
    DELIVERY_STORAGE_KEYS.sendiPlusZonePermissions,
    JSON.stringify(permissions),
  );
  dispatchBrowserEvent(SENDI_PLUS_ZONE_PERMISSIONS_CHANGE_EVENT);
};

export const getAllowedZoneIdsForRestaurant = (
  restaurantId: string,
  zones: StoredDeliveryZone[],
  permissions: SendiPlusZonePermissions,
) => {
  const activeZones = zones.filter(isDeliveryZoneActive);
  const configuredZoneIds = permissions[restaurantId];
  if (!configuredZoneIds) return activeZones.map((zone) => zone.id);

  const existingZoneIds = new Set(activeZones.map((zone) => zone.id));
  return configuredZoneIds.filter((zoneId) => existingZoneIds.has(zoneId));
};

export const isRestaurantAllowedForDeliveryZone = (
  restaurantId: string,
  zoneId: string,
  zones: StoredDeliveryZone[],
  permissions: SendiPlusZonePermissions,
) => getAllowedZoneIdsForRestaurant(restaurantId, zones, permissions).includes(zoneId);

export const isPointInDeliveryZone = (
  point: { lat: number; lng: number },
  zone: StoredDeliveryZone,
) => {
  const polygon = zone.latlngs;
  if (polygon.length < 3) return false;

  let isInside = false;
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
    const [currentLat, currentLng] = polygon[index];
    const [previousLat, previousLng] = polygon[previousIndex];
    const intersects =
      currentLat > point.lat !== previousLat > point.lat &&
      point.lng <
        ((previousLng - currentLng) * (point.lat - currentLat)) /
          (previousLat - currentLat) +
          currentLng;

    if (intersects) isInside = !isInside;
  }

  return isInside;
};

export const findDeliveryZoneForPoint = (
  point: { lat: number; lng: number },
  zones: StoredDeliveryZone[],
) => zones.find((zone) => isDeliveryZoneActive(zone) && isPointInDeliveryZone(point, zone)) ?? null;
