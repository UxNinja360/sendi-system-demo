import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserCircle, Star, Package, X, CheckCircle, ChevronDown, ChevronUp, MapPin, ArrowDownAZ, GripVertical, ArrowUpDown, MoreVertical, Store, User, ArrowDown, ArrowUp, Circle, Eye, EyeOff } from 'lucide-react';
import { useDelivery } from '../../../context/delivery.context';
import { Courier, Delivery } from '../../../types/delivery.types';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { formatAddressWithArea } from '../../../utils/delivery-presenters';
import {
  getDeliveryPickupBatchKey,
  getPickupGroupStopId,
} from '../../../utils/pickup-batches';
import { toast } from 'sonner';

type MapPosition = {
  lat: number;
  lng: number;
};

const padDatePart = (value: number) => value.toString().padStart(2, '0');
const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};
const isOvernightShift = (startTime: string, endTime: string) => timeToMinutes(endTime) <= timeToMinutes(startTime);
const compareShiftDateTime = (
  left: { date: string; startTime: string },
  right: { date: string; startTime: string }
) => {
  if (left.date !== right.date) return left.date.localeCompare(right.date);
  return left.startTime.localeCompare(right.startTime);
};
const buildShiftBounds = (dateKey: string, startTime: string, endTime: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const start = new Date(year, (month || 1) - 1, day || 1, startHours || 0, startMinutes || 0, 0, 0);
  const end = new Date(year, (month || 1) - 1, day || 1, endHours || 0, endMinutes || 0, 0, 0);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
};

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

const getStopLocation = (stop: RouteStop): MapPosition | null => {
  if (stop.type === 'pickup') {
    const pickupLat = stop.order.pickup_latitude;
    const pickupLng = stop.order.pickup_longitude;
    return hasValidPosition({ lat: pickupLat, lng: pickupLng })
      ? { lat: pickupLat, lng: pickupLng }
      : null;
  }

  return hasValidPosition({ lat: stop.order.dropoff_latitude, lng: stop.order.dropoff_longitude })
    ? { lat: stop.order.dropoff_latitude as number, lng: stop.order.dropoff_longitude as number }
    : null;
};

const getPickupReadyAt = (orders: Delivery[]) => {
  const readyTimes = orders
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

// Route stop used in the courier route list.
export interface RouteStop {
  id: string; // unique stop ID: `${deliveryId}-pickup` or `${deliveryId}-dropoff`
  deliveryId: string;
  deliveryIds?: string[];
  type: 'pickup' | 'dropoff';
  order: Delivery;
  orders?: Delivery[];
  isPreview?: boolean;
}

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

// Single draggable route stop in the expanded courier view.
interface DraggableRouteStopProps {
  stop: RouteStop;
  index: number;
  courierId: string;
  moveStop: (courierId: string, fromIndex: number, toIndex: number) => void;
  formatTime: (date: Date | null) => string;
  isLast: boolean;
  stopNumber: number;
  totalStops: number;
  etaAt?: Date | null;
}

const DraggableRouteStop: React.FC<DraggableRouteStopProps> = React.memo(({
  stop,
  index,
  courierId,
  moveStop,
  formatTime,
  isLast,
  stopNumber,
  totalStops,
  etaAt,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'route-stop',
    item: { stopId: stop.id, courierId, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'route-stop',
    hover: (item: { stopId: string; courierId: string; index: number }, monitor) => {
      if (!ref.current) return;
      if (item.courierId !== courierId) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      moveStop(courierId, dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  const isPickup = stop.type === 'pickup';
  const isPreview = stop.isPreview;
  const order = stop.order;
  const groupedOrders = stop.orders ?? [order];
  const groupedCount = groupedOrders.length;
  const pickupArrivedAt = groupedOrders
    .map((groupedOrder) => groupedOrder.arrivedAtRestaurantAt ?? null)
    .find((value): value is Date => value instanceof Date && !Number.isNaN(new Date(value).getTime())) ?? null;
  const pickupCompletedAt = groupedOrders
    .map((groupedOrder) => groupedOrder.pickedUpAt ?? null)
    .find((value): value is Date => value instanceof Date && !Number.isNaN(new Date(value).getTime())) ?? null;
  const allGroupedOrdersPickedUp = groupedOrders.every(
    (groupedOrder) =>
      Boolean(groupedOrder.pickedUpAt) ||
      groupedOrder.status === 'delivering' ||
      groupedOrder.status === 'delivered'
  );
  const anyGroupedOrderAtRestaurant = groupedOrders.some(
    (groupedOrder) => Boolean(groupedOrder.arrivedAtRestaurantAt) && !groupedOrder.pickedUpAt
  );
  const readyAt = isPickup ? getPickupReadyAt(groupedOrders) : null;

  // Derive a compact status pill for each stop.
  const getStopStatus = (): { label: string; colorClass: string } => {
    if (isPreview) return { label: 'טיוטה', colorClass: 'bg-[#22c55e]/15 text-[#16a34a] dark:bg-[#22c55e]/20 dark:text-[#7bf1a8]' };
    
    if (isPickup) {
      if (allGroupedOrdersPickedUp) {
        return { label: 'נאסף', colorClass: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' };
      }
      if (anyGroupedOrderAtRestaurant) {
        return { label: 'במסעדה', colorClass: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300' };
      }
      switch (order.status) {
        case 'pending': return { label: 'ממתין לשיבוץ', colorClass: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' };
        case 'assigned': return { label: 'בדרך לאיסוף', colorClass: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' };
        case 'delivering': return { label: 'נאסף', colorClass: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' };
        default: return { label: 'הושלם', colorClass: 'bg-[#e5e5e5] dark:bg-[#262626] text-[#737373]' };
      }
    } else {
      switch (order.status) {
        case 'pending': return { label: 'ממתין לשיבוץ', colorClass: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' };
        case 'assigned': return { label: 'ממתין לאיסוף', colorClass: 'bg-[#f5f5f5] dark:bg-[#262626] text-[#737373] dark:text-[#a3a3a3]' };
        case 'delivering': return { label: 'בדרך ללקוח', colorClass: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' };
        default: return { label: 'נמסר', colorClass: 'bg-[#dcfce7] dark:bg-[#22c55e]/20 text-[#16a34a] dark:text-[#7bf1a8]' };
      }
    }
  };

  const stopStatus = getStopStatus();
  const secondaryTimeLabel = isPickup && pickupCompletedAt
    ? `נאסף ${formatTime(pickupCompletedAt)}`
    : isPickup && pickupArrivedAt
      ? `הגיע ${formatTime(pickupArrivedAt)}`
    : etaAt
      ? `הגעה ${formatTime(etaAt)}`
      : null;

  return (
    <div
      ref={ref}
      className={`relative transition-all ${
        isDragging ? 'opacity-30 scale-95' : 'opacity-100'
      } ${isOver ? 'bg-[#e0f7f1] dark:bg-[#0a2f2f]' : ''}`}
    >
      {!isLast && (
        <div className="absolute right-[26px] top-full w-0.5 h-2 bg-[#d4d4d4] dark:bg-[#404040] z-0" />
      )}

      <div
        className={`mx-2 my-1 rounded-lg border transition-all ${
          isPreview
            ? 'border-dashed border-[#22c55e] dark:border-[#22c55e]/60 bg-[#f0fdf4] dark:bg-[#0a2f1a]/50'
            : isPickup
            ? 'border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717]'
            : 'border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717]'
        }`}
      >
        <div className="px-3 py-2">
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
              <div className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3.5 h-3.5 text-[#a3a3a3] dark:text-[#525252]" />
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isPickup
                  ? 'bg-[#22c55e]/15 text-[#16a34a] dark:bg-[#22c55e]/20 dark:text-[#7bf1a8]'
                  : 'bg-[#ef4444]/15 text-[#dc2626] dark:bg-[#ef4444]/20 dark:text-[#fca5a5]'
              }`}>
                {stopNumber}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isPickup
                    ? 'bg-[#22c55e]/15 text-[#16a34a] dark:bg-[#22c55e]/20 dark:text-[#7bf1a8]'
                    : 'bg-[#ef4444]/15 text-[#dc2626] dark:bg-[#ef4444]/20 dark:text-[#fca5a5]'
                }`}>
                  {isPickup ? (
                    <>
                      <ArrowUp className="w-2.5 h-2.5" />
                      <span>איסוף</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-2.5 h-2.5" />
                      <span>הורדה</span>
                    </>
                  )}
                </span>

                {isPickup && groupedCount > 1 ? (
                  <span className="text-[11px] font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {groupedCount} משלוחים
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    #{order.orderNumber}
                  </span>
                )}

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${stopStatus.colorClass}`}
                >
                  {stopStatus.label}
                </span>

                {isPreview && (
                  <span className="px-1.5 py-0.5 rounded bg-[#22c55e]/20 text-[#16a34a] dark:text-[#7bf1a8] text-[10px] font-bold border border-[#22c55e]/30 mr-auto">
                    טיוטה
                  </span>
                )}
              </div>

              {isPickup ? (
                // Pickup row
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Store className="w-3 h-3 text-[#22c55e] flex-shrink-0" />
                  <span className="font-bold text-[#22c55e] truncate">{order.restaurantName}</span>
                  {groupedCount > 1 && (
                    <>
                      <span className="text-[#d4d4d4] dark:text-[#404040]">·</span>
                      <span className="text-[#737373] dark:text-[#a3a3a3] truncate">{groupedCount} משלוחים</span>
                    </>
                  )}
                  {order.restaurantAddress && (
                    <>
                      <span className="text-[#d4d4d4] dark:text-[#404040]">·</span>
                      <span className="text-[#737373] dark:text-[#a3a3a3] truncate">{order.rest_city || order.area}</span>
                    </>
                  )}
                </div>
              ) : (
                // Dropoff row
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <User className="w-3 h-3 text-[#ef4444] flex-shrink-0" />
                    <span className="font-bold text-[#0d0d12] dark:text-[#fafafa] truncate">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] mr-[18px]">
                    <MapPin className="w-3 h-3 text-[#737373] dark:text-[#a3a3a3] flex-shrink-0" />
                    <span className="text-[#737373] dark:text-[#a3a3a3] truncate">
                      {formatAddressWithArea(order.address, order.area)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-1 text-[10px] text-[#a3a3a3] dark:text-[#525252]">
                {secondaryTimeLabel ? (
                  <span className="font-medium text-[#0284c7] dark:text-[#7dd3fc]">{secondaryTimeLabel}</span>
                ) : (
                  <span>{formatTime(order.createdAt)}</span>
                )}
                {isPickup && readyAt && !pickupCompletedAt && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-[#22c55e] dark:text-[#9fe870]">
                      מוכן {formatTime(readyAt)}
                    </span>
                  </>
                )}
                {order.price && (
                  <>
                    <span>·</span>
                    <span className="font-bold text-[#16a34a] dark:text-[#7bf1a8]">₪{order.price}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Convert active deliveries into pickup/dropoff route stops.
const deliveriesToRouteStops = (
  deliveries: Delivery[],
  isPreview: boolean = false
): RouteStop[] => {
  const stops: RouteStop[] = [];
  const pickupGroups = new Map<string, Delivery[]>();

  deliveries.forEach((order) => {
    const pickupGroupKey = getDeliveryPickupBatchKey(order);
    const groupedOrders = pickupGroups.get(pickupGroupKey);

    if (groupedOrders) {
      groupedOrders.push(order);
    } else {
      pickupGroups.set(pickupGroupKey, [order]);
      stops.push({
        id: getPickupGroupStopId(pickupGroupKey),
        deliveryId: order.id,
        deliveryIds: [order.id],
        type: 'pickup',
        order,
        orders: [order],
        isPreview,
      });
    }

    stops.push({
      id: `${order.id}-dropoff`,
      deliveryId: order.id,
      deliveryIds: [order.id],
      type: 'dropoff',
      order,
      orders: [order],
      isPreview,
    });
  });

  return stops.map((stop) => {
    if (stop.type !== 'pickup') return stop;

    const groupedOrders = pickupGroups.get(getDeliveryPickupBatchKey(stop.order)) ?? [stop.order];
    return {
      ...stop,
      deliveryIds: groupedOrders.map((groupedOrder) => groupedOrder.id),
      orders: groupedOrders,
    };
  });
};

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
  const [sortBy, setSortBy] = useState<'status' | 'name' | 'active' | 'total' | 'rating' | 'available'>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [openMenuCourierId, setOpenMenuCourierId] = useState<string | null>(null);
  const [openMenuPosition, setOpenMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [openMenuSource, setOpenMenuSource] = useState<'button' | 'context' | null>(null);
  // Temporary route order waiting for explicit confirmation.
  const [pendingRouteOrder, setPendingRouteOrder] = useState<{ courierId: string; order: string[] } | null>(null);

  // Refs for stable moveStop callback (populated after couriersWithOrders is computed below)
  const couriersWithOrdersRef = useRef<Array<{ id: string; routeStops: Array<{ id: string }> }>>([]);
  const routeStopOrdersRef = useRef(routeStopOrders);

  const previewDeliveries = useMemo(() => {
    if (!previewDeliveryIds || previewDeliveryIds.size === 0) return [];
    return state.deliveries.filter(d => previewDeliveryIds.has(d.id));
  }, [previewDeliveryIds, state.deliveries]);

  // Connected couriers used by the filters and summaries.
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

        // Build route stops from active deliveries.
        let stops = deliveriesToRouteStops(activeOrders, false);

        // Append preview stops during assignment mode for the selected courier.
        if (assignmentMode && selectedCourierId === courier.id && previewDeliveries.length > 0) {
          const existingIds = new Set(stops.map(s => s.id));
          const previewStops = deliveriesToRouteStops(
            previewDeliveries.filter(d => !activeOrders.some(a => a.id === d.id)),
            true
          ).filter(s => !existingIds.has(s.id));
          stops = [...stops, ...previewStops];
        }

        // Guard against duplicate stop ids.
        const seen = new Set<string>();
        stops = stops.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });

        // Apply pending or persisted custom route order.
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

  // Keep refs in sync for stable moveStop
  useEffect(() => { couriersWithOrdersRef.current = couriersWithOrders; }, [couriersWithOrders]);
  useEffect(() => { routeStopOrdersRef.current = routeStopOrders; }, [routeStopOrders]);
  useEffect(() => {
    if (!openMenuCourierId) return;
    const close = () => {
      setOpenMenuCourierId(null);
      setOpenMenuPosition(null);
    };
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [openMenuCourierId]);

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

  const sortedCouriers = useMemo(() => {
    const sorted = [...couriersWithOrders].sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'status') {
        // Busy couriers first, then on-shift idle, then connected idle, then offline.
        const statusOrder = (c: typeof a) => {
          if (c.activeOrders.length > 0) return 0;
          if (c.status !== 'offline' && c.isOnShift) return 1;
          if (c.status !== 'offline') return 2;
          return 3;
        };
        comparison = statusOrder(a) - statusOrder(b);
        if (comparison === 0) {
          // Within the same group, heavier workload comes first.
          comparison = b.activeOrders.length - a.activeOrders.length;
        }
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name, 'he');
      } else if (sortBy === 'active') {
        comparison = b.activeOrders.length - a.activeOrders.length;
      } else if (sortBy === 'total') {
        comparison = b.totalDeliveries - a.totalDeliveries;
      } else if (sortBy === 'rating') {
        comparison = b.rating - a.rating;
      } else if (sortBy === 'available') {
        const aAssignable = a.status !== 'offline' && a.isOnShift;
        const bAssignable = b.status !== 'offline' && b.isOnShift;
        if (aAssignable && !bAssignable) comparison = -1;
        else if (!aAssignable && bAssignable) comparison = 1;
        else comparison = a.activeOrders.length - b.activeOrders.length;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }, [couriersWithOrders, sortBy, sortDirection]);

  const displayedCouriers = useMemo(() => {
    if (quickFilter === 'free') return sortedCouriers.filter(c => c.isOnShift && c.activeOrders.length === 0);
    if (quickFilter === 'busy') return sortedCouriers.filter(c => c.activeOrders.length > 0);
    return sortedCouriers;
  }, [sortedCouriers, quickFilter]);

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

  const handleCourierClick = (courierId: string) => {
    if (assignmentMode) {
      // In assignment mode, clicking selects the courier instead of expanding it.
      onCourierClick?.(courierId);
      return;
    }

    // Outside assignment mode, clicking toggles expanded route details.
    const courier = couriersWithOrders.find((c) => c.id === courierId);
    if (!courier || courier.routeStops.filter(s => !s.isPreview).length === 0) return;

    const isCurrentlyExpanded = expandedCourierIds.has(courierId);
    const isCurrentlySelected = selectedCourierId === courierId;
    const newSet = new Set(expandedCourierIds);

    if (isCurrentlyExpanded || isCurrentlySelected) {
      newSet.delete(courierId);
      setExpandedCourierIds(newSet);
      if (isCurrentlySelected) {
        onClearCourierSelection?.();
      }
      onCourierExpand?.(null);
      return;
    }

    newSet.add(courierId);
    setExpandedCourierIds(newSet);
    onCourierExpand?.(courierId);
  };

  // Compact time formatter used across stop cards.
  const formatTime = (date: Date | null) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  // Drag and drop only updates temporary order until the user confirms it.
  const moveStop = useCallback(
    (courierId: string, fromIndex: number, toIndex: number) => {
      const courier = couriersWithOrdersRef.current.find((c) => c.id === courierId);
      if (!courier) return;

      setPendingRouteOrder((prev) => {
        const currentOrder =
          prev?.courierId === courierId
            ? prev.order
            : routeStopOrdersRef.current[courierId] || courier.routeStops.map((s) => s.id);
        const newOrder = [...currentOrder];
        const [movedItem] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, movedItem);
        return { courierId, order: newOrder };
      });
    },
    [] // stable - reads from refs
  );

  const confirmRouteOrder = useCallback(() => {
    if (!pendingRouteOrder) return;

    const courier = couriersWithOrdersRef.current.find((item) => item.id === pendingRouteOrder.courierId);
    const validRouteStopIds = new Set((courier?.routeStops ?? []).map((stop) => stop.id));
    const normalizedOrder = pendingRouteOrder.order.filter((stopId, index) => (
      validRouteStopIds.has(stopId) && pendingRouteOrder.order.indexOf(stopId) === index
    ));

    onRouteStopOrdersChange((prev) => ({
      ...prev,
      [pendingRouteOrder.courierId]: normalizedOrder,
    }));
    setPendingRouteOrder(null);
  }, [pendingRouteOrder, onRouteStopOrdersChange]);

  const cancelRouteOrder = useCallback(() => {
    setPendingRouteOrder(null);
  }, []);

  const toggleCourierShift = (courierId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const courier = state.couriers.find((c) => c.id === courierId);
    if (!courier) return;
    if (courier.status === 'offline') {
      toast.error('שליח לא מחובר לא יכול להתחיל משמרת.');
      return;
    }

    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const courierAssignments = state.shifts.flatMap((shift) =>
      shift.courierAssignments
        .filter((assignment) => assignment.courierId === courierId)
        .map((assignment) => {
          const bounds = buildShiftBounds(shift.date, shift.startTime, shift.endTime);
          const isCurrentWindow = now >= bounds.start && now <= bounds.end;
          const distanceFromStart = Math.abs(bounds.start.getTime() - now.getTime());

          return {
            shiftId: shift.id,
            assignment,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            bounds,
            isCurrentWindow,
            distanceFromStart,
          };
        })
    );

    const activeAssignment =
      courierAssignments.find(({ assignment }) => assignment.startedAt && !assignment.endedAt) ??
      courierAssignments.find(
        ({ assignment }) =>
          assignment.id === courier.currentShiftAssignmentId && assignment.startedAt && !assignment.endedAt
      );

    const nextPlannedAssignmentToday = [...courierAssignments]
      .filter(({ assignment, date }) => !assignment.startedAt && !assignment.endedAt && date === todayKey)
      .sort((left, right) => {
        if (left.isCurrentWindow !== right.isCurrentWindow) {
          return left.isCurrentWindow ? -1 : 1;
        }

        const leftFuture = left.bounds.start.getTime() >= now.getTime();
        const rightFuture = right.bounds.start.getTime() >= now.getTime();
        if (leftFuture !== rightFuture) {
          return leftFuture ? -1 : 1;
        }

        if (left.distanceFromStart !== right.distanceFromStart) {
          return left.distanceFromStart - right.distanceFromStart;
        }

        return compareShiftDateTime(left, right);
      })[0];

    if (courier.isOnShift && activeAssignment) {
      dispatch({
        type: 'END_SHIFT_ASSIGNMENT',
        payload: { shiftId: activeAssignment.shiftId, assignmentId: activeAssignment.assignment.id },
      });
    } else if (!courier.isOnShift && nextPlannedAssignmentToday) {
      dispatch({
        type: 'START_SHIFT_ASSIGNMENT',
        payload: { shiftId: nextPlannedAssignmentToday.shiftId, assignmentId: nextPlannedAssignmentToday.assignment.id },
      });
    } else {
      dispatch({
        type: courier.isOnShift ? 'END_COURIER_SHIFT' : 'START_COURIER_SHIFT',
        payload: { courierId },
      });
    }

    setOpenMenuCourierId(null);
    setOpenMenuPosition(null);
  };

  // Toggle courier online/offline state from the row menu.
  const toggleCourierStatus = (courierId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const courier = state.couriers.find((c) => c.id === courierId);
    if (!courier) return;

    const newStatus = courier.status === 'offline' ? 'available' : 'offline';

    dispatch({
      type: 'UPDATE_COURIER_STATUS',
      payload: {
        courierId,
        status: newStatus,
      },
    });

    setOpenMenuCourierId(null);
    setOpenMenuPosition(null);
  };

  const handleCourierClickWithMenuClose = (courierId: string) => {
    setOpenMenuCourierId(null);
    setOpenMenuPosition(null);
    handleCourierClick(courierId);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="relative w-full min-h-full flex flex-col">
        {/* Counter + Sort */}
        {shouldShowCourierControls && (
          <div className="p-3 border-b border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#0a0a0a] sticky top-0 z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-right text-[#737373] dark:text-[#a3a3a3] text-xs">
                <span>מציג {displayedCouriers.length} / {sortedCouriers.length} שליחים</span>
              </div>

              {/* Sort Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">

                  {/* Sort Menu Button */}
                  <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="px-2 py-1 hover:bg-white dark:hover:bg-[#171717] rounded-lg transition-colors text-xs"
                    title="בחר קטגוריית מיון"
                  >
                    <span className="text-[#737373] dark:text-[#a3a3a3]">
                      לפי: <span className="font-bold text-[#22c55e]">
                        {sortBy === 'status' ? 'סטטוס' :
                        sortBy === 'available' ? 'זמינות' :
                        sortBy === 'active' ? 'משלוחים פעילים' :
                        sortBy === 'total' ? 'סך משלוחים' :
                        sortBy === 'rating' ? 'דירוג' :
                        'שם (א״ב)'}
                      </span>
                    </span>
                  </button>

                  {/* Sort Dropdown */}
                  {showSortMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                      <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden z-50">
                        {(['status', 'available', 'active', 'total', 'rating', 'name'] as const).map((option) => {
                          const labels: Record<string, string> = {
                            status: 'לפי סטטוס',
                            available: 'לפי זמינות',
                            active: 'לפי משלוחים פעילים',
                            total: 'לפי סך משלוחים',
                            rating: 'לפי דירוג',
                            name: 'לפי שם (א״ב)',
                          };
                          return (
                            <button
                              key={option}
                              onClick={() => {
                                setSortBy(option);
                                setShowSortMenu(false);
                              }}
                              className={`w-full text-right px-4 py-2.5 text-sm transition-colors ${
                                sortBy === option
                                  ? 'bg-[#f0fdf4] dark:bg-[#0a2f1a] text-[#22c55e] font-bold'
                                  : 'hover:bg-[#fafafa] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                              }`}
                            >
                              {labels[option]}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Direction Toggle Button */}
                <button
                  onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="p-2 hover:bg-white dark:hover:bg-[#171717] rounded-lg transition-colors group"
                  title={sortDirection === 'asc' ? 'מיון עולה' : 'מיון יורד'}
                >
                  <ArrowUpDown className="w-4 h-4 text-[#22c55e]" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {displayedCouriers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4">
              <UserCircle className="w-10 h-10 text-[#404040] mb-2" />
              <p className="text-xs text-[#737373]">{quickFilter !== 'all' ? 'אין שליחים תואמים' : courierEmptyStateMessage}</p>
            </div>
          ) : (
            displayedCouriers.map((courier) => {
              const isExpanded = expandedCourierIds.has(courier.id);
              const isSelected = selectedCourierId === courier.id;
              const isHovered = hoveredCourierId === courier.id;
              const hasPreviewStops = courier.routeStops.some(s => s.isPreview);
              const previewCount = hasPreviewStops ? previewDeliveries.length : 0;
              const totalActiveDeliveries = courier.activeOrders.length;
              const realStops = courier.routeStops.filter(s => !s.isPreview);
              const lastRealStop = realStops[realStops.length - 1];
              const showRoute = isExpanded || isSelected;
              const isConnected = courier.status !== 'offline';
              const shiftLabel = !isConnected
                ? 'לא מחובר'
                : courier.isOnShift
                  ? 'במשמרת'
                  : 'מחובר, לא במשמרת';

              return (
                <div
                  key={courier.id}
                  data-courier-id={courier.id}
                  className={`border-b border-[#e5e5e5] dark:border-[#262626] transition-all ${
                    isSelected
                      ? 'bg-[#f0fdf4] dark:bg-[#0a2f1a]'
                      : isConnected && !courier.isOnShift
                      ? 'bg-[#fafafa] dark:bg-[#111111]'
                      : isHovered
                      ? 'bg-[#f0f0f0] dark:bg-[#222222]'
                      : ''
                  }`}
                  onMouseEnter={() => setHoveredCourierId(courier.id)}
                  onMouseLeave={() => setHoveredCourierId(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const menuW = 176;
                    const menuH = 96;
                    setOpenMenuCourierId(courier.id);
                    setOpenMenuSource('context');
                    setOpenMenuPosition({
                      top: Math.min(e.clientY, window.innerHeight - menuH - 8),
                      left: Math.min(e.clientX, window.innerWidth - menuW - 8),
                    });
                  }}
                >
                  <div
                    className="px-3 py-3 cursor-pointer"
                    onClick={() => handleCourierClickWithMenuClose(courier.id)}
                  >
                    <div className="flex items-center gap-2.5">

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Circle
                              className={`w-3 h-3 flex-shrink-0 ${
                                !isConnected
                                  ? 'fill-[#737373] text-[#737373]'
                                  : !courier.isOnShift
                                  ? 'fill-[#a3a3a3] text-[#a3a3a3]'
                                  : totalActiveDeliveries > 0
                                  ? 'fill-[#f59e0b] text-[#f59e0b]'
                                  : 'fill-[#22c55e] text-[#22c55e]'
                              }`}
                            />
                            <span className="font-bold text-sm text-[#0d0d12] dark:text-[#fafafa] truncate">
                              {courier.name}
                            </span>
                            {isConnected && !courier.isOnShift && (
                              <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#f5f5f5] dark:bg-[#171717] text-[#737373] dark:text-[#a3a3a3] flex-shrink-0">
                                לא במשמרת
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {hasPreviewStops && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#22c55e]/15 text-[#16a34a] dark:text-[#7bf1a8] border border-dashed border-[#22c55e]/40">
                                +{previewCount}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#737373] dark:text-[#a3a3a3] min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span>{shiftLabel}</span>
                          </div>
                          <span className="flex-shrink-0">·</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Package className="w-3 h-3" />
                            <span>{totalActiveDeliveries} פעיל</span>
                          </div>
                          <span className="flex-shrink-0">·</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <MapPin className="w-3 h-3" />
                            <span>{courier.routeStops.filter(s => !s.isPreview).length} עצירות</span>
                          </div>
                          {lastRealStop && (
                            <>
                              <span className="flex-shrink-0">·</span>
                              <div className="flex items-center gap-1 text-[#f59e0b] dark:text-[#fbbf24] min-w-0 flex-1 overflow-hidden">
                                <span className="truncate whitespace-nowrap">
                                  מתפנה ב{lastRealStop.type === 'pickup'
                                    ? `מסעדת ${lastRealStop.order.restaurantName}`
                                    : formatAddressWithArea(lastRealStop.order.address, lastRealStop.order.area)}
                                </span>
                                {!assignmentMode && realStops.length > 0 && (
                                  isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-[#737373] flex-shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-[#737373] flex-shrink-0" />
                                  )
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="relative flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                              const isClosing = openMenuCourierId === courier.id && openMenuSource === 'button';
                              setOpenMenuCourierId(
                                isClosing ? null : courier.id
                              );
                              setOpenMenuSource(isClosing ? null : 'button');
                              setOpenMenuPosition(
                                isClosing
                                  ? null
                                  : {
                                      top: Math.min(rect.bottom + 8, window.innerHeight - 56),
                                      left: Math.max(12, rect.left - 144 + rect.width),
                                    }
                              );
                            }}
                            className="p-1.5 hover:bg-white dark:hover:bg-[#262626] rounded-lg transition-colors"
                            title="אפשרויות"
                          >
                            <MoreVertical className="w-4 h-4 text-[#737373]" />
                          </button>

                          {openMenuCourierId === courier.id && openMenuPosition && createPortal(
                            <>
                              <div
                                className="fixed inset-0 z-[9990]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuCourierId(null);
                                  setOpenMenuPosition(null);
                                  setOpenMenuSource(null);
                                }}
                              />
                              <div
                                className="fixed w-44 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden z-[9991]"
                                style={openMenuPosition}
                              >
                                {courier.status !== 'offline' && (
                                  <button
                                    onClick={(e) => toggleCourierShift(courier.id, e)}
                                    className="w-full text-right px-4 py-2.5 text-sm hover:bg-[#fafafa] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa] transition-colors flex items-center gap-2"
                                  >
                                    <CheckCircle className={`w-4 h-4 ${courier.isOnShift ? 'text-[#f59e0b]' : 'text-[#22c55e]'}`} />
                                    <span>{courier.isOnShift ? 'סיים משמרת' : 'התחל משמרת'}</span>
                                  </button>
                                )}
                                <button
                                  onClick={(e) => toggleCourierStatus(courier.id, e)}
                                  className="w-full text-right px-4 py-2.5 text-sm hover:bg-[#fafafa] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa] transition-colors flex items-center gap-2"
                                >
                                  {courier.status === 'offline' ? (
                                    <>
                                      <Eye className="w-4 h-4 text-[#22c55e]" />
                                      <span>הפעל שליח</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-4 h-4 text-[#737373]" />
                                      <span>כבה שליח</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </>
                          , document.body)}
                        </div>

                    </div>
                  </div>

                  {showRoute && (
                    <div className="bg-[#f5f5f5] dark:bg-[#0a0a0a] border-t border-[#e5e5e5] dark:border-[#262626] py-1">
                      {courier.routeStops.length > 0 ? (
                        <>
                          <div className="px-3 py-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider">
                              מסלול ({realStops.length} עצירות{hasPreviewStops ? ` +${previewCount} בתצוגה מקדימה` : ''})
                            </span>
                            {!isHovered && (
                              <span className="text-[10px] text-[#a3a3a3] dark:text-[#737373]">
                                גרור לשינוי סדר
                              </span>
                            )}
                          </div>

                          {pendingRouteOrder?.courierId === courier.id && (
                            <div className="mx-2 mb-1 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg flex items-center justify-between gap-2">
                              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">הסדר השתנה — לאשר?</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={cancelRouteOrder}
                                  className="px-2.5 py-1 text-xs rounded-md bg-white dark:bg-[#262626] border border-[#e5e5e5] dark:border-[#404040] text-[#737373] hover:text-[#0d0d12] dark:hover:text-[#fafafa] transition-colors"
                                >
                                  ביטול
                                </button>
                                <button
                                  onClick={confirmRouteOrder}
                                  className="px-2.5 py-1 text-xs rounded-md bg-[#22c55e] text-white font-semibold hover:bg-[#16a34a] transition-colors"
                                >
                                  ✓ אשר סדר
                                </button>
                              </div>
                            </div>
                          )}

                          {courier.routeStops.map((stop, idx) => (
                            <DraggableRouteStop
                              key={stop.id}
                              stop={stop}
                              index={idx}
                              courierId={courier.id}
                              moveStop={moveStop}
                              formatTime={formatTime}
                              isLast={idx === courier.routeStops.length - 1}
                              stopNumber={idx + 1}
                              totalStops={courier.routeStops.length}
                              etaAt={routeEtaByCourier[courier.id]?.[stop.id] ?? null}
                            />
                          ))}
                        </>
                      ) : (
                        <div className="px-3 py-6 text-center">
                          <Package className="w-6 h-6 text-[#a3a3a3] mx-auto mb-2 opacity-50" />
                          <p className="text-xs text-[#737373] dark:text-[#a3a3a3]">
                            אין משלוחים כרגע
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

        {/* Assignment bottom bar */}
        {assignmentMode && (
          <div className="sticky bottom-0 inset-x-0 z-20 mt-auto border-t border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
            {!selectedCourierId ? (
              // Step 1: choose courier
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-[#737373] dark:text-[#a3a3a3]">
                  <span className="font-bold text-[#0d0d12] dark:text-white">{selectedDeliveryCount}</span>
                  <span>{selectedDeliveryCount === 1 ? 'משלוח' : 'משלוחים'} — בחר שליח מהרשימה</span>
                </div>
                <button
                  onClick={onCancelAssignment}
                  className="p-1.5 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-[#737373]" />
                </button>
              </div>
            ) : (
              // Step 2: confirm assignment
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => onClearCourierSelection?.()}
                  className="px-3 py-2 rounded-lg border border-[#e5e5e5] dark:border-[#262626] text-sm font-semibold text-[#737373] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors flex-shrink-0"
                >
                  חזור
                </button>
                <button
                  onClick={onConfirmAssignment}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-sm transition-colors shadow-md shadow-[#22c55e]/20"
                >
                  ✓ אשר שיבוץ ל{couriersWithOrders.find(c => c.id === selectedCourierId)?.name}
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </DndProvider>
  );
};





