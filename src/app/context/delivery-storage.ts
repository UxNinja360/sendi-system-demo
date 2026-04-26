export const DELIVERY_STORAGE_KEYS = {
  state: 'sendi-delivery-state',
  stateEpoch: 'sendi-delivery-state-epoch',
  liveOnShiftFilter: 'sendi-live-manager-on-shift-only',
  liveRouteStopOrders: 'sendi-live-manager-route-stop-orders',
  liveCourierPositions: 'sendi-live-manager-courier-positions',
  liveCourierPositionTimestamps: 'sendi-live-manager-courier-positions-ts',
  livePanelSize: 'liveManagerPanelSize',
  shiftsCollapsedTemplates: 'shifts-collapsed-templates',
  deliveriesColumnOrder: 'deliveries-column-order',
  deliveriesVisibleColumns: 'deliveries-visible-columns',
  couriersColumnOrder: 'couriers-column-order-v1',
  couriersVisibleColumns: 'couriers-visible-columns-v1',
  restaurantsColumnOrder: 'restaurants-column-order-v3',
  restaurantsVisibleColumns: 'restaurants-visible-columns-v1',
  deliveryZones: 'delivery_zones_v1',
} as const;

const RESET_STORAGE_KEYS = [
  DELIVERY_STORAGE_KEYS.state,
  DELIVERY_STORAGE_KEYS.liveOnShiftFilter,
  DELIVERY_STORAGE_KEYS.liveRouteStopOrders,
  DELIVERY_STORAGE_KEYS.liveCourierPositions,
  DELIVERY_STORAGE_KEYS.liveCourierPositionTimestamps,
  DELIVERY_STORAGE_KEYS.livePanelSize,
  DELIVERY_STORAGE_KEYS.shiftsCollapsedTemplates,
  DELIVERY_STORAGE_KEYS.deliveriesColumnOrder,
  DELIVERY_STORAGE_KEYS.deliveriesVisibleColumns,
  DELIVERY_STORAGE_KEYS.couriersColumnOrder,
  DELIVERY_STORAGE_KEYS.couriersVisibleColumns,
  DELIVERY_STORAGE_KEYS.restaurantsColumnOrder,
  DELIVERY_STORAGE_KEYS.restaurantsVisibleColumns,
  DELIVERY_STORAGE_KEYS.deliveryZones,
] as const;

const RESET_STORAGE_KEY_PREFIXES = [
  'sendi-live-manager-',
  'deliveries-',
  'couriers-',
  'restaurants-',
  'shifts-',
  'delivery_zones_',
] as const;

export const createStorageEpoch = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const ensureStorageEpoch = (storage: Storage) => {
  const existing = storage.getItem(DELIVERY_STORAGE_KEYS.stateEpoch);
  if (existing) return existing;

  const next = createStorageEpoch();
  storage.setItem(DELIVERY_STORAGE_KEYS.stateEpoch, next);
  return next;
};

export const shouldClearOnSystemReset = (key: string) =>
  RESET_STORAGE_KEYS.includes(key as (typeof RESET_STORAGE_KEYS)[number]) ||
  RESET_STORAGE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));

export const clearSystemResetStorage = (storage: Storage) => {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => !!key);

  keys.forEach((key) => {
    if (shouldClearOnSystemReset(key)) {
      storage.removeItem(key);
    }
  });
};
