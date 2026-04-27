import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bike,
  CheckCircle2,
  Clock3,
  Package,
  Search,
  Store,
  TriangleAlert,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { useDelivery } from '../context/delivery-context-value';
import type { Courier, Delivery, DeliveryStatus, Restaurant } from '../types/delivery.types';
import { canCourierAcceptDelivery } from '../utils/courier-assignment';
import { isOperationalDelivery } from '../utils/delivery-status';
import { formatOrderNumber } from '../utils/order-number';

type ExceptionSeverity = 'critical' | 'warning' | 'info';
type ExceptionFilter = 'all' | ExceptionSeverity;

type ExceptionItem = {
  id: string;
  severity: ExceptionSeverity;
  kind: string;
  title: string;
  primary: string;
  secondary?: string;
  meta?: string;
  href?: string;
  actionLabel?: string;
  icon: React.ReactNode;
  sortScore: number;
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'ממתין',
  assigned: 'משובץ',
  delivering: 'נאסף',
  delivered: 'נמסר',
  cancelled: 'בוטל',
  expired: 'פג תוקף',
};

const SEVERITY_META: Record<ExceptionSeverity, { label: string; className: string; dotClassName: string }> = {
  critical: {
    label: 'קריטי',
    className: 'border-[#ef4444]/35 bg-[#ef4444]/10 text-[#fca5a5]',
    dotClassName: 'bg-[#ef4444]',
  },
  warning: {
    label: 'דורש טיפול',
    className: 'border-[#facc15]/35 bg-[#facc15]/10 text-[#facc15]',
    dotClassName: 'bg-[#facc15]',
  },
  info: {
    label: 'הזדמנות',
    className: 'border-[#60a5fa]/35 bg-[#60a5fa]/10 text-[#93c5fd]',
    dotClassName: 'bg-[#60a5fa]',
  },
};

const FILTER_LABELS: Record<ExceptionFilter, string> = {
  all: 'הכל',
  critical: 'קריטי',
  warning: 'דורש טיפול',
  info: 'הזדמנויות',
};

const toDate = (value: Date | string | number | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getAgeMinutes = (value: Date | string | number | null | undefined) => {
  const date = toDate(value);
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
};

const formatDuration = (minutes: number) => {
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `${minutes} דק׳`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}ש ${remainder}ד` : `${hours}ש`;
};

const getDeliveryCreatedAt = (delivery: Delivery) => delivery.createdAt ?? delivery.creation_time;
const getRestaurantName = (delivery: Delivery) => delivery.restaurantName || delivery.rest_name;
const getCustomerName = (delivery: Delivery) => delivery.customerName || delivery.client_name;
const getCustomerAddress = (delivery: Delivery) => delivery.address || delivery.client_full_address;

const getDeliveryRestaurant = (
  delivery: Delivery,
  restaurantById: Map<string, Restaurant>,
  restaurantByName: Map<string, Restaurant>,
) => {
  const id = delivery.restaurantId || delivery.rest_id;
  if (id && restaurantById.has(id)) return restaurantById.get(id) ?? null;
  return restaurantByName.get(getRestaurantName(delivery)) ?? null;
};

const matchesQuery = (item: ExceptionItem, query: string) => {
  if (!query) return true;
  return [item.title, item.primary, item.secondary, item.meta, item.kind]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query);
};

const SeverityPill: React.FC<{ severity: ExceptionSeverity }> = ({ severity }) => {
  const meta = SEVERITY_META[severity];

  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName}`} />
      {meta.label}
    </span>
  );
};

const Metric: React.FC<{ label: string; value: number; tone?: ExceptionSeverity | 'neutral' }> = ({
  label,
  value,
  tone = 'neutral',
}) => {
  const toneClass =
    tone === 'critical'
      ? 'text-[#fca5a5]'
      : tone === 'warning'
        ? 'text-[#facc15]'
        : tone === 'info'
          ? 'text-[#93c5fd]'
          : 'text-[#fafafa]';

  return (
    <div className="min-w-[108px] border-l border-[#262626] px-4 py-2 last:border-l-0">
      <div className={`text-lg font-bold tabular-nums ${toneClass}`}>{value.toLocaleString('he-IL')}</div>
      <div className="text-xs text-[#737373]">{label}</div>
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-[#737373]">
    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#262626] bg-[#111111]">
      <CheckCircle2 className="h-5 w-5 text-[#9fe870]" />
    </div>
    <div className="text-sm font-semibold text-[#d4d4d4]">אין חריגים לטיפול</div>
    <div className="max-w-sm text-center text-xs leading-5">המערכת לא מזהה כרגע משלוחים, שליחים או מסעדות שדורשים תשומת לב מיידית.</div>
  </div>
);

export const ExceptionsLabPage: React.FC = () => {
  const { state } = useDelivery();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ExceptionFilter>('all');

  const normalizedQuery = query.trim().toLowerCase();

  const exceptions = useMemo<ExceptionItem[]>(() => {
    const items: ExceptionItem[] = [];
    const operationalDeliveries = state.deliveries.filter(isOperationalDelivery);
    const pendingDeliveries = operationalDeliveries.filter((delivery) => delivery.status === 'pending');
    const restaurantById = new Map(state.restaurants.map((restaurant) => [restaurant.id, restaurant]));
    const restaurantByName = new Map(state.restaurants.map((restaurant) => [restaurant.name, restaurant]));
    const courierById = new Map(state.couriers.map((courier) => [courier.id, courier]));
    const loadByCourier = new Map<string, number>();

    operationalDeliveries.forEach((delivery) => {
      if (!delivery.courierId) return;
      loadByCourier.set(delivery.courierId, (loadByCourier.get(delivery.courierId) ?? 0) + 1);
    });

    const availableCouriers = state.couriers.filter((courier) => canCourierAcceptDelivery(courier));
    const idleCouriers = availableCouriers.filter((courier) => (loadByCourier.get(courier.id) ?? 0) === 0);

    pendingDeliveries.forEach((delivery) => {
      const waitMinutes = getAgeMinutes(getDeliveryCreatedAt(delivery));
      if (waitMinutes < 8) return;

      items.push({
        id: `pending-${delivery.id}`,
        severity: waitMinutes >= 20 ? 'critical' : 'warning',
        kind: 'משלוח ממתין',
        title: `${formatOrderNumber(delivery.orderNumber)} ממתין לציוות`,
        primary: getRestaurantName(delivery),
        secondary: `${getCustomerName(delivery)} · ${getCustomerAddress(delivery)}`,
        meta: `${formatDuration(waitMinutes)} בלי שליח`,
        href: `/delivery/${delivery.id}`,
        actionLabel: 'פתח משלוח',
        icon: <Package className="h-4 w-4" />,
        sortScore: 3000 + waitMinutes,
      });
    });

    operationalDeliveries
      .filter((delivery) => delivery.status === 'assigned')
      .forEach((delivery) => {
        const assignedMinutes = getAgeMinutes(delivery.assignedAt ?? getDeliveryCreatedAt(delivery));
        if (assignedMinutes < 12) return;

        const courier = delivery.courierId ? courierById.get(delivery.courierId) : null;
        items.push({
          id: `assigned-${delivery.id}`,
          severity: assignedMinutes >= 25 ? 'critical' : 'warning',
          kind: 'איסוף מתעכב',
          title: `${formatOrderNumber(delivery.orderNumber)} שובץ ולא נאסף`,
          primary: getRestaurantName(delivery),
          secondary: courier ? `שליח: ${courier.name}` : 'אין שליח מזוהה',
          meta: `${formatDuration(assignedMinutes)} מאז הציוות`,
          href: `/delivery/${delivery.id}`,
          actionLabel: 'פתח משלוח',
          icon: <Clock3 className="h-4 w-4" />,
          sortScore: 2600 + assignedMinutes,
        });
      });

    operationalDeliveries
      .filter((delivery) => delivery.status === 'delivering')
      .forEach((delivery) => {
        const baseTime = delivery.pickedUpAt ?? delivery.assignedAt ?? getDeliveryCreatedAt(delivery);
        const deliveryMinutes = getAgeMinutes(baseTime);
        const expectedMinutes = delivery.maxDeliveryTime ?? delivery.estimatedTime ?? 30;
        if (deliveryMinutes < Math.max(25, expectedMinutes)) return;

        const courier = delivery.courierId ? courierById.get(delivery.courierId) : null;
        items.push({
          id: `delivering-${delivery.id}`,
          severity: deliveryMinutes >= expectedMinutes + 15 ? 'critical' : 'warning',
          kind: 'מסירה מתעכבת',
          title: `${formatOrderNumber(delivery.orderNumber)} בדרך יותר מדי זמן`,
          primary: getCustomerName(delivery),
          secondary: courier ? `שליח: ${courier.name}` : getRestaurantName(delivery),
          meta: `${formatDuration(deliveryMinutes)} בסטטוס ${STATUS_LABELS[delivery.status]}`,
          href: `/delivery/${delivery.id}`,
          actionLabel: 'פתח משלוח',
          icon: <Clock3 className="h-4 w-4" />,
          sortScore: 2400 + deliveryMinutes,
        });
      });

    state.restaurants
      .filter((restaurant) => !restaurant.isActive)
      .forEach((restaurant) => {
        const restaurantDeliveries = operationalDeliveries.filter((delivery) => {
          const matchedRestaurant = getDeliveryRestaurant(delivery, restaurantById, restaurantByName);
          return matchedRestaurant?.id === restaurant.id;
        });
        if (restaurantDeliveries.length === 0) return;

        items.push({
          id: `inactive-restaurant-${restaurant.id}`,
          severity: 'critical',
          kind: 'מסעדה כבויה',
          title: `${restaurant.name} כבויה עם משלוחים פתוחים`,
          primary: `${restaurantDeliveries.length.toLocaleString('he-IL')} משלוחים פעילים`,
          secondary: restaurant.address,
          meta: 'כדאי להפעיל או לעצור קבלת הזמנות ממנה',
          href: `/restaurant/${restaurant.id}`,
          actionLabel: 'פתח מסעדה',
          icon: <Store className="h-4 w-4" />,
          sortScore: 2800 + restaurantDeliveries.length,
        });
      });

    if (pendingDeliveries.length > 0 && availableCouriers.length === 0) {
      items.push({
        id: 'no-courier-coverage',
        severity: 'critical',
        kind: 'אין כיסוי',
        title: 'יש משלוחים ממתינים ואין שליח פנוי',
        primary: `${pendingDeliveries.length.toLocaleString('he-IL')} משלוחים ממתינים`,
        secondary: 'אין שליח במשמרת שמסוגל לקבל עוד משלוח',
        meta: 'צריך לפתוח שליח או לסיים עומס קיים',
        href: '/couriers',
        actionLabel: 'פתח שליחים',
        icon: <Bike className="h-4 w-4" />,
        sortScore: 3200 + pendingDeliveries.length,
      });
    }

    if (pendingDeliveries.length > 0 && idleCouriers.length > 0) {
      const preview = idleCouriers.slice(0, 3).map((courier) => courier.name).join(', ');
      items.push({
        id: 'idle-couriers-with-pending',
        severity: 'info',
        kind: 'שליחים פנויים',
        title: 'יש שליחים פנויים בזמן שמשלוחים ממתינים',
        primary: `${idleCouriers.length.toLocaleString('he-IL')} פנויים · ${pendingDeliveries.length.toLocaleString('he-IL')} ממתינים`,
        secondary: preview ? `לדוגמה: ${preview}` : undefined,
        meta: 'זו הזדמנות לציוות מהיר',
        href: '/dispatch',
        actionLabel: 'פתח חדר ציוות',
        icon: <UserCheck className="h-4 w-4" />,
        sortScore: 900 + idleCouriers.length,
      });
    }

    state.couriers.forEach((courier) => {
      const deliveryLoad = loadByCourier.get(courier.id) ?? 0;
      const trackedLoad = courier.activeDeliveryIds?.length ?? 0;
      const load = Math.max(deliveryLoad, trackedLoad);
      if (load <= 2) return;

      items.push({
        id: `overloaded-courier-${courier.id}`,
        severity: 'critical',
        kind: 'שליח עמוס',
        title: `${courier.name} עם יותר מדי משלוחים`,
        primary: `${load.toLocaleString('he-IL')} משלוחים פעילים`,
        secondary: courier.phone,
        meta: 'מגבלת עבודה תקינה היא עד 2 משלוחים',
        href: `/courier/${courier.id}`,
        actionLabel: 'פתח שליח',
        icon: <Bike className="h-4 w-4" />,
        sortScore: 2500 + load,
      });
    });

    if (state.deliveryBalance <= 100) {
      items.push({
        id: 'low-delivery-balance',
        severity: state.deliveryBalance <= 20 ? 'critical' : 'warning',
        kind: 'יתרת משלוחים',
        title: 'יתרת המשלוחים נמוכה',
        primary: `${state.deliveryBalance.toLocaleString('he-IL')} משלוחים זמינים`,
        secondary: 'המערכת עלולה להיעצר אם היתרה תיגמר',
        meta: 'כדאי להטעין לפני עומס',
        href: '/delivery-balance',
        actionLabel: 'פתח יתרה',
        icon: <Wallet className="h-4 w-4" />,
        sortScore: state.deliveryBalance <= 20 ? 2700 : 1700,
      });
    }

    return items.sort((left, right) => right.sortScore - left.sortScore);
  }, [state.couriers, state.deliveries, state.deliveryBalance, state.restaurants]);

  const filteredExceptions = exceptions.filter((item) => {
    if (filter !== 'all' && item.severity !== filter) return false;
    return matchesQuery(item, normalizedQuery);
  });

  const counts = {
    all: exceptions.length,
    critical: exceptions.filter((item) => item.severity === 'critical').length,
    warning: exceptions.filter((item) => item.severity === 'warning').length,
    info: exceptions.filter((item) => item.severity === 'info').length,
  };

  return (
    <div dir="rtl" className="flex h-full min-h-0 flex-col bg-[#0f0f0f] text-[#fafafa]">
      <header className="shrink-0 border-b border-[#262626] bg-[#0a0a0a] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#262626] bg-[#171717]">
              <TriangleAlert className="h-4 w-4 text-[#facc15]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold">תיבת חריגים</h1>
                <span className="rounded-md border border-[#404040] px-2 py-0.5 text-[11px] font-semibold text-[#a3a3a3]">
                  ניסוי
                </span>
              </div>
              <div className="text-xs text-[#737373]">מה דורש טיפול עכשיו · {counts.all.toLocaleString('he-IL')} חריגים</div>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#737373]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="חיפוש"
                className="h-8 w-48 rounded-md border border-[#262626] bg-[#111111] pr-8 pl-8 text-sm text-[#fafafa] outline-none transition-colors placeholder:text-[#525252] focus:border-[#404040]"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#fafafa]"
                  aria-label="נקה חיפוש"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => navigate('/dispatch')}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[#262626] bg-[#111111] px-3 text-xs font-semibold text-[#d4d4d4] transition-colors hover:bg-[#171717] hover:text-[#fafafa]"
            >
              <UserCheck className="h-3.5 w-3.5" />
              חדר ציוות
            </button>
          </div>
        </div>
      </header>

      <div className="shrink-0 border-b border-[#262626] bg-[#111111]">
        <div className="flex flex-wrap">
          <Metric label="סה״כ" value={counts.all} />
          <Metric label="קריטיים" value={counts.critical} tone="critical" />
          <Metric label="דורשים טיפול" value={counts.warning} tone="warning" />
          <Metric label="הזדמנויות" value={counts.info} tone="info" />
        </div>
      </div>

      <div className="shrink-0 border-b border-[#262626] bg-[#0d0d0d] px-4 py-2">
        <div className="flex flex-wrap gap-2">
          {(['all', 'critical', 'warning', 'info'] as ExceptionFilter[]).map((filterId) => {
            const isActive = filter === filterId;
            const count = counts[filterId];
            return (
              <button
                key={filterId}
                type="button"
                onClick={() => setFilter(filterId)}
                className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-[#9fe870]/40 bg-[#102015] text-[#9fe870]'
                    : 'border-[#262626] bg-[#111111] text-[#a3a3a3] hover:bg-[#171717] hover:text-[#fafafa]'
                }`}
              >
                {FILTER_LABELS[filterId]}
                <span className="tabular-nums text-[#737373]">{count.toLocaleString('he-IL')}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="mb-2 flex h-9 items-center justify-between border-b border-[#262626] text-xs text-[#737373]">
            <span>{filteredExceptions.length.toLocaleString('he-IL')} חריגים מוצגים</span>
            <span>מסודר לפי דחיפות</span>
          </div>

          {filteredExceptions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-[#262626] border-y border-[#262626]">
              {filteredExceptions.map((item) => {
                const meta = SEVERITY_META[item.severity];

                return (
                  <article key={item.id} className="grid gap-3 bg-[#111111] px-3 py-3 transition-colors hover:bg-[#151515] md:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${meta.className}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <SeverityPill severity={item.severity} />
                          <span className="text-xs font-semibold text-[#737373]">{item.kind}</span>
                          {item.meta ? <span className="text-xs text-[#737373]">· {item.meta}</span> : null}
                        </div>
                        <div className="truncate text-sm font-bold text-[#fafafa]">{item.title}</div>
                        <div className="truncate text-sm text-[#d4d4d4]">{item.primary}</div>
                        {item.secondary ? <div className="mt-0.5 truncate text-xs text-[#737373]">{item.secondary}</div> : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 md:justify-start">
                      {item.href ? (
                        <button
                          type="button"
                          onClick={() => navigate(item.href)}
                          className="inline-flex h-8 items-center rounded-md border border-[#404040] px-3 text-xs font-semibold text-[#d4d4d4] transition-colors hover:bg-[#262626] hover:text-[#fafafa]"
                        >
                          {item.actionLabel ?? 'פתח'}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
