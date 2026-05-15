import React, { useLayoutEffect, useRef, useState } from 'react';
import { format as formatDate } from 'date-fns';
import { useNavigate } from 'react-router';
import {
  Bike,
  Car,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Edit,
  FileText,
  Info,
  Package,
  RotateCcw,
  Route,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import type { Courier, Delivery, DeliveryStatus, Restaurant } from '../types/delivery.types';
import {
  EntityActionMenu,
  EntityActionMenuDivider,
  EntityActionMenuItem,
  EntityActionMenuOverlay,
} from '../components/common/entity-action-menu';
import {
  DeliveryStageIndicator,
  DeliveryStageTimelineTooltip,
} from '../components/common/delivery-stage-timeline';
import { DeliveryTimeDetailsTooltip } from '../components/common/delivery-time-details-tooltip';
import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import { VercelEmptyState } from '../components/common/vercel-empty-state';
import type { EntityViewMode } from '../components/common/view-mode-toggle';
import { STATUS_CONFIG } from './status-config';
import { formatOrderNumber } from '../utils/order-number';
import { formatCurrency, getDeliveryCustomerCharge } from '../utils/delivery-finance';
import { CourierAvatarMark } from '../couriers/courier-avatar-mark';
import { RestaurantLogoMark } from '../restaurants/restaurant-logo-mark';

type DeliveriesVercelListProps = {
  filteredDeliveries: Delivery[];
  viewMode?: EntityViewMode;
  showDateForToday?: boolean;
  emptyStateMode: 'no-data' | 'no-results' | 'filtered-empty';
  onClearFilters: () => void;
  totalCount: number;
  couriers: Courier[];
  restaurants: Restaurant[];
  onOpenDrawer: (id: string) => void;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
  onUnassignCourier: (deliveryId: string) => void;
  onEditDelivery: (deliveryId: string) => void;
  drawerDeliveryId: string | null;
  selectionBar?: React.ReactNode;
};

type DeliveryVercelRowProps = {
  delivery: Delivery;
  courier: Courier | null;
  restaurant: Restaurant | null;
  showDateForToday: boolean;
  isDrawerTarget: boolean;
  onOpenDrawer: (id: string) => void;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
  onUnassignCourier: (deliveryId: string) => void;
  onEditDelivery: (deliveryId: string) => void;
};

const rowGridClass =
  'delivery-vercel-row';

const getDeliveryDate = (delivery: Delivery) =>
  delivery.creation_time ?? delivery.createdAt ?? delivery.delivery_date;

const isSameCalendarDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const formatDeliveryDate = (delivery: Delivery, showDateForToday: boolean) => {
  const value = getDeliveryDate(delivery);
  if (!value) return '-';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const formatPattern =
      !showDateForToday && isSameCalendarDay(date, new Date()) ? 'HH:mm' : 'HH:mm dd/MM';
    return formatDate(date, formatPattern);
  } catch {
    return '-';
  }
};

const UNASSIGNED_COURIER_LABEL = 'ממתין לשיבוץ';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const CourierAssignmentLine: React.FC<{
  assigned: boolean;
  label: string;
  vehicleType?: string;
  className?: string;
}> = ({ assigned, label, vehicleType, className }) => {
  const Icon = assigned ? (vehicleType === 'רכב' ? Car : Bike) : null;

  return (
    <div className={joinClassNames('flex min-w-0 items-center gap-2 text-right', className)} dir="rtl">
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" /> : null}
      <span
        className={joinClassNames(
          'min-w-0 truncate text-sm font-normal',
          assigned ? 'text-app-text' : 'text-app-text-secondary',
        )}
      >
        {label}
      </span>
    </div>
  );
};

const DeliveryDirectionMark: React.FC<{
  label: 'מ-' | 'ל-';
  shape?: 'square' | 'circle';
}> = ({ label, shape = 'square' }) => (
  <span
    className={joinClassNames(
      'relative flex h-6 w-6 shrink-0 items-center justify-center border border-app-nav-border bg-app-surface-raised text-[10px] font-semibold leading-none text-app-text shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--app-border)_20%,transparent)]',
      shape === 'circle' ? 'rounded-full' : 'rounded-[5px]',
    )}
    dir="rtl"
  >
    {label}
  </span>
);

const DeliveryDistanceInline: React.FC<{
  label: string;
  className?: string;
}> = ({ label, className }) => (
  <div
    className={joinClassNames(
      'delivery-row__route-distance inline-flex min-w-0 items-center gap-1.5 text-sm font-normal text-app-text-secondary',
      className,
    )}
    dir="rtl"
  >
    <Route className="h-3.5 w-3.5 shrink-0" />
    <span className="min-w-0 truncate" dir="ltr">
      {label}
    </span>
  </div>
);

const getRestaurantForDelivery = (delivery: Delivery, restaurants: Restaurant[]) => {
  const restaurantId = delivery.restaurantId || delivery.rest_id;
  const restaurantName = delivery.restaurantName || delivery.rest_name;

  return restaurants.find((restaurant) =>
    (restaurantId && restaurant.id === restaurantId) ||
    (restaurantName && restaurant.name === restaurantName)
  ) ?? null;
};

const getDeliveryEmptyStateCopy = (
  mode: DeliveriesVercelListProps['emptyStateMode'],
  totalCount: number,
) => {
  if (mode === 'no-data' || totalCount === 0) {
    return {
      title: 'אין משלוחים',
      description: 'עדיין לא נוצרו משלוחים במערכת.',
      actionLabel: undefined,
    };
  }

  if (mode === 'no-results') {
    return {
      title: 'אין תוצאות',
      description: 'אין משלוחים שתואמים לחיפוש הנוכחי.',
      actionLabel: 'נקה חיפוש',
    };
  }

  return {
    title: 'אין תוצאות',
    description: 'אין משלוחים שתואמים לסינון הנוכחי.',
    actionLabel: 'נקה סינון',
  };
};

const DeliveryVercelRow: React.FC<DeliveryVercelRowProps> = ({
  delivery,
  courier,
  restaurant,
  showDateForToday,
  isDrawerTarget,
  onOpenDrawer,
  onStatusChange,
  onCancelDelivery,
  onCompleteDelivery,
  onUnassignCourier,
  onEditDelivery,
}) => {
  const navigate = useNavigate();
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const config = STATUS_CONFIG[delivery.status];
  const StatusIcon = config.icon;
  const restaurantName = delivery.rest_name || delivery.restaurantName || restaurant?.name || '-';
  const restaurantMeta = delivery.restaurantAddress || delivery.rest_city || delivery.restaurantCity || 'מסעדה';
  const clientName = delivery.client_name || delivery.customerName || '-';
  const clientAddress = delivery.client_full_address || delivery.address;
  const hasAssignedCourier = Boolean(courier || delivery.courierId || delivery.runner_id || delivery.courierName);
  const courierName = courier?.name || delivery.courierName || (hasAssignedCourier ? 'לא ידוע' : UNASSIGNED_COURIER_LABEL);
  const courierColumnText = hasAssignedCourier ? courierName : UNASSIGNED_COURIER_LABEL;
  const courierVehicleType = hasAssignedCourier ? courier?.vehicleType || delivery.vehicle_type : undefined;
  const shouldShowCourierAssignment = delivery.status !== 'cancelled' || hasAssignedCourier;
  const distanceLabel = delivery.delivery_distance ? `${delivery.delivery_distance.toFixed(1)} ק״מ` : '-';

  const closeMenus = () => {
    setContextMenuPos(null);
  };

  const navigateToDelivery = () => {
    navigate(`/delivery/${delivery.id}`);
  };

  const handleCopyOrderNumber = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    navigator.clipboard.writeText(delivery.orderNumber);
    toast.success(`מספר הזמנה ${delivery.orderNumber} הועתק`);
    closeMenus();
  };

  const handleStatusChange = (status: DeliveryStatus) => {
    if (status === delivery.status) return;
    if (status === 'cancelled') {
      onCancelDelivery(delivery.id);
    } else if (status === 'delivered') {
      onCompleteDelivery(delivery.id);
    } else {
      onStatusChange(delivery.id, status);
    }
    closeMenus();
  };

  return (
    <div
      onContextMenu={(event) => {
        event.preventDefault();
        setContextMenuPos({ x: event.clientX, y: event.clientY });
      }}
      className={joinClassNames(
        rowGridClass,
        'group relative w-full min-w-0 cursor-default border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors last:border-b-0 hover:bg-app-surface-raised',
        isDrawerTarget && 'shadow-[inset_2px_0_0_var(--app-brand)]',
      )}
    >
      <div
        className="delivery-row__actions flex min-h-0 items-center justify-center"
        dir="ltr"
        onClick={(event) => event.stopPropagation()}
      >
        <EntityRowActionTrigger
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setContextMenuPos({ x: Math.max(8, rect.left - 180), y: rect.bottom + 8 });
          }}
          title={`פעולות משלוח ${delivery.orderNumber}`}
        />
      </div>

      <div
        className="delivery-row__progress flex min-h-0 items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="delivery-row__stage-cluster">
          <DeliveryStageTimelineTooltip delivery={delivery}>
            <DeliveryStageIndicator status={delivery.status} />
          </DeliveryStageTimelineTooltip>
        </span>
      </div>

      <div className="delivery-row__order flex min-h-0 min-w-0 flex-col justify-center" dir="rtl">
        <div className="delivery-row__order-inner flex min-w-0 flex-col items-start gap-0 text-right">
          <button
            type="button"
            onClick={handleCopyOrderNumber}
            onKeyDown={(event) => event.stopPropagation()}
            className="delivery-row__order-number group/order-number inline-flex max-w-full items-center justify-start gap-1.5 text-right text-sm font-semibold text-app-text outline-none"
            title={`העתק מספר הזמנה ${delivery.orderNumber}`}
          >
            <span className="min-w-0 truncate">{formatOrderNumber(delivery.orderNumber)}</span>
            <Copy className="delivery-row__copy-icon h-3.5 w-3.5 shrink-0 text-app-text-secondary opacity-0 transition-opacity group-hover/order-number:opacity-100 group-focus-visible/order-number:opacity-100" />
          </button>
          <div className="delivery-row__time mt-1 flex shrink-0 items-center justify-start gap-1.5 text-right text-sm font-normal text-app-text-secondary">
            <span className="whitespace-nowrap" dir="ltr">{formatDeliveryDate(delivery, showDateForToday)}</span>
            <DeliveryTimeDetailsTooltip delivery={delivery}>
              <Clock3 className="h-3.5 w-3.5 shrink-0" />
            </DeliveryTimeDetailsTooltip>
          </div>
        </div>
      </div>

      <div className="delivery-row__route-table min-h-0 min-w-0 items-center">
        <div className="delivery-row__route-table-pair flex w-full min-w-0 items-center gap-3" dir="rtl">
          <div className="delivery-row__route-table-leg flex min-w-0 items-center gap-2 text-right" dir="rtl">
            <DeliveryDirectionMark label="מ-" />
            <div className="min-w-0 text-right">
              <div className="truncate text-sm font-medium text-app-text">{restaurantName}</div>
              <div className="mt-1 truncate text-sm font-normal text-app-text-secondary">{restaurantMeta}</div>
            </div>
          </div>

          <div className="delivery-row__route-table-leg flex min-w-0 items-center gap-2 text-right" dir="rtl">
            <DeliveryDirectionMark label="ל-" />
            <div className="min-w-0 text-right">
              <div className="truncate text-sm font-normal text-app-text">{clientName}</div>
              <div className="mt-1 truncate text-sm font-normal text-app-text-secondary">{clientAddress}</div>
            </div>
          </div>

          <DeliveryDistanceInline
            label={distanceLabel}
            className="delivery-row__route-table-distance"
          />
        </div>
      </div>

      <div className="delivery-row__route-compact min-h-0 min-w-0 flex-wrap justify-start" dir="rtl">
        <div className="delivery-row__route-compact-pair flex min-w-0 gap-3" dir="rtl">
          <div className="delivery-row__route-compact-leg flex min-w-0 items-center justify-start gap-2 text-right" dir="rtl">
            <DeliveryDirectionMark label="מ-" />
            <div className="min-w-0 text-right">
              <div className="truncate text-sm font-medium text-app-text">{restaurantName}</div>
              <div className="mt-1 truncate text-sm font-normal text-app-text-secondary">{restaurantMeta}</div>
            </div>
          </div>

          <div className="delivery-row__route-compact-leg flex min-w-0 items-center justify-start gap-2 text-right" dir="rtl">
            <DeliveryDirectionMark label="ל-" />
            <div className="min-w-0 text-right">
              <div className="truncate text-sm font-normal text-app-text">{clientName}</div>
              <div className="mt-1 truncate text-sm font-normal text-app-text-secondary">{clientAddress}</div>
            </div>
          </div>
        </div>

        <div className="delivery-row__route-compact-footer flex min-w-0 items-center justify-between gap-3" dir="rtl">
          <DeliveryDistanceInline
            label={distanceLabel}
            className="delivery-row__route-compact-distance"
          />

          {shouldShowCourierAssignment ? (
            <CourierAssignmentLine
              assigned={hasAssignedCourier}
              label={courierColumnText}
              vehicleType={courierVehicleType}
              className="delivery-row__route-compact-courier justify-end whitespace-nowrap"
            />
          ) : null}
        </div>
      </div>

      <div className="delivery-row__courier-table min-h-0 min-w-0 items-center justify-start">
        {shouldShowCourierAssignment ? (
          <CourierAssignmentLine
            assigned={hasAssignedCourier}
            label={courierColumnText}
            vehicleType={courierVehicleType}
            className="delivery-row__courier-line w-full"
          />
        ) : null}
      </div>

      <div className="contents" onClick={(event) => event.stopPropagation()}>
        <EntityActionMenuOverlay
          open={Boolean(contextMenuPos)}
          position={contextMenuPos}
          onClose={closeMenus}
        >
          {contextMenuPos ? (
            <EntityActionMenu
              style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <EntityActionMenuItem
                onClick={() => {
                  navigateToDelivery();
                  closeMenus();
                }}
                icon={<FileText className="h-3.5 w-3.5 text-app-text-secondary" />}
              >
                פתח עמוד משלוח
              </EntityActionMenuItem>
              <EntityActionMenuItem
                onClick={() => {
                  onOpenDrawer(delivery.id);
                  closeMenus();
                }}
                icon={<Info className="h-3.5 w-3.5 text-app-text-secondary" />}
              >
                פתח פרטים מהירים
              </EntityActionMenuItem>
              <EntityActionMenuItem
                onClick={handleCopyOrderNumber}
                icon={<Copy className="h-3.5 w-3.5 text-app-text-secondary" />}
              >
                העתק מספר הזמנה
              </EntityActionMenuItem>
              <EntityActionMenuDivider />
              <EntityActionMenuItem
                onClick={() => {
                  onEditDelivery(delivery.id);
                  closeMenus();
                }}
                icon={<Edit className="h-3.5 w-3.5 text-app-text-secondary" />}
              >
                עריכת משלוח
              </EntityActionMenuItem>

              {delivery.status === 'pending' ? (
                <>
                  <EntityActionMenuDivider />
                  <EntityActionMenuItem
                    onClick={() => {
                      onOpenDrawer(delivery.id);
                      closeMenus();
                    }}
                    icon={<UserPlus className="h-3.5 w-3.5 text-app-text-secondary" />}
                  >
                    שיבוץ שליח
                  </EntityActionMenuItem>
                </>
              ) : null}

              {delivery.status === 'assigned' ? (
                <>
                  <EntityActionMenuDivider />
                  <EntityActionMenuItem
                    onClick={() => {
                      onUnassignCourier(delivery.id);
                      closeMenus();
                    }}
                    icon={<RotateCcw className="h-3.5 w-3.5 text-app-text-secondary" />}
                  >
                    הסרת שיוך
                  </EntityActionMenuItem>
                  <EntityActionMenuItem
                    onClick={() => handleStatusChange('delivering')}
                    icon={<Package className="h-3.5 w-3.5 text-green-400" />}
                  >
                    סמן נאסף
                  </EntityActionMenuItem>
                </>
              ) : null}

              {delivery.status === 'delivering' ? (
                <>
                  <EntityActionMenuDivider />
                  <EntityActionMenuItem
                    onClick={() => handleStatusChange('delivered')}
                    icon={<CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
                  >
                    סמן נמסר
                  </EntityActionMenuItem>
                </>
              ) : null}

              {!['delivered', 'cancelled'].includes(delivery.status) ? (
                <>
                  <EntityActionMenuDivider />
                  <EntityActionMenuItem
                    onClick={() => handleStatusChange('cancelled')}
                    icon={<XCircle className="h-3.5 w-3.5" />}
                    danger
                  >
                    ביטול משלוח
                  </EntityActionMenuItem>
                </>
              ) : null}
            </EntityActionMenu>
          ) : null}
        </EntityActionMenuOverlay>
      </div>
    </div>
  );
};

const DeliveryVercelCard: React.FC<DeliveryVercelRowProps> = ({
  delivery,
  courier,
  restaurant,
  showDateForToday,
  isDrawerTarget,
  onOpenDrawer,
  onStatusChange,
  onCancelDelivery,
  onCompleteDelivery,
  onUnassignCourier,
  onEditDelivery,
}) => {
  const navigate = useNavigate();
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const config = STATUS_CONFIG[delivery.status];
  const StatusIcon = config.icon;
  const restaurantName = delivery.rest_name || delivery.restaurantName || restaurant?.name || '-';
  const restaurantMeta = delivery.restaurantAddress || delivery.rest_city || delivery.restaurantCity || 'מסעדה';
  const clientName = delivery.client_name || delivery.customerName || '-';
  const clientAddress = delivery.client_full_address || delivery.address || '-';
  const hasAssignedCourier = Boolean(courier || delivery.courierId || delivery.runner_id || delivery.courierName);
  const courierName = courier?.name || delivery.courierName || (hasAssignedCourier ? 'לא ידוע' : UNASSIGNED_COURIER_LABEL);
  const courierColumnText = hasAssignedCourier ? courierName : UNASSIGNED_COURIER_LABEL;
  const courierVehicleType = hasAssignedCourier ? courier?.vehicleType || delivery.vehicle_type : undefined;
  const priceLabel = formatCurrency(getDeliveryCustomerCharge(delivery));

  const closeMenus = () => {
    setContextMenuPos(null);
  };

  const navigateToDelivery = () => {
    navigate(`/delivery/${delivery.id}`);
  };

  const handleCopyOrderNumber = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    navigator.clipboard.writeText(delivery.orderNumber);
    toast.success(`מספר הזמנה ${delivery.orderNumber} הועתק`);
    closeMenus();
  };

  const handleStatusChange = (status: DeliveryStatus) => {
    if (status === delivery.status) return;
    if (status === 'cancelled') {
      onCancelDelivery(delivery.id);
    } else if (status === 'delivered') {
      onCompleteDelivery(delivery.id);
    } else {
      onStatusChange(delivery.id, status);
    }
    closeMenus();
  };

  return (
    <div
      onContextMenu={(event) => {
        event.preventDefault();
        setContextMenuPos({ x: event.clientX, y: event.clientY });
      }}
      className={joinClassNames(
        'group min-w-0 cursor-default rounded-lg border border-app-nav-border bg-app-surface p-3 text-app-text outline-none transition-colors hover:bg-app-surface-raised',
        isDrawerTarget && 'shadow-[inset_2px_0_0_var(--app-brand)]',
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="shrink-0" onClick={(event) => event.stopPropagation()}>
            <DeliveryStageTimelineTooltip delivery={delivery}>
              <DeliveryStageIndicator status={delivery.status} />
            </DeliveryStageTimelineTooltip>
          </span>
          <div className="min-w-0">
            <button
              type="button"
              onClick={handleCopyOrderNumber}
              onKeyDown={(event) => event.stopPropagation()}
              className="group/order-number inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-app-text outline-none"
              title={`העתק מספר הזמנה ${delivery.orderNumber}`}
            >
              <span className="min-w-0 truncate">{formatOrderNumber(delivery.orderNumber)}</span>
              <Copy className="h-3.5 w-3.5 shrink-0 text-app-text-secondary opacity-0 transition-opacity group-hover/order-number:opacity-100 group-focus-visible/order-number:opacity-100" />
            </button>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-app-text-secondary">
              <span className="truncate" dir="ltr">{formatDeliveryDate(delivery, showDateForToday)}</span>
              <DeliveryTimeDetailsTooltip delivery={delivery}>
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
              </DeliveryTimeDetailsTooltip>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <EntityRowActionTrigger
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setContextMenuPos({ x: Math.max(8, rect.left - 180), y: rect.bottom + 8 });
            }}
            title={`פעולות משלוח ${delivery.orderNumber}`}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-app-text-secondary">מסעדה</div>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <RestaurantLogoMark name={restaurantName} logoUrl={restaurant?.logoUrl} size="xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-app-text">{restaurantName}</div>
              <div className="mt-1 truncate text-xs text-app-text-secondary">{restaurantMeta}</div>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[11px] text-app-text-secondary">לקוח</div>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <CourierAvatarMark name={clientName} size="xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-app-text">{clientName}</div>
              <div className="mt-1 truncate text-xs text-app-text-secondary">{clientAddress}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-app-text-secondary">שליח</div>
            <div className="mt-1">
              <CourierAssignmentLine
                assigned={hasAssignedCourier}
                label={courierColumnText}
                vehicleType={courierVehicleType}
              />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-app-text-secondary">חיוב</div>
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
              <span className="truncate text-sm font-semibold text-app-text">{priceLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-app-nav-border pt-3 text-xs text-app-text-secondary">
        <span className={joinClassNames('inline-flex items-center gap-1.5 font-medium', config.tableColor)}>
          <StatusIcon className="h-3.5 w-3.5" />
          <span>{config.label}</span>
        </span>
        <span>{delivery.delivery_distance ? `${delivery.delivery_distance.toFixed(1)} ק״מ` : '-'}</span>
      </div>

      <EntityActionMenuOverlay
        open={Boolean(contextMenuPos)}
        position={contextMenuPos}
        onClose={closeMenus}
      >
        {contextMenuPos ? (
          <EntityActionMenu
            style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <EntityActionMenuItem
              onClick={() => {
                navigateToDelivery();
                closeMenus();
              }}
              icon={<FileText className="h-3.5 w-3.5 text-app-text-secondary" />}
            >
              פתח עמוד משלוח
            </EntityActionMenuItem>
            <EntityActionMenuItem
              onClick={() => {
                onOpenDrawer(delivery.id);
                closeMenus();
              }}
              icon={<Info className="h-3.5 w-3.5 text-app-text-secondary" />}
            >
              פתח פרטים מהירים
            </EntityActionMenuItem>
            <EntityActionMenuItem
              onClick={handleCopyOrderNumber}
              icon={<Copy className="h-3.5 w-3.5 text-app-text-secondary" />}
            >
              העתק מספר הזמנה
            </EntityActionMenuItem>
            <EntityActionMenuDivider />
            <EntityActionMenuItem
              onClick={() => {
                onEditDelivery(delivery.id);
                closeMenus();
              }}
              icon={<Edit className="h-3.5 w-3.5 text-app-text-secondary" />}
            >
              עריכת משלוח
            </EntityActionMenuItem>

            {delivery.status === 'pending' ? (
              <>
                <EntityActionMenuDivider />
                <EntityActionMenuItem
                  onClick={() => {
                    onOpenDrawer(delivery.id);
                    closeMenus();
                  }}
                  icon={<UserPlus className="h-3.5 w-3.5 text-app-text-secondary" />}
                >
                  שיבוץ שליח
                </EntityActionMenuItem>
              </>
            ) : null}

            {delivery.status === 'assigned' ? (
              <>
                <EntityActionMenuDivider />
                <EntityActionMenuItem
                  onClick={() => {
                    onUnassignCourier(delivery.id);
                    closeMenus();
                  }}
                  icon={<RotateCcw className="h-3.5 w-3.5 text-app-text-secondary" />}
                >
                  הסרת שיוך
                </EntityActionMenuItem>
                <EntityActionMenuItem
                  onClick={() => handleStatusChange('delivering')}
                  icon={<Package className="h-3.5 w-3.5 text-green-400" />}
                >
                  סמן נאסף
                </EntityActionMenuItem>
              </>
            ) : null}

            {delivery.status === 'delivering' ? (
              <>
                <EntityActionMenuDivider />
                <EntityActionMenuItem
                  onClick={() => handleStatusChange('delivered')}
                  icon={<CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
                >
                  סמן נמסר
                </EntityActionMenuItem>
              </>
            ) : null}

            {!['delivered', 'cancelled'].includes(delivery.status) ? (
              <>
                <EntityActionMenuDivider />
                <EntityActionMenuItem
                  onClick={() => handleStatusChange('cancelled')}
                  icon={<XCircle className="h-3.5 w-3.5" />}
                  danger
                >
                  ביטול משלוח
                </EntityActionMenuItem>
              </>
            ) : null}
          </EntityActionMenu>
        ) : null}
      </EntityActionMenuOverlay>
    </div>
  );
};

export const DeliveriesVercelList: React.FC<DeliveriesVercelListProps> = ({
  filteredDeliveries,
  viewMode = 'list',
  showDateForToday = true,
  emptyStateMode,
  onClearFilters,
  totalCount,
  couriers,
  restaurants,
  onOpenDrawer,
  onStatusChange,
  onCancelDelivery,
  onCompleteDelivery,
  onUnassignCourier,
  onEditDelivery,
  drawerDeliveryId,
  selectionBar,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return undefined;

    const alignToRtlStartEdge = () => {
      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      if (maxScrollLeft <= 0) return;
      element.scrollLeft = maxScrollLeft;
    };

    const animationFrame = window.requestAnimationFrame(alignToRtlStartEdge);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(alignToRtlStartEdge);

    resizeObserver?.observe(element);
    if (element.firstElementChild) {
      resizeObserver?.observe(element.firstElementChild);
    }
    window.addEventListener('resize', alignToRtlStartEdge);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', alignToRtlStartEdge);
    };
  }, [filteredDeliveries.length]);

  if (filteredDeliveries.length === 0) {
    const emptyStateCopy = getDeliveryEmptyStateCopy(emptyStateMode, totalCount);

    return (
      <div data-view-mode={viewMode} className="flex min-h-0 flex-1 flex-col bg-app-background">
        <VercelEmptyState
          title={emptyStateCopy.title}
          description={emptyStateCopy.description}
          actionLabel={emptyStateCopy.actionLabel}
          onAction={emptyStateCopy.actionLabel ? onClearFilters : undefined}
        />
      </div>
    );
  }

  if (viewMode === 'cards') {
    return (
      <div data-view-mode="cards" className="flex min-h-0 flex-1 flex-col bg-app-background">
        <div className="resource-list-scroll min-h-0 flex-1 overflow-auto px-2 pb-3 lg:px-3" dir="rtl">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
            {filteredDeliveries.map((delivery) => {
              const courier = delivery.courierId
                ? couriers.find((candidate) => candidate.id === delivery.courierId) ?? null
                : null;
              const restaurant = getRestaurantForDelivery(delivery, restaurants);

              return (
                <DeliveryVercelCard
                  key={delivery.id}
                  delivery={delivery}
                  courier={courier}
                  restaurant={restaurant}
                  showDateForToday={showDateForToday}
                  isDrawerTarget={drawerDeliveryId === delivery.id}
                  onOpenDrawer={onOpenDrawer}
                  onStatusChange={onStatusChange}
                  onCancelDelivery={onCancelDelivery}
                  onCompleteDelivery={onCompleteDelivery}
                  onUnassignCourier={onUnassignCourier}
                  onEditDelivery={onEditDelivery}
                />
              );
            })}
          </div>
        </div>
        {selectionBar}
      </div>
    );
  }

  return (
    <div data-view-mode="list" className="flex min-h-0 flex-1 flex-col bg-app-background">
      <div ref={scrollContainerRef} className="deliveries-vercel-scroll min-h-0 flex-1 overflow-auto px-2 lg:px-3" dir="ltr">
        <div className="delivery-vercel-list-frame w-full min-w-0 overflow-visible border border-app-nav-border lg:overflow-hidden" dir="rtl">
          {filteredDeliveries.map((delivery) => {
            const courier = delivery.courierId
              ? couriers.find((candidate) => candidate.id === delivery.courierId) ?? null
              : null;
            const restaurant = getRestaurantForDelivery(delivery, restaurants);

            return (
              <DeliveryVercelRow
                key={delivery.id}
                delivery={delivery}
                courier={courier}
                restaurant={restaurant}
                showDateForToday={showDateForToday}
                isDrawerTarget={drawerDeliveryId === delivery.id}
                onOpenDrawer={onOpenDrawer}
                onStatusChange={onStatusChange}
                onCancelDelivery={onCancelDelivery}
                onCompleteDelivery={onCompleteDelivery}
                onUnassignCourier={onUnassignCourier}
                onEditDelivery={onEditDelivery}
              />
            );
          })}
        </div>
      </div>
      {selectionBar}
    </div>
  );
};
