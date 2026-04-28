import React, { useLayoutEffect, useRef, useState } from 'react';
import { format as formatDate } from 'date-fns';
import { createPortal } from 'react-dom';
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

const toDeliveryDate = (value: Date | string | number | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTimelineDate = (value: Date | string | number | null | undefined) => {
  const date = toDeliveryDate(value);
  if (!date) return '-';
  return formatDate(date, 'HH:mm dd/MM/yyyy');
};

const formatRelativeAge = (value: Date | string | number | null | undefined) => {
  const date = toDeliveryDate(value);
  if (!date) return null;

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דק׳`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `לפני ${hours} ש׳`;

  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
};

const getStageIndicatorMeta = (status: DeliveryStatus) => {
  switch (status) {
    case 'pending':
      return { activeSegments: 1, color: '#f97316' };
    case 'assigned':
      return { activeSegments: 2, color: '#eab308' };
    case 'delivering':
      return { activeSegments: 3, color: '#22c55e' };
    case 'delivered':
      return { activeSegments: 4, color: '#0070f3' };
    case 'cancelled':
      return { activeSegments: 4, color: '#ef4444' };
    case 'expired':
    default:
      return { activeSegments: 0, color: '#71717a' };
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

const deliveryHoverCardWidth = 260;
const deliveryHoverCardEstimatedHeight = 116;
const deliveryHoverCardGap = 8;
const deliveryHoverCardViewportPadding = 8;

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const createArcPath = (startAngle: number, endAngle: number) => {
  const start = polarToCartesian(16, 16, 11, endAngle);
  const end = polarToCartesian(16, 16, 11, startAngle);

  return `M ${start.x} ${start.y} A 11 11 0 0 0 ${end.x} ${end.y}`;
};

const stageRingSegments = [
  createArcPath(12, 78),
  createArcPath(102, 168),
  createArcPath(192, 258),
  createArcPath(282, 348),
];

const DeliveryStageIndicator: React.FC<{ status: DeliveryStatus }> = ({ status }) => {
  const { activeSegments, color } = getStageIndicatorMeta(status);

  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
      <svg className="h-8 w-8" viewBox="0 0 32 32" aria-hidden="true">
        {stageRingSegments.map((path, index) => (
          <path
            key={`stage-track-${index}`}
            d={path}
            fill="none"
            stroke="#303030"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
        {stageRingSegments.slice(0, activeSegments).map((path, index) => (
          <path
            key={`stage-active-${index}`}
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </span>
  );
};

const DeliveryStageTimelineTooltip: React.FC<{
  delivery: Delivery;
}> = ({ delivery }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const assignedAt = delivery.assignedAt ?? delivery.coupled_time ?? delivery.deliveryCreditConsumedAt;
  const arrivedAtRestaurant =
    delivery.arrivedAtRestaurantAt ?? delivery.arrived_at_rest ?? delivery.pickedUpAt ?? delivery.took_it_time;
  const arrivedAtCustomer =
    delivery.arrivedAtCustomerAt ?? delivery.arrived_at_client ?? delivery.deliveredAt ?? delivery.delivered_time;
  const assignedAge = formatRelativeAge(assignedAt);

  const timelineRows = [
    { label: 'צוות לשליח', value: assignedAt },
    { label: 'הגיע למסעדה', value: arrivedAtRestaurant },
    { label: 'הגיע ללקוח', value: arrivedAtCustomer },
  ];

  useLayoutEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const preferredLeft = rect.right + deliveryHoverCardGap;
      const fallbackLeft = rect.left - deliveryHoverCardWidth - deliveryHoverCardGap;
      const left =
        preferredLeft + deliveryHoverCardWidth <= viewportWidth - deliveryHoverCardViewportPadding
          ? preferredLeft
          : Math.max(deliveryHoverCardViewportPadding, fallbackLeft);
      const centeredTop = rect.top + rect.height / 2 - deliveryHoverCardEstimatedHeight / 2;
      const maxTop = viewportHeight - deliveryHoverCardEstimatedHeight - deliveryHoverCardViewportPadding;
      const top = Math.min(
        Math.max(deliveryHoverCardViewportPadding, centeredTop),
        Math.max(deliveryHoverCardViewportPadding, maxTop),
      );

      setPosition({ left, top });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <>
      <span
        ref={triggerRef}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center focus:outline-none"
        tabIndex={0}
        aria-label="ציר זמן סטטוס משלוח"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={(event) => event.stopPropagation()}
      >
        <DeliveryStageIndicator status={delivery.status} />
      </span>
      {isOpen && position && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              dir="rtl"
              className="pointer-events-none fixed z-[9999] w-[260px] rounded-md border border-[#2a2a2a] bg-[#0b0b0b] px-3 py-2 text-xs text-[#ededed] shadow-2xl"
              style={{ left: position.left, top: position.top }}
            >
              <div dir="rtl" className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-[#8f8f8f]">
                  <span>ציר זמן שליח</span>
                  {assignedAge ? <span dir="rtl">{assignedAge}</span> : null}
                </div>
                <div className="space-y-1.5">
                  {timelineRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4">
                      <span className="text-[#8f8f8f]">{row.label}</span>
                      <span dir="ltr" className="font-medium text-[#ededed]">
                        {formatTimelineDate(row.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
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
          <Clock3 className="h-3.5 w-3.5" />
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
