import React from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowUp,
  Bike,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  Package,
  PackageCheck,
  PackageOpen,
  Power,
  Plus,
  Sparkles,
  Store,
  Timer,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { AppTooltip } from '../components/common/app-tooltip';
import { Toggle } from '../components/common/toggle';
import { useDelivery } from '../context/delivery-context-value';
import { DeliveriesMapFab } from '../deliveries/deliveries-map-fab';
import { useDeliveriesMapSplit } from '../deliveries/use-deliveries-map-split';
import type { Courier, Delivery, DeliveryStatus } from '../types/delivery.types';
import { canCourierAcceptDelivery } from '../utils/courier-assignment';
import { playHaptic } from '../utils/haptics';
import {
  DEFAULT_SENDI_PLUS_RADIUS_KM,
  LEGACY_SENDI_GO_RADIUS_STORAGE_KEY,
  MAX_SENDI_PLUS_RADIUS_KM,
  SENDI_PLUS_LABEL,
  SENDI_PLUS_RADIUS_CHANGE_EVENT,
  SENDI_PLUS_RADIUS_STORAGE_KEY,
  SENDI_PLUS_RADIUS_STEP_KM,
  SENDI_PLUS_TERMS_ACCEPTED_CHANGE_EVENT,
  SENDI_PLUS_TERMS_ACCEPTED_STORAGE_KEY,
  canReceiveSendiPlusDeliveries,
  clampSendiPlusRadius,
  formatSendiPlusRadiusKm,
  isRestaurantActiveForDisplay,
  isSendiPlusRestaurant,
  readStoredSendiPlusRadius,
  readStoredSendiPlusTermsAccepted,
  writeStoredSendiPlusRadius,
  writeStoredSendiPlusTermsAccepted,
} from '../utils/sendi-plus';
import {
  DELIVERY_ZONES_CHANGE_EVENT,
  isDeliveryZoneActive,
  isPointCoveredByActiveDeliveryZones,
  loadStoredDeliveryServiceAreas,
} from '../utils/delivery-zones';
import { readAuthSession } from '../auth/auth-session';

const DASHBOARD_DELIVERY_STATUSES: DeliveryStatus[] = [
  'pending',
  'assigned',
  'delivering',
  'delivered',
  'cancelled',
];
const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  'pending',
  'assigned',
  'delivering',
];
const getDeliveriesStatusFilterPath = (statuses: DeliveryStatus[]) =>
  `/deliveries?statuses=${statuses.join(',')}`;
const formatRadiusKm = formatSendiPlusRadiusKm;
const SENDI_PLUS_TERMS_TEXT =
  'מתחייב בזמני משלוח של 60 דקות מסירה';
const SENDI_PLUS_DETAILS_OPEN_STORAGE_KEY = 'dashboard-sendi-plus-details-open';
const WORKSPACE_START_DISMISSED_STORAGE_PREFIX = 'dashboard-workspace-start-dismissed:';
const WORKSPACE_START_SENDI_PLUS_RADIUS_KM = 5;
const DASHBOARD_PULL_REFRESH_START_DISTANCE = 22;
const DASHBOARD_PULL_REFRESH_THRESHOLD = 64;
const DASHBOARD_PULL_REFRESH_MAX = 132;
const DASHBOARD_REFRESH_DURATION_MS = 520;

const getDashboardPullRefreshDistance = (rawDistance: number) => {
  const activeDistance = Math.max(0, rawDistance - DASHBOARD_PULL_REFRESH_START_DISTANCE);
  const easedDistance = activeDistance * 0.72;

  if (easedDistance <= DASHBOARD_PULL_REFRESH_THRESHOLD) {
    return Math.round(easedDistance);
  }

  const resistedOverflow = (easedDistance - DASHBOARD_PULL_REFRESH_THRESHOLD) * 0.38;
  return Math.round(
    Math.min(
      DASHBOARD_PULL_REFRESH_MAX,
      DASHBOARD_PULL_REFRESH_THRESHOLD + resistedOverflow,
    ),
  );
};

const readStoredSendiPlusDetailsOpen = () => {
  if (typeof window === 'undefined') return true;

  try {
    const stored = window.localStorage.getItem(SENDI_PLUS_DETAILS_OPEN_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
};

const writeStoredSendiPlusDetailsOpen = (value: boolean) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      SENDI_PLUS_DETAILS_OPEN_STORAGE_KEY,
      String(value),
    );
  } catch {
    // If storage is unavailable, the in-memory state still reflects the choice.
  }
};

const STATUS_META: Array<{
  id: DeliveryStatus;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClassName: string;
  barClassName: string;
}> = [
  {
    id: 'pending',
    label: 'ממתינים',
    hint: 'משלוחים שצריכים שליח',
    icon: Clock3,
    accentClassName: 'text-orange-400',
    barClassName: 'bg-orange-500',
  },
  {
    id: 'assigned',
    label: 'שובצו',
    hint: 'שליח בדרך למסעדה',
    icon: UserCheck,
    accentClassName: 'text-yellow-400',
    barClassName: 'bg-yellow-500',
  },
  {
    id: 'delivering',
    label: 'במסירה',
    hint: 'שליח בדרך ללקוח',
    icon: Package,
    accentClassName: 'text-green-400',
    barClassName: 'bg-green-500',
  },
  {
    id: 'delivered',
    label: 'נמסר',
    hint: 'הושלם בתאריך',
    icon: CheckCircle2,
    accentClassName: 'text-blue-400',
    barClassName: 'bg-blue-500',
  },
  {
    id: 'cancelled',
    label: 'בוטל',
    hint: 'בוטל בתאריך',
    icon: XCircle,
    accentClassName: 'text-red-300',
    barClassName: 'bg-red-400',
  },
  {
    id: 'expired',
    label: 'פג תוקף',
    hint: 'לא שובץ בזמן',
    icon: PackageOpen,
    accentClassName: 'text-zinc-300',
    barClassName: 'bg-zinc-400',
  },
];

const toDate = (value: unknown) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatNumber = (value: number) => value.toLocaleString('he-IL');

const getDashboardGreeting = (date = new Date()) => {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return 'בוקר טוב';
  if (hour >= 12 && hour < 18) return 'צהריים טובים';
  return 'ערב טוב';
};

const formatAverageDeliveryTime = (minutes: number | null) =>
  typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
    ? `${formatNumber(minutes)} דק׳`
    : '—';

const isDashboardPullRefreshIgnoredTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest(
      'input[type="range"], [role="slider"], [data-pull-refresh-ignore="true"], .sendi-plus-radius-slider',
    ),
  );
};

const RefreshingMetricValue: React.FC<{
  refreshing: boolean;
  value: React.ReactNode;
}> = ({ refreshing, value }) => (
  <span
    className={`inline-flex min-w-[1ch] items-center justify-end transition-colors ${
      refreshing ? 'animate-pulse text-app-text-muted' : ''
    }`}
  >
    {refreshing ? '-' : value}
  </span>
);

const useAnimatedMetricValue = (value: number, refreshing: boolean) => {
  const [displayValue, setDisplayValue] = React.useState(value);
  const displayValueRef = React.useRef(value);
  const animationFrameRef = React.useRef<number | null>(null);

  const cancelAnimation = React.useCallback(() => {
    if (typeof window === 'undefined' || animationFrameRef.current === null) return;

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }, []);

  React.useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  React.useEffect(() => {
    if (refreshing) return undefined;

    cancelAnimation();

    const startValue = displayValueRef.current;
    const endValue = value;

    if (startValue === endValue || typeof window === 'undefined') {
      displayValueRef.current = endValue;
      setDisplayValue(endValue);
      return undefined;
    }

    const durationMs = 850;
    const startedAt = window.performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + (endValue - startValue) * easedProgress);

      displayValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      displayValueRef.current = endValue;
      setDisplayValue(endValue);
      animationFrameRef.current = null;
    };

    animationFrameRef.current = window.requestAnimationFrame(step);

    return cancelAnimation;
  }, [cancelAnimation, refreshing, value]);

  return displayValue;
};

const CourierAvailabilityValue: React.FC<{
  connected: number;
  free: number;
  refreshing: boolean;
  total: number;
}> = ({ connected, free, refreshing, total }) => {
  const animatedFree = useAnimatedMetricValue(free, refreshing);
  const animatedConnected = useAnimatedMetricValue(connected, refreshing);
  const animatedTotal = useAnimatedMetricValue(total, refreshing);

  return (
    <RefreshingMetricValue
      refreshing={refreshing}
      value={
        <span
          className="inline-flex items-baseline justify-end leading-none"
          aria-label={`${formatNumber(free)} שליחים זמינים, ${formatNumber(connected)} שליחים מחוברים, ${formatNumber(total)} שליחים במערכת`}
        >
          <span>{formatNumber(animatedFree)}</span>
          <span className="px-1 text-sm font-semibold text-app-text-muted sm:text-base">/</span>
          <span className="text-sm font-semibold text-app-text-muted sm:text-base">{formatNumber(animatedConnected)}</span>
          <span className="px-1 text-sm font-semibold text-app-text-muted sm:text-base">/</span>
          <span className="text-sm font-semibold text-app-text-muted sm:text-base">{formatNumber(animatedTotal)}</span>
        </span>
      }
    />
  );
};

const RestaurantActivityValue: React.FC<{
  active: number;
  refreshing: boolean;
  total: number;
}> = ({ active, refreshing, total }) => {
  const animatedActive = useAnimatedMetricValue(active, refreshing);
  const animatedTotal = useAnimatedMetricValue(total, refreshing);

  return (
    <RefreshingMetricValue
      refreshing={refreshing}
      value={
        <span
          className="inline-flex items-baseline justify-end leading-none"
          aria-label={`${formatNumber(active)} מסעדות פעילות, ${formatNumber(total)} מסעדות במערכת`}
        >
          <span>{formatNumber(animatedActive)}</span>
          <span className="px-1 text-sm font-semibold text-app-text-muted sm:text-base">/</span>
          <span className="text-sm font-semibold text-app-text-muted sm:text-base">{formatNumber(animatedTotal)}</span>
        </span>
      }
    />
  );
};

const AnimatedMetricNumber: React.FC<{
  refreshing: boolean;
  value: number;
}> = ({ refreshing, value }) => {
  const displayValue = useAnimatedMetricValue(value, refreshing);

  return (
    <RefreshingMetricValue
      refreshing={refreshing}
      value={formatNumber(displayValue)}
    />
  );
};

const DashboardPullRefreshLabel: React.FC<{ label: string }> = ({ label }) => {
  const [visibleLabel, setVisibleLabel] = React.useState(label);
  const [isVisible, setIsVisible] = React.useState(Boolean(label));

  React.useEffect(() => {
    if (label) {
      setVisibleLabel(label);
      setIsVisible(true);
      return undefined;
    }

    setIsVisible(false);

    if (typeof window === 'undefined') {
      setVisibleLabel('');
      return undefined;
    }

    const timeout = window.setTimeout(() => setVisibleLabel(''), 190);
    return () => window.clearTimeout(timeout);
  }, [label]);

  if (!visibleLabel) return null;

  return (
    <span
      key={visibleLabel}
      className={`dashboard-pull-refresh-label ${
        isVisible
          ? 'dashboard-pull-refresh-label--visible'
          : 'dashboard-pull-refresh-label--hidden'
      }`}
    >
      {visibleLabel}
    </span>
  );
};

const isSameInputDate = (value: unknown, inputDate: string) => {
  const date = toDate(value);
  return Boolean(date && toDateInputValue(date) === inputDate);
};

const getDeliveryPrimaryDate = (delivery: Delivery) =>
  delivery.createdAt ?? delivery.creation_time;

const DashboardToolbarToggle: React.FC<{
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ active, disabled = false, icon, label, onClick }) => (
  <AppTooltip label={label} side="bottom" sideOffset={8} className="inline-flex shrink-0">
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-haptic="light"
      data-toolbar-icon-button
      data-active={active ? 'true' : 'false'}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--app-radius-xs)] border text-xs font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 ${
        disabled
          ? 'cursor-not-allowed border-[#E5E5E5] bg-white text-[#A3A3A3] opacity-55 dark:border-app-nav-border dark:bg-[#0A0A0A] dark:text-[#555555]'
          : active
          ? 'border-[#0D0D12] bg-[#F5F5F5] text-[#0D0D12] dark:border-[#2E2E2E] dark:bg-[#1F1F1F] dark:text-[#EDEDED]'
          : 'border-[#E5E5E5] bg-white text-[#0D0D12] hover:bg-[#F5F5F5] dark:border-app-nav-border dark:bg-[#0A0A0A] dark:text-[#EDEDED] dark:hover:bg-[#111111]'
      }`}
    >
      <span
        className={`flex items-center justify-center transition-transform ${
          active ? '-translate-y-0.5' : 'translate-y-0'
        }`}
      >
        {icon}
      </span>
      <span
        className={`pointer-events-none absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current transition-opacity ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </button>
  </AppTooltip>
);

const SendiPlusCard: React.FC<{
  deliveryZoneCount: number;
  activeRestaurantCount: number;
  radiusKm: number;
  termsAccepted: boolean;
  isSystemOpen: boolean;
  isRefreshing: boolean;
  onRadiusKmChange: (value: number) => void;
  onTermsAcceptedChange: (value: boolean) => void;
}> = ({
  deliveryZoneCount,
  activeRestaurantCount,
  radiusKm,
  termsAccepted,
  isSystemOpen,
  isRefreshing,
  onRadiusKmChange,
  onTermsAcceptedChange,
}) => {
  const isSendiPlusEnabled = termsAccepted && isSystemOpen;
  const isSystemDisabled = !isSystemOpen;
  const receivesDeliveries = canReceiveSendiPlusDeliveries(radiusKm, isSendiPlusEnabled);
  const canActivateFromCard = isSystemOpen && !isRefreshing && !isSendiPlusEnabled;
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(
    () => isSendiPlusEnabled && readStoredSendiPlusDetailsOpen(),
  );
  const [isRadiusBubbleVisible, setIsRadiusBubbleVisible] = React.useState(false);
  const [isActivationPulseVisible, setIsActivationPulseVisible] = React.useState(false);
  const radiusBubbleHideTimeoutRef = React.useRef<number | null>(null);
  const activationPulseTimeoutRef = React.useRef<number | null>(null);
  const cardTouchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const cardTouchMovedRef = React.useRef(false);
  const radiusPercent = (radiusKm / MAX_SENDI_PLUS_RADIUS_KM) * 100;
  const isAccordionOpen = isSendiPlusEnabled && isDetailsOpen;
  const termsTextClassName = isSendiPlusEnabled
    ? 'text-app-text-secondary'
    : isSystemDisabled
    ? 'text-app-text-secondary'
    : 'text-app-text-muted opacity-70';
  const helperTextClassName = isSendiPlusEnabled
    ? 'text-app-text-secondary'
    : isSystemDisabled
    ? 'text-app-text-secondary'
    : 'text-app-text-muted opacity-70';
  const radiusLabelClassName = isSendiPlusEnabled
    ? 'text-app-text-secondary'
    : isSystemDisabled
    ? 'text-app-text-secondary'
    : 'text-app-text-muted opacity-70';
  const systemDisabledCardClassName = isSystemDisabled
    ? 'cursor-not-allowed opacity-45 grayscale'
    : '';
  const disabledControlClassName = isSystemDisabled
    ? 'cursor-not-allowed'
    : 'cursor-not-allowed opacity-45';
  const offLabelClassName = isSystemDisabled ? '' : 'sendi-plus-label__word--off';
  const offPlusClassName = isSystemDisabled ? '' : 'sendi-plus-label__plus--off';
  const offMarkClassName = isSystemDisabled
    ? 'sendi-plus-mark--off sendi-plus-mark--system-off'
    : 'sendi-plus-mark--off';
  const toggleClassName = isSystemDisabled
    ? 'sendi-plus-card__system-off-toggle'
    : canActivateFromCard
    ? 'sendi-plus-card__toggle'
    : undefined;
  const selectedRadiusText = `${formatRadiusKm(radiusKm)} ק״מ`;
  const termsSummaryText = SENDI_PLUS_TERMS_TEXT;
  const radiusHelperText = !isSystemOpen
    ? 'כבוי'
    : !isSendiPlusEnabled
    ? 'כבוי'
    : receivesDeliveries
      ? `רדיוס נבחר: ${selectedRadiusText}.`
      : 'בחר רדיוס בסליידר כדי להתחיל לקבל משלוחים.';
  const sliderStyle = {
    '--sendi-plus-fill': `${radiusPercent}%`,
  } as React.CSSProperties & { '--sendi-plus-fill': string };
  const clearRadiusBubbleHideTimeout = React.useCallback(() => {
    if (radiusBubbleHideTimeoutRef.current === null) return;

    window.clearTimeout(radiusBubbleHideTimeoutRef.current);
    radiusBubbleHideTimeoutRef.current = null;
  }, []);
  const clearActivationPulseTimeout = React.useCallback(() => {
    if (activationPulseTimeoutRef.current === null) return;

    window.clearTimeout(activationPulseTimeoutRef.current);
    activationPulseTimeoutRef.current = null;
  }, []);
  const triggerActivationPulse = React.useCallback(() => {
    if (typeof window === 'undefined') return;

    clearActivationPulseTimeout();
    setIsActivationPulseVisible(true);

    activationPulseTimeoutRef.current = window.setTimeout(() => {
      setIsActivationPulseVisible(false);
      activationPulseTimeoutRef.current = null;
    }, 880);
  }, [clearActivationPulseTimeout]);
  const showRadiusBubble = React.useCallback(() => {
    clearRadiusBubbleHideTimeout();
    setIsRadiusBubbleVisible(true);
  }, [clearRadiusBubbleHideTimeout]);
  const hideRadiusBubble = React.useCallback(
    (delayMs = 0) => {
      clearRadiusBubbleHideTimeout();

      if (delayMs <= 0) {
        setIsRadiusBubbleVisible(false);
        return;
      }

      radiusBubbleHideTimeoutRef.current = window.setTimeout(() => {
        setIsRadiusBubbleVisible(false);
        radiusBubbleHideTimeoutRef.current = null;
      }, delayMs);
    },
    [clearRadiusBubbleHideTimeout],
  );
  const handleRadiusInput = (event: React.FormEvent<HTMLInputElement>) => {
    if (!isSendiPlusEnabled) return;

    onRadiusKmChange(Number(event.currentTarget.value));
    showRadiusBubble();
    hideRadiusBubble(900);
  };
  const toggleDetailsOpen = React.useCallback(() => {
    if (!isSendiPlusEnabled) {
      writeStoredSendiPlusDetailsOpen(false);
      setIsDetailsOpen(false);
      return;
    }

    setIsDetailsOpen((value) => {
      const nextValue = !value;

      writeStoredSendiPlusDetailsOpen(nextValue);

      return nextValue;
    });
  }, [isSendiPlusEnabled]);
  const setTermsAcceptedFromControl = React.useCallback((nextTermsAccepted: boolean) => {
    if (!isSystemOpen || isRefreshing) return;

    if (nextTermsAccepted && !isSendiPlusEnabled) {
      triggerActivationPulse();
    }

    onTermsAcceptedChange(nextTermsAccepted);

    if (!nextTermsAccepted) {
      writeStoredSendiPlusDetailsOpen(false);
      setIsDetailsOpen(false);
      hideRadiusBubble();
      return;
    }

    if (!isAccordionOpen) {
      writeStoredSendiPlusDetailsOpen(true);
      setIsDetailsOpen(true);
    }
  }, [
    hideRadiusBubble,
    isAccordionOpen,
    isRefreshing,
    isSendiPlusEnabled,
    isSystemOpen,
    onTermsAcceptedChange,
    triggerActivationPulse,
  ]);
  const activateFromCard = React.useCallback(() => {
    if (!canActivateFromCard) return;

    setTermsAcceptedFromControl(true);
  }, [canActivateFromCard, setTermsAcceptedFromControl]);
  const handleCardPointerDown = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') {
      cardTouchStartRef.current = null;
      cardTouchMovedRef.current = false;
      return;
    }

    cardTouchStartRef.current = { x: event.clientX, y: event.clientY };
    cardTouchMovedRef.current = false;
  }, []);
  const handleCardPointerMove = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch' || !cardTouchStartRef.current) return;

    const deltaX = Math.abs(event.clientX - cardTouchStartRef.current.x);
    const deltaY = Math.abs(event.clientY - cardTouchStartRef.current.y);
    if (deltaX > 8 || deltaY > 8) {
      cardTouchMovedRef.current = true;
    }
  }, []);
  const handleCardPointerCancel = React.useCallback(() => {
    cardTouchStartRef.current = null;
    cardTouchMovedRef.current = false;
  }, []);
  const handleCardClick = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (cardTouchMovedRef.current) {
      event.preventDefault();
      event.stopPropagation();
      cardTouchMovedRef.current = false;
      cardTouchStartRef.current = null;
      return;
    }

    if (!canActivateFromCard) return;

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('[data-sendi-plus-control="true"]')
    ) {
      return;
    }

    activateFromCard();
  }, [activateFromCard, canActivateFromCard]);
  const handleCardKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (!canActivateFromCard) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('[data-sendi-plus-control="true"]')
    ) {
      return;
    }

    event.preventDefault();
    activateFromCard();
  }, [activateFromCard, canActivateFromCard]);

  React.useEffect(() => {
    if (isSystemOpen) return;

    writeStoredSendiPlusDetailsOpen(false);
    setIsDetailsOpen(false);
    hideRadiusBubble();
  }, [hideRadiusBubble, isSystemOpen]);

  React.useEffect(() => {
    if (!isSystemOpen || !termsAccepted) return;
    if (!readStoredSendiPlusDetailsOpen()) return;

    setIsDetailsOpen(true);
  }, [isSystemOpen, termsAccepted]);

  React.useEffect(() => clearRadiusBubbleHideTimeout, [clearRadiusBubbleHideTimeout]);
  React.useEffect(() => clearActivationPulseTimeout, [clearActivationPulseTimeout]);

  return (
    <section
      className={`sendi-plus-card rounded-none border border-app-border bg-app-surface dark:border-[#252525] dark:bg-[#0A0A0A] ${
        isSendiPlusEnabled ? 'sendi-plus-card--active' : 'sendi-plus-card--off'
      } ${canActivateFromCard ? 'sendi-plus-card--teaser cursor-pointer' : ''} ${
        isActivationPulseVisible ? 'sendi-plus-card--igniting' : ''
      } ${systemDisabledCardClassName}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      onPointerCancel={handleCardPointerCancel}
      onPointerDown={handleCardPointerDown}
      onPointerMove={handleCardPointerMove}
      role={canActivateFromCard ? 'button' : undefined}
      tabIndex={canActivateFromCard ? 0 : undefined}
      aria-disabled={isSystemDisabled}
      aria-label={canActivateFromCard ? `הפעל ${SENDI_PLUS_LABEL}` : undefined}
    >
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3" dir="ltr">
        <button
          type="button"
          data-sendi-plus-control="true"
          data-haptic="selection"
          onClick={toggleDetailsOpen}
          disabled={!isSendiPlusEnabled}
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-app-text-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/30 ${
            isSendiPlusEnabled
              ? 'hover:bg-app-surface-raised hover:text-app-text dark:hover:bg-[#1f1f1f]'
              : disabledControlClassName
          }`}
          aria-label={
            isSendiPlusEnabled
              ? isAccordionOpen
                ? 'סגור פרטי סנדי פלוס'
                : 'פתח פרטי סנדי פלוס'
              : 'סנדי פלוס כבוי'
          }
          aria-controls="sendi-plus-details"
          aria-expanded={isAccordionOpen}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isAccordionOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div className="ml-auto min-w-0 text-right" dir="rtl">
          <div
            className="ml-auto flex w-fit max-w-full items-center gap-2"
            aria-label={isSendiPlusEnabled ? 'סנדי פלוס פעיל' : 'סנדי פלוס כבוי'}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="sendi-plus-label truncate text-sm font-semibold text-app-text">
                <span className={isSendiPlusEnabled ? '' : offLabelClassName}>
                  סנדי
                </span>
                <span
                  className={`sendi-plus-label__plus ${
                    isSendiPlusEnabled ? '' : offPlusClassName
                  }`}
                >
                  פלוס
                </span>
              </span>
              <span
                className={`sendi-plus-mark ${
                  isSendiPlusEnabled ? 'sendi-plus-mark--active' : offMarkClassName
                }`}
                aria-hidden="true"
              >
                <span className="sendi-plus-mark__inner">
                  <Plus
                    className={
                      isSendiPlusEnabled
                        ? 'h-2.5 w-2.5 text-white'
                        : 'h-2.5 w-2.5 text-app-text-muted'
                    }
                    strokeWidth={2.65}
                  />
                </span>
              </span>
            </span>
          </div>
        </div>
      </div>

      <div
        id="sendi-plus-details"
        className={`sendi-plus-accordion ${
          isAccordionOpen ? 'sendi-plus-accordion--open' : ''
        }`}
        aria-hidden={!isAccordionOpen}
      >
        <div className="sendi-plus-accordion__inner">
          <div className="border-t border-app-border px-3 pb-3 pt-3 sm:px-4 dark:border-[#252525]">
            <p className={`mb-2.5 text-right text-xs font-normal leading-5 ${helperTextClassName}`} dir="rtl">
              {radiusHelperText}
            </p>
            <div className="relative px-1.5">
              {isRadiusBubbleVisible ? (
                <div
                  data-sendi-plus-radius-bubble
                  className="pointer-events-none absolute -top-7 z-10 flex h-7 min-w-9 items-center justify-center rounded-[6px] bg-app-text px-2 text-xs font-bold text-app-background shadow-lg"
                  style={{ right: `clamp(0px, calc(${radiusPercent}% - 18px), calc(100% - 36px))` }}
                >
                  {formatRadiusKm(radiusKm)}
                </div>
              ) : null}
              <input
                type="range"
                data-pull-refresh-ignore="true"
                data-sidebar-swipe-ignore="true"
                min={0}
                max={MAX_SENDI_PLUS_RADIUS_KM}
                step={SENDI_PLUS_RADIUS_STEP_KM}
                value={radiusKm}
                disabled={!isSendiPlusEnabled}
                onChange={handleRadiusInput}
                onInput={handleRadiusInput}
                onPointerDown={showRadiusBubble}
                onPointerUp={() => hideRadiusBubble(700)}
                onPointerCancel={() => hideRadiusBubble()}
                onPointerLeave={() => hideRadiusBubble(700)}
                onKeyDown={showRadiusBubble}
                onKeyUp={() => hideRadiusBubble(900)}
                onBlur={() => hideRadiusBubble()}
                aria-label={`טווח משלוחים ${SENDI_PLUS_LABEL}`}
                className={`sendi-plus-radius-slider h-7 w-full cursor-pointer ${
                  receivesDeliveries ? 'sendi-plus-radius-slider--active' : 'sendi-plus-radius-slider--off'
                }`}
                dir="rtl"
                style={sliderStyle}
              />
              <div className={`relative mt-1 h-4 text-[11px] ${radiusLabelClassName}`} dir="rtl">
                <span className="absolute right-0 top-0 whitespace-nowrap text-right">
                  {receivesDeliveries ? '0 ק״מ' : 'כבוי'}
                </span>
                <span className="absolute right-1/2 top-0 translate-x-1/2 whitespace-nowrap text-center">
                  5 ק״מ
                </span>
                <span className="absolute left-0 top-0 whitespace-nowrap text-left">
                  10+ ק״מ
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="border-t border-app-border px-3 py-2.5 sm:px-4 sm:py-3 dark:border-[#252525]" dir="rtl">
        <div
          data-pull-refresh-ignore="true"
          data-sidebar-swipe-ignore="true"
          className="flex min-w-0 items-center justify-between gap-4"
        >
          <span className={`sendi-plus-terms-text min-w-0 truncate text-xs font-normal ${termsTextClassName}`}>
            {termsSummaryText}
          </span>
          <Toggle
            checked={isSendiPlusEnabled}
            onChange={() => setTermsAcceptedFromControl(!isSendiPlusEnabled)}
            disabled={!isSystemOpen || isRefreshing}
            className={toggleClassName}
            ariaLabel="אישור תנאי סנדי פלוס"
          />
        </div>
      </div>
    </section>
  );
};

const WorkspaceStartSpotlight: React.FC<{
  area?: string;
  companyPhone?: string;
  invitedCourierCount: number;
  registeredCourierCount: number;
  restaurantCount: number;
  sendiPlusActive: boolean;
  workspaceName?: string;
  onActivateSendiPlus: () => void;
  onCreateCourier: () => void;
  onDismiss: () => void;
  onOpenRestaurants: () => void;
}> = ({
  invitedCourierCount,
  registeredCourierCount,
  sendiPlusActive,
  onActivateSendiPlus,
  onCreateCourier,
  onDismiss,
}) => {
  const hasRegisteredCouriers = registeredCourierCount > 0;
  const hasPendingCourierInvites = invitedCourierCount > 0;
  const registeredCourierStatusText = registeredCourierCount === 1
    ? 'שליח אחד רשום'
    : `${formatNumber(registeredCourierCount)} שליחים רשומים`;
  const pendingCourierStatusText = invitedCourierCount === 1
    ? 'הזמנה אחת ממתינה'
    : `${formatNumber(invitedCourierCount)} הזמנות ממתינות`;
  const courierStatusText = hasRegisteredCouriers
    ? registeredCourierStatusText
    : hasPendingCourierInvites
      ? pendingCourierStatusText
      : 'עדיין לא הוזמן שליח';

  let nextStep: {
    actionLabel: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    stepLabel: string;
    title: string;
  };

  if (!hasRegisteredCouriers) {
    nextStep = {
      actionLabel: hasPendingCourierInvites ? 'הזמן עוד שליח' : 'הזמן שליח',
      description: hasPendingCourierInvites
        ? 'מחכים שהשליח ישלים הרשמה באפליקציה שלו. אפשר להזמין עוד אחד בלי לפתוח טופס בדשבורד.'
        : 'השליח נרשם באפליקציה שלו. מכאן רק שולחים הזמנה.',
      icon: <UserPlus className="h-4 w-4" />,
      onClick: onCreateCourier,
      stepLabel: 'שלב ראשון',
      title: hasPendingCourierInvites ? 'הזמנת שליח נשלחה' : 'הוסף שליח ראשון',
    };
  } else if (!sendiPlusActive) {
    nextStep = {
      actionLabel: 'הפעל סנדי פלוס',
      description: 'יש שליח רשום. עכשיו אפשר לפתוח קבלת משלוחים מהרשת.',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: onActivateSendiPlus,
      stepLabel: 'השלב הבא',
      title: 'הפעל קבלת משלוחים',
    };
  } else {
    nextStep = {
      actionLabel: 'סגור',
      description: 'הבסיס מוכן. אפשר להמשיך לעבוד מהדשבורד.',
      icon: <CheckCircle2 className="h-4 w-4" />,
      onClick: onDismiss,
      stepLabel: 'מוכן',
      title: 'הדשבורד מוכן לעבודה',
    };
  }

  return (
    <section className="rounded-none border border-app-brand/25 bg-app-surface text-right shadow-[0_10px_24px_rgba(0,0,0,0.06)] dark:border-app-brand/20 dark:bg-[#0A0A0A]">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between" dir="rtl">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-app-brand/10 text-app-brand">
            {nextStep.icon}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black text-app-brand">{nextStep.stepLabel}</span>
              <span className="h-1 w-1 rounded-full bg-app-text-secondary/50" />
              <span className="text-[11px] font-semibold text-app-text-secondary">{courierStatusText}</span>
            </div>
            <h2 className="mt-1 text-sm font-black leading-5 text-app-text">
              {nextStep.title}
            </h2>
            <p className="mt-0.5 max-w-[46rem] text-xs leading-5 text-app-text-secondary">
              {nextStep.description}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={nextStep.onClick}
            className="inline-flex items-center gap-2 rounded-[6px] bg-app-brand-solid px-3 py-2 text-xs font-black text-app-background transition-colors hover:bg-app-brand-hover"
          >
            {nextStep.icon}
            {nextStep.actionLabel}
          </button>
          {!sendiPlusActive ? (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="סגור כרטיס אונבורדינג"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-app-border text-app-text-secondary transition-colors hover:bg-app-surface-raised dark:border-[#252525] dark:hover:bg-[#111111]"
            >
              <XCircle className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export const Dashboard: React.FC = () => {
  const { state, dispatch, toggleSystem } = useDelivery();
  const navigate = useNavigate();
  const [authSession, setAuthSession] = React.useState(readAuthSession);
  const todayDateKey = React.useMemo(() => toDateInputValue(new Date()), []);
  const [sendiPlusRadiusKm, setSendiPlusRadiusKm] = React.useState(readStoredSendiPlusRadius);
  const [sendiPlusTermsAccepted, setSendiPlusTermsAccepted] = React.useState(readStoredSendiPlusTermsAccepted);
  const [deliveryZoneConfigVersion, setDeliveryZoneConfigVersion] = React.useState(0);
  const [dashboardRefreshVersion, setDashboardRefreshVersion] = React.useState(0);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isPullRefreshReady, setIsPullRefreshReady] = React.useState(false);
  const [isDashboardRefreshing, setIsDashboardRefreshing] = React.useState(false);
  const mainScrollRef = React.useRef<HTMLElement | null>(null);
  const pullStartXRef = React.useRef<number | null>(null);
  const pullStartYRef = React.useRef<number | null>(null);
  const pullRefreshGestureStateRef = React.useRef<'pending' | 'pull' | 'ignore'>('pending');
  const pullRefreshReadyRef = React.useRef(false);
  const pullThresholdHapticPlayedRef = React.useRef(false);
  const pullRefreshTriggeredRef = React.useRef(false);
  const pullRefreshTouchActiveRef = React.useRef(false);
  const isDashboardRefreshingRef = React.useRef(false);
  const pullRefreshResetTimeoutRef = React.useRef<number | null>(null);
  const dashboardRefreshTimeoutRef = React.useRef<number | null>(null);
  const pullRefreshHapticButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const workspaceStartStorageKey = React.useMemo(
    () => `${WORKSPACE_START_DISMISSED_STORAGE_PREFIX}${state.workspaceId ?? state.workspaceName ?? 'default'}`,
    [state.workspaceId, state.workspaceName],
  );
  const [isWorkspaceStartDismissed, setIsWorkspaceStartDismissed] = React.useState(false);
  const dashboardUserName = authSession?.user.name?.trim() || 'משתמש';

  const isMobilePullRefreshPointer = React.useCallback(() => {
    if (typeof window === 'undefined') return false;

    return window.matchMedia('(pointer: coarse), (hover: none), (max-width: 767px)').matches;
  }, []);

  const completePullRefreshReset = React.useCallback(() => {
    setPullDistance(0);
    setIsPullRefreshReady(false);
    pullStartXRef.current = null;
    pullStartYRef.current = null;
    pullRefreshGestureStateRef.current = 'pending';
    pullRefreshReadyRef.current = false;
    pullThresholdHapticPlayedRef.current = false;
    pullRefreshTriggeredRef.current = false;
    pullRefreshTouchActiveRef.current = false;
  }, []);

  const resetPullRefresh = React.useCallback((delay = 0) => {
    if (typeof window !== 'undefined' && pullRefreshResetTimeoutRef.current !== null) {
      window.clearTimeout(pullRefreshResetTimeoutRef.current);
      pullRefreshResetTimeoutRef.current = null;
    }

    if (typeof window === 'undefined' || delay <= 0) {
      completePullRefreshReset();
      return;
    }

    pullRefreshResetTimeoutRef.current = window.setTimeout(() => {
      completePullRefreshReset();
      pullRefreshResetTimeoutRef.current = null;
    }, delay);
  }, [completePullRefreshReset]);

  const playPullRefreshThresholdHaptic = React.useCallback(() => {
    pullRefreshHapticButtonRef.current?.click();
    window.setTimeout(() => playHaptic('medium', { force: true }), 24);
  }, []);

  const runDashboardRefresh = React.useCallback((revealDistance = DASHBOARD_PULL_REFRESH_THRESHOLD) => {
    if (isDashboardRefreshingRef.current || pullRefreshTriggeredRef.current) return;

    const settledDistance = Math.max(
      DASHBOARD_PULL_REFRESH_THRESHOLD,
      Math.min(DASHBOARD_PULL_REFRESH_MAX, revealDistance),
    );

    pullRefreshTriggeredRef.current = true;
    isDashboardRefreshingRef.current = true;
    setPullDistance(settledDistance);
    setIsPullRefreshReady(true);
    setIsDashboardRefreshing(true);
    setDashboardRefreshVersion((version) => version + 1);
    setDeliveryZoneConfigVersion((version) => version + 1);
    setSendiPlusRadiusKm(readStoredSendiPlusRadius());
    setSendiPlusTermsAccepted(readStoredSendiPlusTermsAccepted());

    if (dashboardRefreshTimeoutRef.current !== null) {
      window.clearTimeout(dashboardRefreshTimeoutRef.current);
    }

    dashboardRefreshTimeoutRef.current = window.setTimeout(() => {
      isDashboardRefreshingRef.current = false;
      setIsDashboardRefreshing(false);
      if (!pullRefreshTouchActiveRef.current) {
        resetPullRefresh(140);
      }
      dashboardRefreshTimeoutRef.current = null;
    }, DASHBOARD_REFRESH_DURATION_MS);
  }, [resetPullRefresh]);

  React.useEffect(() => () => {
    if (pullRefreshResetTimeoutRef.current !== null) {
      window.clearTimeout(pullRefreshResetTimeoutRef.current);
    }
    if (dashboardRefreshTimeoutRef.current !== null) {
      window.clearTimeout(dashboardRefreshTimeoutRef.current);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const refreshAuthSession = () => setAuthSession(readAuthSession());

    window.addEventListener('storage', refreshAuthSession);
    window.addEventListener('focus', refreshAuthSession);

    return () => {
      window.removeEventListener('storage', refreshAuthSession);
      window.removeEventListener('focus', refreshAuthSession);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsWorkspaceStartDismissed(
      window.localStorage.getItem(workspaceStartStorageKey) === 'true',
    );
  }, [workspaceStartStorageKey]);

  const handlePullRefreshTouchStart = React.useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (isDashboardRefreshingRef.current || !isMobilePullRefreshPointer()) return;
    if (isDashboardPullRefreshIgnoredTarget(event.target)) return;
    if ((event.currentTarget as HTMLElement).scrollTop > 0) return;

    if (pullRefreshResetTimeoutRef.current !== null) {
      window.clearTimeout(pullRefreshResetTimeoutRef.current);
      pullRefreshResetTimeoutRef.current = null;
    }

    pullRefreshTouchActiveRef.current = true;
    pullRefreshTriggeredRef.current = false;
    pullStartXRef.current = event.touches[0]?.clientX ?? null;
    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    pullRefreshGestureStateRef.current = 'pending';
    pullRefreshReadyRef.current = false;
    pullThresholdHapticPlayedRef.current = false;
  }, [isMobilePullRefreshPointer]);

  const handlePullRefreshTouchMove = React.useCallback((event: React.TouchEvent<HTMLElement>) => {
    const startX = pullStartXRef.current;
    const startY = pullStartYRef.current;
    if (startX === null || startY === null) return;

    const scrollTarget = event.currentTarget as HTMLElement;
    if (scrollTarget.scrollTop > 0 && !pullRefreshTriggeredRef.current) {
      resetPullRefresh();
      return;
    }

    const currentX = event.touches[0]?.clientX ?? startX;
    const currentY = event.touches[0]?.clientY ?? startY;
    const horizontalDistance = Math.abs(currentX - startX);
    const rawDistance = currentY - startY;

    if (pullRefreshGestureStateRef.current === 'pending') {
      const verticalDistance = Math.abs(rawDistance);

      if (
        verticalDistance < DASHBOARD_PULL_REFRESH_START_DISTANCE &&
        horizontalDistance < DASHBOARD_PULL_REFRESH_START_DISTANCE
      ) {
        return;
      }

      if (
        rawDistance <= DASHBOARD_PULL_REFRESH_START_DISTANCE ||
        horizontalDistance > rawDistance * 0.72
      ) {
        pullRefreshGestureStateRef.current = 'ignore';
        resetPullRefresh();
        return;
      }

      pullRefreshGestureStateRef.current = 'pull';
    }

    if (pullRefreshGestureStateRef.current === 'ignore') return;

    if (rawDistance <= 0) {
      if (pullRefreshTriggeredRef.current) {
        setPullDistance(DASHBOARD_PULL_REFRESH_THRESHOLD);
        setIsPullRefreshReady(true);
        event.preventDefault();
        return;
      }

      resetPullRefresh();
      return;
    }

    event.preventDefault();

    const nextDistance = getDashboardPullRefreshDistance(rawDistance);

    if (pullRefreshTriggeredRef.current) {
      setPullDistance(Math.max(DASHBOARD_PULL_REFRESH_THRESHOLD, nextDistance));
      setIsPullRefreshReady(true);
      pullRefreshReadyRef.current = true;
      return;
    }

    const nextReady = nextDistance >= DASHBOARD_PULL_REFRESH_THRESHOLD;

    setPullDistance(nextDistance);
    setIsPullRefreshReady(nextReady);
    pullRefreshReadyRef.current = nextReady;

    if (nextReady && !pullThresholdHapticPlayedRef.current) {
      pullThresholdHapticPlayedRef.current = true;
      playPullRefreshThresholdHaptic();
    }

    if (nextReady) {
      runDashboardRefresh(nextDistance);
    }
  }, [playPullRefreshThresholdHaptic, resetPullRefresh, runDashboardRefresh]);

  const handlePullRefreshTouchEnd = React.useCallback(() => {
    pullRefreshTouchActiveRef.current = false;

    if (pullRefreshTriggeredRef.current || isDashboardRefreshingRef.current) {
      if (isDashboardRefreshingRef.current) {
        setPullDistance(DASHBOARD_PULL_REFRESH_THRESHOLD);
        setIsPullRefreshReady(true);
        return;
      }

      resetPullRefresh();
      return;
    }

    if (pullRefreshGestureStateRef.current === 'pull' && pullRefreshReadyRef.current) {
      runDashboardRefresh();
      return;
    }

    resetPullRefresh();
  }, [resetPullRefresh, runDashboardRefresh]);

  React.useEffect(() => {
    if (!sendiPlusTermsAccepted) return;

    writeStoredSendiPlusRadius(sendiPlusRadiusKm);
  }, [sendiPlusRadiusKm, sendiPlusTermsAccepted]);

  React.useEffect(() => {
    if (!sendiPlusTermsAccepted) {
      setSendiPlusRadiusKm(DEFAULT_SENDI_PLUS_RADIUS_KM);
    }
  }, [sendiPlusTermsAccepted]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const refreshDeliveryZones = () => setDeliveryZoneConfigVersion((version) => version + 1);
    const syncSendiPlusRadius = () => {
      setSendiPlusRadiusKm(readStoredSendiPlusRadius());
    };
    const syncSendiPlusTermsAccepted = () => {
      setSendiPlusTermsAccepted(readStoredSendiPlusTermsAccepted());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'delivery_zones_v1') {
        refreshDeliveryZones();
      }

      if (
        event.key === SENDI_PLUS_RADIUS_STORAGE_KEY ||
        event.key === LEGACY_SENDI_GO_RADIUS_STORAGE_KEY
      ) {
        syncSendiPlusRadius();
      }

      if (event.key === SENDI_PLUS_TERMS_ACCEPTED_STORAGE_KEY) {
        syncSendiPlusTermsAccepted();
      }
    };

    window.addEventListener(DELIVERY_ZONES_CHANGE_EVENT, refreshDeliveryZones);
    window.addEventListener(SENDI_PLUS_RADIUS_CHANGE_EVENT, syncSendiPlusRadius);
    window.addEventListener(SENDI_PLUS_TERMS_ACCEPTED_CHANGE_EVENT, syncSendiPlusTermsAccepted);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(DELIVERY_ZONES_CHANGE_EVENT, refreshDeliveryZones);
      window.removeEventListener(SENDI_PLUS_RADIUS_CHANGE_EVENT, syncSendiPlusRadius);
      window.removeEventListener(SENDI_PLUS_TERMS_ACCEPTED_CHANGE_EVENT, syncSendiPlusTermsAccepted);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleSendiPlusRadiusChange = React.useCallback((value: number) => {
    setSendiPlusRadiusKm(clampSendiPlusRadius(value));
  }, []);

  const handleSendiPlusTermsAcceptedChange = React.useCallback((value: boolean) => {
    writeStoredSendiPlusTermsAccepted(value);
    setSendiPlusTermsAccepted(value);

    if (!value) {
      setSendiPlusRadiusKm(DEFAULT_SENDI_PLUS_RADIUS_KM);
    }
  }, []);

  React.useEffect(() => {
    if (state.isSystemOpen || !sendiPlusTermsAccepted) return;

    setSendiPlusTermsAccepted(false);
    setSendiPlusRadiusKm(DEFAULT_SENDI_PLUS_RADIUS_KM);
  }, [sendiPlusTermsAccepted, state.isSystemOpen]);

  const handleActivateSendiPlusFromSpotlight = React.useCallback(() => {
    if (!state.isSystemOpen) return;

    const nextRadiusKm =
      sendiPlusRadiusKm > 0 ? sendiPlusRadiusKm : WORKSPACE_START_SENDI_PLUS_RADIUS_KM;
    setSendiPlusRadiusKm(nextRadiusKm);
    writeStoredSendiPlusRadius(nextRadiusKm);
    handleSendiPlusTermsAcceptedChange(true);
  }, [handleSendiPlusTermsAcceptedChange, sendiPlusRadiusKm, state.isSystemOpen]);

  const handleDismissWorkspaceStart = React.useCallback(() => {
    setIsWorkspaceStartDismissed(true);

    if (typeof window === 'undefined') return;
    window.localStorage.setItem(workspaceStartStorageKey, 'true');
  }, [workspaceStartStorageKey]);

  const dateDeliveries = React.useMemo(
    () =>
      state.deliveries.filter((delivery) => {
        if (!DASHBOARD_DELIVERY_STATUSES.includes(delivery.status)) return false;
        return isSameInputDate(getDeliveryPrimaryDate(delivery), todayDateKey);
      }),
    [dashboardRefreshVersion, todayDateKey, state.deliveries],
  );

  const filteredDeliveries = dateDeliveries;

  const statusCounts = React.useMemo(() => {
    const counts = new Map<DeliveryStatus, number>();
    STATUS_META.forEach((status) => counts.set(status.id, 0));
    filteredDeliveries.forEach((delivery) => {
      counts.set(delivery.status, (counts.get(delivery.status) ?? 0) + 1);
    });
    return counts;
  }, [dashboardRefreshVersion, filteredDeliveries]);
  const activeDeliveriesCount = React.useMemo(
    () =>
      ACTIVE_DELIVERY_STATUSES.reduce(
        (total, status) => total + (statusCounts.get(status) ?? 0),
        0,
      ),
    [statusCounts],
  );

  const sendiPlusDeliveryZones = React.useMemo(
    () => loadStoredDeliveryServiceAreas(),
    [dashboardRefreshVersion, deliveryZoneConfigVersion],
  );
  const sendiPlusDeliveryZoneCount = React.useMemo(
    () => sendiPlusDeliveryZones.filter(isDeliveryZoneActive).length,
    [dashboardRefreshVersion, sendiPlusDeliveryZones],
  );
  const isSendiPlusOperational = state.isSystemOpen && sendiPlusTermsAccepted;
  const sendiPlusActiveRestaurantCount = React.useMemo(
    () =>
      state.restaurants.filter(
        (restaurant) =>
          isRestaurantActiveForDisplay(restaurant, isSendiPlusOperational) &&
          isSendiPlusRestaurant(restaurant.name, restaurant.chainId) &&
          Number.isFinite(restaurant.lat) &&
          Number.isFinite(restaurant.lng) &&
          isPointCoveredByActiveDeliveryZones(
            { lat: restaurant.lat, lng: restaurant.lng },
            sendiPlusDeliveryZones,
          ),
      ).length,
    [dashboardRefreshVersion, isSendiPlusOperational, sendiPlusDeliveryZones, state.restaurants],
  );
  const connectedCouriersCount = React.useMemo(
    () => state.couriers.filter((courier) => courier.status !== 'offline').length,
    [dashboardRefreshVersion, state.couriers],
  );
  const baseActiveRestaurantsCount = React.useMemo(
    () =>
      state.restaurants.filter(
        (restaurant) =>
          restaurant.isActive &&
          !isSendiPlusRestaurant(restaurant.name, restaurant.chainId),
      ).length,
    [dashboardRefreshVersion, state.restaurants],
  );
  const sendiPlusRestaurantsForDashboardCount = React.useMemo(
    () =>
      state.restaurants.filter(
        (restaurant) =>
          restaurant.isActive &&
          isSendiPlusRestaurant(restaurant.name, restaurant.chainId),
      ).length,
    [dashboardRefreshVersion, state.restaurants],
  );
  const activeRestaurantsCount = baseActiveRestaurantsCount + (
    isSendiPlusOperational ? sendiPlusRestaurantsForDashboardCount : 0
  );
  const shouldShowWorkspaceStart =
    state.dataMode === 'workspace' &&
    !isWorkspaceStartDismissed &&
    (
      state.couriers.length === 0 ||
      activeRestaurantsCount === 0 ||
      !sendiPlusTermsAccepted
    );
  const freeCouriersCount = React.useMemo(() => {
    const busyCourierIds = new Set(
      state.deliveries
        .filter(
          (delivery) =>
            delivery.courierId &&
            (delivery.status === 'assigned' || delivery.status === 'delivering'),
        )
        .map((delivery) => delivery.courierId as string),
    );

    return state.couriers.filter(
      (courier) =>
        courier.status === 'available' &&
        canCourierAcceptDelivery(courier) &&
        !busyCourierIds.has(courier.id),
    ).length;
  }, [dashboardRefreshVersion, state.couriers, state.deliveries]);
  const averageDeliveryMinutes = React.useMemo(() => {
    const deliveryDurations = filteredDeliveries
      .filter((delivery) => delivery.status === 'delivered')
      .map((delivery) => {
        const createdAt = toDate(delivery.createdAt ?? delivery.creation_time);
        const deliveredAt = toDate(delivery.deliveredAt ?? delivery.delivered_time);

        if (!createdAt || !deliveredAt) return null;

        const durationMinutes = (deliveredAt.getTime() - createdAt.getTime()) / 60000;
        return durationMinutes > 0 && Number.isFinite(durationMinutes) ? durationMinutes : null;
      })
      .filter((duration): duration is number => duration !== null);

    if (deliveryDurations.length === 0) return null;

    const totalMinutes = deliveryDurations.reduce((sum, duration) => sum + duration, 0);
    const averageMinutes = Math.round(totalMinutes / deliveryDurations.length);
    return Number.isFinite(averageMinutes) && averageMinutes > 0 ? averageMinutes : null;
  }, [dashboardRefreshVersion, filteredDeliveries]);
  const dashboardGreeting = getDashboardGreeting();
  const { mapOpen, setMapOpen, mapSplitPortal } = useDeliveriesMapSplit({
    deliveries: filteredDeliveries,
    couriers: state.couriers,
    restaurants: state.restaurants,
    routeStopOrders: state.courierRoutePlans,
  });
  const pullRefreshProgress = Math.min(1, pullDistance / DASHBOARD_PULL_REFRESH_THRESHOLD);
  const pullRefreshVisible = pullDistance > 0;
  const pullRefreshArmed = isDashboardRefreshing || isPullRefreshReady;
  const pullRefreshRevealHeight = Math.min(68, Math.round(pullDistance * 0.7));
  const pullRefreshLabel = isDashboardRefreshing || isPullRefreshReady
    ? 'מרענן'
    : 'משוך לרענון';
  const systemPowerLabel = state.isSystemOpen ? 'מערכת דלוקה' : 'מערכת כבויה';
  const deliveryIntakeLabel = state.isReceivingDeliveries ? 'מקבל משלוחים' : 'לא מקבל משלוחים';
  const autoAssignLabel = state.autoAssignEnabled ? 'שיבוץ אוטומטי פעיל' : 'שיבוץ אוטומטי כבוי';
  const registeredCourierCount = state.couriers.filter(
    (courier) => courier.registrationStatus !== 'invited',
  ).length;
  const invitedCourierCount = state.couriers.filter(
    (courier) => courier.registrationStatus === 'invited',
  ).length;
  const hasCouriersForOperations = registeredCourierCount > 0;
  const deliveryIntakeControlDisabled = !state.isSystemOpen || isDashboardRefreshing;
  const autoAssignControlDisabled =
    !state.isSystemOpen || !hasCouriersForOperations || isDashboardRefreshing;
  const dashboardCardsDisabled = !state.isSystemOpen;
  const dashboardCardDisabledClassName = dashboardCardsDisabled
    ? 'cursor-not-allowed opacity-45 grayscale'
    : '';
  const dashboardCardInnerDisabledClassName = dashboardCardsDisabled
    ? 'cursor-not-allowed'
    : '';
  const dashboardCardHoverClassName = dashboardCardsDisabled
    ? ''
    : 'dashboard-card-hover';
  const deliveredCancelledSummary = (
    <section
      aria-label="סיכום נמסרו ובוטלו"
      className="grid grid-cols-2 gap-[10px]"
    >
      {(['delivered', 'cancelled'] as DeliveryStatus[]).map((statusId) => {
        const status = STATUS_META.find((item) => item.id === statusId);
        if (!status) return null;

        const Icon = status.icon;
        const count = statusCounts.get(statusId) ?? 0;
        const label = statusId === 'delivered' ? 'נמסרו' : 'בוטלו';
        const value = formatNumber(count);
        const iconClassName = status.accentClassName;

        return (
          <button
            key={statusId}
            type="button"
            aria-label={label}
            disabled={dashboardCardsDisabled}
            onClick={() => navigate(getDeliveriesStatusFilterPath([statusId]))}
            className={`dashboard-status-card min-w-0 rounded-none border border-app-border bg-app-surface p-2.5 text-right transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 sm:p-3 dark:border-[#252525] dark:bg-[#0A0A0A] ${dashboardCardHoverClassName} ${dashboardCardDisabledClassName}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[11px] font-semibold text-app-text-secondary sm:text-xs">
                {label}
              </span>
              <Icon className={`h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${iconClassName}`} />
            </div>
            <div className="mt-2 text-xl font-bold leading-none text-app-text sm:text-2xl">
              <RefreshingMetricValue
                refreshing={isDashboardRefreshing}
                value={value}
              />
            </div>
          </button>
        );
      })}
    </section>
  );

  return (
    <>
      {mapSplitPortal}
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-app-background text-app-text" dir="rtl">
      <button
        ref={pullRefreshHapticButtonRef}
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        data-haptic="selection"
        className="pointer-events-none fixed -left-10 -top-10 h-px w-px opacity-0"
      />
      <main
        ref={mainScrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-6 md:pt-2 md:pb-6"
        onTouchStart={handlePullRefreshTouchStart}
        onTouchMove={handlePullRefreshTouchMove}
        onTouchEnd={handlePullRefreshTouchEnd}
        onTouchCancel={handlePullRefreshTouchEnd}
      >
        <div
          className={`mx-auto w-full max-w-[1280px] overflow-hidden md:hidden ${
            pullRefreshVisible
              ? 'transition-opacity duration-100'
              : 'transition-[height,opacity] duration-200'
          }`}
          style={{
            height: pullRefreshRevealHeight,
            opacity: pullRefreshVisible ? 1 : 0,
          }}
          aria-hidden={!pullRefreshVisible}
        >
          <div className="flex h-full items-center justify-center gap-2 text-[11px] font-semibold text-app-text-secondary">
            {pullRefreshArmed ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-app-brand" />
            ) : (
              <ArrowUp
                className="h-3.5 w-3.5 text-app-brand transition-transform duration-150 ease-out"
                style={{
                  transform: `rotate(180deg) scale(${0.82 + pullRefreshProgress * 0.18})`,
                }}
              />
            )}
            <DashboardPullRefreshLabel label={pullRefreshLabel} />
          </div>
        </div>
        <div
          className="mx-auto flex w-full max-w-[1280px] flex-col gap-[10px] transition-transform duration-200"
        >
          <section className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0 text-right">
              <h1 className="truncate text-lg font-bold leading-tight text-app-text sm:text-xl">
                {isDashboardRefreshing ? '-' : `${dashboardGreeting}, ${dashboardUserName}`}
              </h1>
            </div>
            <div className="flex max-w-full min-w-0 items-center gap-2 overflow-x-auto no-scrollbar" dir="ltr">
              <div className="flex shrink-0 items-center gap-1">
                <DashboardToolbarToggle
                  active={state.isSystemOpen}
                  disabled={isDashboardRefreshing}
                  label={systemPowerLabel}
                  onClick={toggleSystem}
                  icon={
                    pullRefreshArmed ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Power className="h-3.5 w-3.5" />
                    )
                  }
                />
                <DashboardToolbarToggle
                  active={state.isReceivingDeliveries}
                  disabled={deliveryIntakeControlDisabled}
                  label={deliveryIntakeLabel}
                  onClick={() => dispatch({ type: 'TOGGLE_DELIVERY_INTAKE' })}
                  icon={
                    state.isReceivingDeliveries ? (
                      <PackageCheck className="h-3.5 w-3.5" />
                    ) : (
                      <PackageOpen className="h-3.5 w-3.5" />
                    )
                  }
                />
                <DashboardToolbarToggle
                  active={state.autoAssignEnabled}
                  disabled={autoAssignControlDisabled}
                  label={autoAssignLabel}
                  onClick={() => dispatch({ type: 'TOGGLE_AUTO_ASSIGN' })}
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                />
              </div>
            </div>
          </section>
          {shouldShowWorkspaceStart ? (
            <WorkspaceStartSpotlight
              area={state.workspaceArea}
              companyPhone={state.workspacePhone}
              invitedCourierCount={invitedCourierCount}
              registeredCourierCount={registeredCourierCount}
              restaurantCount={state.restaurants.length}
              sendiPlusActive={isSendiPlusOperational}
              workspaceName={state.workspaceName}
              onActivateSendiPlus={handleActivateSendiPlusFromSpotlight}
              onCreateCourier={() => navigate('/couriers?action=create-courier')}
              onDismiss={handleDismissWorkspaceStart}
              onOpenRestaurants={() => navigate('/restaurants')}
            />
          ) : null}
          <section>
            <div className={`dashboard-delivery-summary overflow-hidden rounded-none border border-app-border bg-app-surface text-right dark:border-[#252525] dark:bg-[#0A0A0A] ${dashboardCardDisabledClassName}`}>
              <button
                type="button"
                disabled={dashboardCardsDisabled}
                onClick={() => navigate(getDeliveriesStatusFilterPath(ACTIVE_DELIVERY_STATUSES))}
                className={`flex w-full min-w-0 items-center justify-between gap-3 border-b border-app-border p-2.5 text-right transition-colors sm:p-3 dark:border-[#252525] ${dashboardCardHoverClassName} ${dashboardCardInnerDisabledClassName}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-xs font-semibold text-app-text-secondary">
                    משלוחים פעילים
                  </span>
                </div>
                <div className="text-xl font-bold leading-none text-app-text sm:text-2xl">
                  <RefreshingMetricValue
                    refreshing={isDashboardRefreshing}
                    value={formatNumber(activeDeliveriesCount)}
                  />
                </div>
              </button>
              <div className="dashboard-delivery-summary__row grid grid-cols-3" dir="rtl">
              {STATUS_META.filter(
                (status) => ACTIVE_DELIVERY_STATUSES.includes(status.id),
              ).map((status) => {
                const Icon = status.icon;
                const count = statusCounts.get(status.id) ?? 0;
                const label = status.label;
                const value = formatNumber(count);
                const iconClassName = status.accentClassName;

                return (
                  <button
                    key={status.id}
                    type="button"
                    disabled={dashboardCardsDisabled}
                    onClick={() => navigate(getDeliveriesStatusFilterPath([status.id]))}
                    className={`min-w-0 p-2.5 text-right transition-colors sm:p-3 ${dashboardCardHoverClassName} ${dashboardCardInnerDisabledClassName}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[11px] font-semibold text-app-text-secondary sm:text-xs">
                        {label}
                      </span>
                      <Icon className={`h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${iconClassName}`} />
                    </div>
                    <div className="mt-2 text-xl font-bold leading-none text-app-text sm:text-2xl">
                      <RefreshingMetricValue
                        refreshing={isDashboardRefreshing}
                        value={value}
                      />
                    </div>
                  </button>
                );
              })}
              </div>
            </div>
            <div className="mt-[10px] grid grid-cols-2 gap-[10px] min-[520px]:grid-cols-6">
              <section
                aria-label="שליחים"
                aria-disabled={dashboardCardsDisabled}
                className={`dashboard-status-card relative col-span-2 min-w-0 rounded-none border border-app-border bg-app-surface p-2.5 text-right transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 sm:p-3 dark:border-[#252525] dark:bg-[#0A0A0A] min-[520px]:col-span-6 ${dashboardCardHoverClassName} ${dashboardCardDisabledClassName}`}
              >
                <div className="flex min-h-[52px] items-stretch gap-3">
                  <button
                    type="button"
                    disabled={dashboardCardsDisabled}
                    onClick={() => navigate('/couriers')}
                    className="min-w-0 flex-1 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[11px] font-semibold text-app-text-secondary sm:text-xs">
                        שליחים
                      </span>
                      <Bike className="h-3.5 w-3.5 shrink-0 text-emerald-400 sm:h-4 sm:w-4" />
                    </div>
                    <div className="mt-2 text-xl font-bold leading-none text-app-text sm:text-2xl">
                      <CourierAvailabilityValue
                        connected={connectedCouriersCount}
                        free={freeCouriersCount}
                        refreshing={isDashboardRefreshing}
                        total={state.couriers.length}
                      />
                    </div>
                  </button>
                  <div
                    className="flex shrink-0 items-center border-r border-app-border pr-3 dark:border-[#252525]"
                    data-pull-refresh-ignore="true"
                  >
                    <div className="flex items-center gap-2">
                      <span className="hidden whitespace-nowrap text-[11px] font-semibold text-app-text-secondary min-[420px]:inline">
                        שיבוץ אוטומטי
                      </span>
                      <Toggle
                        checked={state.autoAssignEnabled}
                        disabled={autoAssignControlDisabled}
                        onChange={() => dispatch({ type: 'TOGGLE_AUTO_ASSIGN' })}
                        ariaLabel={autoAssignLabel}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </section>
              <button
                type="button"
                aria-label="מסעדות"
                disabled={dashboardCardsDisabled}
                onClick={() => navigate('/restaurants')}
                className={`dashboard-status-card col-span-1 min-w-0 rounded-none border border-app-border bg-app-surface p-2.5 text-right transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 sm:p-3 dark:border-[#252525] dark:bg-[#0A0A0A] min-[520px]:col-span-3 ${dashboardCardHoverClassName} ${dashboardCardDisabledClassName}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] font-semibold text-app-text-secondary sm:text-xs">
                    מסעדות
                  </span>
                  <Store className="h-3.5 w-3.5 shrink-0 text-purple-400 sm:h-4 sm:w-4" />
                </div>
                <div className="mt-2 text-xl font-bold leading-none text-app-text sm:text-2xl">
                  <RestaurantActivityValue
                    active={activeRestaurantsCount}
                    refreshing={isDashboardRefreshing}
                    total={state.restaurants.length}
                  />
                </div>
              </button>
              <button
                type="button"
                aria-label="זמן ממוצע למשלוח"
                disabled={dashboardCardsDisabled}
                onClick={() => navigate('/deliveries')}
                className={`dashboard-status-card col-span-1 min-w-0 rounded-none border border-app-border bg-app-surface p-2.5 text-right transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 sm:p-3 dark:border-[#252525] dark:bg-[#0A0A0A] min-[520px]:col-span-3 ${dashboardCardHoverClassName} ${dashboardCardDisabledClassName}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] font-semibold text-app-text-secondary sm:text-xs">
                    זמן ממוצע למשלוח
                  </span>
                  <Timer className="h-3.5 w-3.5 shrink-0 text-cyan-400 sm:h-4 sm:w-4" />
                </div>
                <div className="mt-2 text-xl font-bold leading-none text-app-text sm:text-2xl">
                  <RefreshingMetricValue
                    refreshing={isDashboardRefreshing}
                    value={formatAverageDeliveryTime(averageDeliveryMinutes)}
                  />
                </div>
              </button>
            </div>
          </section>

          <SendiPlusCard
            deliveryZoneCount={sendiPlusDeliveryZoneCount}
            activeRestaurantCount={sendiPlusActiveRestaurantCount}
            radiusKm={sendiPlusRadiusKm}
            termsAccepted={sendiPlusTermsAccepted}
            isSystemOpen={state.isSystemOpen}
            isRefreshing={isDashboardRefreshing}
            onRadiusKmChange={handleSendiPlusRadiusChange}
            onTermsAcceptedChange={handleSendiPlusTermsAcceptedChange}
          />

          {deliveredCancelledSummary}

        </div>
      </main>
      <DeliveriesMapFab mapOpen={mapOpen} setMapOpen={setMapOpen} />
      </div>
    </>
  );
};

