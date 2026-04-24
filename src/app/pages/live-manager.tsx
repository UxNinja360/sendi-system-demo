import React, { useState, useEffect, useRef, useCallback, type SetStateAction } from 'react';
import { useNavigate } from 'react-router';
import { useDelivery } from '../context/delivery-context-value';
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
  COURIER_FALLBACK_POSITIONS,
  normalizeRouteStopOrder,
} from '../live/live-simulation-engine';
import type { Delivery } from '../types/delivery.types';
import {
  buildDefaultRouteStopIds,
} from '../utils/pickup-batches';
import { DELIVERY_STORAGE_KEYS } from '../context/delivery-storage';

const LIVE_MANAGER_ROUTE_STOP_ORDERS_STORAGE_KEY = DELIVERY_STORAGE_KEYS.liveRouteStopOrders;
const LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY = DELIVERY_STORAGE_KEYS.liveCourierPositions;

// Live manager page shell.
export const LiveManager: React.FC = () => {
  const navigate = useNavigate();
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
  const routeStopOrders = state.courierRoutePlans;
  const routeStopOrdersRef = useRef(routeStopOrders);

  useEffect(() => {
    routeStopOrdersRef.current = routeStopOrders;
  }, [routeStopOrders]);

  const setRouteStopOrders = useCallback((updater: SetStateAction<Record<string, string[]>>) => {
    const currentRouteStopOrders = routeStopOrdersRef.current;
    const nextRouteStopOrders =
      typeof updater === 'function' ? updater(currentRouteStopOrders) : updater;

    dispatch({
      type: 'SET_COURIER_ROUTE_PLANS',
      payload: nextRouteStopOrders,
    });
  }, [dispatch]);

  const handleMapRestaurantShowDetails = useCallback((restaurantId: string) => {
    navigate(`/restaurant/${restaurantId}`);
  }, [navigate]);

  const handleMapToggleRestaurant = useCallback((restaurantId: string) => {
    dispatch({ type: 'TOGGLE_RESTAURANT', payload: restaurantId });
  }, [dispatch]);
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

  const readStoredCourierPositions = useCallback(() => {
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
  }, []);

  useEffect(() => {
    const mapsEqual = (
      left: Map<string, { lat: number; lng: number }>,
      right: Map<string, { lat: number; lng: number }>
    ) => {
      if (left.size !== right.size) return false;
      for (const [key, value] of left.entries()) {
        const match = right.get(key);
        if (!match || match.lat !== value.lat || match.lng !== value.lng) {
          return false;
        }
      }
      return true;
    };

    const syncStoredPositions = () => {
      const next = readStoredCourierPositions();
      setCourierPositions((prev) => (mapsEqual(prev, next) ? prev : next));
    };

    syncStoredPositions();

    if (typeof window === 'undefined') return undefined;

    const interval = window.setInterval(syncStoredPositions, 1000);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LIVE_MANAGER_COURIER_POSITIONS_STORAGE_KEY) {
        syncStoredPositions();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [readStoredCourierPositions]);

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
              onRestaurantShowDetails={handleMapRestaurantShowDetails}
              onRestaurantToggleActive={handleMapToggleRestaurant}
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
          inProgressCount={todayDeliveries.assigned + todayDeliveries.delivering}
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


