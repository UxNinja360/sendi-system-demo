import React from 'react';
import { useNavigate } from 'react-router';
import {
  Bike,
  CheckCircle2,
  Clock3,
  Map as MapIcon,
  PackageOpen,
  Power,
  Plus,
  Timer,
  Truck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { PageToolbar } from '../components/common/page-toolbar';
import { ToolbarDayPicker } from '../components/common/toolbar-date-picker';
import { ToolbarIconButton } from '../components/common/toolbar-icon-button';
import { useDelivery } from '../context/delivery-context-value';
import { useDeliveriesMapSplit } from '../deliveries/use-deliveries-map-split';
import type { Delivery, DeliveryStatus } from '../types/delivery.types';
import { canCourierAcceptDelivery } from '../utils/courier-assignment';
import {
  MAX_SENDI_PLUS_RADIUS_KM,
  SENDI_PLUS_LABEL,
  canReceiveSendiPlusDeliveries,
  clampSendiPlusRadius,
  formatSendiPlusRadiusKm,
  isSendiPlusRestaurant,
  readStoredSendiPlusRadius,
  writeStoredSendiPlusRadius,
} from '../utils/sendi-plus';

const DASHBOARD_DELIVERY_STATUSES: DeliveryStatus[] = [
  'pending',
  'assigned',
  'delivering',
  'delivered',
  'cancelled',
];
const formatRadiusKm = formatSendiPlusRadiusKm;

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
    label: 'ממתין לשיבוץ',
    hint: 'משלוחים שצריכים שליח',
    icon: Clock3,
    accentClassName: 'text-orange-400',
    barClassName: 'bg-orange-500',
  },
  {
    id: 'assigned',
    label: 'משובץ',
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

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('he-IL');

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
  activeAreaCount: number;
  radiusKm: number;
  onRadiusKmChange: (value: number) => void;
  onManageZones: () => void;
}> = ({
  activeAreaCount,
  radiusKm,
  onRadiusKmChange,
  onManageZones,
}) => {
  const receivesDeliveries = canReceiveSendiPlusDeliveries(radiusKm);
  const [isRadiusBubbleVisible, setIsRadiusBubbleVisible] = React.useState(false);
  const radiusBubbleHideTimeoutRef = React.useRef<number | null>(null);
  const radiusPercent = (radiusKm / MAX_SENDI_PLUS_RADIUS_KM) * 100;
  const radiusDisplay = `${formatRadiusKm(radiusKm)} ק״מ`;
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
    onRadiusKmChange(Number(event.currentTarget.value));
    showRadiusBubble();
    hideRadiusBubble(900);
  };

  React.useEffect(() => clearRadiusBubbleHideTimeout, [clearRadiusBubbleHideTimeout]);

  return (
    <section className="rounded-[8px] border border-app-border bg-app-surface p-2.5 sm:p-3 dark:border-app-nav-border dark:bg-[#080808]">
      <div className="flex items-start gap-3" dir="ltr">
        <button
          type="button"
          onClick={onManageZones}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] px-2 text-xs font-semibold text-[#0a84ff] transition-colors hover:bg-app-surface-raised"
          dir="rtl"
        >
          <MapIcon className="h-3.5 w-3.5" />
          ניהול אזורים
        </button>

        <div className="ml-auto min-w-0 text-right" dir="rtl">
          <div
            className="ml-auto flex w-fit max-w-full items-center gap-1.5"
            aria-label={receivesDeliveries ? 'סנדי פלוס פעיל' : 'סנדי פלוס כבוי'}
          >
            <span className="truncate text-sm font-bold text-app-text">{SENDI_PLUS_LABEL}</span>
            <span
              className={`sendi-plus-mark ${
                receivesDeliveries ? 'sendi-plus-mark--active' : 'sendi-plus-mark--off'
              }`}
              aria-hidden="true"
            >
              <span className="sendi-plus-mark__inner">
                <Plus
                  className={
                    receivesDeliveries
                      ? 'h-2.5 w-2.5 text-white'
                      : 'h-2.5 w-2.5 text-app-text-muted'
                  }
                  strokeWidth={2.65}
                />
              </span>
            </span>
          </div>
          <div className="mt-1 truncate text-xs text-app-text-secondary">
            {receivesDeliveries
              ? `זמין למשלוחים עד ${radiusDisplay}`
              : `לא מקבל משלוחים מ${SENDI_PLUS_LABEL}`}
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-app-border pt-3 dark:border-app-nav-border">
        <div className="relative mt-5 px-1 pb-4">
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
            step={0.5}
            value={radiusKm}
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
            className={`sendi-plus-radius-slider h-8 w-full cursor-pointer ${
              receivesDeliveries ? 'sendi-plus-radius-slider--active' : 'sendi-plus-radius-slider--off'
            }`}
            dir="rtl"
            style={sliderStyle}
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-app-text-secondary" dir="rtl">
            <span>0 ק״מ</span>
            <span>5 ק״מ</span>
            <span>10 ק״מ</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-app-text-secondary">
          <span>{receivesDeliveries ? `זמין למשלוחים עד ${radiusDisplay}` : 'על 0 לא נכנסים משלוחים חדשים'}</span>
          <span>{`${activeAreaCount.toLocaleString('he-IL')} אזורים פעילים`}</span>
        </div>
      </div>
    </section>
  );
};

export const Dashboard: React.FC = () => {
  const { state, dispatch, toggleSystem } = useDelivery();
  const navigate = useNavigate();
  const todayDate = React.useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = React.useState(todayDate);
  const [sendiPlusRadiusKm, setSendiPlusRadiusKm] = React.useState(readStoredSendiPlusRadius);

  React.useEffect(() => {
    writeStoredSendiPlusRadius(sendiPlusRadiusKm);
  }, [sendiPlusRadiusKm]);

  const handleSendiPlusRadiusChange = React.useCallback((value: number) => {
    setSendiPlusRadiusKm(clampSendiPlusRadius(value));
  }, []);

  const restaurantById = React.useMemo(
    () => new Map(state.restaurants.map((restaurant) => [restaurant.id, restaurant])),
    [state.restaurants],
  );
  const restaurantByName = React.useMemo(
    () => new Map(state.restaurants.map((restaurant) => [normalizeText(restaurant.name), restaurant])),
    [state.restaurants],
  );

  const selectedDateKey = toDateInputValue(selectedDate);

  const deliveryCountsByDay = React.useMemo(() => {
    return state.deliveries.reduce<Record<string, number>>((counts, delivery) => {
      if (!DASHBOARD_DELIVERY_STATUSES.includes(delivery.status)) return counts;

      const date = toDate(getDeliveryPrimaryDate(delivery));
      if (!date) return counts;
      const key = toDateInputValue(date);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  }, [state.deliveries]);

  const dateDeliveries = React.useMemo(
    () =>
      state.deliveries.filter((delivery) => {
        if (!DASHBOARD_DELIVERY_STATUSES.includes(delivery.status)) return false;
        return isSameInputDate(getDeliveryPrimaryDate(delivery), selectedDateKey);
      }),
    [selectedDateKey, state.deliveries],
  );

  const filteredDeliveries = dateDeliveries;
  const isSendiPlusDelivery = React.useCallback(
    (delivery: Delivery) => {
      const restaurant =
        (delivery.restaurantId ? restaurantById.get(delivery.restaurantId) : undefined) ??
        restaurantByName.get(normalizeText(delivery.restaurantName ?? delivery.rest_name));
      const restaurantName = restaurant?.name ?? delivery.restaurantName ?? delivery.rest_name;

      return isSendiPlusRestaurant(restaurantName, restaurant?.chainId);
    },
    [restaurantById, restaurantByName],
  );

  const statusCounts = React.useMemo(() => {
    const counts = new Map<DeliveryStatus, number>();
    STATUS_META.forEach((status) => counts.set(status.id, 0));
    filteredDeliveries.forEach((delivery) => {
      counts.set(delivery.status, (counts.get(delivery.status) ?? 0) + 1);
    });
    return counts;
  }, [filteredDeliveries]);

  const sendiPlusDeliveries = React.useMemo(
    () => filteredDeliveries.filter(isSendiPlusDelivery),
    [filteredDeliveries, isSendiPlusDelivery],
  );
  const sendiPlusActiveAreaCount = React.useMemo(() => {
    const areas = new Set(
      sendiPlusDeliveries
        .map((delivery) => delivery.area?.trim())
        .filter((area): area is string => Boolean(area)),
    );

    return areas.size;
  }, [sendiPlusDeliveries]);
  const connectedCouriersCount = React.useMemo(
    () => state.couriers.filter((courier) => courier.status !== 'offline').length,
    [state.couriers],
  );
  const totalCouriersCount = state.couriers.length;
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
  const totalStatusCount = Math.max(filteredDeliveries.length, 1);
  const { mapSplitPortal } = useDeliveriesMapSplit({
    deliveries: filteredDeliveries,
    couriers: state.couriers,
    restaurants: state.restaurants,
    routeStopOrders: state.courierRoutePlans,
  });

  return (
    <>
      {mapSplitPortal}
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-app-background text-app-text" dir="rtl">
      <PageToolbar
        showBottomBorder={false}
        pairControlsOnMobile
        periodControl={
          <>
            <ToolbarDayPicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              dayCounts={deliveryCountsByDay}
            />
            <div className="flex shrink-0 items-center gap-1">
              <DashboardToolbarToggle
                active={state.isSystemOpen}
                label={state.isSystemOpen ? 'מערכת פתוחה' : 'מערכת סגורה'}
                onClick={toggleSystem}
                icon={<Power className="h-3.5 w-3.5" />}
              />
              <DashboardToolbarToggle
                active={state.autoAssignEnabled}
                label="שיבוץ אוטומטי"
                onClick={() => dispatch({ type: 'TOGGLE_AUTO_ASSIGN' })}
                icon={<UserCheck className="h-3.5 w-3.5" />}
              />
            </div>
          </>
        }
      />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-6 md:pt-2 md:pb-6">
        <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-2">
          <section>
            <div className="grid grid-cols-6 gap-2">
              {STATUS_META.filter((status) => DASHBOARD_DELIVERY_STATUSES.includes(status.id)).map((status) => {
                const isCourierAvailabilityCard = status.id === 'delivered';
                const isAverageDeliveryTimeCard = status.id === 'cancelled';
                const Icon = isCourierAvailabilityCard ? UserCheck : isAverageDeliveryTimeCard ? Timer : status.icon;
                const count = statusCounts.get(status.id) ?? 0;
                const percent = Math.round((count / totalStatusCount) * 100);
                const showStatusProgress =
                  !isCourierAvailabilityCard && !isAverageDeliveryTimeCard;
                const statusSpanClassName =
                  status.id === 'delivered' || status.id === 'cancelled'
                    ? 'col-span-3'
                    : 'col-span-2';
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
                const hint = isCourierAvailabilityCard
                  ? `סה״כ במערכת ${formatNumber(totalCouriersCount)}`
                  : isAverageDeliveryTimeCard
                  ? 'משלוחים שנמסרו'
                  : status.hint;
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
                    className={`min-w-0 rounded-[8px] border border-app-border bg-app-surface p-2.5 text-right transition-colors hover:bg-app-surface-raised sm:p-3 dark:border-app-nav-border dark:bg-[#080808] ${statusSpanClassName}`}
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
                    {isCourierAvailabilityCard || isAverageDeliveryTimeCard ? (
                      <div className="mt-1.5 truncate text-[10px] text-app-text-secondary sm:text-[11px]">
                        {hint}
                      </div>
                    ) : showStatusProgress ? (
                      <>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-surface-raised">
                          <div
                            className={`h-full rounded-full ${status.barClassName}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="mt-1.5 truncate text-[10px] text-app-text-secondary sm:text-[11px]">
                          {hint}
                        </div>
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <SendiPlusCard
            activeAreaCount={sendiPlusActiveAreaCount}
            radiusKm={sendiPlusRadiusKm}
            onRadiusKmChange={handleSendiPlusRadiusChange}
            onManageZones={() => navigate('/zones?source=sendi-plus')}
          />
        </div>
      </main>
      </div>
    </>
  );
};
