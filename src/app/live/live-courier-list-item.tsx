import React from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  Eye,
  EyeOff,
  MapPin,
  MoreVertical,
  Package,
} from 'lucide-react';
import { Courier, Delivery } from '../types/delivery.types';
import { formatAddressWithArea } from '../utils/delivery-presenters';
import { DraggableRouteStop } from './live-courier-route-stop';
import { RouteStop } from './live-couriers-view-utils';

type CourierWithOrders = Courier & {
  activeOrders: Delivery[];
  routeStops: RouteStop[];
};

type LiveCourierListItemProps = {
  courier: CourierWithOrders;
  assignmentMode: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isMenuOpen: boolean;
  menuPosition: { top: number; left: number } | null;
  pendingRouteOrderActive: boolean;
  previewDeliveriesCount: number;
  routeEtaByStopId?: Record<string, Date>;
  moveStop: (courierId: string, fromIndex: number, toIndex: number) => void;
  formatTime: (date: Date | null) => string;
  onCourierClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMenuButtonClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onCloseMenu: () => void;
  onToggleCourierShift: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleCourierStatus: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onCancelRouteOrder: () => void;
  onConfirmRouteOrder: () => void;
};

export const LiveCourierListItem: React.FC<LiveCourierListItemProps> = ({
  courier,
  assignmentMode,
  isExpanded,
  isSelected,
  isHovered,
  isMenuOpen,
  menuPosition,
  pendingRouteOrderActive,
  previewDeliveriesCount,
  routeEtaByStopId,
  moveStop,
  formatTime,
  onCourierClick,
  onMouseEnter,
  onMouseLeave,
  onContextMenu,
  onMenuButtonClick,
  onCloseMenu,
  onToggleCourierShift,
  onToggleCourierStatus,
  onCancelRouteOrder,
  onConfirmRouteOrder,
}) => {
  const hasPreviewStops = courier.routeStops.some((stop) => stop.isPreview);
  const previewCount = hasPreviewStops ? previewDeliveriesCount : 0;
  const totalActiveDeliveries = courier.activeOrders.length;
  const realStops = courier.routeStops.filter((stop) => !stop.isPreview);
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
      data-courier-id={courier.id}
      className={`border-b border-[#e5e5e5] transition-all dark:border-app-border ${
        isSelected
          ? 'bg-[#f0fdf4] dark:bg-[#0a2f1a]'
          : isConnected && !courier.isOnShift
            ? 'bg-[#fafafa] dark:bg-app-surface'
            : isHovered
              ? 'bg-[#f0f0f0] dark:bg-[#222222]'
              : ''
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={onContextMenu}
    >
      <div className="cursor-pointer px-3 py-3" onClick={onCourierClick}>
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Circle
                  className={`h-3 w-3 flex-shrink-0 ${
                    !isConnected
                      ? 'fill-[#737373] text-[#737373]'
                      : !courier.isOnShift
                        ? 'fill-[#a3a3a3] text-[#a3a3a3]'
                        : totalActiveDeliveries > 0
                          ? 'fill-[#f59e0b] text-[#f59e0b]'
                          : 'fill-[#22c55e] text-[#22c55e]'
                  }`}
                />
                <span className="truncate text-sm font-bold text-[#0d0d12] dark:text-app-text">
                  {courier.name}
                </span>
                {isConnected && !courier.isOnShift && (
                  <span className="inline-flex flex-shrink-0 rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] font-medium text-[#737373] dark:bg-app-surface dark:text-app-text-secondary">
                    לא במשמרת
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {hasPreviewStops && (
                  <span className="rounded border border-dashed border-[#22c55e]/40 bg-[#22c55e]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#16a34a] dark:text-[#7bf1a8]">
                    +{previewCount}
                  </span>
                )}
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3 overflow-hidden text-xs text-[#737373] dark:text-app-text-secondary">
              <div className="flex flex-shrink-0 items-center gap-1">
                <span>{shiftLabel}</span>
              </div>
              <span className="flex-shrink-0">·</span>
              <div className="flex flex-shrink-0 items-center gap-1">
                <Package className="h-3 w-3" />
                <span>{totalActiveDeliveries} פעיל</span>
              </div>
              <span className="flex-shrink-0">·</span>
              <div className="flex flex-shrink-0 items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{realStops.length} עצירות</span>
              </div>
              {lastRealStop && (
                <>
                  <span className="flex-shrink-0">·</span>
                  <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-[#f59e0b] dark:text-[#fbbf24]">
                    <span className="truncate whitespace-nowrap">
                      מתפנה ב
                      {lastRealStop.type === 'pickup'
                        ? `מסעדת ${lastRealStop.order.restaurantName}`
                        : formatAddressWithArea(lastRealStop.order.address, lastRealStop.order.area)}
                    </span>
                    {!assignmentMode && realStops.length > 0 && (
                      isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 flex-shrink-0 text-[#737373]" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-[#737373]" />
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="relative flex-shrink-0">
            <button
              onClick={onMenuButtonClick}
              className="rounded-lg p-1.5 transition-colors hover:bg-white dark:hover:bg-[#262626]"
              title="אפשרויות"
            >
              <MoreVertical className="h-4 w-4 text-[#737373]" />
            </button>

            {isMenuOpen && menuPosition && createPortal(
              <>
                <div className="fixed inset-0 z-[9990]" onClick={onCloseMenu} />
                <div
                  className="fixed z-[9991] w-44 overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-2xl dark:border-app-border dark:bg-app-surface"
                  style={menuPosition}
                >
                  {courier.status !== 'offline' && (
                    <button
                      onClick={onToggleCourierShift}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm text-[#0d0d12] transition-colors hover:bg-[#fafafa] dark:text-app-text dark:hover:bg-[#262626]"
                    >
                      <CheckCircle className={`h-4 w-4 ${courier.isOnShift ? 'text-[#f59e0b]' : 'text-[#22c55e]'}`} />
                      <span>{courier.isOnShift ? 'סיים משמרת' : 'התחל משמרת'}</span>
                    </button>
                  )}
                  <button
                    onClick={onToggleCourierStatus}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm text-[#0d0d12] transition-colors hover:bg-[#fafafa] dark:text-app-text dark:hover:bg-[#262626]"
                  >
                    {courier.status === 'offline' ? (
                      <>
                        <Eye className="h-4 w-4 text-[#22c55e]" />
                        <span>הפעל שליח</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 text-[#737373]" />
                        <span>כבה שליח</span>
                      </>
                    )}
                  </button>
                </div>
              </>,
              document.body
            )}
          </div>
        </div>
      </div>

      {showRoute && (
        <div className="border-t border-[#e5e5e5] bg-[#f5f5f5] py-1 dark:border-app-border dark:bg-app-surface">
          {courier.routeStops.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#737373] dark:text-app-text-secondary">
                  מסלול ({realStops.length} עצירות{hasPreviewStops ? ` +${previewCount} בתצוגה מקדימה` : ''})
                </span>
                {!isHovered && (
                  <span className="text-[10px] text-[#a3a3a3] dark:text-[#737373]">גרור לשינוי סדר</span>
                )}
              </div>

              {pendingRouteOrderActive && (
                <div className="mx-2 mb-1 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/40 dark:bg-amber-900/20">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">הסדר השתנה — לאשר?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={onCancelRouteOrder}
                      className="rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1 text-xs text-[#737373] transition-colors hover:text-[#0d0d12] dark:border-[#404040] dark:bg-[#262626] dark:hover:text-[#fafafa]"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={onConfirmRouteOrder}
                      className="rounded-md bg-[#22c55e] px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#16a34a]"
                    >
                      ✓ אשר סדר
                    </button>
                  </div>
                </div>
              )}

              {courier.routeStops.map((stop, index) => (
                <DraggableRouteStop
                  key={stop.id}
                  stop={stop}
                  index={index}
                  courierId={courier.id}
                  moveStop={moveStop}
                  formatTime={formatTime}
                  isLast={index === courier.routeStops.length - 1}
                  stopNumber={index + 1}
                  totalStops={courier.routeStops.length}
                  etaAt={routeEtaByStopId?.[stop.id] ?? null}
                />
              ))}
            </>
          ) : (
            <div className="px-3 py-6 text-center">
              <Package className="mx-auto mb-2 h-6 w-6 text-[#a3a3a3] opacity-50" />
              <p className="text-xs text-[#737373] dark:text-app-text-secondary">אין משלוחים כרגע</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

