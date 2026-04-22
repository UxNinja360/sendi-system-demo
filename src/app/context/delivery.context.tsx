import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import {
  ActivityLogEntry,
  DeliveryState,
  DeliveryAction,
  Delivery,
  Courier,
  Restaurant,
} from '../types/delivery.types';
import { deliveryReducer } from './delivery.reducer';
import {
  buildDefaultRouteStopIds,
  getDeliveryPickupBatchKey,
} from '../utils/pickup-batches';
import {
  DEFAULT_RESTAURANT_MAX_DELIVERY_TIME,
  DEFAULT_RESTAURANT_PREPARATION_TIME,
  ISRAELI_NAMES,
  RESTAURANTS_DATA,
  initialState,
  mergeSeededRestaurants,
  normalizeCouriers,
  normalizeDeliveryPreparationTime,
} from './delivery-bootstrap';

const STORAGE_KEY = 'sendi-delivery-state';
const LIVE_MANAGER_ON_SHIFT_ONLY_STORAGE_KEY = 'sendi-live-manager-on-shift-only';
const LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY = 'sendi-live-manager-route-stop-orders';
const LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY = 'sendi-live-manager-courier-positions';
const LIVE_MANAGER_COURIER_POSITIONS_TS_STORAGE_KEY = 'sendi-live-manager-courier-positions-ts';
const COURIER_MOVE_SPEED = 0.00012;

type MapPosition = {
  lat: number;
  lng: number;
};

const COURIER_FALLBACK_POSITIONS: MapPosition[] = [
  { lat: 32.0700, lng: 34.7735 }, { lat: 32.0752, lng: 34.7731 },
  { lat: 32.0800, lng: 34.7728 }, { lat: 32.0626, lng: 34.7738 },
  { lat: 32.0643, lng: 34.7769 }, { lat: 32.0718, lng: 34.7669 },
  { lat: 32.0765, lng: 34.7662 }, { lat: 32.0653, lng: 34.7755 },
  { lat: 32.0760, lng: 34.7643 }, { lat: 32.0820, lng: 34.7836 },
  { lat: 32.0646, lng: 34.7742 }, { lat: 32.0649, lng: 34.7698 },
  { lat: 32.0864, lng: 34.7781 }, { lat: 32.0562, lng: 34.7718 },
  { lat: 32.0830, lng: 34.7900 }, { lat: 32.0899, lng: 34.7793 },
  { lat: 32.0834, lng: 34.8096 }, { lat: 32.0783, lng: 34.8088 },
  { lat: 32.0808, lng: 34.8050 }, { lat: 32.0700, lng: 34.8135 },
  { lat: 32.0533, lng: 34.7583 }, { lat: 32.0175, lng: 34.7783 },
  { lat: 32.0230, lng: 34.7535 }, { lat: 32.0968, lng: 34.7730 },
];

const hasValidPosition = (value: Partial<MapPosition> | null | undefined): value is MapPosition =>
  typeof value?.lat === 'number' &&
  Number.isFinite(value.lat) &&
  typeof value?.lng === 'number' &&
  Number.isFinite(value.lng);

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (from: MapPosition, to: MapPosition) => {
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

const estimateTravelMinutes = (from: MapPosition | null, to: MapPosition | null) => {
  if (!from || !to) return 8;
  const distanceKm = getDistanceKm(from, to);
  const minutes = (distanceKm / 18) * 60;
  return Math.max(4, Math.round(minutes) + 2);
};

const getPickupReadyAt = (deliveries: Delivery[]) => {
  const readyTimes = deliveries
    .map((delivery) => {
      if (delivery.pickedUpAt) return null;
      if (delivery.orderReadyTime) return new Date(delivery.orderReadyTime);
      if (typeof delivery.preparationTime === 'number') {
        return new Date(new Date(delivery.createdAt).getTime() + delivery.preparationTime * 60000);
      }
      return null;
    })
    .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()));

  if (readyTimes.length === 0) return null;
  return new Date(Math.max(...readyTimes.map((value) => value.getTime())));
};

const normalizeRouteStopOrder = (savedOrder: string[] | undefined, defaultStops: string[]) => {
  if (!savedOrder || savedOrder.length === 0) {
    return defaultStops;
  }

  const validStopIds = new Set(defaultStops);
  const normalizedSavedStops = savedOrder.filter((stopId, index) => (
    validStopIds.has(stopId) && savedOrder.indexOf(stopId) === index
  ));
  const missingStops = defaultStops.filter((stopId) => !normalizedSavedStops.includes(stopId));

  return [...normalizedSavedStops, ...missingStops];
};

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

const loadInitialState = (baseState: DeliveryState): DeliveryState => {
  if (typeof window === 'undefined') return baseState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return baseState;

    const parsed = reviveDates(JSON.parse(raw)) as Partial<DeliveryState>;

    const restaurants = mergeSeededRestaurants(
      (parsed.restaurants as Restaurant[] | undefined) ?? baseState.restaurants
    );
    const couriers = normalizeCouriers(
      (parsed.couriers as Courier[] | undefined) ?? baseState.couriers
    );

    return {
      ...baseState,
      ...parsed,
      couriers,
      restaurants,
      deliveries: ((parsed.deliveries as Delivery[] | undefined) ?? baseState.deliveries).map(delivery =>
        normalizeDeliveryPreparationTime(delivery, restaurants)
      ),
      stats: {
        ...baseState.stats,
        ...parsed.stats,
      },
    };
  } catch (error) {
    console.warn('Failed to load persisted delivery state', error);
    return baseState;
  }
};

// Context Type
interface DeliveryContextType {
  state: DeliveryState;
  dispatch: React.Dispatch<DeliveryAction>;
  toggleSystem: () => void;
  assignCourier: (deliveryId: string, courierId: string, pickupBatchId?: string) => void;
  cancelDelivery: (deliveryId: string) => void;
  unassignCourier: (deliveryId: string) => void;
  updateDelivery: (deliveryId: string, updates: Partial<Delivery>) => void;
  resetSystem: () => void;
  addCourier: (courier: Courier) => void;
  removeCourier: (courierId: string) => void;
  addDeliveryBalance: (amount: number) => void;
}

const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

// Provider
export const DeliveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, rawDispatch] = useReducer(deliveryReducer, initialState, loadInitialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist delivery state', error);
    }
  }, [state]);
  
  // ×ª×™×§×•×Ÿ ××•×˜×•×ž×˜×™ ×©×œ ×ž×¡×¢×“×•×ª ×œ× ×¤×¢×™×œ×•×ª - ×¨×§ ×¤×¢× ××—×ª ×‘×”×ª×—×œ×”
  // ×”×•×¡×¨ - ×ž×ª×—×™×œ×™× ×¢× 0 ×ž×¡×¢×“×•×ª ×¤×¢×™×œ×•×ª
  // useEffect(() => {
  //   const activeRestaurants = state.restaurants.filter(r => r.isActive);
  //   if (activeRestaurants.length === 0) {
  //     console.warn('ðŸ”§ ×ž×ª×§×Ÿ ×ž×¡×¢×“×•×ª ×œ× ×¤×¢×™×œ×•×ª - ×ž×¤×¢×™×œ ××ª ×›×•×œ×Ÿ...');
  //     // ××™×Ÿ ×ž×¡×¢×“×•×ª ×¤×¢×™×œ×•×ª - ×¦×¨×™×š ×œ×ª×§×Ÿ ××ª ×–×”
  //     const fixedRestaurants = state.restaurants.map(r => ({ ...r, isActive: true }));
  //     dispatch({ type: 'SET_RESTAURANTS', payload: fixedRestaurants });
  //   }
  // }, []); // ×¨×§ ×¤×¢× ××—×ª ×‘×”×ª×—×œ×”
  
  // ×ž×•× ×” ×œ×ž×©×œ×•×—×™× - ×œ×”×‘×˜×™×— ×™×™×—×•×“×™×•×ª ×©×œ ID
  const deliveryCounter = useRef(0);
  const courierPositionsRef = useRef<Map<string, MapPosition>>(new Map());
  const courierPositionTimestampsRef = useRef<Map<string, number>>(new Map());

  const getStoredRouteStopOrders = useCallback((): Record<string, string[]> => {
    if (typeof window === 'undefined') return {};

    try {
      const raw = window.localStorage.getItem(LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }, []);

  const getInitialCourierPosition = useCallback((courier: Courier, index: number): MapPosition => {
    const activeDeliveries = stateRef.current.deliveries.filter((delivery) =>
      delivery.courierId === courier.id &&
      (delivery.status === 'assigned' || delivery.status === 'delivering')
    );

    const pickupDelivery = activeDeliveries.find((delivery) =>
      delivery.status === 'assigned' && delivery.arrivedAtRestaurantAt && !delivery.pickedUpAt
    );
    if (pickupDelivery && hasValidPosition({ lat: pickupDelivery.pickup_latitude, lng: pickupDelivery.pickup_longitude })) {
      return {
        lat: pickupDelivery.pickup_latitude as number,
        lng: pickupDelivery.pickup_longitude as number,
      };
    }

    const dropoffDelivery = activeDeliveries.find((delivery) => delivery.status === 'delivering');
    if (dropoffDelivery && hasValidPosition({ lat: dropoffDelivery.dropoff_latitude, lng: dropoffDelivery.dropoff_longitude })) {
      return {
        lat: dropoffDelivery.dropoff_latitude as number,
        lng: dropoffDelivery.dropoff_longitude as number,
      };
    }

    return { ...COURIER_FALLBACK_POSITIONS[index % COURIER_FALLBACK_POSITIONS.length] };
  }, []);

  // ×¤×•× ×§×¦×™×” ×œ×™×¦×™×¨×ª ID ×§×‘×•×¢ ×œ×ž×¡×¢×“×” ×‘×”×ª×‘×¡×¡ ×¢×œ ×©×ž×”
  const getRestaurantId = (restaurantName: string): string => {
    // ×—×™×¤×•×© ×‘×ž×¡×¢×“×•×ª ×”×§×™×™×ž×•×ª ×‘×ž×¢×¨×›×ª
    const restaurant = RESTAURANTS_DATA.find(r => r.name === restaurantName);
    if (restaurant) {
      return restaurant.id;
    }
    
    // fallback - ×™×¦×™×¨×ª hash ×× ×”×ž×¡×¢×“×” ×œ× × ×ž×¦××” (×œ× ××ž×•×¨ ×œ×§×¨×•×ª)
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
      courierPositionsRef.current.set(courier.id, getInitialCourierPosition(courier, index));
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
  }, [getInitialCourierPosition, state.couriers]);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ×¨×©×™×ž×ª ×›×ª×•×‘×•×ª ××ž×™×ª×™×•×ª ×‘×’×•×© ×“×Ÿ ×¢× ×§×•××•×¨×“×™× ×˜×•×ª GPS ×ž×“×•×™×§×•×ª
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const generateDelivery = useCallback((restaurant: Restaurant): Delivery | null => {
    deliveryCounter.current += 1;
    const id = `D${Date.now()}-${deliveryCounter.current}-${Math.random().toString(36).substr(2, 9)}`;
    const orderNumber = `#${Math.floor(10000 + Math.random() * 90000)}`;
    const apiShortOrderId = `${Math.floor(100000 + Math.random() * 900000)}`;
    
    const customerName = ISRAELI_NAMES[Math.floor(Math.random() * ISRAELI_NAMES.length)];
    const price = Math.floor(15 + Math.random() * 35); // 15-50 â‚ª

    // ×‘×—×™×¨×ª ×›×ª×•×‘×ª ×œ×§×•×— ××ž×™×ª×™×ª
    const customerAddr = REAL_ADDRESSES[Math.floor(Math.random() * REAL_ADDRESSES.length)];
    const area = customerAddr.area;

    // ×ž×¦×™××ª ×”×ž×¡×¢×“×” ×›×“×™ ×œ×§×‘×œ ×§×•××•×¨×“×™× ×˜×•×ª ××ž×™×ª×™×•×ª
    const restaurantName = restaurant.name;
    const pickupLat = restaurant.lat || 32.0853;
    const pickupLng = restaurant.lng || 34.7818;
    const restStreet = restaurant.street ?? restaurantName;
    const restCity = restaurant.city ?? 'תל אביב';
    const restAddress = restaurant.address ?? `${restStreet}, ${restCity}`;

    const now = new Date();
    // ×–×ž×Ÿ ×”×’×¢×” ×ž×©×•×¢×¨ ×œ×ž×¡×¢×“×”: 5-15 ×“×§×•×ª ×ž×¢×›×©×™×•
    const estimatedRestaurantTime = new Date(now.getTime() + (5 + Math.random() * 10) * 60000);
    // ×–×ž×Ÿ ×”×’×¢×” ×ž×©×•×¢×¨ ×œ×œ×§×•×—: 20-40 ×“×§×•×ª ×ž×¢×›×©×™×•
    const estimatedCustomerTime = new Date(now.getTime() + (20 + Math.random() * 20) * 60000);

    const restPrice = Math.floor(price * 0.7); // 70% ×ž×”×ž×—×™×¨ ×œ×œ×§×•×—
    const runnerPrice = Math.floor(price * 0.3); // 30% ×œ×©×œ×™×—
    const cookTime = restaurant.defaultPreparationTime ?? DEFAULT_RESTAURANT_PREPARATION_TIME;
    const maxDeliveryTime = restaurant.maxDeliveryTime ?? DEFAULT_RESTAURANT_MAX_DELIVERY_TIME;

    return {
      // ========================================
      // 1. âš™ï¸ Core Entity
      // ========================================
      id,
      api_short_order_id: apiShortOrderId,
      api_str_order_id: `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      priority: Math.floor(Math.random() * 3), // 0-2
      is_api: Math.random() > 0.5,
      is_started: false,
      is_approved: Math.random() > 0.3,
      is_requires_approval: Math.random() > 0.7,
      close_order: false,
      comment: Math.random() > 0.7 ? 'הערת מערכת' : undefined,
      pack_num: `${1 + Math.floor(Math.random() * 3)}`,
      
      // ========================================
      // 2. ðŸª Origin / Spawner
      // ========================================
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
      order_ready: Math.random() > 0.5,
      reported_order_is_ready: Math.random() > 0.6,
      rest_approve: Math.random() > 0.4,
      rest_waits_for_cook_time: Math.random() > 0.5,
      rest_last_eta: Math.random() > 0.5 ? new Date(now.getTime() + cookTime * 60000) : null,
      rest_approved_eta: Math.random() > 0.6 ? new Date(now.getTime() + cookTime * 60000) : null,
      is_drinks_exist: Math.random() > 0.6,
      is_sauces_exist: Math.random() > 0.5,
      
      // ========================================
      // 3. ðŸŽ¯ Target / Client
      // ========================================
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
      
      // ========================================
      // 4. ðŸš´ Actor / Runner
      // ========================================
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
      
      // ========================================
      // 5. â±ï¸ Timeline / Events
      // ========================================
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
      should_delivered_time: new Date(now.getTime() + maxDeliveryTime * 60000),
      max_time_to_deliver: maxDeliveryTime,
      min_time_to_suplly: Math.floor(15 + Math.random() * 10),
      max_time_to_suplly: Math.floor(30 + Math.random() * 15),
      minutes_late: 0,
      pickup_deviation: 0,
      dropoff_deviation: 0,
      delay_reason: undefined,
      delay_duration: 0,
      delivery_distance: Math.floor(1 + Math.random() * 10), // 1-10 ×§"×ž
      duration_to_client: Math.floor(15 + Math.random() * 30),
      eta_after_pickup: Math.floor(10 + Math.random() * 20),
      suplly_status: ['ממתין', 'בהכנה', 'מוכן'][Math.floor(Math.random() * 3)],
      
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
      pickedUpAt: null,
      deliveredAt: null,
      arrivedAtRestaurantAt: null,
      arrivedAtCustomerAt: null,
      estimatedTime: Math.floor(15 + Math.random() * 30),
      estimatedArrivalAtRestaurant: estimatedRestaurantTime,
      estimatedArrivalAtCustomer: estimatedCustomerTime,
      orderReadyTime: Math.random() > 0.5 ? new Date(now.getTime() + cookTime * 60000) : null,
      reportedOrderIsReady: Math.random() > 0.6,
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

  // ×ž× ×’× ×•×Ÿ: ×›×œ ×ž×¡×¢×“×” ×¤×¢×™×œ×” ×™×•×¦×¨×ª ×ž×©×œ×•×—×™× ×‘×§×¦×‘ ×©×œ×”
  // ×—×©×•×‘: ×œ× ×ª×œ×•×™ ×‘-deliveryBalance ×›×“×™ ×œ× ×œ×™×¦×•×¨ ×ž×—×“×© ××ª ×”-intervals ×‘×›×œ ×ž×©×œ×•×— ×©× ×•×¦×¨
  const deliveryBalanceRef = useRef(state.deliveryBalance);
  useEffect(() => { deliveryBalanceRef.current = state.deliveryBalance; }, [state.deliveryBalance]);

  useEffect(() => {
    if (!state.isSystemOpen) return;

    const activeRestaurants = state.restaurants.filter(r => r.isActive);
    if (activeRestaurants.length === 0) return;

    const intervals: NodeJS.Timeout[] = [];

    // ×¢×‘×•×¨ ×›×œ ×ž×¡×¢×“×” ×¤×¢×™×œ×”, ×¦×•×¨ interval ×ž×©×œ×”
    activeRestaurants.forEach(restaurant => {
      // ×™×¦×™×¨×ª ×ž×©×œ×•×—/×™× ×ž×™×™×“×™×ª (××—×¨×™ 1-3 ×©× ×™×•×ª)
      const initialDelay = (Math.random() * 2000 + 1000) / state.timeMultiplier;

      const spawn = () => {
        if (deliveryBalanceRef.current <= 0) return;
        for (let i = 0; i < restaurant.deliveryRate; i++) {
          const newDelivery = generateDelivery(restaurant);
          if (newDelivery) {
            rawDispatch({ type: 'ADD_DELIVERY', payload: newDelivery });
          }
        }
      };

      const initialTimeout = setTimeout(spawn, initialDelay);
      intervals.push(initialTimeout);

      // interval ×§×‘×•×¢ ×œ×¤×™ deliveryInterval ×©×œ ×”×ž×¡×¢×“×”
      const intervalMs = (restaurant.deliveryInterval * 60 * 1000) / state.timeMultiplier;
      const interval = setInterval(spawn, intervalMs);
      intervals.push(interval);
    });

    return () => {
      intervals.forEach(timer => {
        clearInterval(timer);
        clearTimeout(timer);
      });
    };
  }, [state.isSystemOpen, state.restaurants, state.timeMultiplier, generateDelivery, rawDispatch]);

  // ×¦×•×•×ª×™× ××•×˜×•×ž×˜×™ (××•×¤×¦×™×•× ×œ×™ - × ×™×ª×Ÿ ×œ×”×¡×™×¨ ×× ×¨×•×¦×™× ×¦×•×•×ª×™× ×™×“× ×™ ×‘×œ×‘×“)
  useEffect(() => {
    if (!state.autoAssignEnabled) return;

    const interval = setInterval(() => {
      // ×ž×¦× ×ž×©×œ×•×— ×ž×ž×ª×™×Ÿ
      const pendingDelivery = state.deliveries.find(d => d.status === 'pending');
      // ×ž×¦× ×©×œ×™×— ×™×›×•×œ ×œ×§×‘×œ ×ž×©×œ×•×— × ×•×¡×£ (×¤×—×•×ª ×ž-2 ×ž×©×œ×•×—×™× ×¤×¢×™×œ×™×)
      const availableCourier = state.couriers.find(c => 
        c.status !== 'offline' && c.isOnShift && c.activeDeliveryIds.length < 2
      );

      if (pendingDelivery && availableCourier) {
        rawDispatch({
          type: 'ASSIGN_COURIER',
          payload: createAssignCourierPayload(pendingDelivery.id, availableCourier.id),
        });
      }
    }, 500); // ×‘×“×•×§ ×›×œ ×—×¦×™ ×©× ×™×™×” - ×©×™×‘×•×¥ ×ž×™×™×“×™!

    return () => clearInterval(interval);
  }, [state.autoAssignEnabled, state.deliveries, state.couriers]);

  // ×¦×•×•×ª ×•×”×©×œ× ×ž×©×œ×•×—×™× ×ž×ž×ª×™× ×™× ×›×©×”×ž×¢×¨×›×ª ×¡×’×•×¨×” ×•×©×™×‘×•×¥ ××•×˜×•×ž×˜×™ ×¤×¢×™×œ
  useEffect(() => {
    if (state.isSystemOpen || !state.autoAssignEnabled) return;

    const interval = setInterval(() => {
      // ×ž×¦× ×ž×©×œ×•×— ×ž×ž×ª×™×Ÿ
      const pendingDelivery = state.deliveries.find(d => d.status === 'pending');
      
      if (pendingDelivery) {
        // ×ž×¦× ×©×œ×™×— ×™×›×•×œ ×œ×§×‘×œ ×ž×©×œ×•×— × ×•×¡×£ (×¤×—×•×ª ×ž-2 ×ž×©×œ×•×—×™× ×¤×¢×™×œ×™×)
        const availableCourier = state.couriers.find(c => 
          c.status !== 'offline' && c.isOnShift && c.activeDeliveryIds.length < 2
        );
        
        if (availableCourier) {
          rawDispatch({
            type: 'ASSIGN_COURIER',
            payload: createAssignCourierPayload(pendingDelivery.id, availableCourier.id),
          });
        }
      }
    }, 3000); // ×‘×“×•×§ ×›×œ 3 ×©× ×™×•×ª

    return () => clearInterval(interval);
  }, [state.isSystemOpen, state.autoAssignEnabled, state.deliveries, state.couriers]);

  // מנוע התקדמות גלובלי - ממשיך להזיז משלוחים גם בלי עמוד מנג'ר לייב פתוח
  useEffect(() => {
    const SPEED = COURIER_MOVE_SPEED;
    const ARRIVE = 0.0003;

    const interval = setInterval(() => {
      const routeStopOrders = getStoredRouteStopOrders();
      const stateNow = stateRef.current;
      const posUpdates = new Map<string, MapPosition>();
      const statusUpdates: Array<{ type: 'delivering' | 'complete' | 'arrived_pickup'; ids: string[] }> = [];
      const phaseUpdates = new Map<string, Partial<Delivery>>();

      stateNow.couriers.forEach((courier, index) => {
        const activeDeliveries = stateNow.deliveries.filter((delivery) =>
          delivery.courierId === courier.id &&
          (delivery.status === 'assigned' || delivery.status === 'delivering')
        );
        if (activeDeliveries.length === 0) return;

        const currentPosition =
          posUpdates.get(courier.id) ??
          courierPositionsRef.current.get(courier.id) ??
          getInitialCourierPosition(courier, index);

        if (!courierPositionsRef.current.has(courier.id)) {
          posUpdates.set(courier.id, currentPosition);
        }

        const defaultStops = buildDefaultRouteStopIds(activeDeliveries);
        const stopIds = normalizeRouteStopOrder(routeStopOrders[courier.id], defaultStops);

        let nextStopType: 'pickup' | 'dropoff' | undefined;
        let nextStopDeliveries: Delivery[] = [];
        let nextStopPosition: MapPosition | null = null;

        for (const stopId of stopIds) {
          if (stopId.startsWith('pickup-group:')) {
            const pickupBatchKey = stopId.replace('pickup-group:', '');
            const pickupGroupDeliveries = activeDeliveries.filter((delivery) =>
              getDeliveryPickupBatchKey(delivery) === pickupBatchKey &&
              delivery.status === 'assigned'
            );

            if (pickupGroupDeliveries.length > 0) {
              nextStopType = 'pickup';
              nextStopDeliveries = pickupGroupDeliveries;
              nextStopPosition = hasValidPosition({
                lat: pickupGroupDeliveries[0].pickup_latitude,
                lng: pickupGroupDeliveries[0].pickup_longitude,
              })
                ? {
                    lat: pickupGroupDeliveries[0].pickup_latitude as number,
                    lng: pickupGroupDeliveries[0].pickup_longitude as number,
                  }
                : null;
              break;
            }
          } else {
            const deliveryId = stopId.replace(/-dropoff$/, '');
            const delivery = activeDeliveries.find((item) => item.id === deliveryId && item.status === 'delivering');
            if (delivery) {
              nextStopType = 'dropoff';
              nextStopDeliveries = [delivery];
              nextStopPosition = hasValidPosition({
                lat: delivery.dropoff_latitude,
                lng: delivery.dropoff_longitude,
              })
                ? {
                    lat: delivery.dropoff_latitude as number,
                    lng: delivery.dropoff_longitude as number,
                  }
                : null;
              break;
            }
          }
        }

        if (!nextStopType || nextStopDeliveries.length === 0 || !nextStopPosition) return;

        if (nextStopType === 'pickup') {
          const activePickupIds = new Set(nextStopDeliveries.map((delivery) => delivery.id));

          nextStopDeliveries.forEach((delivery) => {
            if (!delivery.started_pickup) {
              phaseUpdates.set(delivery.id, {
                ...(phaseUpdates.get(delivery.id) ?? {}),
                started_pickup: new Date(),
              });
            }
          });

          activeDeliveries
            .filter(
              (delivery) =>
                delivery.status === 'assigned' &&
                !activePickupIds.has(delivery.id) &&
                !!delivery.started_pickup
            )
            .forEach((delivery) => {
              phaseUpdates.set(delivery.id, {
                ...(phaseUpdates.get(delivery.id) ?? {}),
                started_pickup: null,
              });
            });
        } else {
          const activeDropoffIds = new Set(nextStopDeliveries.map((delivery) => delivery.id));

          nextStopDeliveries.forEach((delivery) => {
            if (!delivery.started_dropoff) {
              phaseUpdates.set(delivery.id, {
                ...(phaseUpdates.get(delivery.id) ?? {}),
                started_dropoff: new Date(),
              });
            }
          });

          activeDeliveries
            .filter(
              (delivery) =>
                delivery.status === 'delivering' &&
                !activeDropoffIds.has(delivery.id) &&
                !!delivery.started_dropoff
            )
            .forEach((delivery) => {
              phaseUpdates.set(delivery.id, {
                ...(phaseUpdates.get(delivery.id) ?? {}),
                started_dropoff: null,
              });
            });
        }

        const dLat = nextStopPosition.lat - currentPosition.lat;
        const dLng = nextStopPosition.lng - currentPosition.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist < ARRIVE) {
          posUpdates.set(courier.id, nextStopPosition);

          if (nextStopType === 'pickup') {
            const areAllOrdersReady = nextStopDeliveries.every((delivery) =>
              delivery.order_ready ||
              delivery.reportedOrderIsReady ||
              (delivery.arrivedAtRestaurantAt &&
                Date.now() - new Date(delivery.arrivedAtRestaurantAt).getTime() >=
                  ((delivery.preparationTime || delivery.cook_time || 5) * 60000) / (stateNow.timeMultiplier || 1))
            );

            if (areAllOrdersReady) {
              statusUpdates.push({ type: 'delivering', ids: nextStopDeliveries.map((delivery) => delivery.id) });
            } else {
              const notArrivedDeliveryIds = nextStopDeliveries
                .filter((delivery) => !delivery.arrivedAtRestaurantAt)
                .map((delivery) => delivery.id);

              if (notArrivedDeliveryIds.length > 0) {
                statusUpdates.push({ type: 'arrived_pickup', ids: notArrivedDeliveryIds });
              }
            }
          } else {
            statusUpdates.push({ type: 'complete', ids: nextStopDeliveries.map((delivery) => delivery.id) });
          }
        } else {
          const ratio = Math.min(SPEED / dist, 1);
          posUpdates.set(courier.id, {
            lat: currentPosition.lat + dLat * ratio,
            lng: currentPosition.lng + dLng * ratio,
          });
        }
      });

      if (posUpdates.size > 0) {
        posUpdates.forEach((position, courierId) => {
          courierPositionsRef.current.set(courierId, position);
          courierPositionTimestampsRef.current.set(courierId, Date.now());
        });

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY,
            JSON.stringify(Object.fromEntries(courierPositionsRef.current.entries()))
          );
          window.localStorage.setItem(
            LIVE_MANAGER_COURIER_POSITIONS_TS_STORAGE_KEY,
            JSON.stringify(Object.fromEntries(courierPositionTimestampsRef.current.entries()))
          );
        }
      }

      phaseUpdates.forEach((updates, deliveryId) => {
        rawDispatch({ type: 'UPDATE_DELIVERY', payload: { deliveryId, updates } });
      });

      statusUpdates.forEach(({ type, ids }) => {
        ids.forEach((id) => {
          if (type === 'complete') {
            rawDispatch({ type: 'COMPLETE_DELIVERY', payload: id });
          } else if (type === 'arrived_pickup') {
            rawDispatch({
              type: 'UPDATE_DELIVERY',
              payload: { deliveryId: id, updates: { arrivedAtRestaurantAt: new Date() } },
            });
          } else if (type === 'delivering') {
            rawDispatch({
              type: 'UPDATE_DELIVERY',
              payload: {
                deliveryId: id,
                updates: {
                  status: 'delivering',
                  pickedUpAt: new Date(),
                  started_pickup: new Date(),
                },
              },
            });
          }
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [getInitialCourierPosition, getStoredRouteStopOrders]);

  const toggleSystem = () => {
    dispatch({ type: 'TOGGLE_SYSTEM' });
  };

  const assignCourier = (deliveryId: string, courierId: string, pickupBatchId?: string) => {
    dispatch({
      type: 'ASSIGN_COURIER',
      payload: createAssignCourierPayload(deliveryId, courierId, pickupBatchId),
    });
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
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(LIVE_MANAGER_ON_SHIFT_ONLY_STORAGE_KEY);
        window.localStorage.removeItem(LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY);
        window.localStorage.removeItem(LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY);
        window.localStorage.removeItem(LIVE_MANAGER_COURIER_POSITIONS_TS_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear persisted delivery state', error);
      }
    }

    dispatch({ type: 'RESET_SYSTEM', payload: initialState });

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

// Hook ×œ×©×™×ž×•×© ×‘-Context
export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (context === undefined) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
};
