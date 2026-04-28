import React, { useLayoutEffect, useRef, useState } from 'react';
import { format as formatDate } from 'date-fns';
import { useNavigate } from 'react-router';
import {
  CheckCircle2,
  Clock3,
  Copy,
  Edit,
  FileText,
  Info,
  MapPin,
  Package,
  RotateCcw,
  Store,
  UserRound,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import type { Courier, Delivery, DeliveryStatus } from '../types/delivery.types';
import {
  EntityActionMenu,
  EntityActionMenuDivider,
  EntityActionMenuHeader,
  EntityActionMenuItem,
  EntityActionMenuOverlay,
} from '../components/common/entity-action-menu';
import { DeliveryStageTimelineTooltip } from '../components/common/delivery-stage-timeline';
import { DeliveryTimeDetailsTooltip } from '../components/common/delivery-time-details-tooltip';
import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import { VercelEmptyState } from '../components/common/vercel-empty-state';
import { STATUS_CONFIG } from './status-config';
import { formatOrderNumber } from '../utils/order-number';

type DeliveriesVercelListProps = {
  filteredDeliveries: Delivery[];
  emptyStateMode: 'no-data' | 'no-results' | 'filtered-empty';
  onClearFilters: () => void;
  totalCount: number;
  couriers: Courier[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
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
  isSelected: boolean;
  isDrawerTarget: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDrawer: (id: string) => void;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
  onUnassignCourier: (deliveryId: string) => void;
  onEditDelivery: (deliveryId: string) => void;
};

const rowGridClass =
  'grid grid-cols-[44px_minmax(126px,0.55fr)_minmax(220px,0.8fr)_minmax(240px,0.9fr)_minmax(430px,2.4fr)_44px]';

const getDeliveryDate = (delivery: Delivery) =>
  delivery.creation_time ?? delivery.createdAt ?? delivery.delivery_date;

const formatDeliveryDate = (delivery: Delivery) => {
  const value = getDeliveryDate(delivery);
  if (!value) return '-';
  try {
    return formatDate(value, 'HH:mm dd/MM');
  } catch {
    return '-';
  }
};

const getCourierStatusText = (
  delivery: Delivery,
  courierName: string,
  hasAssignedCourier: boolean,
) => {
  if (!hasAssignedCourier) {
    if (delivery.status === 'expired') return 'פג תוקף';
    return 'ממתין לשיבוץ';
  }

  switch (delivery.status) {
    case 'assigned':
      return `שובץ ל- ${courierName}`;
    case 'delivering':
      return `נאסף על ידי ${courierName}`;
    case 'delivered':
      return `נמסר על ידי ${courierName}`;
    case 'cancelled':
      return `בוטל לאחר שיוך לשליח ${courierName}`;
    case 'expired':
      return `פג תוקף לאחר שיוך לשליח ${courierName}`;
    case 'pending':
    default:
      return courierName;
  }
};

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

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

const DeliveryRowCheckbox: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <label
    className="flex h-full items-center justify-center"
    onClick={(event) => event.stopPropagation()}
  >
    <span className="sr-only">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer rounded border-[#404040] bg-transparent accent-[#ededed] focus:ring-1 focus:ring-[#ededed] focus:ring-offset-0"
    />
  </label>
);

const DeliveryVercelRow: React.FC<DeliveryVercelRowProps> = ({
  delivery,
  courier,
  isSelected,
  isDrawerTarget,
  onToggleSelect,
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
  const restaurantName = delivery.rest_name || delivery.restaurantName;
  const restaurantMeta = delivery.restaurantAddress || delivery.rest_city || delivery.restaurantCity || 'מסעדה';
  const clientName = delivery.client_name || delivery.customerName;
  const clientAddress = delivery.client_full_address || delivery.address;
  const hasAssignedCourier = Boolean(courier || delivery.courierId || delivery.runner_id || delivery.courierName);
  const courierName = courier?.name || delivery.courierName || (hasAssignedCourier ? 'לא ידוע' : 'לא שובץ');
  const courierStatusText = getCourierStatusText(delivery, courierName, hasAssignedCourier);

  const closeMenus = () => {
    setContextMenuPos(null);
  };

  const navigateToDelivery = () => {
    navigate(`/delivery/${delivery.id}`);
  };

  const handleCopyOrderNumber = () => {
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
      role="button"
      tabIndex={0}
      onClick={navigateToDelivery}
      onKeyDown={(event) => {
        if (event.key === 'Enter') navigateToDelivery();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setContextMenuPos({ x: event.clientX, y: event.clientY });
      }}
      className={joinClassNames(
        rowGridClass,
        'group min-w-[1120px] cursor-pointer border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors last:border-b-0 hover:bg-app-surface-raised focus-visible:bg-app-surface-raised',
        isSelected && 'bg-app-surface-raised',
        isDrawerTarget && 'shadow-[inset_2px_0_0_#ededed]',
      )}
    >
      <DeliveryRowCheckbox
        checked={isSelected}
        onChange={() => onToggleSelect(delivery.id)}
        label={`בחר משלוח ${delivery.orderNumber}`}
      />

      <div className="flex min-h-[72px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-app-text">{formatOrderNumber(delivery.orderNumber)}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-sm font-normal text-app-text-secondary">
          <span dir="ltr">{formatDeliveryDate(delivery)}</span>
          <DeliveryTimeDetailsTooltip delivery={delivery}>
            <Clock3 className="h-3.5 w-3.5" />
          </DeliveryTimeDetailsTooltip>
        </div>
      </div>

      <div className="flex min-h-[72px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Store className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
          <span className="truncate text-sm font-normal text-app-text">{restaurantName}</span>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-normal text-app-text-secondary">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{restaurantMeta}</span>
        </div>
      </div>

      <div className="flex min-h-[72px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
          <span className="truncate text-sm font-normal text-app-text">{clientName}</span>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-normal text-app-text-secondary">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{clientAddress}</span>
        </div>
      </div>

      <div className="flex min-h-[72px] min-w-0 items-center justify-end px-3 py-2">
        <div className="flex w-full min-w-0 items-center justify-end gap-2">
          <span className="min-w-0 truncate text-sm font-normal text-app-text-secondary">
            {courierStatusText}
          </span>
          <DeliveryStageTimelineTooltip delivery={delivery} />
        </div>
      </div>

      <div className="flex min-h-[72px] items-center justify-center px-1" onClick={(event) => event.stopPropagation()}>
        <EntityRowActionTrigger
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setContextMenuPos({ x: Math.max(8, rect.left - 180), y: rect.bottom + 8 });
          }}
          title={`פעולות משלוח ${delivery.orderNumber}`}
        />
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
              <EntityActionMenuHeader
                title={formatOrderNumber(delivery.orderNumber)}
                subtitle={<span className={`text-[11px] font-medium ${config.tableColor}`}>{config.label}</span>}
              />
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

export const DeliveriesVercelList: React.FC<DeliveriesVercelListProps> = ({
  filteredDeliveries,
  emptyStateMode,
  onClearFilters,
  totalCount,
  couriers,
  selectedIds,
  onToggleSelect,
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
      <div className="flex min-h-0 flex-1 flex-col bg-app-background">
        <VercelEmptyState
          title={emptyStateCopy.title}
          description={emptyStateCopy.description}
          actionLabel={emptyStateCopy.actionLabel}
          onAction={emptyStateCopy.actionLabel ? onClearFilters : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-app-background">
      <div ref={scrollContainerRef} className="deliveries-vercel-scroll min-h-0 flex-1 overflow-auto px-3" dir="ltr">
        <div className="min-w-[1120px] overflow-hidden border border-app-nav-border" dir="rtl">
          {filteredDeliveries.map((delivery) => {
            const courier = delivery.courierId
              ? couriers.find((candidate) => candidate.id === delivery.courierId) ?? null
              : null;

            return (
              <DeliveryVercelRow
                key={delivery.id}
                delivery={delivery}
                courier={courier}
                isSelected={selectedIds.has(delivery.id)}
                isDrawerTarget={drawerDeliveryId === delivery.id}
                onToggleSelect={onToggleSelect}
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
