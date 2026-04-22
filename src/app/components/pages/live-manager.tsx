import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router';
import { useDelivery } from '../../context/delivery.context';
import { Delivery } from '../../types/delivery.types';
import { LiveDeliveriesTab } from './live/live-deliveries-tab';
import { LiveRestaurantsView } from './live/live-restaurants-view';
import { LiveCouriersView } from './live/live-couriers-view';
import { LeafletMap } from './live/leaflet-map';
import { OrderDetailsPanel } from './live/order-details-panel';
import { LiveManagerDesktopControls } from './live/live-manager-desktop-controls';
import { LiveManagerDesktopHeader } from './live/live-manager-desktop-header';
import { LiveManagerMinimizedWidget } from './live/live-manager-minimized-widget';
import { LiveManagerMobileControls } from './live/live-manager-mobile-controls';
import BottomAppBar from './live/bottom-app-bar';
import { DeliveryEditDialog } from '../deliveries/delivery-edit-dialog';
import {
  buildDefaultRouteStopIds,
  createPickupBatchId,
  getDeliveryPickupBatchKey,
  getPickupGroupStopId,
  getRestaurantPickupBaseKey,
} from '../../utils/pickup-batches';
import { toast } from 'sonner';

type TabType = 'deliveries' | 'couriers';
type MapPosition = {
  lat: number;
  lng: number;
};
const LIVE_MANAGER_ON_SHIFT_ONLY_STORAGE_KEY = 'sendi-live-manager-on-shift-only';
const LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY = 'sendi-live-manager-route-stop-orders';
const LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY = 'sendi-live-manager-courier-positions';
const LIVE_MANAGER_COURIER_POSITIONS_TS_STORAGE_KEY = 'sendi-live-manager-courier-positions-ts';

const areSetsEqual = (left: Set<string>, right: Set<string>) => {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
};

const COURIER_MOVE_SPEED = 0.00012;

// Real street positions across Tel Aviv / Gush Dan — used as courier starting points
const COURIER_FALLBACK_POSITIONS = [
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

// Live Manager Component - Updated with new assignment flow
export const LiveManager: React.FC = () => {
  const { state, dispatch, assignCourier, cancelDelivery, unassignCourier, updateDelivery } = useDelivery();
  const location = useLocation();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [pendingScrollOrderId, setPendingScrollOrderId] = useState<string | null>(null);
  const [pendingScrollCourierId, setPendingScrollCourierId] = useState<string | null>(null);
  const [statusFilters, setStatusFilters] = useState<string[]>(['pending', 'assigned', 'delivering']);
  const [sortBy, setSortBy] = useState<'time' | 'status' | 'restaurant' | 'address' | 'ready'>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('deliveries');
  const [courierQuickFilter, setCourierQuickFilter] = useState<'all' | 'free' | 'busy'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'shift' | 'no_shift'>(() => {
    if (typeof window === 'undefined') return 'all';
    const saved = window.localStorage.getItem(LIVE_MANAGER_ON_SHIFT_ONLY_STORAGE_KEY);
    if (saved === 'shift' || saved === 'no_shift') return saved;
    return 'all';
  });
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set());
  const [assignmentMode, setAssignmentMode] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [mapHighlightedCourierId, setMapHighlightedCourierId] = useState<string | null>(null); // שליח מודגש על המפה
  const [routeStopOrders, setRouteStopOrders] = useState<Record<string, string[]>>(() => {
    if (typeof window === 'undefined') return {};

    try {
      const saved = window.localStorage.getItem(LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY);
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }); // סדר עצירות לכל שליח

  const normalizeRouteStopOrder = useCallback((savedOrder: string[] | undefined, defaultStops: string[]) => {
    if (!savedOrder || savedOrder.length === 0) {
      return defaultStops;
    }

    const validStopIds = new Set(defaultStops);
    const normalizedSavedStops = savedOrder.filter((stopId, index) => (
      validStopIds.has(stopId) && savedOrder.indexOf(stopId) === index
    ));
    const missingStops = defaultStops.filter((stopId) => !normalizedSavedStops.includes(stopId));

    return [...normalizedSavedStops, ...missingStops];
  }, []);
  const buildDefaultStopIds = useCallback((deliveries: Delivery[]) => buildDefaultRouteStopIds(deliveries), []);
  const [panelHeight, setPanelHeight] = useState<'half' | 'full'>('half'); // For mobile - removed collapsed
  const [panelSize, setPanelSize] = useState<'normal' | 'medium' | 'large' | 'minimized'>(() => {
    const saved = localStorage.getItem('liveManagerPanelSize');
    return (saved as 'normal' | 'medium' | 'large' | 'minimized') || 'normal';
  }); // For desktop
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState<'half' | 'full'>('half');

  const focusOrderInDeliveries = useCallback((deliveryId: string) => {
    setSelectedOrderId(deliveryId);
    setActiveTab('deliveries');
    setPendingScrollOrderId(null);

    requestAnimationFrame(() => {
      setPendingScrollOrderId(deliveryId);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LIVE_MANAGER_ON_SHIFT_ONLY_STORAGE_KEY, shiftFilter);
  }, [shiftFilter]);

  useEffect(() => {
    if (shiftFilter === 'no_shift' && courierQuickFilter !== 'all') {
      setCourierQuickFilter('all');
    }
  }, [shiftFilter, courierQuickFilter]);

  const handleSetShiftFilter = useCallback((nextFilter: 'all' | 'shift' | 'no_shift') => {
    setShiftFilter(nextFilter);
    if (nextFilter === 'all' || nextFilter === 'no_shift') {
      setCourierQuickFilter('all');
    }
  }, []);

  const handleToggleShiftFilter = useCallback((target: 'shift' | 'no_shift') => {
    handleSetShiftFilter(shiftFilter === target ? 'all' : target);
  }, [handleSetShiftFilter, shiftFilter]);

  const handleToggleCourierQuickFilter = useCallback((target: 'free' | 'busy') => {
    if (shiftFilter !== 'shift') {
      setShiftFilter('shift');
    }
    setCourierQuickFilter((current) => (current === target ? 'all' : target));
  }, [shiftFilter]);

  const openMobileSidebar = useCallback(() => {
    if ((window as any).toggleMobileSidebar) {
      (window as any).toggleMobileSidebar();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY,
      JSON.stringify(routeStopOrders)
    );
  }, [routeStopOrders]);

  // ── Simulator WebSocket ───────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [simPositions, setSimPositions] = useState<Map<string, { lat: number; lng: number }>>(new Map());

  const connectSim = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket('ws://localhost:8765');
    wsRef.current = ws;
    ws.onopen = () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'update' && Array.isArray(msg.couriers)) {
          const map = new Map<string, { lat: number; lng: number }>();
          // map by index — simulator couriers align with state.couriers order
          msg.couriers.forEach((c: any, i: number) => {
            map.set(`sim_${i}`, { lat: c.lat, lng: c.lng });
            // also store by name match
            map.set(c.name, { lat: c.lat, lng: c.lng });
          });
          setSimPositions(map);
        }
      } catch { /* ignore */ }
    };
    ws.onclose = () => {
      wsRef.current = null;
      reconnectRef.current = setTimeout(() => connectSim(), 4000);
    };
    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connectSim();
    return () => { reconnectRef.current && clearTimeout(reconnectRef.current); wsRef.current?.close(); };
  }, [connectSim]);

  // ── In-app courier movement engine ───────────────────────────────────────
  // Tracks positions for app couriers (when simulator is not connected)
  const [courierPositions, setCourierPositions] = useState<Map<string, { lat: number; lng: number }>>(() => {
    if (typeof window === 'undefined') {
      return new Map<string, { lat: number; lng: number }>();
    }

    try {
      const raw = window.localStorage.getItem(LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY);
      if (!raw) return new Map<string, { lat: number; lng: number }>();

      const parsed = JSON.parse(raw) as Record<string, { lat?: number; lng?: number }>;
      const map = new Map<string, { lat: number; lng: number }>();

      Object.entries(parsed).forEach(([courierId, position]) => {
        if (
          position &&
          typeof position.lat === 'number' &&
          typeof position.lng === 'number'
        ) {
          map.set(courierId, { lat: position.lat, lng: position.lng });
        }
      });

      return map;
    } catch {
      return new Map<string, { lat: number; lng: number }>();
    }
  });
  const courierPositionTimestampsRef = useRef<Map<string, number>>(new Map());

  const getInitialCourierPosition = useCallback((courier: typeof state.couriers[number], index: number) => {
    const activeDeliveries = state.deliveries.filter((delivery) =>
      delivery.courierId === courier.id &&
      (delivery.status === 'assigned' || delivery.status === 'delivering')
    );

    const pickupDelivery = activeDeliveries.find((delivery) =>
      delivery.status === 'assigned' && delivery.arrivedAtRestaurantAt && !delivery.pickedUpAt
    );
    if (pickupDelivery) {
      return {
        lat: pickupDelivery.pickup_latitude,
        lng: pickupDelivery.pickup_longitude,
      };
    }

    const dropoffDelivery = activeDeliveries.find((delivery) => delivery.status === 'delivering');
    if (dropoffDelivery) {
      return {
        lat: dropoffDelivery.dropoff_latitude,
        lng: dropoffDelivery.dropoff_longitude,
      };
    }

    return { ...COURIER_FALLBACK_POSITIONS[index % COURIER_FALLBACK_POSITIONS.length] };
  }, [state.couriers, state.deliveries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(LIVE_MANAGER_COURIER_POSITIONS_TS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Record<string, number>;
      const next = new Map<string, number>();

      Object.entries(parsed).forEach(([courierId, timestamp]) => {
        if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
          next.set(courierId, timestamp);
        }
      });

      courierPositionTimestampsRef.current = next;
    } catch {
      courierPositionTimestampsRef.current = new Map();
    }
  }, []);

  useEffect(() => {
    setCourierPositions(prev => {
      let changed = false;
      const next = new Map(prev);

      state.couriers.forEach((courier, i) => {
        if (next.has(courier.id)) return;
        next.set(courier.id, getInitialCourierPosition(courier, i));
        changed = true;
      });

      Array.from(next.keys()).forEach((courierId) => {
        if (state.couriers.some((courier) => courier.id === courierId)) return;
        next.delete(courierId);
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [getInitialCourierPosition, state.couriers]);

  // Keep a ref so the tick always reads latest positions without stale closure
  const courierPositionsRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  useEffect(() => { courierPositionsRef.current = courierPositions; }, [courierPositions]);
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const serialized = Object.fromEntries(
      Array.from(courierPositions.entries()).map(([courierId, position]) => [courierId, position])
    );
    window.localStorage.setItem(
      LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY,
      JSON.stringify(serialized)
    );
    window.localStorage.setItem(
      LIVE_MANAGER_COURIER_POSITIONS_TS_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(courierPositionTimestampsRef.current.entries()))
    );
  }, [courierPositions]);

  // Refs to avoid stale closures in the tick interval
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const simPositionsRef = useRef(simPositions);
  useEffect(() => { simPositionsRef.current = simPositions; }, [simPositions]);
  const routeStopOrdersRef = useRef(routeStopOrders);
  useEffect(() => { routeStopOrdersRef.current = routeStopOrders; }, [routeStopOrders]);

  // סדר עדיפות איסוף לכל שליח: deliveryId ראשון ברשימה = הבא לטיפול
  // המנהל יכול לשנות סדר זה בעתיד דרך drag-and-drop
  const getCourierNextTarget = useCallback((courier: typeof state.couriers[number]) => {
    const activeDeliveries = state.deliveries.filter(d =>
      d.courierId === courier.id &&
      (d.status === 'assigned' || d.status === 'delivering')
    );
    if (activeDeliveries.length === 0) return null;

    const defaultStops = buildDefaultStopIds(activeDeliveries);
    const stopIds = normalizeRouteStopOrder(routeStopOrdersRef.current[courier.id], defaultStops);

    for (const stopId of stopIds) {
      if (stopId.startsWith('pickup-group:')) {
        const pickupGroupKey = stopId.replace('pickup-group:', '');
        const pickupGroupDeliveries = activeDeliveries.filter((delivery) =>
          getDeliveryPickupBatchKey(delivery) === pickupGroupKey &&
          delivery.status === 'assigned'
        );

        if (pickupGroupDeliveries.length > 0) {
          return {
            lat: pickupGroupDeliveries[0].pickup_latitude,
            lng: pickupGroupDeliveries[0].pickup_longitude,
          };
        }
      } else {
        const deliveryId = stopId.replace(/-dropoff$/, '');
        const delivery = activeDeliveries.find((item) => item.id === deliveryId);
        if (delivery?.status === 'delivering') {
          return {
            lat: delivery.dropoff_latitude,
            lng: delivery.dropoff_longitude,
          };
        }
      }
    }

    return null;
  }, [buildDefaultStopIds, normalizeRouteStopOrder, state.deliveries]);

  useEffect(() => {
    const now = Date.now();

    setCourierPositions(prev => {
      let changed = false;
      const next = new Map(prev);

      state.couriers.forEach((courier) => {
        const current = next.get(courier.id);
        const target = getCourierNextTarget(courier);
        const lastUpdatedAt = courierPositionTimestampsRef.current.get(courier.id);

        if (!current || !target || !lastUpdatedAt) return;

        const elapsedSeconds = Math.max((now - lastUpdatedAt) / 1000, 0);
        if (elapsedSeconds < 1) return;

        const dLat = target.lat - current.lat;
        const dLng = target.lng - current.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist === 0) {
          courierPositionTimestampsRef.current.set(courier.id, now);
          changed = true;
          return;
        }

        const traveled = Math.min(COURIER_MOVE_SPEED * elapsedSeconds, dist);
        const ratio = traveled / dist;
        next.set(courier.id, {
          lat: current.lat + dLat * ratio,
          lng: current.lng + dLng * ratio,
        });
        courierPositionTimestampsRef.current.set(courier.id, now);
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [getCourierNextTarget, state.couriers, state.deliveries]);

  // Movement tick: move each courier toward their delivery target
  useEffect(() => {
    const SPEED = COURIER_MOVE_SPEED;  // ~12m per second
    const ARRIVE = 0.0003;  // ~30m = "arrived"

    const tick = setInterval(() => {
      const posUpdates = new Map<string, { lat: number; lng: number }>();
      const statusUpdates: Array<{ type: 'delivering' | 'complete' | 'arrived_pickup'; ids: string[] }> = [];
      const phaseUpdates: Array<{ deliveryId: string; updates: Partial<Delivery> }> = [];

      stateRef.current.couriers.forEach(courier => {
        if (simPositionsRef.current.has(courier.name)) return;

        const cur = courierPositionsRef.current.get(courier.id);
        if (!cur) return;

        const activeDeliveries = stateRef.current.deliveries.filter(d =>
          d.courierId === courier.id &&
          (d.status === 'assigned' || d.status === 'delivering')
        );
        if (activeDeliveries.length === 0) return;

        // בנה רשימת כל העצירות האפשריות לפי הסדר שנקבע
        const defaultStops = buildDefaultStopIds(activeDeliveries);
        const stopIds = normalizeRouteStopOrder(routeStopOrdersRef.current[courier.id], defaultStops);

        // מצא את העצירה הבאה שעדיין לא הושלמה
        let tLat: number | undefined;
        let tLng: number | undefined;
        let nextStopDeliveryIds: string[] = [];
        let nextStopType: 'pickup' | 'dropoff' | undefined;
        let nextStopDeliveries: Delivery[] = [];

        for (const stopId of stopIds) {
          if (stopId.startsWith('pickup-group:')) {
            const pickupGroupKey = stopId.replace('pickup-group:', '');
            const pickupGroupDeliveries = activeDeliveries.filter((delivery) =>
              getDeliveryPickupBatchKey(delivery) === pickupGroupKey &&
              delivery.status === 'assigned'
            );

            if (pickupGroupDeliveries.length > 0) {
              tLat = pickupGroupDeliveries[0].pickup_latitude;
              tLng = pickupGroupDeliveries[0].pickup_longitude;
              nextStopDeliveryIds = pickupGroupDeliveries.map((delivery) => delivery.id);
              nextStopDeliveries = pickupGroupDeliveries;
              nextStopType = 'pickup';
              break;
            }
          } else {
            const deliveryId = stopId.replace(/-dropoff$/, '');
            const delivery = activeDeliveries.find(d => d.id === deliveryId);
            if (!delivery) continue;
            // עצירת הורדה: רלוונטית אם delivery.status === 'delivering'
            if (delivery.status === 'delivering') {
              tLat = delivery.dropoff_latitude;
              tLng = delivery.dropoff_longitude;
              nextStopDeliveryIds = [deliveryId];
              nextStopDeliveries = [delivery];
              nextStopType = 'dropoff';
              break;
            }
          }
        }

        if (tLat === undefined || tLng === undefined || nextStopDeliveryIds.length === 0 || nextStopDeliveries.length === 0) return;

        if (nextStopType === 'pickup') {
          const activePickupIds = new Set(nextStopDeliveryIds);
          nextStopDeliveries.forEach((delivery) => {
            if (!delivery.started_pickup) {
              phaseUpdates.push({
                deliveryId: delivery.id,
                updates: { started_pickup: new Date() },
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
              phaseUpdates.push({
                deliveryId: delivery.id,
                updates: { started_pickup: null },
              });
            });
        } else if (nextStopType === 'dropoff') {
          const activeDropoffIds = new Set(nextStopDeliveryIds);
          nextStopDeliveries.forEach((delivery) => {
            if (!delivery.started_dropoff) {
              phaseUpdates.push({
                deliveryId: delivery.id,
                updates: { started_dropoff: new Date() },
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
              phaseUpdates.push({
                deliveryId: delivery.id,
                updates: { started_dropoff: null },
              });
            });
        }

        const dLat = tLat - cur.lat;
        const dLng = tLng - cur.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist < ARRIVE) {
          posUpdates.set(courier.id, { lat: tLat, lng: tLng });
          if (nextStopType === 'pickup') {
            // בדוק אם ההזמנה מוכנה לאיסוף
            const areAllOrdersReady = nextStopDeliveries.every((delivery) =>
              delivery.order_ready ||
              delivery.reportedOrderIsReady ||
              (delivery.arrivedAtRestaurantAt &&
                Date.now() - new Date(delivery.arrivedAtRestaurantAt).getTime() >=
                  (delivery.preparationTime || delivery.cook_time || 5) * 60000 / (stateRef.current.timeMultiplier || 1))
            );

            if (areAllOrdersReady) {
              // מנה מוכנה — קח ולך
              statusUpdates.push({ type: 'delivering', ids: nextStopDeliveryIds });
            } else {
              const notArrivedDeliveryIds = nextStopDeliveries
                .filter((delivery) => !delivery.arrivedAtRestaurantAt)
                .map((delivery) => delivery.id);

              if (notArrivedDeliveryIds.length > 0) {
              // הגעה ראשונה למסעדה — המתן לאוכל
                statusUpdates.push({ type: 'arrived_pickup', ids: notArrivedDeliveryIds });
              }
            }
            // else: כבר מחכה — עשה כלום
          } else {
            statusUpdates.push({ type: 'complete', ids: nextStopDeliveryIds });
          }
        } else {
          const ratio = Math.min(SPEED / dist, 1);
          posUpdates.set(courier.id, { lat: cur.lat + dLat * ratio, lng: cur.lng + dLng * ratio });
        }
      });

      if (posUpdates.size > 0) {
        setCourierPositions(prev => {
          const next = new Map(prev);
          posUpdates.forEach((pos, id) => {
            next.set(id, pos);
            courierPositionTimestampsRef.current.set(id, Date.now());
          });
          return next;
        });
      }

      if (phaseUpdates.length > 0) {
        const latestUpdates = new Map<string, Partial<Delivery>>();
        phaseUpdates.forEach(({ deliveryId, updates }) => {
          latestUpdates.set(deliveryId, {
            ...(latestUpdates.get(deliveryId) ?? {}),
            ...updates,
          });
        });

        latestUpdates.forEach((updates, deliveryId) => {
          dispatch({ type: 'UPDATE_DELIVERY', payload: { deliveryId, updates } });
        });
      }

      statusUpdates.forEach(({ type, ids }) => {
        ids.forEach((id) => {
        if (type === 'complete') {
          dispatch({ type: 'COMPLETE_DELIVERY', payload: id });
          // נקה את ה-stop ids של המשלוח שהסתיים מכל הסדרים
          setRouteStopOrders(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(courierId => {
              next[courierId] = next[courierId].filter(
                stopId => !stopId.startsWith(`${id}-`)
              );
            });
            return next;
          });
        } else if (type === 'arrived_pickup') {
          // שליח הגיע למסעדה — נשאר שובץ עד לאיסוף בפועל
          dispatch({ type: 'UPDATE_DELIVERY', payload: { deliveryId: id, updates: { arrivedAtRestaurantAt: new Date() } } });
        } else if (type === 'delivering') {
          // האוכל מוכן — שליח אוסף ויוצא ללקוח
          dispatch({
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

    return () => clearInterval(tick);
  }, [buildDefaultStopIds, dispatch, normalizeRouteStopOrder]); // eslint-disable-line react-hooks/exhaustive-deps
  // ─────────────────────────────────────────────────────────────────────────

  // Hover states for map correlation
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [hoveredCourierId, setHoveredCourierId] = useState<string | null>(null);
  const [hoveredRestaurantName, setHoveredRestaurantName] = useState<string | null>(null);

  const isDeliveryAssignable = useCallback((delivery?: Delivery | null) => {
    return delivery?.status === 'pending';
  }, []);

  // Order details panel state
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any | null>(null);

  // Edit delivery dialog state
  const [editDeliveryId, setEditDeliveryId] = useState<string | null>(null);
  const editDelivery = useMemo(() =>
    editDeliveryId ? state.deliveries.find(d => d.id === editDeliveryId) ?? null : null
  , [editDeliveryId, state.deliveries]);
  const handleOpenEditDelivery = useCallback((deliveryId: string) => setEditDeliveryId(deliveryId), []);
  const handleCloseEditDelivery = useCallback(() => setEditDeliveryId(null), []);
  const handleSaveEditDelivery = useCallback((deliveryId: string, updates: Partial<Delivery>) => {
    updateDelivery(deliveryId, updates);
  }, [updateDelivery]);

  // Persist panel size to localStorage
  useEffect(() => {
    localStorage.setItem('liveManagerPanelSize', panelSize);
  }, [panelSize]);

  // Set page title
  useEffect(() => {
    document.title = 'LIVE | Sendi Cockpit';
    return () => {
      document.title = 'Sendi Cockpit';
    };
  }, []);

  // Prevent page scroll and pull-to-refresh on mobile
  useEffect(() => {
    // Save original styles
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalHeight = document.body.style.height;
    const originalTouchAction = document.body.style.touchAction;
    const htmlOriginalOverflow = document.documentElement.style.overflow;

    // Prevent scroll and pull-to-refresh
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.height = '100%';
    document.body.style.width = '100%';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.height = originalHeight;
      document.body.style.touchAction = originalTouchAction;
      document.documentElement.style.overflow = htmlOriginalOverflow;
    };
  }, []);

  // Check if navigated from dashboard
  useEffect(() => {
    const locationState = location.state as { activeTab?: string } | null;
    if (locationState?.activeTab) {
      setActiveTab('deliveries');
      setStatusFilters([locationState.activeTab]);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Format delivery as order
  const formatDeliveryAsOrder = (delivery: Delivery) => {
    const courier = state.couriers.find(c => c.id === delivery.courierId);
    const restaurant = state.restaurants.find(
      r => r.id === delivery.restaurantId || r.name === delivery.restaurantName
    );
    const hash = delivery.orderNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Use real GPS coordinates from delivery, fall back to Tel Aviv center area
    const lat = delivery.dropoff_latitude ?? (32.0853 + ((hash % 100) - 50) * 0.0004);
    const lng = delivery.dropoff_longitude ?? (34.7818 + ((hash % 100) - 50) * 0.0006);
    const prepTime =
      delivery.preparationTime ??
      delivery.cook_time ??
      restaurant?.defaultPreparationTime ??
      5;
    const travelTime = 10 + (hash % 6);
    const estimatedDeliveryTime = new Date(new Date(delivery.createdAt).getTime() + (prepTime + travelTime) * 60000);
    const phone = `05${(hash % 9) + 1}-${Math.floor((hash % 900) + 1000000).toString().substring(0, 7)}`;
    
    // סימולציה של תשלום: 50% מזומן, 50% אשראי
    const paymentMethod = (hash % 2 === 0) ? 'cash' : 'credit';
    const cashToCollect = paymentMethod === 'cash' ? delivery.price : 0;
    
    return {
      id: delivery.orderNumber,
      deliveryId: delivery.id,
      restaurantId: delivery.restaurantId,
      restaurantName: delivery.restaurantName,
      pickup: delivery.restaurantName,
      customerName: delivery.customerName,
      address: delivery.address,
      status: delivery.status,
      createdAt: new Date(delivery.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      createdAtTimestamp: new Date(delivery.createdAt).getTime(),
      readyBy: `${delivery.estimatedTime} דק׳`,
      amountToCollect: delivery.price,
      courierId: delivery.courierId ?? null,
      courierName: courier?.name || null,
      phone,
      prepTime,
      estimatedDelivery: estimatedDeliveryTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      lat,
      lng,
      pickupLat: delivery.pickup_latitude,
      pickupLng: delivery.pickup_longitude,
      orderNotes: delivery.orderNotes, // העברת הערות מהמודל
      paymentMethod, // מזומן או אשראי
      cashToCollect, // סכום לגביה במזומן
      pickedUpAt: delivery.pickedUpAt, // זמן איסוף
      deliveredAt: delivery.deliveredAt, // זמן מסירה
      fullDelivery: delivery, // האובייקט המלא לפרטים מלאים
    };
  };

  const allOrders = useMemo(() => state.deliveries.map(formatDeliveryAsOrder), [state.deliveries, state.couriers]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Extract unique restaurants - שימוש ישיר בנתוני מסעדות מה-state עם קואורדינטות אמיתיות
  const uniqueRestaurants = useMemo(() => {
    return state.restaurants
      .filter(r => r.isActive)
      .map(restaurant => ({
        name: restaurant.name,
        lat: restaurant.lat,
        lng: restaurant.lng,
      }));
  }, [state.restaurants]);

  // Couriers with locations
  const couriersWithLocations = useMemo(() => {
    return state.couriers
      .filter(courier => courier.status !== 'offline')
      .map((courier, i) => {
        // Use real simulator position if available (match by name or index)
        const simPos = simPositions.get(courier.name) ?? simPositions.get(`sim_${i}`);
        if (simPos) {
          return { ...courier, lat: simPos.lat, lng: simPos.lng };
        }
        // Movement engine position (updates every second)
        const enginePos = courierPositions.get(courier.id);
        if (enginePos) return { ...courier, lat: enginePos.lat, lng: enginePos.lng };

        // Final fallback
        const pos = COURIER_FALLBACK_POSITIONS[i % COURIER_FALLBACK_POSITIONS.length];
        return { ...courier, lat: pos.lat, lng: pos.lng };
        });
  }, [state.couriers, simPositions, courierPositions]);
  const mapCouriers = useMemo(
    () => (
      shiftFilter === 'shift'
        ? couriersWithLocations.filter((courier) => courier.isOnShift)
        : shiftFilter === 'no_shift'
        ? couriersWithLocations.filter((courier) => !courier.isOnShift)
        : couriersWithLocations
    ),
    [couriersWithLocations, shiftFilter]
  );

  const routeEtaLabelByDeliveryId = useMemo(() => {
    const labels: Record<string, string> = {};
    const courierLocationById = new Map(
      couriersWithLocations
        .filter((courier) => hasValidPosition({ lat: courier.lat, lng: courier.lng }))
        .map((courier) => [courier.id, { lat: courier.lat as number, lng: courier.lng as number } satisfies MapPosition])
    );

    state.couriers.forEach((courier, index) => {
      const activeDeliveries = state.deliveries.filter((delivery) =>
        delivery.courierId === courier.id &&
        (delivery.status === 'assigned' || delivery.status === 'delivering')
      );

      if (activeDeliveries.length === 0) return;

      let currentPosition: MapPosition | null =
        courierLocationById.get(courier.id) ??
        COURIER_FALLBACK_POSITIONS[index % COURIER_FALLBACK_POSITIONS.length] ??
        null;
      let cursor = new Date();

      const defaultStops = buildDefaultStopIds(activeDeliveries);
      const stopIds = normalizeRouteStopOrder(routeStopOrders[courier.id], defaultStops);

      stopIds.forEach((stopId) => {
        if (stopId.startsWith('pickup-group:')) {
          const pickupGroupKey = stopId.replace('pickup-group:', '');
          const pickupGroupDeliveries = activeDeliveries.filter((delivery) =>
            getDeliveryPickupBatchKey(delivery) === pickupGroupKey &&
            delivery.status === 'assigned'
          );

          if (pickupGroupDeliveries.length === 0) return;

          const nextLocation = hasValidPosition({
            lat: pickupGroupDeliveries[0].pickup_latitude,
            lng: pickupGroupDeliveries[0].pickup_longitude,
          })
            ? {
                lat: pickupGroupDeliveries[0].pickup_latitude as number,
                lng: pickupGroupDeliveries[0].pickup_longitude as number,
              }
            : null;

          cursor = new Date(cursor.getTime() + estimateTravelMinutes(currentPosition, nextLocation) * 60000);

          const readyAt = getPickupReadyAt(pickupGroupDeliveries);
          if (readyAt && cursor < readyAt) {
            cursor = new Date(readyAt);
          }

          pickupGroupDeliveries.forEach((delivery) => {
            if (!delivery.arrivedAtRestaurantAt && !delivery.pickedUpAt) {
              labels[delivery.id] = `מגיע למסעדה ב־${cursor.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
            }
          });

          currentPosition = nextLocation ?? currentPosition;
          const serviceMinutes = Math.min(6, 2 + Math.max(0, pickupGroupDeliveries.length - 1));
          cursor = new Date(cursor.getTime() + serviceMinutes * 60000);
          return;
        }

        const deliveryId = stopId.replace(/-dropoff$/, '');
        const delivery = activeDeliveries.find((item) => item.id === deliveryId && item.status === 'delivering');
        if (!delivery) return;

        const nextLocation = hasValidPosition({
          lat: delivery.dropoff_latitude,
          lng: delivery.dropoff_longitude,
        })
          ? {
              lat: delivery.dropoff_latitude as number,
              lng: delivery.dropoff_longitude as number,
            }
          : null;

        cursor = new Date(cursor.getTime() + estimateTravelMinutes(currentPosition, nextLocation) * 60000);
        labels[delivery.id] = `מגיע ללקוח ב־${cursor.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
        currentPosition = nextLocation ?? currentPosition;
        cursor = new Date(cursor.getTime() + 3 * 60000);
      });
    });

    return labels;
  }, [
    buildDefaultStopIds,
    couriersWithLocations,
    normalizeRouteStopOrder,
    routeStopOrders,
    state.couriers,
    state.deliveries,
  ]);
  const courierLocationMap = useMemo(
    () =>
      Object.fromEntries(
        couriersWithLocations.map((courier) => [
          courier.id,
          { lat: courier.lat, lng: courier.lng },
        ])
      ),
    [couriersWithLocations]
  );
  
  const shiftCounts = useMemo(() => {
    const connected = state.couriers.filter(c => c.status !== 'offline');
    const onShift = connected.filter(c => c.isOnShift);
    return { connected: connected.length, onShift: onShift.length, noShift: connected.length - onShift.length };
  }, [state.couriers]);

  const freeCouriersCount = useMemo(
    () => state.couriers.filter(
      c => c.isOnShift && !state.deliveries.some(
        d => d.courierId === c.id && ['assigned', 'delivering'].includes(d.status)
      )
    ).length,
    [state.couriers, state.deliveries]
  );

  const busyCouriersCount = useMemo(
    () => state.couriers.filter(
      c => state.deliveries.some(
        d => d.courierId === c.id && ['assigned', 'delivering'].includes(d.status)
      )
    ).length,
    [state.couriers, state.deliveries]
  );

  // Available couriers
  const availableCouriers = state.couriers.filter(c => c.status !== 'offline' && c.isOnShift);

  // Live delivery stats for the current manager dataset
  const todayDeliveries = React.useMemo(() => {
    const pending = state.deliveries.filter(d => d.status === 'pending').length;
    const assigned = state.deliveries.filter(d => d.status === 'assigned').length;
    const delivering = state.deliveries.filter(d => d.status === 'delivering').length;
    const delivered = state.deliveries.filter(d => d.status === 'delivered').length;
    const cancelled = state.deliveries.filter(d => d.status === 'cancelled').length;
    const total = state.deliveries.length;

    return { pending, assigned, delivering, delivered, cancelled, total };
  }, [state.deliveries]);

  // Filter by status
  const filteredOrders = statusFilters.length === 0 
    ? allOrders 
    : allOrders.filter(order => statusFilters.includes(order.status));

  // Filter by search
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return filteredOrders;
    
    const query = searchQuery.toLowerCase();
    return filteredOrders.filter(order => 
      order.id.toLowerCase().includes(query) ||
      order.address.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.pickup.toLowerCase().includes(query) ||
      (order.courierName && order.courierName.toLowerCase().includes(query))
    );
  }, [filteredOrders, searchQuery]);

  // Sort orders
  const orders = useMemo(() => {
    const sorted = [...searchFiltered].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'status') {
        const statusOrder = { pending: 1, assigned: 2, delivering: 3, delivered: 4, cancelled: 5 };
        const aOrder = statusOrder[a.status as keyof typeof statusOrder] || 999;
        const bOrder = statusOrder[b.status as keyof typeof statusOrder] || 999;
        comparison = aOrder - bOrder;
      } else if (sortBy === 'time') {
        comparison = a.createdAtTimestamp - b.createdAtTimestamp;
      } else if (sortBy === 'restaurant') {
        comparison = a.restaurantName.localeCompare(b.restaurantName, 'he');
      } else if (sortBy === 'address') {
        comparison = a.address.localeCompare(b.address, 'he');
      } else if (sortBy === 'ready') {
        comparison = a.prepTime - b.prepTime;
      }
      
      // Apply direction
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [searchFiltered, sortBy, sortDirection]);

  useEffect(() => {
    if (activeTab !== 'deliveries' || !pendingScrollOrderId) return;

    const frame = requestAnimationFrame(() => {
      const target = document.querySelector(`[data-order-id="${pendingScrollOrderId}"]`) as HTMLElement | null;
      if (!target) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPendingScrollOrderId(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [activeTab, pendingScrollOrderId, orders]);

  const validSelectedDeliveryIds = useMemo(() => {
    return new Set(
      [...selectedDeliveryIds].filter((deliveryId) => {
        const delivery = state.deliveries.find(d => d.id === deliveryId);
        return isDeliveryAssignable(delivery);
      })
    );
  }, [isDeliveryAssignable, selectedDeliveryIds, state.deliveries]);

  useEffect(() => {
    if (areSetsEqual(validSelectedDeliveryIds, selectedDeliveryIds)) return;
    setSelectedDeliveryIds(validSelectedDeliveryIds);
  }, [selectedDeliveryIds, validSelectedDeliveryIds]);

  useEffect(() => {
    if (!selectedCourierId) return;
    const selectedCourier = state.couriers.find((courier) => courier.id === selectedCourierId);
    if (selectedCourier && selectedCourier.status !== 'offline' && selectedCourier.isOnShift) return;

    setSelectedCourierId(null);
    setMapHighlightedCourierId(null);
  }, [selectedCourierId, state.couriers]);

  useEffect(() => {
    if (!assignmentMode) return;
    if (validSelectedDeliveryIds.size > 0) return;

    setAssignmentMode(false);
    setSelectedCourierId(null);
    setMapHighlightedCourierId(null);
    setActiveTab('deliveries');
  }, [assignmentMode, validSelectedDeliveryIds]);

  const previewRouteOrders = useMemo(() => {
    if (!assignmentMode || !selectedCourierId || validSelectedDeliveryIds.size === 0) {
      return allOrders;
    }

    const selectedIds = new Set(validSelectedDeliveryIds);
    return allOrders.map((order) => (
      selectedIds.has(order.deliveryId)
        ? { ...order, courierId: selectedCourierId }
        : order
    ));
  }, [allOrders, assignmentMode, selectedCourierId, validSelectedDeliveryIds]);

  const canCourierTakeSelectedDeliveries = useCallback((courierId: string) => {
    const courier = state.couriers.find((item) => item.id === courierId);
    if (!courier || courier.status === 'offline' || !courier.isOnShift) return false;

    const selectedDeliveries = [...validSelectedDeliveryIds]
      .map((deliveryId) => state.deliveries.find((delivery) => delivery.id === deliveryId))
      .filter((delivery): delivery is Delivery => Boolean(delivery));

    if (selectedDeliveries.length === 0) return false;

    // A courier can always receive new deliveries — they will be queued and handled
    // after their current active delivery is completed.
    return true;
  }, [state.couriers, state.deliveries, validSelectedDeliveryIds]);

  useEffect(() => {
    if (!assignmentMode || !selectedCourierId) return;
    if (canCourierTakeSelectedDeliveries(selectedCourierId)) return;

    setSelectedCourierId(null);
    setMapHighlightedCourierId(null);
  }, [assignmentMode, canCourierTakeSelectedDeliveries, selectedCourierId]);

  // Assignment handlers
  const handleOpenAssignMode = (deliveryId: string) => {
    const delivery = state.deliveries.find(d => d.id === deliveryId);
    if (!isDeliveryAssignable(delivery)) return;
    setSelectedDeliveryIds(new Set([deliveryId]));
    setSelectedCourierId(null);
    setMapHighlightedCourierId(null);
    setAssignmentMode(true);
    setActiveTab('couriers');
  };

  const handleOpenAssignForSelected = () => {
    if (validSelectedDeliveryIds.size === 0) return;
    setSelectedDeliveryIds(new Set(validSelectedDeliveryIds));
    setSelectedCourierId(null);
    setMapHighlightedCourierId(null);
    setAssignmentMode(true);
    setActiveTab('couriers');
  };

  const handleToggleSelectedDelivery = useCallback((deliveryId: string) => {
    setSelectedDeliveryIds((current) => {
      const next = new Set(current);
      if (next.has(deliveryId)) {
        next.delete(deliveryId);
      } else {
        next.add(deliveryId);
      }
      return next;
    });
  }, []);

  const handleMapOrderClick = useCallback((deliveryId: string) => {
    const delivery = state.deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    const isRoutedDelivery =
      Boolean(delivery.courierId) &&
      (delivery.status === 'assigned' || delivery.status === 'delivering');

    if (isRoutedDelivery && delivery.courierId) {
      setMapHighlightedCourierId(delivery.courierId);
      focusOrderInDeliveries(delivery.id);
      return;
    }

    focusOrderInDeliveries(delivery.id);

    setSelectedDeliveryIds(prev => {
      const next = new Set(prev);
      if (next.has(deliveryId)) next.delete(deliveryId);
      else next.add(deliveryId);
      return next;
    });
  }, [focusOrderInDeliveries, state.deliveries]);

  const handleDeliveryRowClick = useCallback((order: { id: string; deliveryId: string; fullDelivery?: { courierId?: string; status?: string } }) => {
    // selectedOrderId can be orderNumber (from list click) or UUID (from map click) — check both
    const isAlreadySelected = selectedOrderId === order.id || selectedOrderId === order.deliveryId;
    if (isAlreadySelected) {
      setSelectedOrderId(null);
      setMapHighlightedCourierId(null);
      return;
    }
    setSelectedOrderId(order.id);
    const courierId = order.fullDelivery?.courierId;
    const status = order.fullDelivery?.status;
    const isActive = status === 'assigned' || status === 'delivering';
    if (courierId && isActive) {
      setMapHighlightedCourierId(courierId);
    } else {
      setMapHighlightedCourierId(null);
    }
  }, [selectedOrderId]);

  const handleSelectCourier = (courierId: string) => {
    if (!canCourierTakeSelectedDeliveries(courierId)) {
      toast.error('שליח זה לא זמין לשיבוץ (לא מחובר או לא במשמרת).', {
        duration: 3000,
        position: 'top-center',
      });
      return;
    }

    setSelectedCourierId(courierId);
    setMapHighlightedCourierId(courierId);
    setPendingScrollCourierId(courierId);
  };

  const handleMapOrderShowDetails = useCallback((deliveryId: string) => {
    const order = allOrders.find(o => o.deliveryId === deliveryId || o.id === deliveryId);
    if (order) setSelectedOrderForDetails(order);
  }, [allOrders]);

  const handleMapCourierClick = useCallback((courierId: string) => {
    if (assignmentMode) {
      const canTake = canCourierTakeSelectedDeliveries(courierId);
      if (!canTake) {
        toast.error('שליח זה לא זמין לשיבוץ (לא מחובר או לא במשמרת).', {
          duration: 2500,
          position: 'top-center',
        });
        setActiveTab('couriers');
        setPendingScrollCourierId(courierId);
        setMapHighlightedCourierId(null);
        setSelectedCourierId(null);
        return;
      }
    }
    setActiveTab('couriers');
    setMapHighlightedCourierId(courierId);
    setSelectedCourierId(courierId);
    setPendingScrollCourierId(courierId);
  }, [assignmentMode, canCourierTakeSelectedDeliveries]);

  const handleConfirmAssignment = () => {
    if (!selectedCourierId || validSelectedDeliveryIds.size === 0) return;
    if (!canCourierTakeSelectedDeliveries(selectedCourierId)) {
      setSelectedCourierId(null);
      setMapHighlightedCourierId(null);
      toast.error('לא ניתן לשבץ כרגע את המשלוחים לשליח הזה.', { duration: 2500 });
      return;
    }
    const courier = state.couriers.find(c => c.id === selectedCourierId);
    const courierName = courier?.name || 'שליח';
    const deliveryCount = validSelectedDeliveryIds.size;
    const selectedPickupBatchIdsByRestaurant = new Map<string, string>();
    const selectedPickupBatchIdsByDeliveryId = new Map<string, string>();

    // Smart route ordering — always set a fresh order on every assignment.
    // This overrides any stale data from localStorage.
    // Rule: delivering dropoffs first (goods already picked up),
    //       then interleaved pickup→dropoff pairs for each remaining delivery.
    {
      const existingActiveDeliveries = state.deliveries.filter(
        d => d.courierId === selectedCourierId &&
             d.status !== 'delivered' && d.status !== 'cancelled'
      );
      const newDeliveryObjects = [...validSelectedDeliveryIds]
        .map(id => state.deliveries.find(d => d.id === id))
        .filter((d): d is Delivery => !!d);

      const deliveringDeliveries = existingActiveDeliveries.filter(d => d.status === 'delivering');
      const assignedDeliveries   = existingActiveDeliveries.filter(d => d.status === 'assigned');
      const existingAssignedPickupBatchIdsByRestaurant = new Map<string, string>();

      assignedDeliveries.forEach((delivery) => {
        const restaurantKey = getRestaurantPickupBaseKey(delivery);
        if (existingAssignedPickupBatchIdsByRestaurant.has(restaurantKey)) return;
        existingAssignedPickupBatchIdsByRestaurant.set(
          restaurantKey,
          getDeliveryPickupBatchKey(delivery)
        );
      });

      newDeliveryObjects.forEach((delivery) => {
        const restaurantKey = getRestaurantPickupBaseKey(delivery);
        let pickupBatchId =
          selectedPickupBatchIdsByRestaurant.get(restaurantKey) ??
          existingAssignedPickupBatchIdsByRestaurant.get(restaurantKey);

        if (!pickupBatchId) {
          pickupBatchId = createPickupBatchId(restaurantKey);
        }

        selectedPickupBatchIdsByRestaurant.set(restaurantKey, pickupBatchId);
        selectedPickupBatchIdsByDeliveryId.set(delivery.id, pickupBatchId);
      });

      const smartStops: string[] = [];
      const seenPickupGroups = new Set<string>();

      // 1. Dropoffs for already-picked-up deliveries (courier has the goods — deliver first)
      deliveringDeliveries.forEach(d => {
        smartStops.push(`${d.id}-dropoff`);
      });

      // 2. Existing assigned deliveries — interleaved pickup → dropoff
      assignedDeliveries.forEach(d => {
        const key = getDeliveryPickupBatchKey(d);
        const stopId = getPickupGroupStopId(key);
        if (!seenPickupGroups.has(stopId)) {
          seenPickupGroups.add(stopId);
          smartStops.push(stopId);
        }
        smartStops.push(`${d.id}-dropoff`);
      });

      // 3. Newly assigned deliveries — interleaved pickup → dropoff
      newDeliveryObjects.forEach(d => {
        const key =
          selectedPickupBatchIdsByDeliveryId.get(d.id) ??
          createPickupBatchId(getRestaurantPickupBaseKey(d));
        const stopId = getPickupGroupStopId(key);
        if (!seenPickupGroups.has(stopId)) {
          seenPickupGroups.add(stopId);
          smartStops.push(stopId);
        }
        smartStops.push(`${d.id}-dropoff`);
      });

      // 4. Claim pickup-groups for delivering orders at the end (map skips them
      //    when all orders in the group are already delivering).
      deliveringDeliveries.forEach(d => {
        const stopId = getPickupGroupStopId(getDeliveryPickupBatchKey(d));
        if (!smartStops.includes(stopId)) smartStops.push(stopId);
      });

      if (smartStops.length > 0) {
        setRouteStopOrders(prev => ({
          ...prev,
          [selectedCourierId]: smartStops,
        }));
      }
    }

    validSelectedDeliveryIds.forEach((deliveryId) =>
      assignCourier(deliveryId, selectedCourierId, selectedPickupBatchIdsByDeliveryId.get(deliveryId))
    );

    toast.success(
      deliveryCount === 1
        ? `משלוח שובץ ל${courierName} ✓`
        : `${deliveryCount} משלוחים שובצו ל${courierName} ✓`,
      { duration: 2500 }
    );

    setAssignmentMode(false);
    setSelectedDeliveryIds(new Set());
    setSelectedCourierId(null);
    setMapHighlightedCourierId(null);
  };

  const handleCancelAssignment = () => {
    setAssignmentMode(false);
    setSelectedDeliveryIds(new Set());
    setSelectedCourierId(null);
    setMapHighlightedCourierId(null);
    setActiveTab('deliveries');
  };

  // Get sort direction label
  const getSortLabel = () => {
    if (sortBy === 'time') {
      return sortDirection === 'desc' ? 'זמן (חדש -> ישן)' : 'זמן (ישן -> חדש)';
    } else if (sortBy === 'status') {
      return sortDirection === 'asc' ? 'סטטוס (↑)' : 'סטטוס (↓)';
    } else if (sortBy === 'restaurant') {
      return sortDirection === 'asc' ? 'מסעדה (א→ת)' : 'מסעדה (ת→א)';
    } else if (sortBy === 'address') {
      return sortDirection === 'asc' ? 'כתובת (א→ת)' : 'כתובת (ת→א)';
    } else if (sortBy === 'ready') {
      return sortDirection === 'asc' ? 'מוכן (↑)' : 'מוכן (↓)';
    }
    return 'סטטוס';
  };

  return (
    <>
      {/* Main Layout: Full Screen Map + Floating Panel */}
      <div className="flex flex-col h-screen w-full overflow-hidden relative bg-[#f5f5f5] dark:bg-[#0a0a0a] touch-none">
        
        {/* Mobile Menu Button */}
        <div className="md:hidden absolute top-4 right-4 z-50">
          <button
            onClick={openMobileSidebar}
            className="p-3 bg-white dark:bg-[#171717] rounded-xl shadow-lg border border-[#e5e5e5] dark:border-[#262626] hover:bg-[#fafafa] dark:hover:bg-[#262626] active:scale-95 transition-all"
          >
            <Menu className="w-6 h-6 text-[#0d0d12] dark:text-white" />
          </button>
        </div>

        {/* Full Screen Map */}
        <div className="absolute inset-0 z-0">
          <LeafletMap
              orders={filteredOrders}
              routeOrders={previewRouteOrders}
              selectedId={selectedOrderId}
              couriers={mapCouriers}
            restaurants={uniqueRestaurants}
            onOrderHover={setHoveredOrderId}
            onCourierHover={setHoveredCourierId}
            onRestaurantHover={setHoveredRestaurantName}
            hoveredOrderId={hoveredOrderId}
            hoveredCourierId={hoveredCourierId}
            hoveredRestaurantName={hoveredRestaurantName}
            highlightedCourierId={assignmentMode ? (selectedCourierId ?? mapHighlightedCourierId) : mapHighlightedCourierId}
            routeStopOrders={routeStopOrders}
            selectedDeliveryIds={selectedDeliveryIds}
            onOrderClick={handleMapOrderClick}
            onOrderShowDetails={handleMapOrderShowDetails}
            onCourierClick={handleMapCourierClick}
            onMapClick={() => {
              setMapHighlightedCourierId(null);
              setSelectedOrderId(null);
              setPendingScrollOrderId(null);
              setSelectedDeliveryIds(new Set());
            }}
          />

        </div>

        {/* Floating Panel - DESKTOP - Unified */}
        <div
          className={`hidden md:flex absolute top-4 right-4 z-20 bg-white/95 dark:bg-[#171717]/95 backdrop-blur-lg border border-[#e5e5e5] dark:border-[#262626] rounded-2xl shadow-2xl flex-col overflow-hidden transition-all duration-300 ${
            panelSize === 'minimized'
              ? 'cursor-pointer hover:shadow-3xl'
              : 'max-h-[calc(100vh-32px)]'
          } ${
            panelSize === 'minimized'
              ? 'w-auto'
              : panelSize === 'normal'
              ? 'w-[415px]'
              : panelSize === 'medium'
              ? 'w-[580px]'
              : 'w-[760px]'
          }`}
          onClick={panelSize === 'minimized' ? () => setPanelSize('normal') : undefined}
        >
          {/* Minimized Widget */}
          {panelSize === 'minimized' ? (
            <LiveManagerMinimizedWidget
              totalDeliveries={todayDeliveries.total}
              pendingCount={todayDeliveries.pending}
              inProgressCount={todayDeliveries.assigned + todayDeliveries.pickingUp}
              deliveredCount={todayDeliveries.delivered}
              cancelledCount={todayDeliveries.cancelled}
              availableCouriersCount={availableCouriers.length}
              onExpand={(event) => {
                event.stopPropagation();
                setPanelSize('normal');
              }}
            />
          ) : (
          <>
          <LiveManagerDesktopHeader
            activeTab={activeTab}
            deliveriesCount={orders.length}
            couriersCount={availableCouriers.length}
            panelSize={panelSize}
            onSelectDeliveries={() => {
              setActiveTab('deliveries');
              if (assignmentMode) {
                setAssignmentMode(false);
                setSelectedDeliveryIds(new Set());
                setSelectedCourierId(null);
              }
            }}
            onSelectCouriers={() => setActiveTab('couriers')}
            onCyclePanelSize={() => {
              setPanelSize(prev =>
                prev === 'normal'
                  ? 'medium'
                  : prev === 'medium'
                  ? 'large'
                  : 'normal'
              );
            }}
            onMinimize={() => setPanelSize('minimized')}
          />

          <LiveManagerDesktopControls
            activeTab={activeTab}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            shiftFilter={shiftFilter}
            courierQuickFilter={courierQuickFilter}
            shiftCounts={shiftCounts}
            freeCouriersCount={freeCouriersCount}
            busyCouriersCount={busyCouriersCount}
            onToggleShiftFilter={handleToggleShiftFilter}
            onToggleCourierQuickFilter={handleToggleCourierQuickFilter}
            onSetShiftFilter={handleSetShiftFilter}
            statusFilters={statusFilters}
            todayDeliveries={todayDeliveries}
            onToggleStatusFilter={toggleStatusFilter}
          />

          {/* Content Area - Dynamic based on activeTab */}
          <div className="flex-1 overflow-y-auto relative">
            {activeTab === 'deliveries' ? (
              <>
                <LiveDeliveriesTab
                  orders={orders}
                  routeEtaLabelByDeliveryId={routeEtaLabelByDeliveryId}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  showSortMenu={showSortMenu}
                  sortLabel={getSortLabel()}
                  selectedOrderId={selectedOrderId}
                  selectedDeliveryIds={validSelectedDeliveryIds}
                  hoveredOrderId={hoveredOrderId}
                  isDeliverySelectable={(deliveryId) =>
                    isDeliveryAssignable(state.deliveries.find((delivery) => delivery.id === deliveryId))
                  }
                  onToggleSortMenu={() => setShowSortMenu(!showSortMenu)}
                  onCloseSortMenu={() => setShowSortMenu(false)}
                  onSelectSort={(value) => {
                    setSortBy(value);
                    setShowSortMenu(false);
                  }}
                  onToggleDirection={() =>
                    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                  }
                  onOrderClick={handleDeliveryRowClick}
                  onCancel={cancelDelivery}
                  onUnassign={unassignCourier}
                  onAssignCourier={handleOpenAssignMode}
                  onToggleSelection={handleToggleSelectedDelivery}
                  onHover={setHoveredOrderId}
                  onShowDetails={setSelectedOrderForDetails}
                  onClearSelection={() => setSelectedDeliveryIds(new Set())}
                  onAssignSelected={handleOpenAssignForSelected}
                />
              </>
            ) : (
              /* Couriers Tab */
              <>
                 <LiveCouriersView
                    onCourierClick={assignmentMode ? handleSelectCourier : undefined}
                    onCourierExpand={setMapHighlightedCourierId}
                    shiftFilter={shiftFilter}
                    assignmentMode={assignmentMode}
                  selectedDeliveryCount={validSelectedDeliveryIds.size}
                  onCancelAssignment={handleCancelAssignment}
                  selectedCourierId={selectedCourierId}
                  onClearCourierSelection={() => {
                    setSelectedCourierId(null);
                    setMapHighlightedCourierId(null);
                  }}
                  onConfirmAssignment={handleConfirmAssignment}
                  previewDeliveryIds={validSelectedDeliveryIds}
                  scrollToCourierId={pendingScrollCourierId}
                  onCourierScrolled={() => setPendingScrollCourierId(null)}
                  routeStopOrders={routeStopOrders}
                  onRouteStopOrdersChange={setRouteStopOrders}
                  quickFilter={courierQuickFilter}
                  courierLocations={courierLocationMap}
                />
              </>
            )}
          </div>
          </>
          )}
        </div>

        {/* Floating Panel - MOBILE - Main Content Card */}
        <div 
          className={`md:hidden absolute bottom-[72px] left-0 right-0 z-20 transition-all duration-300 ease-out ${
            panelHeight === 'half' 
              ? 'h-[45vh]' 
              : 'h-[calc(100vh-96px)]'
          }`}
        >
          <div className="h-full bg-white/95 dark:bg-[#171717]/95 backdrop-blur-lg border-t border-[#e5e5e5] dark:border-t-[#262626] shadow-2xl flex flex-col overflow-hidden rounded-t-[24px]">
            {/* Drag Handle */}
            <div 
              className="flex-shrink-0 py-2 flex justify-center cursor-pointer active:cursor-grabbing"
              onTouchStart={(e) => {
                setIsDragging(true);
                setDragStartY(e.touches[0].clientY);
                setDragStartHeight(panelHeight);
              }}
              onTouchMove={(e) => {
                if (!isDragging) return;
                const deltaY = dragStartY - e.touches[0].clientY;
                if (deltaY > 50 && dragStartHeight === 'half') {
                  setPanelHeight('full');
                  setIsDragging(false);
                } else if (deltaY < -50 && dragStartHeight === 'full') {
                  setPanelHeight('half');
                  setIsDragging(false);
                }
              }}
              onTouchEnd={() => setIsDragging(false)}
              onClick={() => setPanelHeight(prev => prev === 'half' ? 'full' : 'half')}
            >
              <div className="w-10 h-1 bg-[#d4d4d4] dark:bg-[#404040] rounded-full"></div>
            </div>

            {(activeTab === 'deliveries' || activeTab === 'couriers') && (
              <LiveManagerMobileControls
                activeTab={activeTab}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                shiftFilter={shiftFilter}
                courierQuickFilter={courierQuickFilter}
                shiftCounts={shiftCounts}
                freeCouriersCount={freeCouriersCount}
                busyCouriersCount={busyCouriersCount}
                onToggleShiftFilter={handleToggleShiftFilter}
                onToggleCourierQuickFilter={handleToggleCourierQuickFilter}
                onSetShiftFilter={handleSetShiftFilter}
                statusFilters={statusFilters}
                todayDeliveries={todayDeliveries}
                onToggleStatusFilter={toggleStatusFilter}
              />
            )}

            {/* Content Area - Dynamic based on activeTab */}
            <div className="flex-1 overflow-y-auto relative">
              {activeTab === 'deliveries' ? (
                <>
                  <LiveDeliveriesTab
                    orders={orders}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    showSortMenu={showSortMenu}
                    sortLabel={getSortLabel()}
                    selectedOrderId={selectedOrderId}
                    selectedDeliveryIds={validSelectedDeliveryIds}
                    hoveredOrderId={hoveredOrderId}
                    isDeliverySelectable={(deliveryId) =>
                      isDeliveryAssignable(state.deliveries.find((delivery) => delivery.id === deliveryId))
                    }
                    onToggleSortMenu={() => setShowSortMenu(!showSortMenu)}
                    onCloseSortMenu={() => setShowSortMenu(false)}
                    onSelectSort={(value) => {
                      setSortBy(value);
                      setShowSortMenu(false);
                    }}
                    onToggleDirection={() =>
                      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                    }
                    onOrderClick={handleDeliveryRowClick}
                    onCancel={cancelDelivery}
                    onUnassign={unassignCourier}
                    onAssignCourier={handleOpenAssignMode}
                    onToggleSelection={handleToggleSelectedDelivery}
                    onHover={setHoveredOrderId}
                    onShowDetails={setSelectedOrderForDetails}
                    onClearSelection={() => setSelectedDeliveryIds(new Set())}
                    onAssignSelected={handleOpenAssignForSelected}
                  />
                </>
              ) : (
                /* Couriers Tab */
                <>
                   <LiveCouriersView
                     onCourierExpand={setMapHighlightedCourierId}
                     shiftFilter={shiftFilter}
                     onCourierClick={(courierId) => {
                      setSelectedCourierId(courierId);
                      setPendingScrollCourierId(courierId);
                    }}
                    selectedCourierId={selectedCourierId}
                    scrollToCourierId={pendingScrollCourierId}
                    onCourierScrolled={() => setPendingScrollCourierId(null)}
                    routeStopOrders={routeStopOrders}
                    onRouteStopOrdersChange={setRouteStopOrders}
                    quickFilter={courierQuickFilter}
                    courierLocations={courierLocationMap}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Fixed Card - MOBILE - Tabs/Actions */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[40]">
          <BottomAppBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenMenu={openMobileSidebar}
          />
        </div>


        {/* Order Details Panel */}
        <OrderDetailsPanel
          order={selectedOrderForDetails}
          onClose={() => setSelectedOrderForDetails(null)}
          onEditDelivery={handleOpenEditDelivery}
        />

        {/* Edit Delivery Dialog */}
        <DeliveryEditDialog
          delivery={editDelivery}
          isOpen={!!editDeliveryId}
          onClose={handleCloseEditDelivery}
          onSave={handleSaveEditDelivery}
        />

      </div>
    </>
  );
};
