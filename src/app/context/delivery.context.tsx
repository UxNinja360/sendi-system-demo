import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import {
  ActivityLogEntry,
  DeliveryState,
  DeliveryAction,
  Delivery,
  Courier,
  Restaurant,
} from '../types/delivery.types';
import { deliveryReducer } from './delivery.reducer';
import { DeliveryContext } from './delivery-context-value';
import {
  advanceLiveSimulation,
  getInitialCourierPosition,
  type MapPosition,
} from '../live/live-simulation-engine';
import { canCourierAcceptDelivery, getAutoAssignableCourier } from '../utils/courier-assignment';
import {
  canAssignDeliveryWithCredits,
} from '../utils/delivery-credits';
import { isDeliveryOfferExpired } from '../utils/delivery-offers';
import {
  DEFAULT_RESTAURANT_MAX_DELIVERY_TIME,
  DEFAULT_RESTAURANT_PREPARATION_TIME,
  ISRAELI_NAMES,
  RESTAURANTS_DATA,
  createInitialDeliveryState,
  initialState,
  mergeSeededRestaurants,
  normalizeCouriers,
  normalizeDeliveryPreparationTime,
} from './delivery-bootstrap';
import { sanitizeLoadedDeliveryState } from './delivery-state-sanitizer';
import {
  DELIVERY_STORAGE_KEYS,
  clearSystemResetStorage,
  createStorageEpoch,
  ensureStorageEpoch,
} from './delivery-storage';

const STORAGE_KEY = DELIVERY_STORAGE_KEYS.state;
const STATE_EPOCH_KEY = DELIVERY_STORAGE_KEYS.stateEpoch;
const LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY = DELIVERY_STORAGE_KEYS.liveRouteStopOrders;
const LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY = DELIVERY_STORAGE_KEYS.liveCourierPositions;
const LIVE_MANAGER_COURIER_POSITIONS_TS_STORAGE_KEY = DELIVERY_STORAGE_KEYS.liveCourierPositionTimestamps;
const SIMULATION_TICK_MS = 5000;
const MIN_GLOBAL_DELIVERY_GAP_MS = 12000;
const MIN_ACTIVE_SIMULATED_DELIVERIES = 8;
const MAX_ACTIVE_SIMULATED_DELIVERIES = 48;
const ACTIVE_DELIVERIES_PER_RESTAURANT = 2;
const ACTIVE_DELIVERIES_PER_ON_SHIFT_COURIER = 4;
const INITIAL_RESTAURANT_STAGGER_MIN_MS = 2500;
const INITIAL_RESTAURANT_STAGGER_RANGE_MS = 27500;

const createActivityLogEntry = (action: DeliveryAction, state: DeliveryState): ActivityLogEntry | null => {
  const now = new Date();
  const getDeliveryLabel = (deliveryId: string) =>
    state.deliveries.find((delivery) => delivery.id === deliveryId)?.orderNumber ?? deliveryId;
  const getCourierLabel = (courierId: string) =>
    state.couriers.find((courier) => courier.id === courierId)?.name ?? courierId;
  const getRestaurantLabel = (restaurantId: string) =>
    state.restaurants.find((restaurant) => restaurant.id === restaurantId)?.name ?? restaurantId;

  switch (action.type) {
    case 'TOGGLE_SYSTEM':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: state.isSystemOpen ? 'המערכת נסגרה' : 'המערכת נפתחה',
        description: state.isSystemOpen ? 'קבלת משלוחים הופסקה' : 'קבלת משלוחים הופעלה',
        actionType: action.type,
        category: 'system',
      };
    case 'TOGGLE_AUTO_ASSIGN':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: state.autoAssignEnabled ? 'שיוך אוטומטי כובה' : 'שיוך אוטומטי הופעל',
        actionType: action.type,
        category: 'system',
      };
    case 'ADD_DELIVERY':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'משלוח חדש נוצר',
        description: `${action.payload.orderNumber} · ${action.payload.restaurantName}`,
        actionType: action.type,
        category: 'delivery',
      };
    case 'ASSIGN_COURIER':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'משלוח שויך לשליח',
        description: `${getDeliveryLabel(action.payload.deliveryId)} → ${getCourierLabel(action.payload.courierId)}`,
        actionType: action.type,
        category: 'delivery',
      };
    case 'CANCEL_DELIVERY':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'משלוח בוטל',
        description: getDeliveryLabel(action.payload),
        actionType: action.type,
        category: 'delivery',
      };
    case 'UNASSIGN_COURIER':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'שיוך שליח הוסר',
        description: getDeliveryLabel(action.payload),
        actionType: action.type,
        category: 'delivery',
      };
    case 'UPDATE_DELIVERY':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'פרטי משלוח עודכנו',
        description: getDeliveryLabel(action.payload.deliveryId),
        actionType: action.type,
        category: 'delivery',
      };
    case 'DELETE_DELIVERY':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'משלוח נמחק',
        description: getDeliveryLabel(action.payload),
        actionType: action.type,
        category: 'delivery',
      };
    case 'UPDATE_COURIER_STATUS':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'סטטוס שליח עודכן',
        description: `${getCourierLabel(action.payload.courierId)} → ${action.payload.status}`,
        actionType: action.type,
        category: 'courier',
      };
    case 'START_COURIER_SHIFT':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'שליח התחיל משמרת',
        description: getCourierLabel(action.payload.courierId),
        actionType: action.type,
        category: 'shift',
      };
    case 'END_COURIER_SHIFT':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'שליח סיים משמרת',
        description: getCourierLabel(action.payload.courierId),
        actionType: action.type,
        category: 'shift',
      };
    case 'ADD_COURIER':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'שליח חדש נוסף',
        description: action.payload.name,
        actionType: action.type,
        category: 'courier',
      };
    case 'REMOVE_COURIER':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'שליח הוסר',
        description: getCourierLabel(action.payload),
        actionType: action.type,
        category: 'courier',
      };
    case 'ADD_RESTAURANT':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'מסעדה חדשה נוספה',
        description: action.payload.name,
        actionType: action.type,
        category: 'restaurant',
      };
    case 'TOGGLE_RESTAURANT':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'סטטוס מסעדה עודכן',
        description: getRestaurantLabel(action.payload),
        actionType: action.type,
        category: 'restaurant',
      };
    case 'UPDATE_RESTAURANT':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'פרטי מסעדה עודכנו',
        description: getRestaurantLabel(action.payload.restaurantId),
        actionType: action.type,
        category: 'restaurant',
      };
    case 'ADD_DELIVERY_BALANCE':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'יתרת משלוחים עודכנה',
        description: `+${action.payload}`,
        actionType: action.type,
        category: 'settings',
      };
    case 'CREATE_SHIFT_TEMPLATE':
    case 'UPDATE_SHIFT_TEMPLATE':
    case 'DELETE_SHIFT_TEMPLATE':
    case 'CREATE_SHIFT':
    case 'UPDATE_SHIFT':
    case 'DELETE_SHIFT':
    case 'ASSIGN_COURIER_TO_SHIFT':
    case 'AUTO_ASSIGN_SHIFT':
    case 'REMOVE_COURIER_FROM_SHIFT':
    case 'START_SHIFT_ASSIGNMENT':
    case 'END_SHIFT_ASSIGNMENT':
      return {
        id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        title: 'פעולת משמרת בוצעה',
        description: action.type,
        actionType: action.type,
        category: 'shift',
      };
    default:
      return null;
  }
};

const reviveDates = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, reviveDates(entry)])
    );
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return new Date(value);
  }

  return value;
};

const getStoredCourierAssignPosition = (
  courierId: string,
): { runner_at_assigning_latitude?: number; runner_at_assigning_longitude?: number } => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { lat?: number; lng?: number }>;
    const position = parsed?.[courierId];
    if (!position) return {};

    return {
      runner_at_assigning_latitude:
        typeof position.lat === 'number' ? position.lat : undefined,
      runner_at_assigning_longitude:
        typeof position.lng === 'number' ? position.lng : undefined,
    };
  } catch {
    return {};
  }
};

const getDeliveryCreatedAtMs = (delivery: Delivery) => {
  const value = delivery.createdAt ?? delivery.creation_time;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const isLiveActiveDelivery = (delivery: Delivery) =>
  delivery.status === 'pending' || delivery.status === 'assigned' || delivery.status === 'delivering';

const getActiveSimulatedDeliveryLimit = (state: DeliveryState) => {
  const activeRestaurantCount = state.restaurants.filter((restaurant) => restaurant.isActive).length;
  const activeCourierCount = state.couriers.filter((courier) => (
    courier.isOnShift && courier.status !== 'offline'
  )).length;

  return Math.min(
    MAX_ACTIVE_SIMULATED_DELIVERIES,
    Math.max(
      MIN_ACTIVE_SIMULATED_DELIVERIES,
      activeRestaurantCount * ACTIVE_DELIVERIES_PER_RESTAURANT,
      activeCourierCount * ACTIVE_DELIVERIES_PER_ON_SHIFT_COURIER
    )
  );
};

const matchesRestaurant = (delivery: Delivery, restaurant: Restaurant) =>
  delivery.rest_id === restaurant.id ||
  delivery.restaurantId === restaurant.id ||
  delivery.restaurantName === restaurant.name ||
  delivery.rest_name === restaurant.name;

const getLatestDeliveryCreatedAtMs = (deliveries: Delivery[], restaurant?: Restaurant) =>
  deliveries.reduce((latest, delivery) => {
    if (restaurant && !matchesRestaurant(delivery, restaurant)) return latest;
    return Math.max(latest, getDeliveryCreatedAtMs(delivery));
  }, 0);

const getRecentRestaurantDeliveryCount = (
  deliveries: Delivery[],
  restaurant: Restaurant,
  nowMs: number
) =>
  deliveries.filter((delivery) => {
    if (!matchesRestaurant(delivery, restaurant)) return false;
    const createdAtMs = getDeliveryCreatedAtMs(delivery);
    return createdAtMs > 0 && nowMs - createdAtMs < 60 * 60 * 1000;
  }).length;

const getStableRestaurantDelayMs = (restaurant: Restaurant) => {
  const seed = `${restaurant.id}:${restaurant.name}`;
  const hash = Array.from(seed).reduce((acc, char) => (
    (acc * 31 + char.charCodeAt(0)) % INITIAL_RESTAURANT_STAGGER_RANGE_MS
  ), 0);
  return INITIAL_RESTAURANT_STAGGER_MIN_MS + hash;
};

const createAssignCourierPayload = (
  deliveryId: string,
  courierId: string,
  pickupBatchId?: string
) => ({
  deliveryId,
  courierId,
  pickupBatchId,
  ...getStoredCourierAssignPosition(courierId),
});

const normalizeStoredRoutePlans = (value: unknown): Record<string, string[]> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, stopIds]) => Array.isArray(stopIds))
      .map(([courierId, stopIds]) => [
        courierId,
        (stopIds as unknown[]).filter((stopId): stopId is string => typeof stopId === 'string'),
      ])
  );
};

const readStoredRouteStopOrders = (): Record<string, string[]> => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY);
    if (!raw) return {};
    return normalizeStoredRoutePlans(JSON.parse(raw));
  } catch {
    return {};
  }
};

const loadInitialState = (baseState: DeliveryState): DeliveryState => {
  if (typeof window === 'undefined') return baseState;

  try {
    ensureStorageEpoch(window.localStorage);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return baseState;

    const parsed = reviveDates(JSON.parse(raw)) as Partial<DeliveryState>;

    const restaurants = mergeSeededRestaurants(
      (parsed.restaurants as Restaurant[] | undefined) ?? baseState.restaurants
    );
    const couriers = normalizeCouriers(
      (parsed.couriers as Courier[] | undefined) ?? baseState.couriers
    );
    const courierRoutePlans =
      'courierRoutePlans' in parsed
        ? normalizeStoredRoutePlans(parsed.courierRoutePlans)
        : readStoredRouteStopOrders();

    const loadedState = {
      ...baseState,
      ...parsed,
      couriers,
      restaurants,
      courierRoutePlans,
      deliveries: ((parsed.deliveries as Delivery[] | undefined) ?? baseState.deliveries).map(delivery =>
        normalizeDeliveryPreparationTime(delivery, restaurants)
      ),
      stats: {
        ...baseState.stats,
        ...parsed.stats,
      },
    };

    return sanitizeLoadedDeliveryState(loadedState);
  } catch (error) {
    console.warn('Failed to load persisted delivery state', error);
    return baseState;
  }
};

// Context Type
// Provider
export const DeliveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, rawDispatch] = useReducer(
    deliveryReducer,
    initialState,
    () => loadInitialState(createInitialDeliveryState())
  );
  const stateRef = useRef(state);
  const isResettingRef = useRef(false);
  const storageEpochRef = useRef<string | null>(
    typeof window === 'undefined' ? null : ensureStorageEpoch(window.localStorage)
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== STATE_EPOCH_KEY || !event.newValue) return;
      if (storageEpochRef.current === event.newValue) return;

      isResettingRef.current = true;
      window.location.reload();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const dispatch = useCallback((action: DeliveryAction) => {
    rawDispatch(action);

    if (action.type === 'ADD_ACTIVITY_LOG' || action.type === 'CLEAR_ACTIVITY_LOGS' || action.type === 'RESET_SYSTEM') {
      return;
    }

    const logEntry = createActivityLogEntry(action, stateRef.current);
    if (logEntry) {
      rawDispatch({ type: 'ADD_ACTIVITY_LOG', payload: logEntry });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isResettingRef.current) return;

    try {
      const currentEpoch = ensureStorageEpoch(window.localStorage);
      if (storageEpochRef.current && currentEpoch !== storageEpochRef.current) {
        isResettingRef.current = true;
        window.location.reload();
        return;
      }

      storageEpochRef.current = currentEpoch;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist delivery state', error);
    }
  }, [state]);
  
  // Keep the initial restaurant activation state as seeded.











  // Delivery counter keeps generated demo IDs unique.
  const deliveryCounter = useRef(0);
  const courierPositionsRef = useRef<Map<string, MapPosition>>(new Map());
  const courierPositionTimestampsRef = useRef<Map<string, number>>(new Map());
  const simulationOpenedAtRef = useRef<number | null>(null);

  // Reuse the seeded restaurant id when the name matches.
  const getRestaurantId = (restaurantName: string): string => {

    const restaurant = RESTAURANTS_DATA.find(r => r.name === restaurantName);
    if (restaurant) {
      return restaurant.id;
    }
    
    // Fallback hash for unexpected restaurant names.
    let hash = 0;
    for (let i = 0; i < restaurantName.length; i++) {
      const char = restaurantName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `r${Math.abs(hash % 100) + 1}`;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const rawPositions = window.localStorage.getItem(LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY);
      if (rawPositions) {
        const parsed = JSON.parse(rawPositions) as Record<string, { lat?: number; lng?: number }>;
        const next = new Map<string, MapPosition>();

        Object.entries(parsed).forEach(([courierId, position]) => {
          if (typeof position?.lat === 'number' && typeof position?.lng === 'number') {
            next.set(courierId, { lat: position.lat, lng: position.lng });
          }
        });

        courierPositionsRef.current = next;
      }

      const rawTimestamps = window.localStorage.getItem(LIVE_MANAGER_COURIER_POSITIONS_TS_STORAGE_KEY);
      if (rawTimestamps) {
        const parsed = JSON.parse(rawTimestamps) as Record<string, number>;
        const next = new Map<string, number>();

        Object.entries(parsed).forEach(([courierId, timestamp]) => {
          if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
            next.set(courierId, timestamp);
          }
        });

        courierPositionTimestampsRef.current = next;
      }
    } catch {
      courierPositionsRef.current = new Map();
      courierPositionTimestampsRef.current = new Map();
    }
  }, []);

  useEffect(() => {
    let changed = false;

    state.couriers.forEach((courier, index) => {
      if (courierPositionsRef.current.has(courier.id)) return;
      courierPositionsRef.current.set(
        courier.id,
        getInitialCourierPosition(courier, stateRef.current.deliveries, index)
      );
      courierPositionTimestampsRef.current.set(courier.id, Date.now());
      changed = true;
    });

    Array.from(courierPositionsRef.current.keys()).forEach((courierId) => {
      if (state.couriers.some((courier) => courier.id === courierId)) return;
      courierPositionsRef.current.delete(courierId);
      courierPositionTimestampsRef.current.delete(courierId);
      changed = true;
    });

    if (!changed || typeof window === 'undefined') return;

    window.localStorage.setItem(
      LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(courierPositionsRef.current.entries()))
    );
    window.localStorage.setItem(
      LIVE_MANAGER_COURIER_POSITIONS_TS_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(courierPositionTimestampsRef.current.entries()))
    );
  }, [state.couriers]);

  // Real delivery addresses with GPS coordinates around central Israel.


  const REAL_ADDRESSES = [
    { address: 'דיזנגוף 22, תל אביב', city: 'תל אביב', street: 'דיזנגוף', building: '22', lat: 32.0700, lng: 34.7735, area: 'מרכז תל אביב' },
    { address: 'דיזנגוף 55, תל אביב', city: 'תל אביב', street: 'דיזנגוף', building: '55', lat: 32.0725, lng: 34.7733, area: 'מרכז תל אביב' },
    { address: 'דיזנגוף 99, תל אביב', city: 'תל אביב', street: 'דיזנגוף', building: '99', lat: 32.0752, lng: 34.7731, area: 'מרכז תל אביב' },
    { address: 'שדרות רוטשילד 12, תל אביב', city: 'תל אביב', street: 'שדרות רוטשילד', building: '12', lat: 32.0617, lng: 34.7723, area: 'מרכז תל אביב' },
    { address: 'שדרות רוטשילד 50, תל אביב', city: 'תל אביב', street: 'שדרות רוטשילד', building: '50', lat: 32.0635, lng: 34.7753, area: 'מרכז תל אביב' },
    { address: 'בן יהודה 44, תל אביב', city: 'תל אביב', street: 'בן יהודה', building: '44', lat: 32.0718, lng: 34.7669, area: 'מרכז תל אביב' },
    { address: 'בן יהודה 105, תל אביב', city: 'תל אביב', street: 'בן יהודה', building: '105', lat: 32.0765, lng: 34.7662, area: 'מרכז תל אביב' },
    { address: 'אלנבי 20, תל אביב', city: 'תל אביב', street: 'אלנבי', building: '20', lat: 32.0660, lng: 34.7726, area: 'מרכז תל אביב' },
    { address: 'הירקון 88, תל אביב', city: 'תל אביב', street: 'הירקון', building: '88', lat: 32.0760, lng: 34.7643, area: 'חוף תל אביב' },
    { address: 'אבן גבירול 65, תל אביב', city: 'תל אביב', street: 'אבן גבירול', building: '65', lat: 32.0775, lng: 34.7838, area: 'מרכז תל אביב' },
    { address: 'פלורנטין 22, תל אביב', city: 'תל אביב', street: 'פלורנטין', building: '22', lat: 32.0646, lng: 34.7742, area: 'פלורנטין' },
    { address: 'נחלת בנימין 35, תל אביב', city: 'תל אביב', street: 'נחלת בנימין', building: '35', lat: 32.0649, lng: 34.7698, area: 'נחלת בנימין' },
    { address: 'נמל תל אביב 18, תל אביב', city: 'תל אביב', street: 'נמל תל אביב', building: '18', lat: 32.0864, lng: 34.7781, area: 'נמל תל אביב' },
    { address: 'ביאליק 14, רמת גן', city: 'רמת גן', street: 'ביאליק', building: '14', lat: 32.0836, lng: 34.7882, area: 'מרכז רמת גן' },
    { address: 'ז׳בוטינסקי 38, רמת גן', city: 'רמת גן', street: 'ז׳בוטינסקי', building: '38', lat: 32.0834, lng: 34.8096, area: 'מרכז רמת גן' },
    { address: 'הרא״ה 42, רמת גן', city: 'רמת גן', street: 'הרא״ה', building: '42', lat: 32.0783, lng: 34.8088, area: 'מרכז רמת גן' },
    { address: 'קריניצי 22, רמת גן', city: 'רמת גן', street: 'קריניצי', building: '22', lat: 32.0808, lng: 34.8050, area: 'מרכז רמת גן' },
    { address: 'ויצמן 25, גבעתיים', city: 'גבעתיים', street: 'ויצמן', building: '25', lat: 32.0700, lng: 34.8135, area: 'מרכז גבעתיים' },
    { address: 'שדרות בן גוריון 12, גבעתיים', city: 'גבעתיים', street: 'שדרות בן גוריון', building: '12', lat: 32.0713, lng: 34.8143, area: 'מרכז גבעתיים' },
    { address: 'דרך השלום 20, בני ברק', city: 'בני ברק', street: 'דרך השלום', building: '20', lat: 32.0842, lng: 34.8335, area: 'מרכז בני ברק' },
    { address: 'רבי עקיבא 10, בני ברק', city: 'בני ברק', street: 'רבי עקיבא', building: '10', lat: 32.0846, lng: 34.8345, area: 'מרכז בני ברק' },
    { address: 'שדרות ירושלים 8, יפו', city: 'יפו', street: 'שדרות ירושלים', building: '8', lat: 32.0118, lng: 34.7772, area: 'יפו' },
    { address: 'יפת 14, יפו', city: 'יפו', street: 'יפת', building: '14', lat: 32.0175, lng: 34.7783, area: 'יפו' },
    { address: 'העלייה 12, בת ים', city: 'בת ים', street: 'העלייה', building: '12', lat: 32.0258, lng: 34.7523, area: 'בת ים' },
    { address: 'בלפור 18, בת ים', city: 'בת ים', street: 'בלפור', building: '18', lat: 32.0230, lng: 34.7535, area: 'בת ים' },
  ];

  const toRadians = (value: number) => (value * Math.PI) / 180;

  const getCoordinateDistanceKm = (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ) => {
    const earthRadiusKm = 6371;
    const latDiff = toRadians(to.lat - from.lat);
    const lngDiff = toRadians(to.lng - from.lng);
    const fromLat = toRadians(from.lat);
    const toLat = toRadians(to.lat);

    const a =
      Math.sin(latDiff / 2) ** 2 +
      Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDiff / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const pickCustomerAddressForRestaurant = (
    restaurant: Restaurant,
    pickup: { lat: number; lng: number }
  ) => {
    const maxRadiusKm = Math.min(
      5.5,
      Math.max(2.4, (restaurant.maxDeliveryTime ?? DEFAULT_RESTAURANT_MAX_DELIVERY_TIME) / 8)
    );

    const rankedAddresses = REAL_ADDRESSES
      .map((address) => ({
        address,
        distanceKm: getCoordinateDistanceKm(pickup, { lat: address.lat, lng: address.lng }),
      }))
      .sort((left, right) => left.distanceKm - right.distanceKm);

    const sameCityAddresses = rankedAddresses.filter((item) => item.address.city === restaurant.city);
    const nearbyAddresses = rankedAddresses.filter((item) => item.distanceKm <= maxRadiusKm);
    const candidatePool = sameCityAddresses.length > 0
      ? sameCityAddresses.slice(0, 8)
      : nearbyAddresses.length > 0
        ? nearbyAddresses
        : rankedAddresses.slice(0, 8);

    return candidatePool[Math.floor(Math.random() * candidatePool.length)].address;
  };

  const generateDelivery = useCallback((restaurant: Restaurant, generatedAt: Date = new Date()): Delivery | null => {
    deliveryCounter.current += 1;
    const id = `D${generatedAt.getTime()}-${deliveryCounter.current}-${Math.random().toString(36).substr(2, 9)}`;
    const orderNumber = `#${Math.floor(10000 + Math.random() * 90000)}`;
    const apiShortOrderId = `${Math.floor(100000 + Math.random() * 900000)}`;
    
    const customerName = ISRAELI_NAMES[Math.floor(Math.random() * ISRAELI_NAMES.length)];
    const price = Math.floor(15 + Math.random() * 35); // 15-50 ILS

    // Reuse restaurant coordinates when available.
    const restaurantName = restaurant.name;
    const pickupLat = restaurant.lat || 32.0853;
    const pickupLng = restaurant.lng || 34.7818;
    const restStreet = restaurant.street ?? restaurantName;
    const restCity = restaurant.city ?? 'תל אביב';
    const restAddress = restaurant.address ?? `${restStreet}, ${restCity}`;
    const customerAddr = pickCustomerAddressForRestaurant(restaurant, { lat: pickupLat, lng: pickupLng });
    const area = customerAddr.area;
    const directDistanceKm = getCoordinateDistanceKm(
      { lat: pickupLat, lng: pickupLng },
      { lat: customerAddr.lat, lng: customerAddr.lng }
    );
    const deliveryDistanceKm = Math.max(0.8, Math.round(directDistanceKm * 1.28 * 10) / 10);
    const etaAfterPickupMinutes = Math.max(8, Math.round((deliveryDistanceKm / 18) * 60) + 3);

    const now = generatedAt;
    const restPrice = Math.floor(price * 0.7); // 70% of customer price
    const runnerPrice = Math.floor(price * 0.3); // 30% to courier
    const cookTime = restaurant.defaultPreparationTime ?? DEFAULT_RESTAURANT_PREPARATION_TIME;
    const maxDeliveryTime = restaurant.maxDeliveryTime ?? DEFAULT_RESTAURANT_MAX_DELIVERY_TIME;

    return {
      // Core entity


      id,
      api_short_order_id: apiShortOrderId,
      api_str_order_id: `ORDER-${generatedAt.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      priority: Math.floor(Math.random() * 3), // 0-2
      is_api: Math.random() > 0.5,
      is_started: false,
      is_approved: Math.random() > 0.3,
      is_requires_approval: Math.random() > 0.7,
      close_order: false,
      comment: Math.random() > 0.7 ? 'הערת מערכת' : undefined,
      pack_num: `${1 + Math.floor(Math.random() * 3)}`,
      
      // Origin / spawner


      rest_id: restaurant.id,
      branch_id: Math.random() > 0.7 ? `BR${Math.floor(1 + Math.random() * 5)}` : undefined,
      rest_name: restaurantName,
      rest_city: restCity,
      rest_street: restStreet,
      rest_building: restaurant?.street?.split(' ').pop() ?? '',
      pickup_latitude: pickupLat,
      pickup_longitude: pickupLng,
      cook_type: ['רגיל', 'מהיר', 'איטי'][Math.floor(Math.random() * 3)],
      cook_time: cookTime,
      origin_cook_time: cookTime,
      order_ready: false,
      reported_order_is_ready: false,
      rest_approve: Math.random() > 0.4,
      rest_waits_for_cook_time: Math.random() > 0.5,
      rest_last_eta: null,
      rest_approved_eta: null,
      is_drinks_exist: Math.random() > 0.6,
      is_sauces_exist: Math.random() > 0.5,
      
      // Target / client


      client_id: `cu${Math.floor(1 + Math.random() * 30)}`,
      client_name: customerName,
      client_phone: `050-${Math.floor(1000000 + Math.random() * 9000000)}`,
      client_full_address: customerAddr.address,
      client_city: customerAddr.city,
      client_street: customerAddr.street,
      client_building: customerAddr.building,
      client_entry: Math.random() > 0.6 ? `${String.fromCharCode(65 + Math.floor(Math.random() * 4))}` : undefined,
      client_floor: Math.random() > 0.5 ? `${Math.floor(Math.random() * 10)}` : undefined,
      client_apartment: Math.random() > 0.5 ? `${Math.floor(1 + Math.random() * 20)}` : undefined,
      zipcode: `${Math.floor(1000000 + Math.random() * 9000000)}`,
      dropoff_latitude: customerAddr.lat,
      dropoff_longitude: customerAddr.lng,
      client_comment: Math.random() > 0.7 ? 'אנא לצלצל כשמגיעים' : undefined,
      wrong_address: Math.random() > 0.95,
      client_agree_to_place: Math.random() > 0.8,
      signature_url: undefined,
      
      // Actor / runner


      runner_id: null,
      pending_runner_id: undefined,
      shift_runner_id: undefined,
      arrived_at_rest_runner_id: undefined,
      vehicle_type: ['אופניים', 'קורקינט', 'אופנוע', 'רכב'][Math.floor(Math.random() * 4)],
      algo_runner: Math.random() > 0.5,
      coupled_by: undefined,
      runner_at_assigning_latitude: undefined,
      runner_at_assigning_longitude: undefined,
      is_orbit_start: Math.random() > 0.7,
      area,
      area_id: `area${Math.floor(1 + Math.random() * 5)}`,
      delivery_area_id: `da${Math.floor(1 + Math.random() * 10)}`,
      main_polygon_name: ['מרכז', 'צפון', 'דרום', 'מזרח', 'מערב'][Math.floor(Math.random() * 5)],
      
      // Timeline / events


      creation_time: now,
      delivery_date: new Date(now.getTime() + (20 + Math.random() * 20) * 60000),
      push_time: Math.random() > 0.5 ? new Date(now.getTime() + Math.random() * 60000) : undefined,
      coupled_time: null,
      started_pickup: null,
      arrived_at_rest: null,
      took_it_time: null,
      started_dropoff: null,
      arrived_at_client: null,
      delivered_time: null,
      
      // ========================================
      // 6. ðŸ“Š Mechanics & SLA
      // ========================================
      should_delivered_time: null,
      max_time_to_deliver: maxDeliveryTime,
      min_time_to_suplly: Math.floor(15 + Math.random() * 10),
      max_time_to_suplly: Math.floor(30 + Math.random() * 15),
      minutes_late: 0,
      pickup_deviation: 0,
      dropoff_deviation: 0,
      delay_reason: undefined,
      delay_duration: 0,
      delivery_distance: deliveryDistanceKm,
      duration_to_client: etaAfterPickupMinutes,
      eta_after_pickup: etaAfterPickupMinutes,
      suplly_status: 'ממתין',
      
      // ========================================
      // 7. ðŸ’° Economy / Finances
      // ========================================
      rest_price: restPrice,
      rest_polygon_price: Math.random() > 0.5 ? restPrice : undefined,
      runner_price: runnerPrice,
      runner_tip: Math.random() > 0.7 ? Math.floor(5 + Math.random() * 15) : undefined,
      sum_cash: price,
      is_cash: Math.random() > 0.5,
      
      // ========================================
      // 8. ðŸ“¡ Meta & Feedback
      // ========================================
      api_type: Math.random() > 0.5 ? 'REST' : 'WEBHOOK',
      api_source: ['Website', 'App', 'Phone', 'Wolt', 'TenBis'][Math.floor(Math.random() * 5)],
      source_platform: ['iOS', 'Android', 'Web', 'Desktop'][Math.floor(Math.random() * 4)],
      website_id: Math.random() > 0.6 ? `WEB${Math.floor(100 + Math.random() * 900)}` : undefined,
      comax_id: Math.random() > 0.7 ? `CMX${Math.floor(1000 + Math.random() * 9000)}` : undefined,
      parent_mishloha_order_id: undefined,
      associated_api_order_id: undefined,
      associated_short_api_order_id: undefined,
      sms_status: ['sent', 'pending', 'failed'][Math.floor(Math.random() * 3)],
      sms_code: `${Math.floor(1000 + Math.random() * 9000)}`,
      tracker_viewed: Math.random() > 0.5,
      runner_took_comment: undefined,
      runner_delivered_comment: undefined,
      client_runner_rank: undefined,
      client_remark: undefined,
      feedback_status: undefined,
      feedback_first_answer: undefined,
      feedback_second_answer: undefined,
      feedback_third_answer: undefined,
      
      // ========================================
      // Legacy/Compatibility Fields
      // ========================================
      orderNumber,
      restaurantId: getRestaurantId(restaurantName),
      restaurantName,
      restaurantAddress: restAddress,
      restaurantCity: restCity,
      restaurantStreet: restStreet,
      branchName: Math.random() > 0.7 ? `סניף ${Math.floor(1 + Math.random() * 5)}` : undefined,
      customerName,
      customerPhone: `050-${Math.floor(1000000 + Math.random() * 9000000)}`,
      address: customerAddr.address,
      customerCity: customerAddr.city,
      customerStreet: customerAddr.street,
      customerBuilding: customerAddr.building,
      price,
      restaurantPrice: restPrice,
      commissionAmount: price - restPrice,
      courierPayment: runnerPrice,
      courierId: null,
      courierName: undefined,
      courierEmploymentType: undefined,
      courierRating: undefined,
      createdAt: now,
      assignedAt: null,
      deliveryCreditConsumedAt: null,
      offerExpiresAt: null,
      expiredAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      arrivedAtRestaurantAt: null,
      arrivedAtCustomerAt: null,
      estimatedTime: Math.max(15, cookTime + etaAfterPickupMinutes),
      estimatedArrivalAtRestaurant: null,
      estimatedArrivalAtCustomer: null,
      orderReadyTime: null,
      reportedOrderIsReady: false,
      preparationTime: cookTime,
      maxDeliveryTime: maxDeliveryTime,
      cancelledAt: null,
      cancelledAfterPickup: false,
      orderPriority: Math.floor(Math.random() * 3),
      customerRating: undefined,
      customerFeedback: undefined,
      customerFeedbackQuestion1: undefined,
      customerFeedbackQuestion2: undefined,
      customerFeedbackQuestion3: undefined,
      deliveryNotes: Math.random() > 0.7 ? 'הערת מערכת' : undefined,
      orderNotes: Math.random() > 0.7 ? 'אנא לצלצל כשמגיעים' : undefined,
    };
  }, []);

  // A single scheduler keeps the demo realistic and prevents HMR/reload bursts.
  useEffect(() => {
    if (!state.isSystemOpen) {
      simulationOpenedAtRef.current = null;
      return;
    }

    if (simulationOpenedAtRef.current === null) {
      simulationOpenedAtRef.current = Date.now();
    }

    const spawnEligibleDelivery = (now: Date = new Date()) => {
      const stateNow = stateRef.current;
      if (!stateNow.isSystemOpen) return;

      const speed = Math.max(stateNow.timeMultiplier || 1, 0.1);
      const nowMs = now.getTime();
      const activeDeliveryCount = stateNow.deliveries.filter(isLiveActiveDelivery).length;
      const activeDeliveryLimit = getActiveSimulatedDeliveryLimit(stateNow);
      const activeCapacity = activeDeliveryLimit - activeDeliveryCount;
      if (activeCapacity <= 0) return;

      const lastGlobalDeliveryMs = getLatestDeliveryCreatedAtMs(stateNow.deliveries);
      if (lastGlobalDeliveryMs && nowMs - lastGlobalDeliveryMs < MIN_GLOBAL_DELIVERY_GAP_MS / speed) {
        return;
      }

      const openedAtMs = simulationOpenedAtRef.current ?? nowMs;
      const activeRestaurants = stateNow.restaurants.filter((restaurant) => restaurant.isActive);
      const eligibleRestaurants = activeRestaurants
        .map((restaurant) => {
          const latestRestaurantDeliveryMs = getLatestDeliveryCreatedAtMs(stateNow.deliveries, restaurant);
          const intervalMs = Math.max(1, restaurant.deliveryInterval || 10) * 60 * 1000 / speed;
          const initialDelayMs = getStableRestaurantDelayMs(restaurant) / speed;
          const dueAt = latestRestaurantDeliveryMs
            ? latestRestaurantDeliveryMs + intervalMs
            : openedAtMs + initialDelayMs;

          return {
            restaurant,
            dueAt,
            recentCount: getRecentRestaurantDeliveryCount(stateNow.deliveries, restaurant, nowMs),
          };
        })
        .filter(({ dueAt, recentCount, restaurant }) =>
          dueAt <= nowMs && recentCount < restaurant.maxDeliveriesPerHour
        )
        .sort((left, right) => (
          left.dueAt - right.dueAt ||
          left.recentCount - right.recentCount ||
          left.restaurant.name.localeCompare(right.restaurant.name, 'he')
        ));

      const nextRestaurant = eligibleRestaurants[0]?.restaurant;
      if (!nextRestaurant) return;

      const deliveryCount = Math.min(
        Math.max(1, nextRestaurant.deliveryRate || 1),
        activeCapacity
      );

      for (let i = 0; i < deliveryCount; i++) {
        const newDelivery = generateDelivery(nextRestaurant, now);
        if (newDelivery) {
          rawDispatch({ type: 'ADD_DELIVERY', payload: newDelivery });
        }
      }
    };

    const handleSchedulerWake = () => {
      spawnEligibleDelivery();
    };

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        handleSchedulerWake();
      }
    };

    const timerSpeed = Math.max(state.timeMultiplier || 1, 0.1);
    const initialTimer = setTimeout(spawnEligibleDelivery, Math.max(1000, 1500 / timerSpeed));
    const interval = setInterval(
      spawnEligibleDelivery,
      Math.max(1000, SIMULATION_TICK_MS / timerSpeed)
    );

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleSchedulerWake);
      window.addEventListener('pageshow', handleSchedulerWake);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);

      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleSchedulerWake);
        window.removeEventListener('pageshow', handleSchedulerWake);
      }

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [state.isSystemOpen, state.timeMultiplier, generateDelivery, rawDispatch]);

  useEffect(() => {
    const expireOffers = () => {
      rawDispatch({ type: 'EXPIRE_DELIVERY_OFFERS', payload: new Date() });
    };

    expireOffers();
    const intervalId = window.setInterval(expireOffers, 10_000);
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined' || document.hidden) return;
      expireOffers();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      window.clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [rawDispatch]);

  // Auto-assign pending deliveries while the feature is enabled.
  useEffect(() => {
    if (!state.autoAssignEnabled) return;

    const runAutoAssign = () => {
      const stateNow = stateRef.current;
      const pendingDelivery = stateNow.deliveries.find((delivery) => delivery.status === 'pending');
      const availableCourier = getAutoAssignableCourier(stateNow.couriers);

      if (
        pendingDelivery &&
        availableCourier &&
        canAssignDeliveryWithCredits(stateNow, pendingDelivery)
      ) {
        rawDispatch({
          type: 'ASSIGN_COURIER',
          payload: createAssignCourierPayload(pendingDelivery.id, availableCourier.id),
        });
      }
    };

    const handleAutoAssignWake = () => {
      runAutoAssign();
    };

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        handleAutoAssignWake();
      }
    };

    const interval = setInterval(runAutoAssign, state.isSystemOpen ? 500 : 3000);

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleAutoAssignWake);
      window.addEventListener('pageshow', handleAutoAssignWake);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);

      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleAutoAssignWake);
        window.removeEventListener('pageshow', handleAutoAssignWake);
      }

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [state.autoAssignEnabled, state.isSystemOpen]);

  // Global progress engine: keeps deliveries moving without the LIVE page open.
  useEffect(() => {
    const persistCourierPositions = () => {
      if (typeof window === 'undefined') return;

      window.localStorage.setItem(
        LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY,
        JSON.stringify(Object.fromEntries(courierPositionsRef.current.entries()))
      );
      window.localStorage.setItem(
        LIVE_MANAGER_COURIER_POSITIONS_TS_STORAGE_KEY,
        JSON.stringify(Object.fromEntries(courierPositionTimestampsRef.current.entries()))
      );
    };

    const runProgressTick = () => {
      const tick = advanceLiveSimulation({
        state: stateRef.current,
        currentPositions: courierPositionsRef.current,
        currentTimestamps: courierPositionTimestampsRef.current,
        routeStopOrders: stateRef.current.courierRoutePlans,
      });

      if (tick.positionChanged) {
        courierPositionsRef.current = tick.courierPositions;
        courierPositionTimestampsRef.current = tick.courierPositionTimestamps;
        persistCourierPositions();
      }

      tick.phaseUpdates.forEach((updates, deliveryId) => {
        rawDispatch({ type: 'UPDATE_DELIVERY', payload: { deliveryId, updates } });
      });

      tick.statusUpdates.forEach(({ type, deliveryIds }) => {
        const now = new Date();

        deliveryIds.forEach((id) => {
          if (type === 'complete') {
            rawDispatch({ type: 'COMPLETE_DELIVERY', payload: id });
          } else if (type === 'arrived_pickup') {
            rawDispatch({
              type: 'UPDATE_DELIVERY',
              payload: { deliveryId: id, updates: { arrivedAtRestaurantAt: now, arrived_at_rest: now } },
            });
          } else if (type === 'delivering') {
            rawDispatch({
              type: 'UPDATE_DELIVERY',
              payload: {
                deliveryId: id,
                updates: {
                  status: 'delivering',
                  arrivedAtRestaurantAt: now,
                  arrived_at_rest: now,
                  pickedUpAt: now,
                  took_it_time: now,
                  started_pickup: now,
                },
              },
            });
          }
        });
      });
    };

    const handleProgressWake = () => {
      runProgressTick();
    };

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        handleProgressWake();
      }
    };

    const interval = setInterval(runProgressTick, 1000);

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleProgressWake);
      window.addEventListener('pageshow', handleProgressWake);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);

      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleProgressWake);
        window.removeEventListener('pageshow', handleProgressWake);
      }

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  const toggleSystem = () => {
    dispatch({ type: 'TOGGLE_SYSTEM' });
  };

  const assignCourier = (deliveryId: string, courierId: string, pickupBatchId?: string) => {
    const stateNow = stateRef.current;
    const delivery = stateNow.deliveries.find((item) => item.id === deliveryId);
    const courier = stateNow.couriers.find((item) => item.id === courierId);
    if (
      !delivery ||
      !courier ||
      delivery.status === 'delivered' ||
      delivery.status === 'cancelled' ||
      delivery.status === 'expired' ||
      isDeliveryOfferExpired(delivery, new Date()) ||
      !canCourierAcceptDelivery(courier, deliveryId) ||
      !canAssignDeliveryWithCredits(stateNow, delivery)
    ) {
      return false;
    }

    dispatch({
      type: 'ASSIGN_COURIER',
      payload: createAssignCourierPayload(deliveryId, courierId, pickupBatchId),
    });
    return true;
  };

  const cancelDelivery = (deliveryId: string) => {
    dispatch({ type: 'CANCEL_DELIVERY', payload: deliveryId });
  };

  const unassignCourier = (deliveryId: string) => {
    dispatch({ type: 'UNASSIGN_COURIER', payload: deliveryId });
  };

  const updateDelivery = (deliveryId: string, updates: Partial<Delivery>) => {
    dispatch({ type: 'UPDATE_DELIVERY', payload: { deliveryId, updates } });
  };

  const resetSystem = () => {
    const resetState = createInitialDeliveryState();
    isResettingRef.current = true;
    deliveryCounter.current = 0;
    courierPositionsRef.current = new Map();
    courierPositionTimestampsRef.current = new Map();
    simulationOpenedAtRef.current = null;

    if (typeof window !== 'undefined') {
      try {
        const nextEpoch = createStorageEpoch();
        clearSystemResetStorage(window.localStorage);
        window.localStorage.setItem(STATE_EPOCH_KEY, nextEpoch);
        storageEpochRef.current = nextEpoch;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resetState));
      } catch (error) {
        console.warn('Failed to clear persisted delivery state', error);
      }
    }

    rawDispatch({ type: 'RESET_SYSTEM', payload: resetState });

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const addCourier = (courier: Courier) => {
    dispatch({ type: 'ADD_COURIER', payload: courier });
  };

  const removeCourier = (courierId: string) => {
    dispatch({ type: 'REMOVE_COURIER', payload: courierId });
  };

  const addDeliveryBalance = (amount: number) => {
    dispatch({ type: 'ADD_DELIVERY_BALANCE', payload: amount });
  };

  return (
    <DeliveryContext.Provider
      value={{
        state,
        dispatch,
        toggleSystem,
        assignCourier,
        cancelDelivery,
        unassignCourier,
        updateDelivery,
        resetSystem,
        addCourier,
        removeCourier,
        addDeliveryBalance,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
};
