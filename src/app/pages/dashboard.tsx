import React from 'react';
import { useNavigate } from 'react-router';
import CountUp from 'react-countup';
import {
  ArrowUp,
  Bike,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  PackageOpen,
  Power,
  Plus,
  Store,
  Timer,
  Truck,
  XCircle,
} from 'lucide-react';
import { AppTooltip } from '../components/common/app-tooltip';
import { Toggle } from '../components/common/toggle';
import { useDelivery } from '../context/delivery-context-value';
import { useDeliveriesMapSplit } from '../deliveries/use-deliveries-map-split';
import type { Delivery, DeliveryStatus } from '../types/delivery.types';
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

const DASHBOARD_DELIVERY_STATUSES: DeliveryStatus[] = [
  'pending',
  'assigned',
  'delivering',
  'delivered',
  'cancelled',
];
const getDeliveriesStatusFilterPath = (statuses: DeliveryStatus[]) =>
  `/deliveries?statuses=${statuses.join(',')}`;
const formatRadiusKm = formatSendiPlusRadiusKm;
const SENDI_PLUS_TERMS_TEXT =
  'מחייב עמידה בזמני משלוח של עד 60 דקות מסירה';
const SENDI_PLUS_DETAILS_OPEN_STORAGE_KEY = 'dashboard-sendi-plus-details-open';
const DASHBOARD_PULL_REFRESH_THRESHOLD = 72;
const DASHBOARD_PULL_REFRESH_MAX = 124;

const readStoredSendiPlusDetailsOpen = () => {
  if (typeof window === 'undefined') return true;

  try {
    const stored = window.localStorage.getItem(SENDI_PLUS_DETAILS_OPEN_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
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
    icon: Truck,
    accentClassName: 'text-yellow-400',
    barClassName: 'bg-yellow-500',
  },
  {
    id: 'delivering',
    label: 'במסירה',
    hint: 'שליח בדרך ללקוח',
    icon: Bike,
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

const CourierAvailabilityValue: React.FC<{
  connected: number;
  free: number;
  refreshing: boolean;
}> = ({ connected, free, refreshing }) => (
  <RefreshingMetricValue
    refreshing={refreshing}
    value={
      <span className="inline-flex items-baseline justify-end gap-1.5 leading-none">
        <span>{formatNumber(free)}</span>
        <span className="text-sm font-semibold text-app-text-muted sm:text-base">
          / {formatNumber(connected)}
        </span>
      </span>
    }
  />
);

const AnimatedMetricNumber: React.FC<{
  refreshing: boolean;
  value: number;
}> = ({ refreshing, value }) => {
  const previousValueRef = React.useRef(value);
  const previousValue = previousValueRef.current;
  const shouldAnimate = !refreshing && previousValue !== value;

  React.useEffect(() => {
    if (!refreshing) {
      previousValueRef.current = value;
    }
  }, [refreshing, value]);

  return (
    <RefreshingMetricValue
      refreshing={refreshing}
      value={
        shouldAnimate ? (
          <CountUp
            duration={0.85}
            end={value}
            formattingFn={formatNumber}
            start={previousValue}
          />
        ) : (
          formatNumber(value)
        )
      }
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
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ active, icon, label, onClick }) => (
  <AppTooltip label={label} side="bottom" sideOffset={8} className="inline-flex shrink-0">
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-haptic="light"
      data-toolbar-icon-button
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--app-radius-xs)] border text-xs font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 ${
        active
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
  isRefreshing: boolean;
  onRadiusKmChange: (value: number) => void;
  onTermsAcceptedChange: (value: boolean) => void;
}> = ({
  deliveryZoneCount,
  activeRestaurantCount,
  radiusKm,
  termsAccepted,
  isRefreshing,
  onRadiusKmChange,
  onTermsAcceptedChange,
}) => {
  const isSendiPlusEnabled = termsAccepted;
  const receivesDeliveries = canReceiveSendiPlusDeliveries(radiusKm, termsAccepted);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(readStoredSendiPlusDetailsOpen);
  const [isRadiusBubbleVisible, setIsRadiusBubbleVisible] = React.useState(false);
  const radiusBubbleHideTimeoutRef = React.useRef<number | null>(null);
  const radiusPercent = (radiusKm / MAX_SENDI_PLUS_RADIUS_KM) * 100;
  const isAccordionOpen = isDetailsOpen;
  const termsTextClassName = termsAccepted
    ? 'text-app-text-secondary'
    : 'text-app-text-muted opacity-70';
  const helperTextClassName = termsAccepted
    ? 'text-app-text-secondary'
    : 'text-app-text-muted opacity-70';
  const radiusLabelClassName = termsAccepted
    ? 'text-app-text-secondary'
    : 'text-app-text-muted opacity-70';
  const selectedRadiusText = `${formatRadiusKm(radiusKm)} ק״מ`;
  const termsSummaryText =
    termsAccepted && !isAccordionOpen
      ? `עד 60 דקות מסירה · ${
          receivesDeliveries ? `רדיוס עד ${selectedRadiusText}` : 'רדיוס כבוי'
        }`
      : SENDI_PLUS_TERMS_TEXT;
  const radiusHelperText = !termsAccepted
    ? 'הפעל את המתג למטה כדי לפתוח קבלת משלוחי סנדי פלוס, ואז בחר רדיוס שירות.'
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
    if (!termsAccepted) return;

    onRadiusKmChange(Number(event.currentTarget.value));
    showRadiusBubble();
    hideRadiusBubble(900);
  };
  const toggleDetailsOpen = React.useCallback(() => {
    setIsDetailsOpen((value) => {
      const nextValue = !value;

      try {
        window.localStorage.setItem(
          SENDI_PLUS_DETAILS_OPEN_STORAGE_KEY,
          String(nextValue),
        );
      } catch {
        // If storage is unavailable, the in-memory state still reflects the choice.
      }

      return nextValue;
    });
  }, []);

  React.useEffect(() => clearRadiusBubbleHideTimeout, [clearRadiusBubbleHideTimeout]);

  return (
    <section className="rounded-[8px] border border-app-border bg-app-surface dark:border-[#252525] dark:bg-[#0A0A0A]">
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3" dir="ltr">
        <button
          type="button"
          data-haptic="selection"
          onClick={toggleDetailsOpen}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/30 dark:hover:bg-[#1f1f1f]"
          aria-label={isAccordionOpen ? 'סגור פרטי סנדי פלוס' : 'פתח פרטי סנדי פלוס'}
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
                <span className={isSendiPlusEnabled ? '' : 'sendi-plus-label__word--off'}>
                  סנדי
                </span>
                <span
                  className={`sendi-plus-label__plus ${
                    isSendiPlusEnabled ? '' : 'sendi-plus-label__plus--off'
                  }`}
                >
                  פלוס
                </span>
              </span>
              <span
                className={`sendi-plus-mark ${
                  isSendiPlusEnabled ? 'sendi-plus-mark--active' : 'sendi-plus-mark--off'
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
                disabled={!termsAccepted}
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

      <div className="border-t border-app-border px-3 py-2 sm:px-4 dark:border-[#252525]" dir="rtl">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className={`min-w-0 truncate text-xs font-normal ${termsTextClassName}`}>
            {termsSummaryText}
          </span>
          <Toggle
            checked={termsAccepted}
            onChange={() => onTermsAcceptedChange(!termsAccepted)}
            ariaLabel="אישור תנאי סנדי פלוס"
          />
        </div>
      </div>
    </section>
  );
};

export const Dashboard: React.FC = () => {
  const { state, dispatch, toggleSystem } = useDelivery();
  const navigate = useNavigate();
  const todayDateKey = React.useMemo(() => toDateInputValue(new Date()), []);
  const [sendiPlusRadiusKm, setSendiPlusRadiusKm] = React.useState(readStoredSendiPlusRadius);
  const [sendiPlusTermsAccepted, setSendiPlusTermsAccepted] = React.useState(readStoredSendiPlusTermsAccepted);
  const [deliveryZoneConfigVersion, setDeliveryZoneConfigVersion] = React.useState(0);
  const [dashboardRefreshVersion, setDashboardRefreshVersion] = React.useState(0);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isPullRefreshReady, setIsPullRefreshReady] = React.useState(false);
  const [isDashboardRefreshing, setIsDashboardRefreshing] = React.useState(false);
  const mainScrollRef = React.useRef<HTMLElement | null>(null);
  const pullStartYRef = React.useRef<number | null>(null);
  const pullThresholdHapticPlayedRef = React.useRef(false);
  const pullRefreshTriggeredRef = React.useRef(false);
  const pullRefreshTouchActiveRef = React.useRef(false);
  const isDashboardRefreshingRef = React.useRef(false);
  const pullRefreshResetTimeoutRef = React.useRef<number | null>(null);
  const dashboardRefreshTimeoutRef = React.useRef<number | null>(null);
  const pullRefreshHapticButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const isMobilePullRefreshPointer = React.useCallback(() => {
    if (typeof window === 'undefined') return false;

    return window.matchMedia('(pointer: coarse), (hover: none), (max-width: 767px)').matches;
  }, []);

  const completePullRefreshReset = React.useCallback(() => {
    setPullDistance(0);
    setIsPullRefreshReady(false);
    pullStartYRef.current = null;
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

  const runDashboardRefresh = React.useCallback(() => {
    if (isDashboardRefreshingRef.current || pullRefreshTriggeredRef.current) return;

    pullRefreshTriggeredRef.current = true;
    isDashboardRefreshingRef.current = true;
    setPullDistance(DASHBOARD_PULL_REFRESH_THRESHOLD);
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
    }, 650);
  }, [resetPullRefresh]);

  React.useEffect(() => () => {
    if (pullRefreshResetTimeoutRef.current !== null) {
      window.clearTimeout(pullRefreshResetTimeoutRef.current);
    }
    if (dashboardRefreshTimeoutRef.current !== null) {
      window.clearTimeout(dashboardRefreshTimeoutRef.current);
    }
  }, []);

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
    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    pullThresholdHapticPlayedRef.current = false;
  }, [isMobilePullRefreshPointer]);

  const handlePullRefreshTouchMove = React.useCallback((event: React.TouchEvent<HTMLElement>) => {
    const startY = pullStartYRef.current;
    if (startY === null) return;

    const scrollTarget = event.currentTarget as HTMLElement;
    if (scrollTarget.scrollTop > 0 && !pullRefreshTriggeredRef.current) {
      resetPullRefresh();
      return;
    }

    const currentY = event.touches[0]?.clientY ?? startY;
    const rawDistance = currentY - startY;
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

    if (pullRefreshTriggeredRef.current) {
      setPullDistance(DASHBOARD_PULL_REFRESH_THRESHOLD);
      setIsPullRefreshReady(true);
      return;
    }

    const easedDistance = Math.min(
      DASHBOARD_PULL_REFRESH_MAX,
      Math.round(rawDistance * 0.58),
    );
    const nextDistance = easedDistance;
    const nextReady = nextDistance >= DASHBOARD_PULL_REFRESH_THRESHOLD;

    setPullDistance(nextDistance);
    setIsPullRefreshReady(nextReady);

    if (nextReady && !pullThresholdHapticPlayedRef.current) {
      pullThresholdHapticPlayedRef.current = true;
      playPullRefreshThresholdHaptic();
      runDashboardRefresh();
    }
  }, [playPullRefreshThresholdHaptic, resetPullRefresh, runDashboardRefresh]);

  const handlePullRefreshTouchEnd = React.useCallback(() => {
    pullRefreshTouchActiveRef.current = false;

    if (pullRefreshTriggeredRef.current || isDashboardRefreshingRef.current) {
      resetPullRefresh();
      return;
    }

    resetPullRefresh();
  }, [resetPullRefresh]);

  React.useEffect(() => {
    if (!sendiPlusTermsAccepted) return;

    writeStoredSendiPlusRadius(sendiPlusRadiusKm);
  }, [sendiPlusRadiusKm, sendiPlusTermsAccepted]);

  React.useEffect(() => {
    if (!sendiPlusTermsAccepted) {
      setSendiPlusRadiusKm(DEFAULT_SENDI_PLUS_RADIUS_KM);
    }

    writeStoredSendiPlusTermsAccepted(sendiPlusTermsAccepted);
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
    setSendiPlusTermsAccepted(value);

    if (!value) {
      setSendiPlusRadiusKm(DEFAULT_SENDI_PLUS_RADIUS_KM);
    }
  }, []);

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

  const sendiPlusDeliveryZones = React.useMemo(
    () => loadStoredDeliveryServiceAreas(),
    [dashboardRefreshVersion, deliveryZoneConfigVersion],
  );
  const sendiPlusDeliveryZoneCount = React.useMemo(
    () => sendiPlusDeliveryZones.filter(isDeliveryZoneActive).length,
    [dashboardRefreshVersion, sendiPlusDeliveryZones],
  );
  const sendiPlusActiveRestaurantCount = React.useMemo(
    () =>
      state.restaurants.filter(
        (restaurant) =>
          isRestaurantActiveForDisplay(restaurant, sendiPlusTermsAccepted) &&
          isSendiPlusRestaurant(restaurant.name, restaurant.chainId) &&
          Number.isFinite(restaurant.lat) &&
          Number.isFinite(restaurant.lng) &&
          isPointCoveredByActiveDeliveryZones(
            { lat: restaurant.lat, lng: restaurant.lng },
            sendiPlusDeliveryZones,
          ),
      ).length,
    [dashboardRefreshVersion, sendiPlusDeliveryZones, sendiPlusTermsAccepted, state.restaurants],
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
    sendiPlusTermsAccepted ? sendiPlusRestaurantsForDashboardCount : 0
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
  const { mapSplitPortal } = useDeliveriesMapSplit({
    deliveries: filteredDeliveries,
    couriers: state.couriers,
    restaurants: state.restaurants,
    routeStopOrders: state.courierRoutePlans,
  });
  const pullRefreshProgress = Math.min(1, pullDistance / DASHBOARD_PULL_REFRESH_THRESHOLD);
  const pullRefreshVisible = pullDistance > 0;
  const pullRefreshArmed = isDashboardRefreshing || isPullRefreshReady;
  const pullRefreshRevealHeight = Math.min(64, Math.round(pullDistance * 0.58));
  const pullRefreshLabel = isDashboardRefreshing
    ? 'מרענן'
    : isPullRefreshReady
    ? ''
    : 'משוך לרענון';

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
          className="mx-auto w-full max-w-[1280px] overflow-hidden transition-[height,opacity] duration-200 md:hidden"
          style={{
            height: pullRefreshRevealHeight,
            opacity: pullRefreshVisible ? 1 : 0,
          }}
          aria-hidden={!pullRefreshVisible}
        >
          <div className="flex h-full items-center justify-center gap-2 text-[11px] font-semibold text-app-text-secondary">
            <ArrowUp
              className="h-3.5 w-3.5 text-app-brand transition-transform duration-300 ease-out"
              style={{
                transform: `rotate(${pullRefreshArmed ? 0 : 180}deg) scale(${0.82 + pullRefreshProgress * 0.18})`,
              }}
            />
            <DashboardPullRefreshLabel label={pullRefreshLabel} />
          </div>
        </div>
        <div
          className="mx-auto flex w-full max-w-[1280px] flex-col gap-[10px] transition-transform duration-200"
        >
          <section className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0 text-right">
              <h1 className="truncate text-lg font-bold leading-tight text-app-text sm:text-xl">
                {isDashboardRefreshing ? '-' : `${dashboardGreeting}, אלכס`}
              </h1>
            </div>
            <div className="flex max-w-full min-w-0 items-center gap-2 overflow-x-auto no-scrollbar" dir="ltr">
              <div className="flex shrink-0 items-center gap-1">
                <DashboardToolbarToggle
                  active={state.isSystemOpen}
                  label={state.isSystemOpen ? 'מערכת פתוחה' : 'מערכת סגורה'}
                  onClick={isDashboardRefreshing ? () => undefined : toggleSystem}
                  icon={
                    pullRefreshArmed ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Power className="h-3.5 w-3.5" />
                    )
                  }
                />
              </div>
            </div>
          </section>
          <section>
            <div className="dashboard-delivery-summary overflow-hidden rounded-[8px] border border-app-border bg-app-surface text-right dark:border-[#252525] dark:bg-[#0A0A0A]">
              <div className="dashboard-delivery-summary__row grid grid-cols-3" dir="rtl">
              {STATUS_META.filter(
                (status) =>
                  DASHBOARD_DELIVERY_STATUSES.includes(status.id) &&
                  status.id !== 'delivered' &&
                  status.id !== 'cancelled',
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
                    onClick={() => navigate(getDeliveriesStatusFilterPath([status.id]))}
                    className="min-w-0 p-2.5 text-right transition-colors hover:bg-app-surface-raised sm:p-3 dark:hover:bg-[#111111]"
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
              <div className="dashboard-delivery-summary__row dashboard-delivery-summary__status-row grid grid-cols-2" dir="rtl">
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
                    onClick={() => navigate(getDeliveriesStatusFilterPath([statusId]))}
                    className="min-w-0 p-2.5 text-right transition-colors hover:bg-app-surface-raised sm:p-3 dark:hover:bg-[#111111]"
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
                className="dashboard-status-card relative col-span-2 min-w-0 rounded-[8px] border border-app-border bg-app-surface p-2.5 text-right transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 sm:p-3 dark:border-[#252525] dark:bg-[#0A0A0A] dark:hover:bg-[#111111] min-[520px]:col-span-6"
              >
                <div className="flex min-h-[52px] items-stretch">
                  <button
                    type="button"
                    onClick={() => navigate('/couriers')}
                    className="min-w-0 flex-1 pl-[7.5rem] text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-[11px] font-semibold text-app-text-secondary sm:text-xs">
                        שליחים
                      </span>
                    </div>
                    <div className="mt-2 text-xl font-bold leading-none text-app-text sm:text-2xl">
                      <CourierAvailabilityValue
                        connected={connectedCouriersCount}
                        free={freeCouriersCount}
                        refreshing={isDashboardRefreshing}
                      />
                    </div>
                  </button>
                  <div dir="ltr" className="absolute left-2.5 top-1/2 flex h-[52px] min-w-[6.75rem] -translate-y-1/2 flex-col items-start justify-between py-0.5 sm:left-3">
                    <span className="max-w-[7.5rem] truncate text-left text-[11px] font-semibold leading-none text-app-text-secondary sm:text-xs">
                      שיבוץ אוטומטי
                    </span>
                    <Toggle
                      checked={state.autoAssignEnabled}
                      disabled={isDashboardRefreshing}
                      ariaLabel="שיבוץ אוטומטי"
                      size="sm"
                      onChange={
                        isDashboardRefreshing
                          ? () => undefined
                          : () => dispatch({ type: 'TOGGLE_AUTO_ASSIGN' })
                      }
                    />
                  </div>
                </div>
              </section>
              <button
                type="button"
                aria-label="מסעדות פעילות"
                onClick={() => navigate('/restaurants')}
                className="dashboard-status-card col-span-1 min-w-0 rounded-[8px] border border-app-border bg-app-surface p-2.5 text-right transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 sm:p-3 dark:border-[#252525] dark:bg-[#0A0A0A] dark:hover:bg-[#111111] min-[520px]:col-span-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] font-semibold text-app-text-secondary sm:text-xs">
                    מסעדות פעילות
                  </span>
                  <Store className="h-3.5 w-3.5 shrink-0 text-purple-400 sm:h-4 sm:w-4" />
                </div>
                <div className="mt-2 text-xl font-bold leading-none text-app-text sm:text-2xl">
                  <AnimatedMetricNumber
                    refreshing={isDashboardRefreshing}
                    value={activeRestaurantsCount}
                  />
                </div>
              </button>
              <button
                type="button"
                aria-label="זמן ממוצע למשלוח"
                onClick={() => navigate('/deliveries')}
                className="dashboard-status-card col-span-1 min-w-0 rounded-[8px] border border-app-border bg-app-surface p-2.5 text-right transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 sm:p-3 dark:border-[#252525] dark:bg-[#0A0A0A] dark:hover:bg-[#111111] min-[520px]:col-span-3"
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
            isRefreshing={isDashboardRefreshing}
            onRadiusKmChange={handleSendiPlusRadiusChange}
            onTermsAcceptedChange={handleSendiPlusTermsAcceptedChange}
          />
        </div>
      </main>
      </div>
    </>
  );
};
