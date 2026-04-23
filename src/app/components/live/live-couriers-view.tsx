import React, { useState, useMemo, useEffect } from 'react';
import { UserCircle } from 'lucide-react';
import { useDelivery } from '../../context/delivery.context';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { LiveCouriersAssignmentBar } from './live-couriers-assignment-bar';
import { LiveCourierListItem } from './live-courier-list-item';
import { LiveCouriersToolbar } from './live-couriers-toolbar';
import { useLiveCouriersViewActions } from './use-live-couriers-view-actions';
import { useLiveCouriersViewControls } from './use-live-couriers-view-controls';
import {
  MapPosition,
  RouteStop,
  deliveriesToRouteStops,
  estimateTravelMinutes,
  getPickupReadyAt,
  getStopLocation,
  hasValidPosition,
} from './live-couriers-view-utils';

interface LiveCouriersViewProps {
  onCourierClick?: (courierId: string) => void;
  onCourierExpand?: (courierId: string | null) => void;
  shiftFilter?: 'all' | 'shift' | 'no_shift';
  assignmentMode?: boolean;
  selectedDeliveryCount?: number;
  onCancelAssignment?: () => void;
  selectedCourierId?: string | null;
  onClearCourierSelection?: () => void;
  onConfirmAssignment?: () => void;
  previewDeliveryIds?: Set<string>;
  scrollToCourierId?: string | null;
  onCourierScrolled?: () => void;
  routeStopOrders: Record<string, string[]>;
  onRouteStopOrdersChange: (updater: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
  quickFilter?: 'all' | 'free' | 'busy';
  courierLocations?: Record<string, MapPosition>;
}

export const LiveCouriersView: React.FC<LiveCouriersViewProps> = ({
  onCourierClick,
  onCourierExpand,
  shiftFilter = 'all' as const,
  assignmentMode = false,
  selectedDeliveryCount = 0,
  onCancelAssignment,
  selectedCourierId,
  onClearCourierSelection,
  onConfirmAssignment,
  previewDeliveryIds,
  scrollToCourierId,
  onCourierScrolled,
  routeStopOrders,
  onRouteStopOrdersChange,
  quickFilter = 'all',
  courierLocations,
}) => {
  const { state, dispatch } = useDelivery();
  const [expandedCourierIds, setExpandedCourierIds] = useState<Set<string>>(new Set());
  const [hoveredCourierId, setHoveredCourierId] = useState<string | null>(null);
  const [pendingRouteOrder, setPendingRouteOrder] = useState<{ courierId: string; order: string[] } | null>(null);

  const previewDeliveries = useMemo(() => {
    if (!previewDeliveryIds || previewDeliveryIds.size === 0) return [];
    return state.deliveries.filter(d => previewDeliveryIds.has(d.id));
  }, [previewDeliveryIds, state.deliveries]);

  // Connected couriers drive the filters and summary states.
  const connectedCouriers = useMemo(
    () => state.couriers.filter((courier) => courier.status !== 'offline'),
    [state.couriers]
  );

  const couriersWithOrders = useMemo(() => {
    return state.couriers
      .filter((courier) => {
        if (courier.status === 'offline') return false;
        if (shiftFilter === 'shift' && !courier.isOnShift) return false;
        if (shiftFilter === 'no_shift' && courier.isOnShift) return false;
        return true;
      })
      .map((courier) => {
        const activeOrders = state.deliveries.filter(
          (d) =>
            d.courierId === courier.id &&
            (d.status === 'assigned' || d.status === 'delivering')
        );

        // Build route stops from the courier's active deliveries.
        let stops = deliveriesToRouteStops(activeOrders, false);

        // Append preview stops while assigning more deliveries to this courier.
        if (assignmentMode && selectedCourierId === courier.id && previewDeliveries.length > 0) {
          const existingIds = new Set(stops.map(s => s.id));
          const previewStops = deliveriesToRouteStops(
            previewDeliveries.filter(d => !activeOrders.some(a => a.id === d.id)),
            true
          ).filter(s => !existingIds.has(s.id));
          stops = [...stops, ...previewStops];
        }

        // Guard against duplicate stop ids after merging preview data.
        const seen = new Set<string>();
        stops = stops.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });

        // Apply pending or persisted route ordering for this courier.
        const effectiveOrder =
          (pendingRouteOrder?.courierId === courier.id ? pendingRouteOrder.order : null)
          ?? routeStopOrders[courier.id];
        if (effectiveOrder && effectiveOrder.length > 0) {
          const orderedStops = effectiveOrder
            .map((stopId) => stops.find((s) => s.id === stopId))
            .filter((s) => s !== undefined) as RouteStop[];
          const orderedIds = new Set(effectiveOrder);
          const newStops = stops.filter((s) => !orderedIds.has(s.id));
          stops = [...orderedStops, ...newStops];
        }

        return {
          ...courier,
          activeOrders,
          routeStops: stops,
        };
      });
  }, [state.couriers, state.deliveries, routeStopOrders, pendingRouteOrder, shiftFilter, assignmentMode, selectedCourierId, previewDeliveries]);

  const routeEtaByCourier = useMemo(() => {
    const now = new Date();
    const etaByCourier: Record<string, Record<string, Date>> = {};

    couriersWithOrders.forEach((courier) => {
      let currentPosition =
        courierLocations?.[courier.id] ??
        (() => {
          const positionedDelivery = courier.activeOrders.find((delivery) =>
            hasValidPosition({
              lat: delivery.runner_at_assigning_latitude,
              lng: delivery.runner_at_assigning_longitude,
            })
          );

          if (!positionedDelivery) return null;

          return {
            lat: positionedDelivery.runner_at_assigning_latitude as number,
            lng: positionedDelivery.runner_at_assigning_longitude as number,
          };
        })();

      let cursor = new Date(now);
      const etaByStop: Record<string, Date> = {};

      courier.routeStops.forEach((stop) => {
        const groupedOrders = stop.orders ?? [stop.order];
        const alreadyPickedUp =
          stop.type === 'pickup' &&
          groupedOrders.every((delivery) => delivery.status === 'delivering' || delivery.status === 'delivered');

        if (alreadyPickedUp) {
          const pickupCompletedAt = groupedOrders
            .map((delivery) => delivery.pickedUpAt ?? null)
            .find((value): value is Date => value instanceof Date && !Number.isNaN(new Date(value).getTime()));

          if (pickupCompletedAt) {
            etaByStop[stop.id] = new Date(pickupCompletedAt);
          }
          return;
        }

        const nextLocation = getStopLocation(stop);
        const travelMinutes = estimateTravelMinutes(currentPosition, nextLocation);
        cursor = new Date(cursor.getTime() + travelMinutes * 60000);

        if (stop.type === 'pickup') {
          const readyAt = getPickupReadyAt(groupedOrders);
          if (readyAt && cursor < readyAt) {
            cursor = new Date(readyAt);
          }
        }

        etaByStop[stop.id] = new Date(cursor);
        currentPosition = nextLocation ?? currentPosition;

        const serviceMinutes = stop.type === 'pickup'
          ? Math.min(6, 2 + Math.max(0, groupedOrders.length - 1))
          : 3;
        cursor = new Date(cursor.getTime() + serviceMinutes * 60000);
      });

      etaByCourier[courier.id] = etaByStop;
    });

    return etaByCourier;
  }, [courierLocations, couriersWithOrders]);

  const {
    sortBy,
    sortDirection,
    showSortMenu,
    openMenuCourierId,
    openMenuPosition,
    sortedCouriers,
    displayedCouriers,
    setSortBy,
    setSortDirection,
    setShowSortMenu,
    moveStop,
    confirmRouteOrder,
    cancelRouteOrder,
    closeCourierMenu,
    handleOpenCourierContextMenu,
    handleToggleCourierMenu,
  } = useLiveCouriersViewControls({
    couriersWithOrders,
    routeStopOrders,
    onRouteStopOrdersChange,
    quickFilter,
    pendingRouteOrder,
    setPendingRouteOrder,
  });

  useEffect(() => {
    if (!scrollToCourierId) return;

    const frame = requestAnimationFrame(() => {
      const target = document.querySelector(`[data-courier-id="${scrollToCourierId}"]`) as HTMLElement | null;
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onCourierScrolled?.();
    });

    return () => cancelAnimationFrame(frame);
  }, [onCourierScrolled, scrollToCourierId, displayedCouriers]);

  const shouldShowCourierControls = connectedCouriers.length > 0 || shiftFilter !== 'all';
  const courierEmptyStateMessage =
    shiftFilter === 'shift' && connectedCouriers.length > 0
      ? 'אין כרגע שליחים במשמרת'
      : shiftFilter === 'no_shift' && connectedCouriers.length > 0
      ? 'אין שליחים מחוברים שלא במשמרת'
      : 'אין שליחים מחוברים';

  // Compact time formatter shared by route stop cards.
  const formatTime = (date: Date | null) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  const {
    handleCourierClickWithMenuClose,
    toggleCourierShift,
    toggleCourierStatus,
  } = useLiveCouriersViewActions({
    assignmentMode,
    couriersWithOrders,
    expandedCourierIds,
    selectedCourierId,
    stateCouriers: state.couriers,
    shifts: state.shifts,
    dispatch,
    closeCourierMenu,
    setExpandedCourierIds,
    onCourierClick,
    onCourierExpand,
    onClearCourierSelection,
  });

  const selectedCourierName = couriersWithOrders.find((courier) => courier.id === selectedCourierId)?.name;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="relative w-full min-h-full flex flex-col">
        {shouldShowCourierControls && (
          <LiveCouriersToolbar
            displayedCouriersCount={displayedCouriers.length}
            sortedCouriersCount={sortedCouriers.length}
            sortBy={sortBy}
            sortDirection={sortDirection}
            showSortMenu={showSortMenu}
            onToggleSortMenu={() => setShowSortMenu((prev) => !prev)}
            onCloseSortMenu={() => setShowSortMenu(false)}
            onSelectSort={(option) => {
              setSortBy(option);
              setShowSortMenu(false);
            }}
            onToggleSortDirection={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
          />
        )}

        <div className="flex-1 flex flex-col">
          {displayedCouriers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4">
              <UserCircle className="w-10 h-10 text-[#404040] mb-2" />
              <p className="text-xs text-[#737373]">{quickFilter !== 'all' ? 'אין שליחים תואמים' : courierEmptyStateMessage}</p>
            </div>
          ) : (
            displayedCouriers.map((courier) => (
              <LiveCourierListItem
                key={courier.id}
                courier={courier}
                assignmentMode={assignmentMode}
                isExpanded={expandedCourierIds.has(courier.id)}
                isSelected={selectedCourierId === courier.id}
                isHovered={hoveredCourierId === courier.id}
                isMenuOpen={openMenuCourierId === courier.id}
                menuPosition={openMenuPosition}
                pendingRouteOrderActive={pendingRouteOrder?.courierId === courier.id}
                previewDeliveriesCount={previewDeliveries.length}
                routeEtaByStopId={routeEtaByCourier[courier.id]}
                moveStop={moveStop}
                formatTime={formatTime}
                onCourierClick={() => handleCourierClickWithMenuClose(courier.id)}
                onMouseEnter={() => setHoveredCourierId(courier.id)}
                onMouseLeave={() => setHoveredCourierId(null)}
                onContextMenu={(event) => handleOpenCourierContextMenu(courier.id, event)}
                onMenuButtonClick={(event) => handleToggleCourierMenu(courier.id, event)}
                onCloseMenu={closeCourierMenu}
                onToggleCourierShift={(event) => toggleCourierShift(courier.id, event)}
                onToggleCourierStatus={(event) => toggleCourierStatus(courier.id, event)}
                onCancelRouteOrder={cancelRouteOrder}
                onConfirmRouteOrder={confirmRouteOrder}
              />
            ))
          )}

        <LiveCouriersAssignmentBar
          assignmentMode={assignmentMode}
          selectedDeliveryCount={selectedDeliveryCount}
          selectedCourierId={selectedCourierId}
          selectedCourierName={selectedCourierName}
          onCancelAssignment={onCancelAssignment}
          onClearCourierSelection={onClearCourierSelection}
          onConfirmAssignment={onConfirmAssignment}
        />
        </div>
      </div>
    </DndProvider>
  );
};





