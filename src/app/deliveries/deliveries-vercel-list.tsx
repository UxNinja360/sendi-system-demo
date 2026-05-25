import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { format as formatDate } from 'date-fns';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowUp,
  Bike,
  Car,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Edit,
  FileText,
  Info,
  LoaderCircle,
  Package,
  RotateCcw,
  Route,
  Search,
  Star,
  TimerOff,
  UserPlus,
  XCircle,
} from 'lucide-react';

import type { Courier, Delivery, DeliveryStatus, Restaurant } from '../types/delivery.types';
import { showActionToast } from '../notifications/toast-helpers';
import {
  EntityActionMenu,
  EntityActionMenuDivider,
  EntityActionMenuItem,
  EntityActionMenuOverlay,
} from '../components/common/entity-action-menu';
import { DeliveryStageTimelineTooltip } from '../components/common/delivery-stage-timeline';
import { DeliveryTimeDetailsTooltip } from '../components/common/delivery-time-details-tooltip';
import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import { VercelEmptyState } from '../components/common/vercel-empty-state';
import type { EntityViewMode } from '../components/common/view-mode-toggle';
import { formatOrderNumber } from '../utils/order-number';
import {
  formatCurrency,
  getDeliveryCustomerCharge,
  isSendiPlusDelivery,
} from '../utils/delivery-finance';
import { CourierAvatarMark } from '../couriers/courier-avatar-mark';
import { RestaurantLogoMark } from '../restaurants/restaurant-logo-mark';
import {
  canCourierAcceptDelivery,
  getCourierActiveDeliveryCount,
} from '../utils/courier-assignment';
import {
  DELIVERY_ASSIGNMENT_BLOCK_COPY,
  getDeliveryOfferRemainingSeconds,
  getDeliveryAssignmentBlockReason,
} from '../utils/delivery-assignment';
import { playHaptic } from '../utils/haptics';

type DeliveriesVercelListProps = {
  filteredDeliveries: Delivery[];
  viewMode?: EntityViewMode;
  showDateForToday?: boolean;
  emptyStateMode: 'no-data' | 'no-results' | 'filtered-empty';
  onClearFilters: () => void;
  totalCount: number;
  couriers: Courier[];
  restaurants: Restaurant[];
  deliveryBalance: number;
  onOpenDrawer: (id: string) => void;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onAssignCourier: (deliveryId: string, courierId: string) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
  onUnassignCourier: (deliveryId: string) => void;
  onEditDelivery: (deliveryId: string) => void;
  drawerDeliveryId: string | null;
  focusedDeliveryId?: string | null;
  focusedDeliveryScrollSignal?: number;
  onFocusDeliveryOnMap?: (deliveryId: string) => void;
  selectionBar?: React.ReactNode;
  onSearchRowHiddenChange?: (hidden: boolean) => void;
};

type DeliveryVercelRowProps = {
  delivery: Delivery;
  courier: Courier | null;
  restaurant: Restaurant | null;
  couriers: Courier[];
  deliveryBalance: number;
  now: Date;
  showDateForToday: boolean;
  isDrawerTarget: boolean;
  isMapTarget?: boolean;
  onFocusDeliveryOnMap?: (deliveryId: string) => void;
  onOpenDrawer: (id: string) => void;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onAssignCourier: (deliveryId: string, courierId: string) => void;
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

const DELIVERY_TOUCH_LONG_PRESS_MS = 480;
const DELIVERY_TOUCH_MOVE_CANCEL_PX = 12;
const DELIVERY_TOUCH_CONTEXT_SUPPRESS_MS = 800;
const DELIVERY_MOBILE_BOTTOM_REVEAL_GUARD_PX = 96;

const isInteractiveGestureTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(
    target.closest(
      'button, a[href], input, textarea, select, [role="button"], [data-ignore-row-gesture="true"]',
    ),
  );

const isDeliveryTouchPointer = (event: React.PointerEvent<HTMLElement>) =>
  event.pointerType === 'touch' || event.pointerType === 'pen';

const getNowForGesture = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

const useDeliveryFocusGesture = (
  deliveryId: string,
  onFocusDeliveryOnMap?: (deliveryId: string) => void,
) => {
  const timerRef = useRef<number | null>(null);
  const touchResetTimerRef = useRef<number | null>(null);
  const startPointRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const touchInteractionRef = useRef(false);
  const longPressTriggeredRef = useRef(false);
  const lastTouchInteractionAtRef = useRef(0);

  const clearLongPressTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPointRef.current = null;
  };

  const clearTouchResetTimer = () => {
    if (touchResetTimerRef.current !== null) {
      window.clearTimeout(touchResetTimerRef.current);
      touchResetTimerRef.current = null;
    }
  };

  const scheduleTouchReset = () => {
    clearTouchResetTimer();
    touchResetTimerRef.current = window.setTimeout(() => {
      touchInteractionRef.current = false;
      longPressTriggeredRef.current = false;
      touchResetTimerRef.current = null;
    }, DELIVERY_TOUCH_CONTEXT_SUPPRESS_MS);
  };

  const focusDelivery = () => {
    onFocusDeliveryOnMap?.(deliveryId);
  };

  useEffect(() => () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    if (touchResetTimerRef.current !== null) {
      window.clearTimeout(touchResetTimerRef.current);
    }
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!onFocusDeliveryOnMap || !event.isPrimary || event.button !== 0) return;

    if (!isDeliveryTouchPointer(event)) {
      touchInteractionRef.current = false;
      clearTouchResetTimer();
      return;
    }

    if (isInteractiveGestureTarget(event.target)) return;

    clearLongPressTimer();
    clearTouchResetTimer();
    touchInteractionRef.current = true;
    longPressTriggeredRef.current = false;
    startPointRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      startPointRef.current = null;
      longPressTriggeredRef.current = true;
      lastTouchInteractionAtRef.current = getNowForGesture();
      focusDelivery();
      playHaptic('selection', { force: true });
    }, DELIVERY_TOUCH_LONG_PRESS_MS);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const startPoint = startPointRef.current;
    if (!startPoint || startPoint.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - startPoint.x;
    const deltaY = event.clientY - startPoint.y;
    if (Math.hypot(deltaX, deltaY) > DELIVERY_TOUCH_MOVE_CANCEL_PX) {
      clearLongPressTimer();
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    if (isDeliveryTouchPointer(event) && touchInteractionRef.current) {
      lastTouchInteractionAtRef.current = getNowForGesture();
      scheduleTouchReset();
    }
    clearLongPressTimer();
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    clearTouchResetTimer();

    if (longPressTriggeredRef.current) {
      event.preventDefault();
      event.stopPropagation();
      longPressTriggeredRef.current = false;
      touchInteractionRef.current = false;
      return;
    }

    if (touchInteractionRef.current) {
      event.preventDefault();
      event.stopPropagation();
      touchInteractionRef.current = false;
      return;
    }

    focusDelivery();
  };

  const shouldOpenContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    const isRecentTouch =
      getNowForGesture() - lastTouchInteractionAtRef.current < DELIVERY_TOUCH_CONTEXT_SUPPRESS_MS;

    if (touchInteractionRef.current || longPressTriggeredRef.current || isRecentTouch) {
      event.preventDefault();
      event.stopPropagation();
      scheduleTouchReset();
      return false;
    }

    return true;
  };

  return {
    handleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    shouldOpenContextMenu,
  };
};

const formatInlineTime = (value: Date) => {
  try {
    return formatDate(value, 'HH:mm');
  } catch {
    return '-';
  }
};

const PENDING_DELIVERY_STATUS_LABEL = 'ממתין';
const UNASSIGNED_COURIER_LABEL = '-';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const UNUSUAL_LATE_THRESHOLD_MINUTES = 15;
const READY_FOR_PICKUP_DELAY_THRESHOLD_MINUTES = 5;

type UnusualLateInfo = {
  minutesLate: number;
  label: string;
  targetLabel: string;
};

const toValidDate = (value: Date | string | number | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toPositiveNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60 * 1000);

const getDeliveryPickupReadyAt = (delivery: Delivery) => {
  const explicitReadyAt = toValidDate(
    delivery.orderReadyTime ??
      delivery.rest_approved_eta ??
      delivery.rest_last_eta,
  );
  if (explicitReadyAt) return explicitReadyAt;

  const isReportedReady = Boolean(
    delivery.order_ready ||
      delivery.reported_order_is_ready ||
      delivery.reportedOrderIsReady,
  );
  if (isReportedReady) {
    return toValidDate(delivery.createdAt ?? delivery.creation_time);
  }

  const preparationMinutes = toPositiveNumber(
    delivery.preparationTime ??
      delivery.cook_time ??
      delivery.origin_cook_time,
  );
  if (!preparationMinutes) return null;

  const preparationAnchor = toValidDate(
    delivery.deliveryCreditConsumedAt ??
      delivery.assignedAt ??
      delivery.coupled_time ??
      delivery.createdAt ??
      delivery.creation_time,
  );
  if (!preparationAnchor) return null;

  return addMinutes(preparationAnchor, preparationMinutes);
};

const hasDeliveryCourier = (delivery: Delivery) =>
  Boolean(delivery.courierId || delivery.runner_id || delivery.courierName);

const hasDeliveryBeenPickedUp = (delivery: Delivery) =>
  Boolean(
    delivery.pickedUpAt ||
      delivery.took_it_time ||
      delivery.status === 'delivering' ||
      delivery.status === 'delivered',
  );

const hasCourierArrivedAtRestaurant = (delivery: Delivery) =>
  Boolean(
    delivery.arrivedAtRestaurantAt ||
      delivery.arrived_at_rest ||
      delivery.arrived_at_rest_runner_id,
  );

const getDeliveryLateTarget = (delivery: Delivery) => {
  if (delivery.status === 'assigned') {
    const dueAt = toValidDate(delivery.estimatedArrivalAtRestaurant);
    if (dueAt) return { dueAt, label: 'הגעה למסעדה' };
  }

  if (delivery.status === 'delivering') {
    const dueAt = toValidDate(delivery.estimatedArrivalAtCustomer);
    if (dueAt) return { dueAt, label: 'הגעה ללקוח' };
  }

  const deliveryDueAt = toValidDate(delivery.should_delivered_time);
  if (deliveryDueAt) return { dueAt: deliveryDueAt, label: 'מסירה' };

  const createdAt = toValidDate(delivery.createdAt ?? delivery.creation_time);
  const targetMinutes = toPositiveNumber(
    delivery.max_time_to_deliver ??
      delivery.maxDeliveryTime ??
      delivery.max_time_to_suplly ??
      delivery.estimatedTime,
  );

  if (!createdAt || !targetMinutes) return null;

  return {
    dueAt: new Date(createdAt.getTime() + targetMinutes * 60 * 1000),
    label: 'זמן מקסימלי',
  };
};

const getUnusualLateInfo = (delivery: Delivery, now: Date): UnusualLateInfo | null => {
  if (delivery.status === 'delivered' || delivery.status === 'cancelled' || delivery.status === 'expired') {
    return null;
  }

  if (!hasDeliveryBeenPickedUp(delivery)) {
    const readyAt = getDeliveryPickupReadyAt(delivery);
    const readyWaitMinutes = readyAt
      ? Math.floor((now.getTime() - readyAt.getTime()) / (60 * 1000))
      : 0;
    const pickupDeviationMinutes = toPositiveNumber(delivery.pickup_deviation) ?? 0;
    const pickupDelayMinutes = Math.max(readyWaitMinutes, pickupDeviationMinutes);

    if (pickupDelayMinutes >= READY_FOR_PICKUP_DELAY_THRESHOLD_MINUTES) {
      const label = !hasDeliveryCourier(delivery)
        ? 'מוכן בלי שליח'
        : hasCourierArrivedAtRestaurant(delivery)
          ? 'מוכן לא נאסף'
          : 'מוכן מחכה לאיסוף';

      return {
        minutesLate: Math.floor(pickupDelayMinutes),
        label,
        targetLabel: readyAt ? `מוכן במסעדה מ-${formatInlineTime(readyAt)}` : 'איסוף מהמסעדה',
      };
    }
  }

  if (delivery.status === 'delivering' || hasDeliveryBeenPickedUp(delivery)) {
    const target = toValidDate(delivery.estimatedArrivalAtCustomer ?? delivery.should_delivered_time);
    const targetLateMinutes = target
      ? Math.floor((now.getTime() - target.getTime()) / (60 * 1000))
      : 0;
    const dropoffDeviationMinutes = toPositiveNumber(delivery.dropoff_deviation) ?? 0;
    const dropoffDelayMinutes = Math.max(targetLateMinutes, dropoffDeviationMinutes);

    if (dropoffDelayMinutes >= UNUSUAL_LATE_THRESHOLD_MINUTES) {
      return {
        minutesLate: Math.floor(dropoffDelayMinutes),
        label: 'מסירה מתעכבת',
        targetLabel: target ? `יעד מסירה ${formatInlineTime(target)}` : 'מסירה ללקוח',
      };
    }
  }

  const explicitLateMinutes = toPositiveNumber(delivery.minutes_late) ?? 0;
  const target = getDeliveryLateTarget(delivery);
  const targetLateMinutes = target
    ? Math.floor((now.getTime() - target.dueAt.getTime()) / (60 * 1000))
    : 0;
  const minutesLate = Math.max(explicitLateMinutes, targetLateMinutes);

  if (minutesLate < UNUSUAL_LATE_THRESHOLD_MINUTES) return null;

  const label =
    delivery.status === 'assigned'
      ? 'איסוף מתעכב'
      : delivery.status === 'delivering'
        ? 'מסירה מתעכבת'
        : 'איחור חריג';

  return {
    minutesLate: Math.floor(minutesLate),
    label,
    targetLabel: target?.label ?? 'יעד',
  };
};

const formatLateMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes.toLocaleString('he-IL')} דק׳`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')} ש׳`;
};

const UnusualLateIndicator: React.FC<{
  lateInfo: UnusualLateInfo;
  compact?: boolean;
  className?: string;
}> = ({ lateInfo, compact = false, className }) => {
  const lateLabel = formatLateMinutes(lateInfo.minutesLate);

  return (
    <span
      className={joinClassNames(
        'inline-flex max-w-full shrink-0 items-center gap-1 rounded-[var(--app-radius-xs)] border border-red-500/35 bg-red-500/10 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-red-600 dark:text-red-300',
        className,
      )}
      title={`${lateInfo.label}: ${lateLabel} מעבר ליעד ${lateInfo.targetLabel}`}
      aria-label={`${lateInfo.label}: ${lateLabel}`}
      dir="rtl"
    >
      <AlertTriangle className="h-3 w-3 shrink-0" />
      <span className="min-w-0 truncate">
        {compact ? `${lateInfo.label} ${lateLabel}` : `${lateInfo.label} · ${lateLabel}`}
      </span>
    </span>
  );
};

const getSendiGoOfferExpiryInfo = (
  delivery: Delivery,
  restaurant: Pick<Restaurant, 'chainId' | 'name'> | null,
  now: Date,
) => {
  if (!isSendiPlusDelivery(delivery, restaurant) || delivery.status !== 'pending') {
    return null;
  }

  const expiresAt = toValidDate(delivery.offerExpiresAt);
  if (!expiresAt) return null;

  return {
    expiresAt,
    remainingSeconds: getDeliveryOfferRemainingSeconds(delivery, now) ?? 0,
  };
};

const formatOfferRemainingSeconds = (seconds: number) => {
  if (seconds <= 0) return 'פג';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} ש׳`;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

const OfferExpiryIndicator: React.FC<{
  expiresAt: Date;
  remainingSeconds: number;
  compact?: boolean;
}> = ({ expiresAt, remainingSeconds, compact = false }) => {
  const timeLabel = formatOfferRemainingSeconds(remainingSeconds);
  const isExpiringSoon = remainingSeconds <= 30;
  const isExpired = remainingSeconds <= 0;
  const label = isExpired
    ? 'פג תוקף'
    : compact
      ? `תפוג ${timeLabel}`
      : `צוות עד תפוגה · ${timeLabel}`;

  return (
    <span
      className={joinClassNames(
        'inline-flex max-w-full shrink-0 items-center rounded-[var(--app-radius-xs)] border px-1.5 py-0.5 text-[11px] font-semibold leading-none',
        isExpired
          ? 'border-zinc-300 bg-zinc-500/5 text-zinc-500 dark:border-zinc-500/50 dark:bg-zinc-400/10 dark:text-zinc-300'
          : isExpiringSoon
            ? 'border-orange-500/35 bg-orange-500/10 text-orange-600 dark:text-orange-300'
            : 'border-app-nav-border bg-app-surface-raised text-app-text-secondary',
      )}
      title={`הצעת סנדי גו ${isExpired ? 'פגה' : 'תפוג'} בשעה ${formatInlineTime(expiresAt)}`}
      aria-label={`זמן לציוות לפני פקיעת הצעה ${timeLabel}`}
      dir="rtl"
    >
      <span className="min-w-0 truncate">
        {label}
      </span>
    </span>
  );
};

const AssignedStatusDot: React.FC<{ className?: string }> = ({ className }) => (
  <span className={joinClassNames('delivery-status-line__dot', className)} aria-hidden="true" />
);

const DELIVERY_STATUS_LINE_META: Record<
  DeliveryStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClassName?: string;
  }
> = {
  pending: {
    label: PENDING_DELIVERY_STATUS_LABEL,
    icon: LoaderCircle,
    iconClassName: 'animate-spin',
  },
  assigned: {
    label: 'שובץ',
    icon: AssignedStatusDot,
  },
  delivering: {
    label: 'במסירה',
    icon: Package,
  },
  delivered: {
    label: 'נמסר',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'בוטל',
    icon: XCircle,
  },
  expired: {
    label: 'פג תוקף',
    icon: TimerOff,
  },
};

const DeliveryStatusLine: React.FC<{
  status: DeliveryStatus;
  delivery?: Delivery;
  className?: string;
}> = ({ status, delivery, className }) => {
  const meta = DELIVERY_STATUS_LINE_META[status];
  const Icon = meta.icon;

  const line = (
    <span
      className={joinClassNames(
        'delivery-status-line',
        `delivery-status-line--${status}`,
        'inline-flex min-w-0 items-center gap-2 text-right',
        className,
      )}
      dir="rtl"
    >
      <span className="delivery-status-line__label min-w-0 truncate text-sm font-normal">
        {meta.label}
      </span>
      <Icon
        className={joinClassNames(
          'delivery-status-line__icon h-3.5 w-3.5 shrink-0',
          meta.iconClassName,
        )}
        aria-hidden="true"
      />
    </span>
  );

  if (!delivery) return line;

  return (
    <DeliveryStageTimelineTooltip
      delivery={delivery}
      triggerClassName="inline-flex min-w-0 max-w-full focus:outline-none"
    >
      {line}
    </DeliveryStageTimelineTooltip>
  );
};

const DeliveryCourierLine: React.FC<{
  assigned: boolean;
  label: string;
  vehicleType?: string;
  className?: string;
}> = ({ assigned, label, vehicleType, className }) => {
  const Icon = vehicleType === 'רכב' ? Car : Bike;

  return (
    <span
      className={joinClassNames(
        'delivery-courier-line inline-flex min-w-0 items-center gap-2 text-right',
        assigned ? 'delivery-courier-line--assigned' : 'delivery-courier-line--empty',
        className,
      )}
      dir="rtl"
    >
      {assigned ? (
        <Icon className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
      ) : null}
      <span
        className={joinClassNames(
          'min-w-0 truncate text-sm font-normal',
          assigned ? 'text-app-text' : 'text-app-text-muted',
        )}
      >
        {assigned ? label : UNASSIGNED_COURIER_LABEL}
      </span>
    </span>
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

const getFloatingAssignmentPosition = (rect: DOMRect) => {
  const width = 320;
  const estimatedHeight = 380;
  if (typeof window === 'undefined') {
    return { x: rect.left, y: rect.bottom + 8 };
  }

  const maxX = Math.max(8, window.innerWidth - width - 8);
  const x = Math.min(Math.max(8, rect.right - width), maxX);
  const hasRoomBelow = rect.bottom + 8 + estimatedHeight <= window.innerHeight;
  const y = hasRoomBelow
    ? rect.bottom + 8
    : Math.max(8, rect.top - estimatedHeight - 8);

  return { x, y };
};

const getVisibleElementRect = (...elements: Array<HTMLElement | null>) => {
  if (typeof window === 'undefined') return null;

  for (const element of elements) {
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    ) {
      return rect;
    }
  }

  return null;
};

const getCourierStatusLabel = (courier: Courier) => {
  if (courier.status === 'offline') return 'לא מחובר';
  if (courier.status === 'busy') return 'עסוק';
  return 'זמין';
};

const DeliveryAssignmentMenu: React.FC<{
  open: boolean;
  position: { x: number; y: number } | null;
  delivery: Delivery;
  currentCourier: Courier | null;
  allCouriers: Courier[];
  deliveryBalance: number;
  onClose: () => void;
  onAssignCourier: (deliveryId: string, courierId: string) => void;
  onUnassignCourier: (deliveryId: string) => void;
}> = ({
  open,
  position,
  delivery,
  currentCourier,
  allCouriers,
  deliveryBalance,
  onClose,
  onAssignCourier,
  onUnassignCourier,
}) => {
  const [courierFilter, setCourierFilter] = useState('');
  const normalizedFilter = courierFilter.trim().toLowerCase();
  const canOpenAssignmentList = delivery.status === 'pending' || delivery.status === 'assigned';
  const assignableCourierCount = useMemo(
    () => allCouriers.filter((courier) => canCourierAcceptDelivery(courier, delivery.id)).length,
    [allCouriers, delivery.id],
  );
  const assignmentBlockReason = delivery.status === 'pending'
    ? getDeliveryAssignmentBlockReason(delivery, {
        deliveryBalance,
        availableCourierCount: assignableCourierCount,
      })
    : null;
  const assignmentBlockCopy = assignmentBlockReason
    ? DELIVERY_ASSIGNMENT_BLOCK_COPY[assignmentBlockReason]
    : null;
  const availableCouriers = useMemo(
    () =>
      allCouriers.filter((courier) => {
        if (courier.id === currentCourier?.id) return false;
        if (!canCourierAcceptDelivery(courier, delivery.id)) return false;
        if (!normalizedFilter) return true;
        const haystack = [
          courier.name,
          courier.phone,
          courier.vehicleType,
          courier.employmentType,
        ].join(' ').toLowerCase();
        return haystack.includes(normalizedFilter);
      }),
    [allCouriers, currentCourier?.id, delivery.id, normalizedFilter],
  );

  return (
    <EntityActionMenuOverlay open={open} position={position} onClose={onClose}>
      {position ? (
        <div
          dir="rtl"
          className="absolute w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-[var(--app-radius-md)] border border-app-border bg-app-surface text-right shadow-[var(--app-shadow-panel)]"
          style={{ top: position.y, left: position.x }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="border-b border-app-border px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-app-text">שיבוץ מהיר</p>
                <p className="mt-0.5 truncate text-xs text-app-text-secondary">
                  {formatOrderNumber(delivery.orderNumber)}
                </p>
              </div>
              <UserPlus className="h-4 w-4 shrink-0 text-app-text-secondary" />
            </div>
          </div>

          {currentCourier ? (
            <div className="border-b border-app-border px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs text-app-text-secondary">משובץ עכשיו</p>
                  <p className="mt-1 truncate text-sm font-semibold text-app-text">{currentCourier.name}</p>
                </div>
                <button
                  type="button"
                  data-haptic="warning"
                  onClick={() => {
                    onUnassignCourier(delivery.id);
                    onClose();
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-app-border px-2 py-1.5 text-xs font-medium text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  הסר
                </button>
              </div>
            </div>
          ) : null}

          {assignmentBlockCopy ? (
            <div className="flex items-start gap-2 px-3 py-3 text-xs text-app-text-secondary">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
              <span>{assignmentBlockCopy}</span>
            </div>
          ) : canOpenAssignmentList ? (
            <>
              <div className="border-b border-app-border p-2">
                <label className="flex items-center gap-2 rounded-md border border-app-border bg-app-surface-raised px-2 py-1.5">
                  <Search className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
                  <input
                    autoFocus
                    value={courierFilter}
                    onChange={(event) => setCourierFilter(event.target.value)}
                    placeholder="חפש שליח..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-text-muted"
                  />
                </label>
              </div>

              <div className="max-h-64 overflow-y-auto py-1">
                {availableCouriers.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-app-text-secondary">
                    אין שליחים זמינים
                  </p>
                ) : (
                  availableCouriers.map((courier) => {
                    const activeCount = getCourierActiveDeliveryCount(courier, delivery.id);
                    return (
                      <button
                        key={courier.id}
                        type="button"
                        data-haptic="success"
                        onClick={() => {
                          onAssignCourier(delivery.id, courier.id);
                          onClose();
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right transition-colors hover:bg-app-surface-raised"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-app-text">{courier.name}</p>
                          <p className="mt-0.5 truncate text-xs text-app-text-secondary">
                            {courier.vehicleType} · {courier.employmentType} · {activeCount}/2 פעילים
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-app-text-secondary">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={joinClassNames(
                                'h-2 w-2 rounded-full',
                                courier.status === 'offline'
                                  ? 'bg-app-text-muted'
                                  : courier.status === 'busy'
                                    ? 'bg-orange-400'
                                    : 'bg-[#50e3c2]',
                              )}
                            />
                            {getCourierStatusLabel(courier)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400" />
                            {courier.rating.toFixed(1)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="px-3 py-3 text-xs text-app-text-secondary">
              ניתן לשנות שיבוץ רק במשלוח ממתין או משובץ.
            </div>
          )}
        </div>
      ) : null}
    </EntityActionMenuOverlay>
  );
};

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
  couriers,
  deliveryBalance,
  now,
  showDateForToday,
  isDrawerTarget,
  isMapTarget,
  onFocusDeliveryOnMap,
  onOpenDrawer,
  onStatusChange,
  onAssignCourier,
  onCancelDelivery,
  onCompleteDelivery,
  onUnassignCourier,
  onEditDelivery,
}) => {
  const navigate = useNavigate();
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [assignmentMenuPos, setAssignmentMenuPos] = useState<{ x: number; y: number } | null>(null);
  const tableAssignmentAnchorRef = useRef<HTMLDivElement | null>(null);
  const compactAssignmentAnchorRef = useRef<HTMLDivElement | null>(null);
  const focusGesture = useDeliveryFocusGesture(delivery.id, onFocusDeliveryOnMap);
  const restaurantName = delivery.rest_name || delivery.restaurantName || restaurant?.name || '-';
  const restaurantMeta = delivery.restaurantAddress || delivery.rest_city || delivery.restaurantCity || 'מסעדה';
  const clientName = delivery.client_name || delivery.customerName || '-';
  const clientAddress = delivery.client_full_address || delivery.address;
  const hasAssignedCourier = Boolean(courier || delivery.courierId || delivery.runner_id || delivery.courierName);
  const courierName = courier?.name || delivery.courierName || (hasAssignedCourier ? 'לא ידוע' : UNASSIGNED_COURIER_LABEL);
  const courierColumnText = hasAssignedCourier ? courierName : UNASSIGNED_COURIER_LABEL;
  const courierVehicleType = hasAssignedCourier ? courier?.vehicleType || delivery.vehicle_type : undefined;
  const shouldShowCourierAssignment = delivery.status !== 'cancelled' || hasAssignedCourier;
  const unusualLateInfo = getUnusualLateInfo(delivery, now);
  const offerExpiryInfo = getSendiGoOfferExpiryInfo(delivery, restaurant, now);
  const distanceLabel = delivery.delivery_distance ? `${delivery.delivery_distance.toFixed(1)} ק״מ` : '-';

  const closeMenus = () => {
    setContextMenuPos(null);
    setAssignmentMenuPos(null);
  };

  const openAssignmentMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect =
      getVisibleElementRect(tableAssignmentAnchorRef.current, compactAssignmentAnchorRef.current) ??
      event.currentTarget.getBoundingClientRect();
    setContextMenuPos(null);
    setAssignmentMenuPos(getFloatingAssignmentPosition(rect));
  };

  const navigateToDelivery = () => {
    navigate(`/delivery/${delivery.id}`);
  };

  const handleCopyOrderNumber = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    navigator.clipboard.writeText(delivery.orderNumber);
    showActionToast(`מספר הזמנה ${delivery.orderNumber} הועתק`, {
      id: 'copy-order-number',
    });
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
      data-delivery-row-id={delivery.id}
      onClick={focusGesture.handleClick}
      onPointerDown={focusGesture.handlePointerDown}
      onPointerMove={focusGesture.handlePointerMove}
      onPointerUp={focusGesture.handlePointerEnd}
      onPointerCancel={focusGesture.handlePointerEnd}
      onPointerLeave={focusGesture.handlePointerEnd}
      onContextMenu={(event) => {
        if (!focusGesture.shouldOpenContextMenu(event)) return;
        event.preventDefault();
        setContextMenuPos({ x: event.clientX, y: event.clientY });
      }}
      className={joinClassNames(
        rowGridClass,
        'group relative w-full min-w-0 cursor-pointer border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors last:border-b-0 hover:bg-app-surface-raised',
        unusualLateInfo && 'bg-red-500/[0.04] hover:bg-red-500/[0.08]',
        (isDrawerTarget || isMapTarget) && 'shadow-[inset_2px_0_0_var(--app-brand)]',
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
          <div className="delivery-row__time mt-1 flex max-w-full shrink-0 flex-wrap items-center justify-start gap-1.5 text-right text-sm font-normal text-app-text-secondary">
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

          {shouldShowCourierAssignment ? (
            <div
              className="delivery-row__route-table-distance-wrap flex min-w-0"
            >
              <DeliveryDistanceInline
                label={distanceLabel}
                className="delivery-row__route-table-distance"
              />
            </div>
          ) : null}
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
          <div className="delivery-row__route-compact-status flex min-w-0 rounded-md">
            <DeliveryStatusLine
              status={delivery.status}
              delivery={delivery}
              className="w-full justify-start whitespace-nowrap px-1 py-1"
            />
          </div>

          {unusualLateInfo || offerExpiryInfo ? (
            <div className="delivery-row__route-compact-offer flex min-w-0">
              {unusualLateInfo ? (
                <UnusualLateIndicator lateInfo={unusualLateInfo} compact />
              ) : offerExpiryInfo ? (
                <OfferExpiryIndicator
                  expiresAt={offerExpiryInfo.expiresAt}
                  remainingSeconds={offerExpiryInfo.remainingSeconds}
                  compact
                />
              ) : null}
            </div>
          ) : null}

          <DeliveryDistanceInline
            label={distanceLabel}
            className="delivery-row__route-compact-distance"
          />

          <div
            ref={compactAssignmentAnchorRef}
            className="delivery-row__route-compact-courier flex min-w-0 rounded-md"
          >
            <DeliveryCourierLine
              assigned={hasAssignedCourier}
              label={courierColumnText}
              vehicleType={courierVehicleType}
              className="w-full justify-start whitespace-nowrap px-1 py-1"
            />
          </div>
        </div>
      </div>

      <div className="delivery-row__status-table min-h-0 min-w-0 items-center justify-start">
        <div className="delivery-row__route-table-status flex min-w-0 rounded-md">
          <DeliveryStatusLine
            status={delivery.status}
            delivery={delivery}
            className="delivery-row__status-line w-full px-1 py-1"
          />
        </div>
      </div>

      <div className="delivery-row__offer-table min-h-0 min-w-0 items-center justify-start">
        {unusualLateInfo || offerExpiryInfo ? (
          <div className="delivery-row__route-table-offer flex min-w-0">
            {unusualLateInfo ? (
              <UnusualLateIndicator lateInfo={unusualLateInfo} compact />
            ) : offerExpiryInfo ? (
              <OfferExpiryIndicator
                expiresAt={offerExpiryInfo.expiresAt}
                remainingSeconds={offerExpiryInfo.remainingSeconds}
                compact
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="delivery-row__courier-table min-h-0 min-w-0 items-center justify-start">
        <div
          ref={tableAssignmentAnchorRef}
          className="delivery-row__route-table-courier flex min-w-0 rounded-md"
        >
          <DeliveryCourierLine
            assigned={hasAssignedCourier}
            label={courierColumnText}
            vehicleType={courierVehicleType}
            className="delivery-row__courier-line w-full px-1 py-1"
          />
        </div>
      </div>

      <DeliveryAssignmentMenu
        open={Boolean(assignmentMenuPos)}
        position={assignmentMenuPos}
        delivery={delivery}
        currentCourier={courier}
        allCouriers={couriers}
        deliveryBalance={deliveryBalance}
        onClose={() => setAssignmentMenuPos(null)}
        onAssignCourier={onAssignCourier}
        onUnassignCourier={onUnassignCourier}
      />

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
                    onClick={openAssignmentMenu}
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

              {!['delivered', 'cancelled', 'expired'].includes(delivery.status) ? (
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
  couriers,
  deliveryBalance,
  now,
  showDateForToday,
  isDrawerTarget,
  isMapTarget,
  onFocusDeliveryOnMap,
  onOpenDrawer,
  onStatusChange,
  onAssignCourier,
  onCancelDelivery,
  onCompleteDelivery,
  onUnassignCourier,
  onEditDelivery,
}) => {
  const navigate = useNavigate();
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [assignmentMenuPos, setAssignmentMenuPos] = useState<{ x: number; y: number } | null>(null);
  const assignmentAnchorRef = useRef<HTMLDivElement | null>(null);
  const focusGesture = useDeliveryFocusGesture(delivery.id, onFocusDeliveryOnMap);
  const restaurantName = delivery.rest_name || delivery.restaurantName || restaurant?.name || '-';
  const restaurantMeta = delivery.restaurantAddress || delivery.rest_city || delivery.restaurantCity || 'מסעדה';
  const clientName = delivery.client_name || delivery.customerName || '-';
  const clientAddress = delivery.client_full_address || delivery.address || '-';
  const hasAssignedCourier = Boolean(courier || delivery.courierId || delivery.runner_id || delivery.courierName);
  const courierName = courier?.name || delivery.courierName || (hasAssignedCourier ? 'לא ידוע' : UNASSIGNED_COURIER_LABEL);
  const courierColumnText = hasAssignedCourier ? courierName : UNASSIGNED_COURIER_LABEL;
  const courierVehicleType = hasAssignedCourier ? courier?.vehicleType || delivery.vehicle_type : undefined;
  const priceLabel = formatCurrency(getDeliveryCustomerCharge(delivery));
  const unusualLateInfo = getUnusualLateInfo(delivery, now);
  const offerExpiryInfo = getSendiGoOfferExpiryInfo(delivery, restaurant, now);

  const closeMenus = () => {
    setContextMenuPos(null);
    setAssignmentMenuPos(null);
  };

  const openAssignmentMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect =
      getVisibleElementRect(assignmentAnchorRef.current) ??
      event.currentTarget.getBoundingClientRect();
    setContextMenuPos(null);
    setAssignmentMenuPos(getFloatingAssignmentPosition(rect));
  };

  const navigateToDelivery = () => {
    navigate(`/delivery/${delivery.id}`);
  };

  const handleCopyOrderNumber = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    navigator.clipboard.writeText(delivery.orderNumber);
    showActionToast(`מספר הזמנה ${delivery.orderNumber} הועתק`, {
      id: 'copy-order-number',
    });
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
      data-delivery-row-id={delivery.id}
      onClick={focusGesture.handleClick}
      onPointerDown={focusGesture.handlePointerDown}
      onPointerMove={focusGesture.handlePointerMove}
      onPointerUp={focusGesture.handlePointerEnd}
      onPointerCancel={focusGesture.handlePointerEnd}
      onPointerLeave={focusGesture.handlePointerEnd}
      onContextMenu={(event) => {
        if (!focusGesture.shouldOpenContextMenu(event)) return;
        event.preventDefault();
        setContextMenuPos({ x: event.clientX, y: event.clientY });
      }}
      className={joinClassNames(
        'group min-w-0 cursor-pointer rounded-lg border border-app-nav-border bg-app-surface p-3 text-app-text outline-none transition-colors hover:bg-app-surface-raised',
        unusualLateInfo && 'border-red-500/35 bg-red-500/[0.04] hover:bg-red-500/[0.08]',
        (isDrawerTarget || isMapTarget) && 'shadow-[inset_2px_0_0_var(--app-brand)]',
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
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
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-app-text-secondary">
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
            <div
              ref={assignmentAnchorRef}
              className="mt-1 max-w-full rounded-md"
            >
              <DeliveryCourierLine
                assigned={hasAssignedCourier}
                label={courierColumnText}
                vehicleType={courierVehicleType}
                className="px-1 py-1"
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

      <div className="mt-4 flex items-start justify-between gap-3 border-t border-app-nav-border pt-3 text-xs text-app-text-secondary">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <DeliveryStatusLine status={delivery.status} delivery={delivery} />
          {unusualLateInfo ? (
            <UnusualLateIndicator lateInfo={unusualLateInfo} />
          ) : offerExpiryInfo ? (
            <OfferExpiryIndicator
              expiresAt={offerExpiryInfo.expiresAt}
              remainingSeconds={offerExpiryInfo.remainingSeconds}
            />
          ) : null}
        </div>
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
                  onClick={openAssignmentMenu}
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

            {!['delivered', 'cancelled', 'expired'].includes(delivery.status) ? (
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

      <DeliveryAssignmentMenu
        open={Boolean(assignmentMenuPos)}
        position={assignmentMenuPos}
        delivery={delivery}
        currentCourier={courier}
        allCouriers={couriers}
        deliveryBalance={deliveryBalance}
        onClose={() => setAssignmentMenuPos(null)}
        onAssignCourier={onAssignCourier}
        onUnassignCourier={onUnassignCourier}
      />
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
  deliveryBalance,
  onOpenDrawer,
  onStatusChange,
  onAssignCourier,
  onCancelDelivery,
  onCompleteDelivery,
  onUnassignCourier,
  onEditDelivery,
  drawerDeliveryId,
  focusedDeliveryId,
  focusedDeliveryScrollSignal = 0,
  onFocusDeliveryOnMap,
  selectionBar,
  onSearchRowHiddenChange,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTopFab, setShowScrollTopFab] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const scrollDirectionRef = useRef({
    animationFrame: 0,
    hidden: false,
    lastScrollTop: 0,
  });
  const hasDeliveries = filteredDeliveries.length > 0;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

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

  useLayoutEffect(() => {
    if (!focusedDeliveryId || focusedDeliveryScrollSignal === 0) return undefined;

    const element = scrollContainerRef.current;
    if (!element) return undefined;

    const animationFrame = window.requestAnimationFrame(() => {
      const target = Array
        .from(element.querySelectorAll<HTMLElement>('[data-delivery-row-id]'))
        .find((row) => row.dataset.deliveryRowId === focusedDeliveryId);

      if (!target) return;

      onSearchRowHiddenChange?.(false);
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [
    focusedDeliveryId,
    focusedDeliveryScrollSignal,
    onSearchRowHiddenChange,
  ]);

  useLayoutEffect(() => {
    const scrollState = scrollDirectionRef.current;
    if (!onSearchRowHiddenChange) return undefined;

    if (!hasDeliveries) {
      scrollState.hidden = false;
      onSearchRowHiddenChange(false);
      return undefined;
    }

    const element = scrollContainerRef.current;
    if (!element) return undefined;

    const desktopViewportQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(min-width: 1024px)')
        : null;
    const isDesktopViewport = () => desktopViewportQuery?.matches ?? false;
    const setHidden = (hidden: boolean) => {
      if (scrollState.hidden === hidden) return;
      scrollState.hidden = hidden;
      onSearchRowHiddenChange(hidden);
    };
    const syncDesktopVisibility = () => {
      if (isDesktopViewport()) {
        scrollState.lastScrollTop = element.scrollTop;
        setHidden(false);
      }
    };
    const handleScroll = () => {
      if (scrollState.animationFrame) return;
      scrollState.animationFrame = window.requestAnimationFrame(() => {
        const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
        const nextScrollTop = Math.min(Math.max(0, element.scrollTop), maxScrollTop);

        if (isDesktopViewport()) {
          setHidden(false);
          scrollState.lastScrollTop = nextScrollTop;
          scrollState.animationFrame = 0;
          return;
        }

        const delta = nextScrollTop - scrollState.lastScrollTop;
        const distanceFromBottom = maxScrollTop - nextScrollTop;
        const isNearBottomBounce = distanceFromBottom < DELIVERY_MOBILE_BOTTOM_REVEAL_GUARD_PX;

        if (nextScrollTop < 12) {
          setHidden(false);
        } else if (delta > 10) {
          setHidden(true);
        } else if (delta < -8 && !isNearBottomBounce) {
          setHidden(false);
        }

        scrollState.lastScrollTop = nextScrollTop;
        scrollState.animationFrame = 0;
      });
    };

    scrollState.lastScrollTop = element.scrollTop;
    setHidden(false);
    syncDesktopVisibility();
    element.addEventListener('scroll', handleScroll, { passive: true });
    desktopViewportQuery?.addEventListener('change', syncDesktopVisibility);

    return () => {
      if (scrollState.animationFrame) {
        window.cancelAnimationFrame(scrollState.animationFrame);
        scrollState.animationFrame = 0;
      }
      element.removeEventListener('scroll', handleScroll);
      desktopViewportQuery?.removeEventListener('change', syncDesktopVisibility);
      setHidden(false);
    };
  }, [hasDeliveries, onSearchRowHiddenChange, viewMode]);

  useLayoutEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return undefined;

    let animationFrame = 0;
    const updateVisibility = () => {
      animationFrame = 0;
      setShowScrollTopFab(element.scrollTop > 640);
    };
    const handleScroll = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateVisibility);
    };

    updateVisibility();
    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      element.removeEventListener('scroll', handleScroll);
    };
  }, [filteredDeliveries.length, viewMode]);

  const handleScrollToTop = () => {
    const element = scrollContainerRef.current;
    if (!element) return;

    onSearchRowHiddenChange?.(false);
    element.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollTopFab = showScrollTopFab ? (
    <button
      type="button"
      data-haptic="medium"
      onClick={handleScrollToTop}
      className="absolute bottom-4 left-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-app-border bg-app-surface/95 text-app-text shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur transition-[transform,background-color,border-color] hover:-translate-y-0.5 hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 md:bottom-5 md:left-5"
      aria-label="גלול למעלה"
      title="גלול למעלה"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  ) : null;

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
      <div data-view-mode="cards" className="relative flex min-h-0 flex-1 flex-col bg-app-background">
        <div ref={scrollContainerRef} className="resource-list-scroll deliveries-scroll-safe-end min-h-0 flex-1 overflow-auto px-2 lg:px-3" dir="rtl">
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
                  couriers={couriers}
                  deliveryBalance={deliveryBalance}
                  now={now}
                  showDateForToday={showDateForToday}
                  isDrawerTarget={drawerDeliveryId === delivery.id}
                  isMapTarget={focusedDeliveryId === delivery.id}
                  onFocusDeliveryOnMap={onFocusDeliveryOnMap}
                  onOpenDrawer={onOpenDrawer}
                  onStatusChange={onStatusChange}
                  onAssignCourier={onAssignCourier}
                  onCancelDelivery={onCancelDelivery}
                  onCompleteDelivery={onCompleteDelivery}
                  onUnassignCourier={onUnassignCourier}
                  onEditDelivery={onEditDelivery}
                />
              );
            })}
          </div>
        </div>
        {scrollTopFab}
        {selectionBar}
      </div>
    );
  }

  return (
    <div data-view-mode="list" className="relative flex min-h-0 flex-1 flex-col bg-app-background">
      <div ref={scrollContainerRef} className="deliveries-vercel-scroll deliveries-scroll-safe-end min-h-0 flex-1 overflow-auto px-2 lg:px-3" dir="ltr">
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
                couriers={couriers}
                deliveryBalance={deliveryBalance}
                now={now}
                showDateForToday={showDateForToday}
                isDrawerTarget={drawerDeliveryId === delivery.id}
                isMapTarget={focusedDeliveryId === delivery.id}
                onFocusDeliveryOnMap={onFocusDeliveryOnMap}
                onOpenDrawer={onOpenDrawer}
                onStatusChange={onStatusChange}
                onAssignCourier={onAssignCourier}
                onCancelDelivery={onCancelDelivery}
                onCompleteDelivery={onCompleteDelivery}
                onUnassignCourier={onUnassignCourier}
                onEditDelivery={onEditDelivery}
              />
            );
          })}
        </div>
      </div>
      {scrollTopFab}
      {selectionBar}
    </div>
  );
};
