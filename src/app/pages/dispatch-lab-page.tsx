import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bike,
  Check,
  CheckCircle2,
  Clock3,
  Package,
  PackageCheck,
  Play,
  Search,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDelivery } from '../context/delivery-context-value';
import type { Courier, Delivery, DeliveryStatus } from '../types/delivery.types';
import { canCourierAcceptDelivery } from '../utils/courier-assignment';
import {
  DELIVERY_ASSIGNMENT_BLOCK_COPY,
  getDeliveryAssignmentBlockReason,
  getDeliveryOfferRemainingSeconds,
} from '../utils/delivery-assignment';
import { isOperationalDelivery } from '../utils/delivery-status';

const STATUS_META: Record<DeliveryStatus, { label: string; className: string }> = {
  pending: {
    label: 'ממתין',
    className: 'border-[#facc15]/40 bg-[#facc15]/10 text-[#facc15]',
  },
  assigned: {
    label: 'משובץ',
    className: 'border-[#60a5fa]/40 bg-[#60a5fa]/10 text-[#60a5fa]',
  },
  delivering: {
    label: 'נאסף',
    className: 'border-[#a78bfa]/40 bg-[#a78bfa]/10 text-[#c4b5fd]',
  },
  delivered: {
    label: 'נמסר',
    className: 'border-[#22c55e]/40 bg-[#22c55e]/10 text-[#9fe870]',
  },
  cancelled: {
    label: 'בוטל',
    className: 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fca5a5]',
  },
  expired: {
    label: 'פג תוקף',
    className: 'border-[#737373]/40 bg-[#737373]/10 text-[#a3a3a3]',
  },
};

const toDate = (value: Date | string | number | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const timeFormatter = new Intl.DateTimeFormat('he-IL', {
  hour: '2-digit',
  minute: '2-digit',
});

const formatTime = (value: Date | string | number | null | undefined) => {
  const date = toDate(value);
  return date ? timeFormatter.format(date) : '-';
};

const formatAge = (value: Date | string | number | null | undefined) => {
  const date = toDate(value);
  if (!date) return '-';

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
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

const matchesQuery = (delivery: Delivery, query: string) => {
  if (!query) return true;

  return [
    delivery.orderNumber,
    getRestaurantName(delivery),
    getCustomerName(delivery),
    getCustomerAddress(delivery),
    delivery.courierName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query);
};

const SectionTitle: React.FC<{
  title: string;
  count?: number;
  action?: React.ReactNode;
}> = ({ title, count, action }) => (
  <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#262626] px-3">
    <div className="flex items-baseline gap-2">
      <h2 className="text-sm font-semibold text-[#fafafa]">{title}</h2>
      {typeof count === 'number' ? (
        <span className="text-xs tabular-nums text-[#737373]">{count.toLocaleString('he-IL')}</span>
      ) : null}
    </div>
    {action}
  </div>
);

const StatusPill: React.FC<{ status: DeliveryStatus }> = ({ status }) => {
  const meta = STATUS_META[status];

  return (
    <span className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
};

const Metric: React.FC<{
  label: string;
  value: number;
  tone?: 'neutral' | 'green' | 'yellow' | 'blue';
}> = ({ label, value, tone = 'neutral' }) => {
  const toneClass =
    tone === 'green'
      ? 'text-[#9fe870]'
      : tone === 'yellow'
        ? 'text-[#facc15]'
        : tone === 'blue'
          ? 'text-[#60a5fa]'
          : 'text-[#fafafa]';

  return (
    <div className="min-w-[104px] border-l border-[#262626] px-4 py-2 last:border-l-0">
      <div className={`text-lg font-bold tabular-nums ${toneClass}`}>{value.toLocaleString('he-IL')}</div>
      <div className="text-xs text-[#737373]">{label}</div>
    </div>
  );
};

const CourierLoad: React.FC<{ courier: Courier; load: number }> = ({ courier, load }) => {
  const isFull = load >= 2;
  const label = courier.status === 'offline' ? 'לא מחובר' : !courier.isOnShift ? 'לא במשמרת' : isFull ? 'מלא' : load === 0 ? 'פנוי' : 'בעבודה';
  const className =
    courier.status === 'offline' || !courier.isOnShift
      ? 'text-[#737373]'
      : isFull
        ? 'text-[#facc15]'
        : 'text-[#9fe870]';

  return (
    <span className={`text-xs font-semibold ${className}`}>
      {label} · {load}/2
    </span>
  );
};

const DeliverySummary: React.FC<{ delivery: Delivery }> = ({ delivery }) => (
  <div className="min-w-0">
    <div className="mb-1 flex items-center gap-2">
      <span className="font-mono text-xs font-bold text-[#fafafa]">#{delivery.orderNumber}</span>
      <StatusPill status={delivery.status} />
      <span className="text-xs text-[#737373]">{formatAge(getDeliveryCreatedAt(delivery))}</span>
    </div>
    <div className="truncate text-sm font-semibold text-[#fafafa]">{getRestaurantName(delivery)}</div>
    <div className="truncate text-xs text-[#a3a3a3]">{getCustomerName(delivery)}</div>
    <div className="mt-1 truncate text-xs text-[#737373]">{getCustomerAddress(delivery)}</div>
  </div>
);

export const DispatchLabPage: React.FC = () => {
  const { state, dispatch, assignCourier, unassignCourier } = useDelivery();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();

  const courierById = useMemo(
    () => new Map(state.couriers.map((courier) => [courier.id, courier])),
    [state.couriers],
  );

  const operationalDeliveries = useMemo(
    () =>
      state.deliveries
        .filter(isOperationalDelivery)
        .sort((left, right) => {
          const leftTime = toDate(getDeliveryCreatedAt(left))?.getTime() ?? 0;
          const rightTime = toDate(getDeliveryCreatedAt(right))?.getTime() ?? 0;
          return leftTime - rightTime;
        }),
    [state.deliveries],
  );

  const filteredOperational = useMemo(
    () => operationalDeliveries.filter((delivery) => matchesQuery(delivery, normalizedQuery)),
    [normalizedQuery, operationalDeliveries],
  );

  const pendingDeliveries = filteredOperational.filter((delivery) => delivery.status === 'pending');
  const activeDeliveries = filteredOperational.filter((delivery) => delivery.status !== 'pending');
  const deliveringCount = operationalDeliveries.filter((delivery) => delivery.status === 'delivering').length;
  const assignedCount = operationalDeliveries.filter((delivery) => delivery.status === 'assigned').length;

  const loadByCourier = useMemo(() => {
    const loads = new Map<string, number>();
    operationalDeliveries.forEach((delivery) => {
      if (!delivery.courierId) return;
      loads.set(delivery.courierId, (loads.get(delivery.courierId) ?? 0) + 1);
    });
    return loads;
  }, [operationalDeliveries]);

  const dispatchCouriers = useMemo(
    () =>
      [...state.couriers].sort((left, right) => {
        const leftAccepts = canCourierAcceptDelivery(left) ? 0 : 1;
        const rightAccepts = canCourierAcceptDelivery(right) ? 0 : 1;
        if (leftAccepts !== rightAccepts) return leftAccepts - rightAccepts;

        const loadDelta = (loadByCourier.get(left.id) ?? 0) - (loadByCourier.get(right.id) ?? 0);
        if (loadDelta !== 0) return loadDelta;

        return left.name.localeCompare(right.name, 'he');
      }),
    [loadByCourier, state.couriers],
  );

  const assignableCouriers = dispatchCouriers.filter((courier) => canCourierAcceptDelivery(courier));
  const nextDelivery = pendingDeliveries[0] ?? null;
  const nextCourier = assignableCouriers[0] ?? null;

  const courierWork = useMemo(
    () =>
      dispatchCouriers
        .map((courier) => ({
          courier,
          deliveries: activeDeliveries.filter((delivery) => delivery.courierId === courier.id),
        }))
        .filter((group) => group.deliveries.length > 0),
    [activeDeliveries, dispatchCouriers],
  );

  const handleAssign = (delivery: Delivery, courier: Courier) => {
    const assigned = assignCourier(delivery.id, courier.id);

    if (!assigned) {
      const reason = getDeliveryAssignmentBlockReason(delivery, {
        deliveryBalance: state.deliveryBalance,
        availableCourierCount: assignableCouriers.length,
      });
      toast.error(reason ? DELIVERY_ASSIGNMENT_BLOCK_COPY[reason] : 'לא ניתן לשבץ כרגע');
      return;
    }

    toast.success(`${delivery.orderNumber} שובץ ל${courier.name}`);
  };

  const handleQuickAssign = () => {
    if (!nextDelivery || !nextCourier) return;
    handleAssign(nextDelivery, nextCourier);
  };

  const handleStatus = (delivery: Delivery, status: DeliveryStatus) => {
    dispatch({ type: 'UPDATE_STATUS', payload: { deliveryId: delivery.id, status } });
    toast.success(`${delivery.orderNumber} עודכן ל${STATUS_META[status].label}`);
  };

  const handleComplete = (delivery: Delivery) => {
    dispatch({ type: 'COMPLETE_DELIVERY', payload: delivery.id });
    toast.success(`${delivery.orderNumber} נמסר`);
  };

  return (
    <div dir="rtl" className="flex h-full min-h-0 flex-col bg-[#0f0f0f] text-[#fafafa]">
      <header className="shrink-0 border-b border-[#262626] bg-[#0a0a0a] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#262626] bg-[#171717]">
              <Package className="h-4 w-4 text-[#9fe870]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold">חדר ציוות</h1>
                <span className="rounded-md border border-[#404040] px-2 py-0.5 text-[11px] font-semibold text-[#a3a3a3]">
                  ניסוי
                </span>
              </div>
              <div className="text-xs text-[#737373]">פעילות עכשיו · {state.isSystemOpen ? 'קבלה פעילה' : 'קבלה כבויה'}</div>
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
              onClick={() => navigate('/deliveries')}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[#262626] bg-[#111111] px-3 text-xs font-semibold text-[#d4d4d4] transition-colors hover:bg-[#171717] hover:text-[#fafafa]"
            >
              <Package className="h-3.5 w-3.5" />
              טבלת משלוחים
            </button>
          </div>
        </div>
      </header>

      <div className="shrink-0 border-b border-[#262626] bg-[#111111]">
        <div className="flex flex-wrap">
          <Metric label="ממתינים" value={operationalDeliveries.filter((delivery) => delivery.status === 'pending').length} tone="yellow" />
          <Metric label="משובצים" value={assignedCount} tone="blue" />
          <Metric label="נאספו" value={deliveringCount} tone="green" />
          <Metric label="שליחים פנויים" value={assignableCouriers.length} tone="green" />
        </div>
      </div>

      <div className="shrink-0 border-b border-[#262626] bg-[#0d0d0d] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {nextDelivery && nextCourier ? (
              <>
                <div className="text-xs font-semibold text-[#9fe870]">הבא בתור</div>
                <div className="truncate text-sm text-[#fafafa]">
                  #{nextDelivery.orderNumber} · {getRestaurantName(nextDelivery)} → {nextCourier.name}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs font-semibold text-[#a3a3a3]">הבא בתור</div>
                <div className="text-sm text-[#737373]">
                  {pendingDeliveries.length === 0 ? 'אין משלוחים ממתינים' : 'אין שליח פנוי לשיבוץ'}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleQuickAssign}
            disabled={!nextDelivery || !nextCourier}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#22c55e] px-4 text-sm font-bold text-[#052e16] transition-colors hover:bg-[#9fe870] disabled:cursor-not-allowed disabled:bg-[#262626] disabled:text-[#737373]"
          >
            <Zap className="h-4 w-4" />
            צוות הבא
          </button>
        </div>
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(320px,0.9fr)_minmax(360px,1.2fr)_minmax(300px,0.8fr)]">
        <section className="flex min-h-0 flex-col border-b border-[#262626] lg:border-b-0 lg:border-l">
          <SectionTitle title="ממתינים לטיפול" count={pendingDeliveries.length} />
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {pendingDeliveries.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="אין ממתינים" />
            ) : (
              <div className="space-y-2">
                {pendingDeliveries.map((delivery) => (
                  <article key={delivery.id} className="rounded-md border border-[#262626] bg-[#151515] p-3">
                    <DeliverySummary delivery={delivery} />
                    <div className="mt-3 flex items-center justify-between border-t border-[#262626] pt-2">
                      <div className="flex items-center gap-1 text-xs text-[#737373]">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatTime(getDeliveryCreatedAt(delivery))}
                        {getDeliveryOfferRemainingSeconds(delivery) !== null ? (
                          <span>· {Math.ceil((getDeliveryOfferRemainingSeconds(delivery) ?? 0) / 60)} דק׳</span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'CANCEL_DELIVERY', payload: delivery.id })}
                        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[#fca5a5] transition-colors hover:bg-[#ef4444]/10"
                      >
                        <X className="h-3.5 w-3.5" />
                        בטל
                      </button>
                    </div>
                    <div className="mt-2 grid gap-1">
                      {assignableCouriers.slice(0, 3).map((courier) => (
                        <button
                          key={courier.id}
                          type="button"
                          onClick={() => handleAssign(delivery, courier)}
                          className="flex h-8 items-center justify-between rounded-md border border-[#262626] bg-[#101010] px-2 text-xs transition-colors hover:border-[#22c55e]/40 hover:bg-[#102015]"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Bike className="h-3.5 w-3.5 text-[#9fe870]" />
                            <span className="truncate font-semibold text-[#fafafa]">{courier.name}</span>
                          </span>
                          <CourierLoad courier={courier} load={loadByCourier.get(courier.id) ?? 0} />
                        </button>
                      ))}
                      {assignableCouriers.length === 0 ? (
                        <div className="rounded-md border border-[#262626] px-2 py-2 text-xs text-[#737373]">אין שליחים פנויים</div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col border-b border-[#262626] lg:border-b-0 lg:border-l">
          <SectionTitle title="פעילות עכשיו" count={activeDeliveries.length} />
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {courierWork.length === 0 ? (
              <EmptyState icon={<PackageCheck className="h-5 w-5" />} title="אין פעילות פתוחה" />
            ) : (
              <div className="space-y-3">
                {courierWork.map(({ courier, deliveries }) => (
                  <section key={courier.id} className="rounded-md border border-[#262626]">
                    <div className="flex items-center justify-between border-b border-[#262626] bg-[#111111] px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserCheck className="h-4 w-4 text-[#60a5fa]" />
                        <span className="truncate text-sm font-semibold text-[#fafafa]">{courier.name}</span>
                      </div>
                      <CourierLoad courier={courier} load={deliveries.length} />
                    </div>
                    <div className="divide-y divide-[#262626]">
                      {deliveries.map((delivery) => (
                        <div key={delivery.id} className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <DeliverySummary delivery={delivery} />
                            <div className="shrink-0 text-left text-xs text-[#737373]">{formatTime(delivery.assignedAt)}</div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {delivery.status === 'assigned' ? (
                              <button
                                type="button"
                                onClick={() => handleStatus(delivery, 'delivering')}
                                className="inline-flex h-8 items-center gap-2 rounded-md border border-[#60a5fa]/30 px-3 text-xs font-semibold text-[#93c5fd] transition-colors hover:bg-[#60a5fa]/10"
                              >
                                <Play className="h-3.5 w-3.5" />
                                נאסף
                              </button>
                            ) : null}
                            {delivery.status === 'delivering' ? (
                              <button
                                type="button"
                                onClick={() => handleComplete(delivery)}
                                className="inline-flex h-8 items-center gap-2 rounded-md border border-[#22c55e]/30 px-3 text-xs font-semibold text-[#9fe870] transition-colors hover:bg-[#22c55e]/10"
                              >
                                <Check className="h-3.5 w-3.5" />
                                נמסר
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                unassignCourier(delivery.id);
                                toast.success(`${delivery.orderNumber} חזר לממתינים`);
                              }}
                              className="inline-flex h-8 items-center gap-2 rounded-md border border-[#404040] px-3 text-xs font-semibold text-[#d4d4d4] transition-colors hover:bg-[#262626]"
                            >
                              הסר ציוות
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col">
          <SectionTitle title="שליחים" count={dispatchCouriers.length} />
          <div className="min-h-0 flex-1 overflow-auto">
            {dispatchCouriers.map((courier) => {
              const load = loadByCourier.get(courier.id) ?? 0;
              return (
                <div key={courier.id} className="flex items-center justify-between border-b border-[#262626] px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#fafafa]">{courier.name}</div>
                    <div className="text-xs text-[#737373]">{courier.phone}</div>
                  </div>
                  <div className="shrink-0 text-left">
                    <CourierLoad courier={courier} load={load} />
                    <div className="mt-0.5 text-[11px] text-[#525252]">{courier.vehicleType}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 text-[#737373]">
    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#262626] bg-[#111111]">
      {icon}
    </div>
    <div className="text-sm font-semibold">{title}</div>
  </div>
);
