import React from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowUp,
  Bike,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  Map as MapIcon,
  MoreHorizontal,
  PackageOpen,
  Power,
  Plus,
  Settings,
  Timer,
  Truck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { ToolbarIconButton } from '../components/common/toolbar-icon-button';
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
const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = ['pending', 'assigned', 'delivering'];
const formatRadiusKm = formatSendiPlusRadiusKm;
const SENDI_PLUS_TERMS_TEXT =
  'הפעלת המתג מחייבת עמידה בזמני משלוח של עד 60 דקות מסירה';
const DASHBOARD_PULL_REFRESH_THRESHOLD = 48;
const DASHBOARD_PULL_REFRESH_MAX = 92;

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

const formatAverageDeliveryTime = (minutes: number | null) =>
  minutes === null ? '—' : `${formatNumber(minutes)} דק׳`;

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
  <div className="relative flex h-10 shrink-0 items-center justify-center">
    <ToolbarIconButton
      active={active}
      aria-pressed={active}
      label={label}
      title={label}
      onClick={onClick}
    >
      <span
        className={`flex items-center justify-center transition-transform ${
          active ? '-translate-y-1' : 'translate-y-0'
        }`}
      >
        {icon}
      </span>
    </ToolbarIconButton>
    <span
      className={`pointer-events-none absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-app-nav-indicator transition-opacity ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    />
  </div>
);

const SendiPlusCard: React.FC<{
  deliveryZoneCount: number;
  activeRestaurantCount: number;
  radiusKm: number;
  termsAccepted: boolean;
  onRadiusKmChange: (value: number) => void;
  onTermsAcceptedChange: (value: boolean) => void;
  onManageZones: () => void;
  onInspectRestaurantCoverage: () => void;
}> = ({
  deliveryZoneCount,
  activeRestaurantCount,
  radiusKm,
  termsAccepted,
  onRadiusKmChange,
  onTermsAcceptedChange,
  onManageZones,
  onInspectRestaurantCoverage,
}) => {
  const isSendiPlusEnabled = termsAccepted;
  const receivesDeliveries = canReceiveSendiPlusDeliveries(radiusKm, termsAccepted);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isRadiusBubbleVisible, setIsRadiusBubbleVisible] = React.useState(false);
  const radiusBubbleHideTimeoutRef = React.useRef<number | null>(null);
  const radiusPercent = (radiusKm / MAX_SENDI_PLUS_RADIUS_KM) * 100;
  const radiusDisplay = `${formatRadiusKm(radiusKm)} ק״מ`;
  const secondaryTextClassName = isSendiPlusEnabled
    ? 'text-app-text-secondary'
    : 'text-app-text-muted opacity-70';
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

  React.useEffect(() => clearRadiusBubbleHideTimeout, [clearRadiusBubbleHideTimeout]);

  React.useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <section className="rounded-[8px] border border-app-border bg-app-surface dark:border-[#252525] dark:bg-[#0A0A0A]">
      <div className="flex items-center gap-3 px-3 py-3 sm:px-4 sm:py-3.5" dir="ltr">
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            data-haptic="medium"
            onClick={() => setIsMenuOpen((value) => !value)}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/30 dark:hover:bg-[#1f1f1f] ${
              isSendiPlusEnabled ? 'text-app-text-secondary' : 'text-app-text-muted opacity-70'
            }`}
            aria-label="אפשרויות סנדי פלוס"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isMenuOpen ? (
            <div
              role="menu"
              className="absolute left-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-[7px] border border-app-border bg-app-surface py-1 text-right shadow-[var(--app-shadow-panel)] dark:border-[#252525] dark:bg-[#0A0A0A]"
              dir="rtl"
            >
              <button
                type="button"
                role="menuitem"
                data-haptic="selection"
                onClick={() => {
                  setIsMenuOpen(false);
                  onManageZones();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-medium text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
              >
                <MapIcon className="h-3.5 w-3.5 shrink-0" />
                <span>מפת אזורי חלוקה</span>
              </button>
              <button
                type="button"
                role="menuitem"
                data-haptic="selection"
                onClick={() => {
                  setIsMenuOpen(false);
                  onInspectRestaurantCoverage();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-medium text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span>מסעדות בתחום</span>
              </button>
            </div>
          ) : null}
        </div>

        <div className="ml-auto min-w-0 text-right" dir="rtl">
          <div
            className="ml-auto flex w-fit max-w-full items-center gap-1.5"
            aria-label={isSendiPlusEnabled ? 'סנדי פלוס פעיל' : 'סנדי פלוס כבוי'}
          >
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
          </div>
          <div className={`mt-1 truncate text-sm font-normal ${secondaryTextClassName}`}>
            {receivesDeliveries
              ? `בתוך אזורי החלוקה עד ${radiusDisplay}`
              : isSendiPlusEnabled
                ? 'כרגע לא מקבל משלוחים'
                : 'משלוחים לפי טווח במחיר מובטח'}
          </div>
        </div>
      </div>

      <div
        className={`sendi-plus-accordion ${
          termsAccepted ? 'sendi-plus-accordion--open' : ''
        }`}
        aria-hidden={!termsAccepted}
      >
        <div className="sendi-plus-accordion__inner">
          <div className="border-t border-app-border px-3 pb-4 pt-8 sm:px-4 dark:border-[#252525]">
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
                className={`sendi-plus-radius-slider h-9 w-full cursor-pointer ${
                  receivesDeliveries ? 'sendi-plus-radius-slider--active' : 'sendi-plus-radius-slider--off'
                }`}
                dir="rtl"
                style={sliderStyle}
              />
              <div className="relative mt-2 h-4 text-[11px] text-app-text-secondary" dir="rtl">
                <span className="absolute right-0 top-0 whitespace-nowrap text-right">
                  {receivesDeliveries ? '0 ק״מ' : 'כבוי'}
                </span>
                <span className="absolute right-[25%] top-0 translate-x-1/2 whitespace-nowrap text-center">
                  5 ק״מ
                </span>
                <span className="absolute right-1/2 top-0 translate-x-1/2 whitespace-nowrap text-center">
                  10 ק״מ
                </span>
                <span className="absolute right-[75%] top-0 translate-x-1/2 whitespace-nowrap text-center">
                  15 ק״מ
                </span>
                <span className="absolute left-0 top-0 whitespace-nowrap text-left">
                  20+ ק״מ
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 sm:px-4">
            <div className="border-t border-app-border py-2.5 sm:py-3 dark:border-[#252525]">
              <div className="grid grid-cols-2 gap-4 text-right" dir="rtl">
                <div className="min-w-0">
                  <div className="truncate text-[11px] text-app-text-secondary">מסעדות בתחום</div>
                  <div className="mt-1 truncate text-sm font-semibold text-app-text">
                    {activeRestaurantCount.toLocaleString('he-IL')}
                  </div>
                </div>
                <div className="min-w-0 border-r border-app-border pr-4 dark:border-[#252525]">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] text-app-text-secondary">אזורי חלוקה</div>
                      <div className="mt-1 truncate text-sm font-semibold text-app-text">
                        {deliveryZoneCount.toLocaleString('he-IL')}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-haptic="selection"
                      onClick={onManageZones}
                      disabled={!termsAccepted}
                      tabIndex={termsAccepted ? 0 : -1}
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/30 dark:hover:bg-[#1f1f1f] ${
                        termsAccepted ? 'text-app-text-secondary' : 'text-app-text-muted opacity-70'
                      }`}
                      aria-label="ניהול אזורי חלוקה"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-app-border px-3 py-2.5 sm:px-4 dark:border-[#252525]" dir="rtl">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className={`min-w-0 truncate text-xs font-normal ${secondaryTextClassName}`}>
            {SENDI_PLUS_TERMS_TEXT}
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
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isPullRefreshReady, setIsPullRefreshReady] = React.useState(false);
  const [isDashboardRefreshing, setIsDashboardRefreshing] = React.useState(false);
  const mainScrollRef = React.useRef<HTMLElement | null>(null);
  const pullStartYRef = React.useRef<number | null>(null);
  const pullThresholdHapticPlayedRef = React.useRef(false);
  const pullRefreshResetTimeoutRef = React.useRef<number | null>(null);
  const dashboardRefreshTimeoutRef = React.useRef<number | null>(null);

  const isMobilePullRefreshPointer = React.useCallback(() => {
    if (typeof window === 'undefined') return false;

    return window.matchMedia('(pointer: coarse), (hover: none), (max-width: 767px)').matches;
  }, []);

  const resetPullRefresh = React.useCallback((delay = 0) => {
    if (typeof window === 'undefined') {
      setPullDistance(0);
      setIsPullRefreshReady(false);
      return;
    }

    if (pullRefreshResetTimeoutRef.current !== null) {
      window.clearTimeout(pullRefreshResetTimeoutRef.current);
      pullRefreshResetTimeoutRef.current = null;
    }

    pullRefreshResetTimeoutRef.current = window.setTimeout(() => {
      setPullDistance(0);
      setIsPullRefreshReady(false);
      pullStartYRef.current = null;
      pullThresholdHapticPlayedRef.current = false;
      pullRefreshResetTimeoutRef.current = null;
    }, delay);
  }, []);

  const runDashboardRefresh = React.useCallback(() => {
    if (isDashboardRefreshing) return;

    setIsDashboardRefreshing(true);
    playHaptic('success', { force: true });
    setDeliveryZoneConfigVersion((version) => version + 1);
    setSendiPlusRadiusKm(readStoredSendiPlusRadius());
    setSendiPlusTermsAccepted(readStoredSendiPlusTermsAccepted());

    if (dashboardRefreshTimeoutRef.current !== null) {
      window.clearTimeout(dashboardRefreshTimeoutRef.current);
    }

    dashboardRefreshTimeoutRef.current = window.setTimeout(() => {
      setIsDashboardRefreshing(false);
      resetPullRefresh(140);
      dashboardRefreshTimeoutRef.current = null;
    }, 650);
  }, [isDashboardRefreshing, resetPullRefresh]);

  React.useEffect(() => () => {
    if (pullRefreshResetTimeoutRef.current !== null) {
      window.clearTimeout(pullRefreshResetTimeoutRef.current);
    }
    if (dashboardRefreshTimeoutRef.current !== null) {
      window.clearTimeout(dashboardRefreshTimeoutRef.current);
    }
  }, []);

  const handlePullRefreshTouchStart = React.useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (isDashboardRefreshing || !isMobilePullRefreshPointer()) return;
    if ((event.currentTarget as HTMLElement).scrollTop > 0) return;

    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    pullThresholdHapticPlayedRef.current = false;
  }, [isDashboardRefreshing, isMobilePullRefreshPointer]);

  const handlePullRefreshTouchMove = React.useCallback((event: React.TouchEvent<HTMLElement>) => {
    const startY = pullStartYRef.current;
    if (startY === null || isDashboardRefreshing) return;

    const scrollTarget = event.currentTarget as HTMLElement;
    if (scrollTarget.scrollTop > 0) {
      resetPullRefresh();
      return;
    }

    const currentY = event.touches[0]?.clientY ?? startY;
    const rawDistance = currentY - startY;
    if (rawDistance <= 0) {
      setPullDistance(0);
      setIsPullRefreshReady(false);
      return;
    }

    event.preventDefault();

    const easedDistance = Math.min(
      DASHBOARD_PULL_REFRESH_MAX,
      Math.round(rawDistance * 0.58),
    );
    const nextReady = easedDistance >= DASHBOARD_PULL_REFRESH_THRESHOLD;

    setPullDistance(easedDistance);
    setIsPullRefreshReady(nextReady);

    if (nextReady && !pullThresholdHapticPlayedRef.current) {
      pullThresholdHapticPlayedRef.current = true;
      playHaptic('success', { force: true });
    }
  }, [isDashboardRefreshing, resetPullRefresh]);

  const handlePullRefreshTouchEnd = React.useCallback(() => {
    if (isDashboardRefreshing) return;

    if (isPullRefreshReady) {
      setPullDistance(DASHBOARD_PULL_REFRESH_THRESHOLD);
      runDashboardRefresh();
      return;
    }

    resetPullRefresh();
  }, [isDashboardRefreshing, isPullRefreshReady, resetPullRefresh, runDashboardRefresh]);

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
    [todayDateKey, state.deliveries],
  );

  const filteredDeliveries = dateDeliveries;

  const statusCounts = React.useMemo(() => {
    const counts = new Map<DeliveryStatus, number>();
    STATUS_META.forEach((status) => counts.set(status.id, 0));
    filteredDeliveries.forEach((delivery) => {
      counts.set(delivery.status, (counts.get(delivery.status) ?? 0) + 1);
    });
    return counts;
  }, [filteredDeliveries]);

  const sendiPlusDeliveryZones = React.useMemo(
    () => loadStoredDeliveryServiceAreas(),
    [deliveryZoneConfigVersion],
  );
  const sendiPlusDeliveryZoneCount = React.useMemo(
    () => sendiPlusDeliveryZones.filter(isDeliveryZoneActive).length,
    [sendiPlusDeliveryZones],
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
    [sendiPlusDeliveryZones, sendiPlusTermsAccepted, state.restaurants],
  );
  const connectedCouriersCount = React.useMemo(
    () => state.couriers.filter((courier) => courier.status !== 'offline').length,
    [state.couriers],
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
  }, [state.couriers, state.deliveries]);
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
    return Math.round(totalMinutes / deliveryDurations.length);
  }, [filteredDeliveries]);
  const activeDeliveriesCount = React.useMemo(
    () => filteredDeliveries.filter((delivery) => ACTIVE_DELIVERY_STATUSES.includes(delivery.status)).length,
    [filteredDeliveries],
  );
  const { mapSplitPortal } = useDeliveriesMapSplit({
    deliveries: filteredDeliveries,
    couriers: state.couriers,
    restaurants: state.restaurants,
    routeStopOrders: state.courierRoutePlans,
  });
  const pullRefreshProgress = Math.min(1, pullDistance / DASHBOARD_PULL_REFRESH_THRESHOLD);
  const pullRefreshVisible = pullDistance > 0 || isDashboardRefreshing;
  const pullRefreshArmed = isDashboardRefreshing || isPullRefreshReady;
  const pullRefreshRevealHeight = isDashboardRefreshing
    ? 44
    : Math.min(54, Math.round(pullDistance * 0.58));
  const pullRefreshLabel = isDashboardRefreshing
    ? 'מרענן'
    : isPullRefreshReady
    ? 'שחרר לרענון'
    : 'משוך לרענון';

  return (
    <>
      {mapSplitPortal}
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-app-background text-app-text" dir="rtl">
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
              className="h-3.5 w-3.5 text-app-brand transition-transform duration-200"
              style={{
                transform: `rotate(${pullRefreshArmed ? 0 : 180}deg) scale(${0.82 + pullRefreshProgress * 0.18})`,
              }}
            />
            <span>{pullRefreshLabel}</span>
          </div>
        </div>
        <div
          className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 transition-transform duration-200"
        >
          <section className="flex w-full items-center justify-end gap-2">
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
                <DashboardToolbarToggle
                  active={state.autoAssignEnabled}
                  label="שיבוץ אוטומטי"
                  onClick={() => dispatch({ type: 'TOGGLE_AUTO_ASSIGN' })}
                  icon={<Bot className="h-3.5 w-3.5" />}
                />
              </div>
            </div>
          </section>
          <section>
            <div className="mb-2 grid grid-cols-2 gap-2 min-[520px]:grid-cols-6">
              <button
                type="button"
                onClick={() => navigate('/deliveries')}
                className="dashboard-status-card col-span-2 min-w-0 rounded-[8px] border border-app-border bg-app-surface p-2.5 text-right transition-colors hover:border-app-border hover:bg-app-surface-raised sm:p-3 dark:border-[#252525] dark:bg-[#0A0A0A] min-[520px]:col-span-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] font-semibold text-app-text-secondary sm:text-xs">
                    משלוחים פעילים
                  </span>
                  <PackageOpen className="h-3.5 w-3.5 shrink-0 text-app-brand sm:h-4 sm:w-4" />
                </div>
                <div className="mt-2 text-xl font-bold leading-none text-app-text sm:text-2xl">
                  {formatNumber(activeDeliveriesCount)}
                </div>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-6">
              {STATUS_META.filter((status) => DASHBOARD_DELIVERY_STATUSES.includes(status.id)).map((status) => {
                const isCourierAvailabilityCard = status.id === 'delivered';
                const isAverageDeliveryTimeCard = status.id === 'cancelled';
                const Icon = isCourierAvailabilityCard ? UserCheck : isAverageDeliveryTimeCard ? Timer : status.icon;
                const count = statusCounts.get(status.id) ?? 0;
                const statusSpanClassName =
                  status.id === 'cancelled'
                    ? 'col-span-2 min-[520px]:col-span-3'
                    : status.id === 'delivered'
                    ? 'col-span-1 min-[520px]:col-span-3'
                    : 'col-span-1 min-[520px]:col-span-2';
                const label = isCourierAvailabilityCard
                  ? 'שליחים פנויים'
                  : isAverageDeliveryTimeCard
                  ? 'זמן ממוצע למשלוח'
                  : status.label;
                const value = isCourierAvailabilityCard
                  ? `${formatNumber(freeCouriersCount)} / ${formatNumber(connectedCouriersCount)}`
                  : isAverageDeliveryTimeCard
                  ? formatAverageDeliveryTime(averageDeliveryMinutes)
                  : formatNumber(count);
                const iconClassName = isCourierAvailabilityCard
                  ? 'text-[#0a84ff]'
                  : isAverageDeliveryTimeCard
                  ? 'text-cyan-400'
                  : status.accentClassName;

                return (
                  <button
                    key={status.id}
                    type="button"
                    onClick={() => navigate(isCourierAvailabilityCard ? '/couriers' : '/deliveries')}
                    className={`dashboard-status-card min-w-0 rounded-[8px] border border-app-border bg-app-surface p-2.5 text-right transition-colors hover:border-app-border hover:bg-app-surface-raised sm:p-3 dark:border-[#252525] dark:bg-[#0A0A0A] ${statusSpanClassName}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[11px] font-semibold text-app-text-secondary sm:text-xs">
                        {label}
                      </span>
                      <Icon className={`h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${iconClassName}`} />
                    </div>
                    <div className="mt-2 text-xl font-bold leading-none text-app-text sm:text-2xl">
                      {value}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <SendiPlusCard
            deliveryZoneCount={sendiPlusDeliveryZoneCount}
            activeRestaurantCount={sendiPlusActiveRestaurantCount}
            radiusKm={sendiPlusRadiusKm}
            termsAccepted={sendiPlusTermsAccepted}
            onRadiusKmChange={handleSendiPlusRadiusChange}
            onTermsAcceptedChange={handleSendiPlusTermsAcceptedChange}
            onManageZones={() => navigate('/zones?source=sendi-plus')}
            onInspectRestaurantCoverage={() => navigate('/zones?source=sendi-plus&tab=permissions')}
          />
        </div>
      </main>
      </div>
    </>
  );
};
