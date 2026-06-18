import { DELIVERY_STORAGE_KEYS } from '../context/delivery-storage';

export type DeliveryZoneLatLng = [number, number];

export interface StoredDeliveryZone {
  id: string;
  name: string;
  color: string;
  latlngs: DeliveryZoneLatLng[];
  isActive?: boolean;
}

export const DELIVERY_ZONES_CHANGE_EVENT = 'delivery-zones-change';

const LEGACY_PRESET_DELIVERY_ZONE_IDS = new Set([
  'preset-central-tel-aviv',
  'preset-tel-aviv-beach',
  'preset-florentin',
  'preset-nahalat-binyamin',
  'preset-tel-aviv-port',
  'preset-ramat-gan',
  'preset-givatayim',
  'preset-bnei-brak',
  'preset-jaffa',
  'preset-bat-yam',
  'preset-center-service-area',
]);

const zonePolygon = (
  id: string,
  name: string,
  color: string,
  latlngs: DeliveryZoneLatLng[],
): StoredDeliveryZone => ({
  id,
  name,
  color,
  latlngs,
});

export const DEFAULT_SENDI_PLUS_SERVICE_AREAS: StoredDeliveryZone[] = [
  zonePolygon('zone-north', 'צפון', '#16a34a', [
    [32.46, 35.12],
    [32.62, 35.02],
    [32.92, 35.12],
    [33.12, 35.05],
    [33.30, 35.32],
    [33.27, 35.72],
    [32.98, 35.88],
    [32.72, 35.65],
    [32.46, 35.46],
  ]),
  zonePolygon('zone-haifa-krayot', 'חיפה והקריות', '#0f766e', [
    [32.62, 35.02],
    [32.68, 34.88],
    [32.80, 34.82],
    [32.92, 35.02],
    [32.86, 35.20],
    [32.70, 35.16],
  ]),
  zonePolygon('zone-sharon', 'שרון', '#0284c7', [
    [32.02, 34.84],
    [32.08, 34.77],
    [32.38, 34.77],
    [32.55, 34.90],
    [32.45, 35.08],
    [32.12, 35.00],
  ]),
  zonePolygon('zone-center-dan', 'מרכז וגוש דן', '#2563eb', [
    [31.87, 34.86],
    [31.93, 34.72],
    [32.08, 34.72],
    [32.18, 34.84],
    [32.12, 35.02],
    [31.95, 35.02],
  ]),
  zonePolygon('zone-samaria', 'שומרון', '#9333ea', [
    [31.86, 35.03],
    [32.08, 34.96],
    [32.40, 35.08],
    [32.50, 35.38],
    [32.30, 35.58],
    [31.98, 35.48],
  ]),
  zonePolygon('zone-judea', 'יהודה', '#a855f7', [
    [31.14, 35.02],
    [31.34, 34.90],
    [31.53, 34.98],
    [31.55, 35.20],
    [31.42, 35.36],
    [31.18, 35.30],
  ]),
  zonePolygon('zone-jerusalem-area', 'ירושלים והסביבה', '#facc15', [
    [31.55, 35.26],
    [31.58, 35.02],
    [31.72, 34.88],
    [31.92, 35.02],
    [31.92, 35.36],
    [31.72, 35.48],
  ]),
  zonePolygon('zone-shfela', 'שפלה', '#f59e0b', [
    [31.50, 34.84],
    [31.55, 34.55],
    [31.92, 34.57],
    [31.98, 34.86],
    [31.72, 35.02],
  ]),
  zonePolygon('zone-dead-sea', 'ים המלח', '#0891b2', [
    [30.92, 35.20],
    [31.20, 35.12],
    [31.72, 35.28],
    [31.78, 35.55],
    [31.30, 35.62],
    [30.95, 35.45],
  ]),
  zonePolygon('zone-south', 'דרום', '#dc2626', [
    [30.15, 34.55],
    [30.55, 34.25],
    [31.52, 34.25],
    [31.62, 34.80],
    [31.20, 35.18],
    [30.35, 35.05],
  ]),
  zonePolygon('zone-eilat-arava', 'אילת והערבה', '#be185d', [
    [29.45, 34.82],
    [30.45, 34.90],
    [31.05, 35.22],
    [30.70, 35.42],
    [29.55, 35.08],
  ]),
];

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

const normalizeStoredDeliveryZones = (zones: StoredDeliveryZone[]) =>
  zones.length > 0 && zones.every((zone) => LEGACY_PRESET_DELIVERY_ZONE_IDS.has(zone.id))
    ? DEFAULT_SENDI_PLUS_SERVICE_AREAS
    : zones;

export const loadStoredDeliveryZones = (storage?: StorageReader | null): StoredDeliveryZone[] => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return [];

  try {
    const raw = targetStorage.getItem(DELIVERY_STORAGE_KEYS.deliveryZones);
    const parsed = raw ? JSON.parse(raw) : [];
    const zones = Array.isArray(parsed)
      ? parsed.filter(
          (zone): zone is StoredDeliveryZone =>
            typeof zone?.id === 'string' &&
            typeof zone?.name === 'string' &&
            typeof zone?.color === 'string' &&
            Array.isArray(zone?.latlngs) &&
            (zone?.isActive === undefined || typeof zone.isActive === 'boolean'),
        )
      : [];
    return normalizeStoredDeliveryZones(zones);
  } catch {
    return [];
  }
};

export const getDeliveryServiceAreas = (zones: StoredDeliveryZone[]) =>
  zones.length > 0 ? zones : DEFAULT_SENDI_PLUS_SERVICE_AREAS;

export const loadStoredDeliveryServiceAreas = (storage?: StorageReader | null) => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return DEFAULT_SENDI_PLUS_SERVICE_AREAS;

  return targetStorage.getItem(DELIVERY_STORAGE_KEYS.deliveryZones) === null
    ? DEFAULT_SENDI_PLUS_SERVICE_AREAS
    : loadStoredDeliveryZones(storage);
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

export const getActiveDeliveryZones = (zones: StoredDeliveryZone[]) =>
  zones.filter(isDeliveryZoneActive);

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
) => getActiveDeliveryZones(zones).find((zone) => isPointInDeliveryZone(point, zone)) ?? null;

export const isPointCoveredByActiveDeliveryZones = (
  point: { lat: number; lng: number },
  zones: StoredDeliveryZone[],
) => {
  const activeZones = getActiveDeliveryZones(zones);
  if (activeZones.length === 0) return true;

  return activeZones.some((zone) => isPointInDeliveryZone(point, zone));
};
