import React, { useLayoutEffect, useRef, useState } from 'react';
import { format as formatDate } from 'date-fns';
import { useNavigate } from 'react-router';
import {
  Bike,
  Car,
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
  isDrawerTarget: boolean;
  onOpenDrawer: (id: string) => void;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
  onUnassignCourier: (deliveryId: string) => void;
  onEditDelivery: (deliveryId: string) => void;
};

const rowGridClass =
  'grid grid-cols-[minmax(0,1fr)_76px] md:grid-cols-[minmax(96px,140px)_minmax(120px,210px)_minmax(120px,210px)_minmax(120px,190px)_minmax(120px,1fr)_44px] xl:grid-cols-[minmax(120px,166px)_minmax(170px,240px)_minmax(170px,240px)_minmax(150px,220px)_minmax(160px,1fr)_44px] 2xl:grid-cols-[minmax(140px,190px)_minmax(200px,280px)_minmax(200px,280px)_minmax(180px,260px)_minmax(220px,1fr)_44px]';

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

const CourierVehicleIcon: React.FC<{ vehicleType?: string }> = ({ vehicleType }) => {
  const Icon = vehicleType === '\u05e8\u05db\u05d1' ? Car : Bike;
  return <Icon className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />;
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

const DeliveryVercelRow: React.FC<DeliveryVercelRowProps> = ({
  delivery,
  courier,
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
  const restaurantName = delivery.rest_name || delivery.restaurantName;
  const restaurantMeta = delivery.restaurantAddress || delivery.rest_city || delivery.restaurantCity || 'מסעדה';
  const clientName = delivery.client_name || delivery.customerName;
  const clientAddress = delivery.client_full_address || delivery.address;
  const hasAssignedCourier = Boolean(courier || delivery.courierId || delivery.runner_id || delivery.courierName);
  const courierName = courier?.name || delivery.courierName || (hasAssignedCourier ? 'לא ידוע' : 'לא שובץ');
  const courierVehicleType = hasAssignedCourier ? courier?.vehicleType || delivery.vehicle_type : undefined;
  const courierColumnText = hasAssignedCourier ? courierName : '-';

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
        'group relative w-full min-w-0 cursor-pointer border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors last:border-b-0 hover:bg-app-surface-raised focus-visible:bg-app-surface-raised',
        isDrawerTarget && 'shadow-[inset_2px_0_0_#ededed]',
      )}
    >
      <div
        className="col-start-2 row-start-1 flex min-h-0 flex-row-reverse items-start justify-center gap-2 px-2 py-3 md:hidden"
        dir="ltr"
        onClick={(event) => event.stopPropagation()}
      >
        <DeliveryStageTimelineTooltip delivery={delivery} />
        <EntityRowActionTrigger
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setContextMenuPos({ x: Math.max(8, rect.left - 180), y: rect.bottom + 8 });
          }}
          title={`פעולות משלוח ${delivery.orderNumber}`}
        />
      </div>

      <div className="col-start-1 row-start-1 flex min-h-0 min-w-0 flex-col justify-center px-2 py-2 md:col-auto md:row-auto md:min-h-[72px] md:px-3">
        <div className="flex min-w-0 items-center gap-2 md:flex-col md:items-start md:gap-0">
          <span className="truncate text-sm font-semibold text-app-text">{formatOrderNumber(delivery.orderNumber)}</span>
          <div className="flex shrink-0 items-center gap-1.5 text-sm font-normal text-app-text-secondary md:mt-1">
            <span className="whitespace-nowrap" dir="ltr">{formatDeliveryDate(delivery)}</span>
            <DeliveryTimeDetailsTooltip delivery={delivery}>
              <Clock3 className="h-3.5 w-3.5" />
            </DeliveryTimeDetailsTooltip>
          </div>
        </div>
      </div>

      <div className="col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:py-2 md:pl-3 md:pr-5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Store className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
          <span className="truncate text-sm font-normal text-app-text">{restaurantName}</span>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-normal text-app-text-secondary">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{restaurantMeta}</span>
        </div>
      </div>

      <div className="col-start-1 row-start-3 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:px-3 md:py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
          <span className="truncate text-sm font-normal text-app-text">{clientName}</span>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-normal text-app-text-secondary">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{clientAddress}</span>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-normal text-app-text-secondary md:hidden">
          {hasAssignedCourier ? <CourierVehicleIcon vehicleType={courierVehicleType} /> : null}
          <span className="min-w-0 truncate text-sm font-normal text-[#EDEDED]">
            {courierColumnText}
          </span>
        </div>
      </div>

      <div className="hidden min-h-0 min-w-0 items-center justify-end px-2 py-1 md:col-auto md:row-auto md:flex md:min-h-[72px] md:px-3 md:py-2">
        <div className="flex w-full min-w-0 items-center justify-end gap-1.5 overflow-hidden text-right" dir="rtl">
          {hasAssignedCourier ? <CourierVehicleIcon vehicleType={courierVehicleType} /> : null}
          <span className="min-w-0 truncate text-sm font-normal text-[#EDEDED]">
            {courierColumnText}
          </span>
        </div>
      </div>

      <div className="hidden min-h-0 min-w-0 items-center justify-end px-2 py-2 md:col-auto md:row-auto md:flex md:min-h-[72px] md:px-3">
        <div className="flex w-full min-w-0 items-center justify-end">
          <DeliveryStageTimelineTooltip delivery={delivery} />
        </div>
      </div>

      <div className="contents min-h-0 items-center justify-center px-1 md:col-auto md:row-auto md:flex md:min-h-[72px]" onClick={(event) => event.stopPropagation()}>
        <div className="hidden md:block">
          <EntityRowActionTrigger
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setContextMenuPos({ x: Math.max(8, rect.left - 180), y: rect.bottom + 8 });
            }}
            title={`פעולות משלוח ${delivery.orderNumber}`}
          />
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
  onOpenDrawer,
  onStatusChange,
  onCancelDelivery,
  onCompleteDelivery,
  onUnassignCourier,
  onEditDelivery,
  drawerDeliveryId,
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
      <div ref={scrollContainerRef} className="deliveries-vercel-scroll min-h-0 flex-1 overflow-auto px-2 md:px-3" dir="ltr">
        <div className="w-full min-w-0 overflow-visible border border-app-nav-border md:overflow-hidden" dir="rtl">
          {filteredDeliveries.map((delivery) => {
            const courier = delivery.courierId
              ? couriers.find((candidate) => candidate.id === delivery.courierId) ?? null
              : null;

            return (
              <DeliveryVercelRow
                key={delivery.id}
                delivery={delivery}
                courier={courier}
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
    </div>
  );
};
