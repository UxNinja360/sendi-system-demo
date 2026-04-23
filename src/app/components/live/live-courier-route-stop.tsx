import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ArrowDown, ArrowUp, GripVertical, MapPin, Store, User } from 'lucide-react';
import { formatAddressWithArea } from '../../utils/delivery-presenters';
import { RouteStop, getPickupReadyAt } from './live-couriers-view-utils';

type DraggableRouteStopProps = {
  stop: RouteStop;
  index: number;
  courierId: string;
  moveStop: (courierId: string, fromIndex: number, toIndex: number) => void;
  formatTime: (date: Date | null) => string;
  isLast: boolean;
  stopNumber: number;
  totalStops: number;
  etaAt?: Date | null;
};

export const DraggableRouteStop: React.FC<DraggableRouteStopProps> = React.memo(({
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
    hover: (item: { stopId: string; courierId: string; index: number }) => {
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
  const pickupArrivedAt =
    groupedOrders
      .map((groupedOrder) => groupedOrder.arrivedAtRestaurantAt ?? null)
      .find((value): value is Date => value instanceof Date && !Number.isNaN(new Date(value).getTime())) ?? null;
  const pickupCompletedAt =
    groupedOrders
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

  const getStopStatus = (): { label: string; colorClass: string } => {
    if (isPreview) {
      return {
        label: 'טיוטה',
        colorClass: 'bg-[#22c55e]/15 text-[#16a34a] dark:bg-[#22c55e]/20 dark:text-[#7bf1a8]',
      };
    }

    if (isPickup) {
      if (allGroupedOrdersPickedUp) {
        return {
          label: 'נאסף',
          colorClass: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
        };
      }

      if (anyGroupedOrderAtRestaurant) {
        return {
          label: 'במסעדה',
          colorClass: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
        };
      }

      switch (order.status) {
        case 'pending':
          return {
            label: 'ממתין לשיבוץ',
            colorClass: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
          };
        case 'assigned':
          return {
            label: 'בדרך לאיסוף',
            colorClass: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
          };
        case 'delivering':
          return {
            label: 'נאסף',
            colorClass: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
          };
        default:
          return {
            label: 'הושלם',
            colorClass: 'bg-[#e5e5e5] dark:bg-[#262626] text-[#737373]',
          };
      }
    }

    switch (order.status) {
      case 'pending':
        return {
          label: 'ממתין לשיבוץ',
          colorClass: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
        };
      case 'assigned':
        return {
          label: 'ממתין לאיסוף',
          colorClass: 'bg-[#f5f5f5] dark:bg-[#262626] text-[#737373] dark:text-[#a3a3a3]',
        };
      case 'delivering':
        return {
          label: 'בדרך ללקוח',
          colorClass: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
        };
      default:
        return {
          label: 'נמסר',
          colorClass: 'bg-[#dcfce7] dark:bg-[#22c55e]/20 text-[#16a34a] dark:text-[#7bf1a8]',
        };
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
        <div className="absolute right-[26px] top-full z-0 h-2 w-0.5 bg-[#d4d4d4] dark:bg-[#404040]" />
      )}

      <div
        className={`mx-2 my-1 rounded-lg border transition-all ${
          isPreview
            ? 'border-dashed border-[#22c55e] dark:border-[#22c55e]/60 bg-[#f0fdf4] dark:bg-[#0a2f1a]/50'
            : 'border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717]'
        }`}
      >
        <div className="px-3 py-2">
          <div className="flex items-start gap-2">
            <div className="flex flex-shrink-0 flex-col items-center gap-0.5 pt-0.5">
              <div className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-3.5 w-3.5 text-[#a3a3a3] dark:text-[#525252]" />
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isPickup
                    ? 'bg-[#22c55e]/15 text-[#16a34a] dark:bg-[#22c55e]/20 dark:text-[#7bf1a8]'
                    : 'bg-[#ef4444]/15 text-[#dc2626] dark:bg-[#ef4444]/20 dark:text-[#fca5a5]'
                }`}
              >
                {stopNumber}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    isPickup
                      ? 'bg-[#22c55e]/15 text-[#16a34a] dark:bg-[#22c55e]/20 dark:text-[#7bf1a8]'
                      : 'bg-[#ef4444]/15 text-[#dc2626] dark:bg-[#ef4444]/20 dark:text-[#fca5a5]'
                  }`}
                >
                  {isPickup ? (
                    <>
                      <ArrowUp className="h-2.5 w-2.5" />
                      <span>איסוף</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="h-2.5 w-2.5" />
                      <span>הורדה</span>
                    </>
                  )}
                </span>

                {isPickup && groupedCount > 1 ? (
                  <span className="text-[11px] font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {groupedCount} משלוחים
                  </span>
                ) : (
                  <span className="font-mono text-[11px] font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    #{order.orderNumber}
                  </span>
                )}

                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${stopStatus.colorClass}`}>
                  {stopStatus.label}
                </span>

                {isPreview && (
                  <span className="mr-auto rounded border border-[#22c55e]/30 bg-[#22c55e]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#16a34a] dark:text-[#7bf1a8]">
                    טיוטה
                  </span>
                )}
              </div>

              {isPickup ? (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Store className="h-3 w-3 flex-shrink-0 text-[#22c55e]" />
                  <span className="truncate font-bold text-[#22c55e]">{order.restaurantName}</span>
                  {groupedCount > 1 && (
                    <>
                      <span className="text-[#d4d4d4] dark:text-[#404040]">·</span>
                      <span className="truncate text-[#737373] dark:text-[#a3a3a3]">{groupedCount} משלוחים</span>
                    </>
                  )}
                  {order.restaurantAddress && (
                    <>
                      <span className="text-[#d4d4d4] dark:text-[#404040]">·</span>
                      <span className="truncate text-[#737373] dark:text-[#a3a3a3]">{order.rest_city || order.area}</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <User className="h-3 w-3 flex-shrink-0 text-[#ef4444]" />
                    <span className="truncate font-bold text-[#0d0d12] dark:text-[#fafafa]">{order.customerName}</span>
                  </div>
                  <div className="mr-[18px] flex items-center gap-1.5 text-[11px]">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-[#737373] dark:text-[#a3a3a3]" />
                    <span className="truncate text-[#737373] dark:text-[#a3a3a3]">
                      {formatAddressWithArea(order.address, order.area)}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-1 flex items-center gap-2 text-[10px] text-[#a3a3a3] dark:text-[#525252]">
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
