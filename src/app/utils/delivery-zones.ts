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

const zoneBox = (
  id: string,
  name: string,
  color: string,
  south: number,
  west: number,
  north: number,
  east: number,
): StoredDeliveryZone => ({
  id,
  name,
  color,
  latlngs: [
    [south, west],
    [south, east],
    [north, east],
    [north, west],
  ],
});

export const DEFAULT_SENDI_PLUS_SERVICE_AREAS: StoredDeliveryZone[] = [
  zoneBox('zone-tlv-north', 'תל אביב צפון', '#0a84ff', 32.083, 34.755, 32.122, 34.812),
  zoneBox('zone-tlv-center', 'תל אביב מרכז', '#2563eb', 32.060, 34.755, 32.086, 34.805),
  zoneBox('zone-tlv-south', 'תל אביב דרום', '#0891b2', 32.034, 34.755, 32.064, 34.800),
  zoneBox('zone-jaffa', 'יפו', '#ef4444', 31.998, 34.738, 32.036, 34.795),
  zoneBox('zone-ramat-gan', 'רמת גן', '#22c55e', 32.064, 34.790, 32.100, 34.838),
  zoneBox('zone-givatayim', 'גבעתיים', '#84cc16', 32.058, 34.798, 32.078, 34.825),
  zoneBox('zone-bnei-brak', 'בני ברק', '#eab308', 32.073, 34.815, 32.104, 34.856),
  zoneBox('zone-petah-tikva', 'פתח תקווה', '#65a30d', 32.070, 34.855, 32.112, 34.925),
  zoneBox('zone-kiryat-ono-or-yehuda', 'בקעת אונו / אור יהודה', '#14b8a6', 32.026, 34.815, 32.078, 34.905),
  zoneBox('zone-holon', 'חולון', '#f97316', 31.995, 34.760, 32.052, 34.818),
  zoneBox('zone-bat-yam', 'בת ים', '#ec4899', 31.988, 34.728, 32.037, 34.775),
  zoneBox('zone-rishon-lezion', 'ראשון לציון', '#f59e0b', 31.935, 34.735, 32.005, 34.860),
  zoneBox('zone-herzliya-ramat-hasharon', 'הרצליה / רמת השרון', '#06b6d4', 32.095, 34.780, 32.180, 34.875),
  zoneBox('zone-raanana-kfar-saba', 'רעננה / כפר סבא / הוד השרון', '#10b981', 32.120, 34.845, 32.245, 35.025),
  zoneBox('zone-netanya-sharon', 'נתניה והשרון', '#0284c7', 32.245, 34.780, 32.365, 34.965),
  zoneBox('zone-hadera-caesarea', 'חדרה / קיסריה', '#38bdf8', 32.360, 34.820, 32.560, 35.050),
  zoneBox('zone-lod-ramla', 'לוד / רמלה', '#d97706', 31.875, 34.815, 31.980, 34.965),
  zoneBox('zone-rehovot-nes-ziona', 'רחובות / נס ציונה', '#fb923c', 31.840, 34.720, 31.945, 34.900),
  zoneBox('zone-modiin', 'מודיעין / מכבים / רעות', '#a855f7', 31.825, 34.925, 31.985, 35.085),
  zoneBox('zone-ashdod', 'אשדוד / גן יבנה', '#f43f5e', 31.735, 34.560, 31.870, 34.785),
  zoneBox('zone-ashkelon', 'אשקלון', '#e11d48', 31.600, 34.520, 31.740, 34.730),
  zoneBox('zone-kiryat-gat-lachish', 'קריית גת / לכיש', '#ea580c', 31.500, 34.660, 31.780, 34.965),
  zoneBox('zone-jerusalem', 'ירושלים', '#7c3aed', 31.675, 35.090, 31.875, 35.335),
  zoneBox('zone-beit-shemesh', 'בית שמש והרי יהודה', '#8b5cf6', 31.620, 34.870, 31.800, 35.105),
  zoneBox('zone-maale-adumim-dead-sea-north', 'מעלה אדומים / ים המלח צפון', '#6366f1', 31.630, 35.320, 31.900, 35.560),
  zoneBox('zone-hebron-judea', 'חברון / יהודה', '#9333ea', 31.330, 34.880, 31.650, 35.260),
  zoneBox('zone-haifa-krayot', 'חיפה והקריות', '#0f766e', 32.695, 34.900, 32.905, 35.175),
  zoneBox('zone-akko-nahariya', 'עכו / נהריה', '#0d9488', 32.900, 34.845, 33.115, 35.170),
  zoneBox('zone-western-galilee', 'גליל מערבי', '#2dd4bf', 32.860, 35.050, 33.210, 35.370),
  zoneBox('zone-upper-galilee-golan', 'גליל עליון / גולן', '#15803d', 32.860, 35.350, 33.320, 35.900),
  zoneBox('zone-lower-galilee', 'גליל תחתון / עמקים', '#16a34a', 32.500, 35.120, 32.860, 35.560),
  zoneBox('zone-tiberias-kinneret', 'טבריה / כנרת', '#4ade80', 32.680, 35.430, 32.960, 35.760),
  zoneBox('zone-beit-shean-jordan-valley', 'בית שאן / בקעת הירדן', '#65a30d', 32.250, 35.330, 32.660, 35.680),
  zoneBox('zone-samaria-ariel', 'שומרון / אריאל', '#84cc16', 32.020, 35.020, 32.270, 35.360),
  zoneBox('zone-beersheba', 'באר שבע', '#c2410c', 31.150, 34.640, 31.350, 34.980),
  zoneBox('zone-western-negev', 'נגב מערבי / עוטף', '#dc2626', 31.190, 34.260, 31.620, 34.670),
  zoneBox('zone-arad-dead-sea-south', 'ערד / ים המלח דרום', '#b45309', 30.880, 34.880, 31.360, 35.570),
  zoneBox('zone-central-negev', 'נגב מרכזי', '#d97706', 30.300, 34.450, 31.170, 35.120),
  zoneBox('zone-ramat-negev', 'רמת נגב', '#92400e', 30.250, 34.160, 31.220, 34.700),
  zoneBox('zone-mitzpe-ramon', 'מצפה רמון', '#a16207', 30.200, 34.540, 30.760, 35.080),
  zoneBox('zone-arava', 'הערבה', '#ca8a04', 29.650, 35.000, 30.920, 35.360),
  zoneBox('zone-eilat', 'אילת', '#be185d', 29.450, 34.835, 29.760, 35.110),
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
