import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDelivery } from '../context/delivery.context';
import { Delivery } from '../types/delivery.types';
import { LiveDeliveriesTab } from '../live/live-deliveries-tab';
import { LiveRestaurantsView } from '../live/live-restaurants-view';
import { LiveCouriersView } from '../live/live-couriers-view';
import { LeafletMap } from '../live/leaflet-map';
import { LiveManagerDesktopPanel } from '../live/live-manager-desktop-panel';
import { OrderDetailsPanel } from '../live/order-details-panel';
import { LiveManagerMobilePanel } from '../live/live-manager-mobile-panel';
import { useLiveAssignmentFlow } from '../live/use-live-assignment-flow';
import { useLiveManagerControls } from '../live/use-live-manager-controls';
import { useLiveManagerData } from '../live/use-live-manager-data';
import { useLiveDeliveryEdit } from '../live/use-live-delivery-edit';
import { useLiveManagerEffects } from '../live/use-live-manager-effects';
import { useLiveManagerSelection } from '../live/use-live-manager-selection';
import BottomAppBar from '../live/bottom-app-bar';
import { DeliveryEditDialog } from '../deliveries/delivery-edit-dialog';
import {
  buildDefaultRouteStopIds,
  getDeliveryPickupBatchKey,
} from '../utils/pickup-batches';
const LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY = 'sendi-live-manager-route-stop-orders';
const LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY = 'sendi-live-manager-courier-positions';
const LIVE_MANAGER_COURIER_POSITIONS_TS_STORAGE_KEY = 'sendi-live-manager-courier-positions-ts';

const COURIER_MOVE_SPEED = 0.00012;

// Fallback courier starting positions across Tel Aviv / Gush Dan.
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

// Live manager page shell.
export const LiveManager: React.FC = () => {
  const { state, dispatch, assignCourier, cancelDelivery, unassignCourier, updateDelivery } = useDelivery();
  const {
    activeTab,
    courierQuickFilter,
    handleCloseSortMenu,
    handleCyclePanelSize,
    handleExpandPanel,
    handleSetShiftFilter,
    handleMinimizePanel,
    handleMobilePanelTouchEnd,
    handleMobilePanelTouchMove,
    handleMobilePanelTouchStart,
    handleSelectSort,
    handleToggleCourierQuickFilter,
    handleTogglePanelHeight,
    handleToggleSortDirection,
    handleToggleSortMenu,
    handleToggleShiftFilter,
    panelHeight,
    panelSize,
    searchQuery,
    setActiveTab,
    setPanelSize,
    setSearchQuery,
    shiftFilter,
    showSortMenu,
    sortBy,
    sortDirection,
    sortLabel,
    statusFilters,
    toggleStatusFilter,
  } = useLiveManagerControls();
  const {
    clearCourierSelection,
    clearOrderSelection,
    focusOrderInDeliveries,
    mapHighlightedCourierId,
    pendingScrollCourierId,
    setMapHighlightedCourierId,
    setPendingScrollCourierId,
    setSelectedCourierId,
    setSelectedOrderId,
    selectedCourierId,
    selectedOrderId,
  } = useLiveManagerSelection({
    activeTab,
    couriers: state.couriers,
    setActiveTab,
  });
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
  }); // Route stop order per courier.

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

  // Simulator WebSocket bridge
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
          // Map simulator payloads by index to the current courier list.
          msg.couriers.forEach((c: any, i: number) => {
            map.set(`sim_${i}`, { lat: c.lat, lng: c.lng });
            // Also keep a name-based mapping as a fallback.
            map.set(c.name, { lat: c.lat, lng: c.lng });
          });
          setSimPositions(map);
        }
      } catch {
        // Ignore malformed simulator payloads and wait for the next tick.
      }
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

  // In-app courier movement engine
  // Tracks courier positions when the external simulator is not connected.
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

  // Keep the latest positions available to the movement tick.
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

  // Keep the latest state snapshots available inside the tick interval.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const simPositionsRef = useRef(simPositions);
  useEffect(() => { simPositionsRef.current = simPositions; }, [simPositions]);
  const routeStopOrdersRef = useRef(routeStopOrders);
  useEffect(() => { routeStopOrdersRef.current = routeStopOrders; }, [routeStopOrders]);

  // Pickup priority per courier: the first stop id is handled next.
  // This order can later be changed by drag-and-drop in the manager UI.
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

  // Move each courier toward its next active route target.
  useEffect(() => {
    const SPEED = COURIER_MOVE_SPEED; // ~12m per second
    const ARRIVE = 0.0003; // ~30m counts as arrival

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

        // Build the ordered list of remaining stops for this courier.
        const defaultStops = buildDefaultStopIds(activeDeliveries);
        const stopIds = normalizeRouteStopOrder(routeStopOrdersRef.current[courier.id], defaultStops);

        // Find the next stop that is still pending.
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
            // Dropoff stops only matter while the delivery is out for delivery.
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
            // Check whether the order is ready for pickup.
            const areAllOrdersReady = nextStopDeliveries.every((delivery) =>
              delivery.order_ready ||
              delivery.reportedOrderIsReady ||
              (delivery.arrivedAtRestaurantAt &&
                Date.now() - new Date(delivery.arrivedAtRestaurantAt).getTime() >=
                  (delivery.preparationTime || delivery.cook_time || 5) * 60000 / (stateRef.current.timeMultiplier || 1))
            );

            if (areAllOrdersReady) {
              // Food is ready: pick it up and continue to the customer.
              statusUpdates.push({ type: 'delivering', ids: nextStopDeliveryIds });
            } else {
              const notArrivedDeliveryIds = nextStopDeliveries
                .filter((delivery) => !delivery.arrivedAtRestaurantAt)
                .map((delivery) => delivery.id);

              if (notArrivedDeliveryIds.length > 0) {
              // First arrival at the restaurant: wait for food readiness.
                statusUpdates.push({ type: 'arrived_pickup', ids: notArrivedDeliveryIds });
              }
            }
            // Otherwise the courier is already waiting at the restaurant.
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
          // Remove completed stop ids from all saved route orders.
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
          // Courier reached the restaurant and stays assigned until pickup.
          dispatch({ type: 'UPDATE_DELIVERY', payload: { deliveryId: id, updates: { arrivedAtRestaurantAt: new Date() } } });
        } else if (type === 'delivering') {
          // Food is ready, so the courier picks up and heads to the customer.
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
  // Hover state used to correlate list items and map markers.
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [hoveredCourierId, setHoveredCourierId] = useState<string | null>(null);
  const [hoveredRestaurantName, setHoveredRestaurantName] = useState<string | null>(null);

  const isDeliveryAssignable = useCallback((delivery?: Delivery | null) => {
    return delivery?.status === 'pending';
  }, []);

  const {
    editDelivery,
    editDeliveryId,
    handleCloseEditDelivery,
    handleCloseOrderDetails,
    handleOpenEditDelivery,
    handleSaveEditDelivery,
    selectedOrderForDetails,
    setSelectedOrderForDetails,
  } = useLiveDeliveryEdit({
    deliveries: state.deliveries,
    updateDelivery,
  });

  useLiveManagerEffects();

  const {
    allOrders,
    availableCouriers,
    courierLocationMap,
    filteredOrders,
    freeCouriersCount,
    busyCouriersCount,
    mapCouriers,
    orders,
    routeEtaLabelByDeliveryId,
    shiftCounts,
    todayDeliveries,
    uniqueRestaurants,
  } = useLiveManagerData({
    buildDefaultStopIds,
    courierFallbackPositions: COURIER_FALLBACK_POSITIONS,
    courierPositions,
    normalizeRouteStopOrder,
    routeStopOrders,
    searchQuery,
    shiftFilter,
    simPositions,
    sortBy,
    sortDirection,
    state,
    statusFilters,
  });

  const {
    assignmentMode,
    handleCancelAssignment,
    handleConfirmAssignment,
    handleDeliveryRowClick,
    handleMapCourierClick,
    handleMapOrderClick,
    handleMapOrderShowDetails,
    handleOpenAssignForSelected,
    handleOpenAssignMode,
    handleSelectCourier,
    handleToggleSelectedDelivery,
    previewRouteOrders,
    resetAssignmentFlow,
    selectedDeliveryIds,
    setSelectedDeliveryIds,
    validSelectedDeliveryIds,
  } = useLiveAssignmentFlow({
    allOrders,
    assignCourier,
    clearCourierSelection,
    clearOrderSelection,
    couriers: state.couriers,
    deliveries: state.deliveries,
    focusOrderInDeliveries,
    isDeliveryAssignable,
    selectedCourierId,
    selectedOrderId,
    setActiveTab,
    setMapHighlightedCourierId,
    setPendingScrollCourierId,
    setSelectedCourierId,
    setSelectedOrderForDetails,
    setSelectedOrderId,
    setRouteStopOrders,
  });

  const liveManagerControlsProps = {
    activeTab,
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    shiftFilter,
    courierQuickFilter,
    shiftCounts,
    freeCouriersCount,
    busyCouriersCount,
    onToggleShiftFilter: handleToggleShiftFilter,
    onToggleCourierQuickFilter: handleToggleCourierQuickFilter,
    onSetShiftFilter: handleSetShiftFilter,
    statusFilters,
    todayDeliveries,
    onToggleStatusFilter: toggleStatusFilter,
  };

  const commonDeliveriesTabProps = {
    orders,
    sortBy,
    sortDirection,
    showSortMenu,
    sortLabel: sortLabel(),
    selectedOrderId,
    selectedDeliveryIds: validSelectedDeliveryIds,
    hoveredOrderId,
    isDeliverySelectable: (deliveryId: string) =>
      isDeliveryAssignable(state.deliveries.find((delivery) => delivery.id === deliveryId)),
    onToggleSortMenu: handleToggleSortMenu,
    onCloseSortMenu: handleCloseSortMenu,
    onSelectSort: handleSelectSort,
    onToggleDirection: handleToggleSortDirection,
    onOrderClick: handleDeliveryRowClick,
    onCancel: cancelDelivery,
    onUnassign: unassignCourier,
    onAssignCourier: handleOpenAssignMode,
    onToggleSelection: handleToggleSelectedDelivery,
    onHover: setHoveredOrderId,
    onShowDetails: setSelectedOrderForDetails,
    onClearSelection: () => setSelectedDeliveryIds(new Set()),
    onAssignSelected: handleOpenAssignForSelected,
  };

  const desktopCouriersViewProps = {
    onCourierClick: assignmentMode ? handleSelectCourier : undefined,
    onCourierExpand: setMapHighlightedCourierId,
    shiftFilter,
    assignmentMode,
    selectedDeliveryCount: validSelectedDeliveryIds.size,
    onCancelAssignment: handleCancelAssignment,
    selectedCourierId,
    onClearCourierSelection: clearCourierSelection,
    onConfirmAssignment: handleConfirmAssignment,
    previewDeliveryIds: validSelectedDeliveryIds,
    scrollToCourierId: pendingScrollCourierId,
    onCourierScrolled: () => setPendingScrollCourierId(null),
    routeStopOrders,
    onRouteStopOrdersChange: setRouteStopOrders,
    quickFilter: courierQuickFilter,
    courierLocations: courierLocationMap,
  };

  const mobileCouriersViewProps = {
    onCourierExpand: setMapHighlightedCourierId,
    shiftFilter,
    onCourierClick: (courierId: string) => {
      setSelectedCourierId(courierId);
      setPendingScrollCourierId(courierId);
    },
    selectedCourierId,
    scrollToCourierId: pendingScrollCourierId,
    onCourierScrolled: () => setPendingScrollCourierId(null),
    routeStopOrders,
    onRouteStopOrdersChange: setRouteStopOrders,
    quickFilter: courierQuickFilter,
    courierLocations: courierLocationMap,
  };

  return (
    <>
      {/* Main layout */}
      <div className="flex flex-col h-screen w-full overflow-hidden relative bg-[#f5f5f5] dark:bg-[#0a0a0a] touch-none">
        {/* Full-screen map */}
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
              clearOrderSelection();
              setSelectedDeliveryIds(new Set());
            }}
          />

        </div>

        <LiveManagerDesktopPanel
          panelSize={panelSize}
          deliveriesCount={orders.length}
          couriersCount={availableCouriers.length}
          totalDeliveries={todayDeliveries.total}
          pendingCount={todayDeliveries.pending}
          inProgressCount={todayDeliveries.assigned + todayDeliveries.pickingUp}
          deliveredCount={todayDeliveries.delivered}
          cancelledCount={todayDeliveries.cancelled}
          availableCouriersCount={availableCouriers.length}
          onExpand={handleExpandPanel}
          onSelectDeliveries={() => {
            setActiveTab('deliveries');
            if (assignmentMode) {
              resetAssignmentFlow();
            }
          }}
          onSelectCouriers={() => setActiveTab('couriers')}
          onCyclePanelSize={handleCyclePanelSize}
          onMinimize={handleMinimizePanel}
          controlsProps={liveManagerControlsProps}
          deliveriesTabProps={{
            ...commonDeliveriesTabProps,
            routeEtaLabelByDeliveryId,
          }}
          couriersViewProps={desktopCouriersViewProps}
        />

        <LiveManagerMobilePanel
          panelHeight={panelHeight}
          controlsProps={liveManagerControlsProps}
          deliveriesTabProps={commonDeliveriesTabProps}
          couriersViewProps={mobileCouriersViewProps}
          onTouchStart={handleMobilePanelTouchStart}
          onTouchMove={handleMobilePanelTouchMove}
          onTouchEnd={handleMobilePanelTouchEnd}
          onToggleHeight={handleTogglePanelHeight}
        />

        {/* Mobile bottom bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[40]">
          <BottomAppBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenMenu={openMobileSidebar}
          />
        </div>


        {/* Order details panel */}
        <OrderDetailsPanel
          order={selectedOrderForDetails}
          onClose={handleCloseOrderDetails}
          onEditDelivery={handleOpenEditDelivery}
        />

        {/* Edit delivery dialog */}
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


