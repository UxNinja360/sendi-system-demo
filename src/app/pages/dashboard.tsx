import React from 'react';
import { useNavigate } from 'react-router';
import {
  Bike,
  CheckCircle2,
  Clock3,
  PackageCheck,
  PackageOpen,
  Store,
  Truck,
  Users,
  XCircle,
} from 'lucide-react';
import { PageToolbar } from '../components/common/page-toolbar';
import { ToolbarDayPicker } from '../components/common/toolbar-date-picker';
import { ToolbarSearchControl } from '../components/common/toolbar-search-control';
import { useDelivery } from '../context/delivery-context-value';
import type { Courier, Delivery, DeliveryStatus, Restaurant } from '../types/delivery.types';

const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = ['pending', 'assigned', 'delivering'];

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
    accentClassName: 'text-amber-300',
    barClassName: 'bg-amber-400',
  },
  {
    id: 'assigned',
    label: 'משובץ',
    hint: 'שליח בדרך למסעדה',
    icon: Truck,
    accentClassName: 'text-sky-300',
    barClassName: 'bg-sky-400',
  },
  {
    id: 'delivering',
    label: 'במסירה',
    hint: 'בדרך ללקוח',
    icon: Bike,
    accentClassName: 'text-blue-300',
    barClassName: 'bg-blue-400',
  },
  {
    id: 'delivered',
    label: 'נמסר',
    hint: 'הושלם בתאריך',
    icon: CheckCircle2,
    accentClassName: 'text-emerald-300',
    barClassName: 'bg-emerald-400',
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

const formatShortTime = (value: unknown) => {
  const date = toDate(value);
  if (!date) return '--:--';
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
};

const formatNumber = (value: number) => value.toLocaleString('he-IL');

const isSameInputDate = (value: unknown, inputDate: string) => {
  const date = toDate(value);
  return Boolean(date && toDateInputValue(date) === inputDate);
};

const getDeliveryPrimaryDate = (delivery: Delivery) =>
  delivery.createdAt ?? delivery.creation_time ?? delivery.delivery_date;

const getDeliveryCompletionDate = (delivery: Delivery) =>
  delivery.deliveredAt ??
  delivery.delivered_time ??
  delivery.cancelledAt ??
  delivery.expiredAt ??
  getDeliveryPrimaryDate(delivery);

const getDeliverySearchText = (delivery: Delivery, courier?: Courier) =>
  normalizeText([
    delivery.orderNumber,
    delivery.restaurantName,
    delivery.customerName,
    delivery.address,
    delivery.customerPhone,
    delivery.courierName,
    courier?.name,
  ].join(' '));

const SummaryTile: React.FC<{
  label: string;
  value: React.ReactNode;
  detail: React.ReactNode;
  icon: React.ReactNode;
}> = ({ label, value, detail, icon }) => (
  <div className="min-w-0 rounded-[8px] border border-app-border bg-app-surface px-3 py-3 dark:border-app-nav-border dark:bg-[#080808]">
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-xs font-semibold text-app-text-secondary">{label}</span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-app-surface-raised text-app-text-secondary">
        {icon}
      </span>
    </div>
    <div className="mt-2 text-2xl font-bold leading-none text-app-text">{value}</div>
    <div className="mt-1 min-h-4 truncate text-xs text-app-text-secondary">{detail}</div>
  </div>
);

const SectionHeader: React.FC<{
  title: string;
  action?: React.ReactNode;
}> = ({ title, action }) => (
  <div className="flex items-center justify-between gap-3">
    <h2 className="text-sm font-bold text-app-text">{title}</h2>
    {action}
  </div>
);

export const Dashboard: React.FC = () => {
  const { state } = useDelivery();
  const navigate = useNavigate();
  const todayDate = React.useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = React.useState(todayDate);
  const [searchOpen, setSearchOpen] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');

  const courierById = React.useMemo(
    () => new Map(state.couriers.map((courier) => [courier.id, courier])),
    [state.couriers],
  );

  const query = normalizeText(searchQuery);
  const selectedDateKey = toDateInputValue(selectedDate);

  const deliveryCountsByDay = React.useMemo(() => {
    return state.deliveries.reduce<Record<string, number>>((counts, delivery) => {
      const date = toDate(
        delivery.status === 'delivered' || delivery.status === 'cancelled' || delivery.status === 'expired'
          ? getDeliveryCompletionDate(delivery)
          : getDeliveryPrimaryDate(delivery),
      );
      if (!date) return counts;
      const key = toDateInputValue(date);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  }, [state.deliveries]);

  const dateDeliveries = React.useMemo(
    () =>
      state.deliveries.filter((delivery) => {
        if (delivery.status === 'delivered' || delivery.status === 'cancelled' || delivery.status === 'expired') {
          return isSameInputDate(getDeliveryCompletionDate(delivery), selectedDateKey);
        }

        return isSameInputDate(getDeliveryPrimaryDate(delivery), selectedDateKey);
      }),
    [selectedDateKey, state.deliveries],
  );

  const filteredDeliveries = React.useMemo(
    () =>
      dateDeliveries.filter((delivery) => {
        if (!query) return true;
        const courier = delivery.courierId ? courierById.get(delivery.courierId) : undefined;
        return getDeliverySearchText(delivery, courier).includes(query);
      }),
    [courierById, dateDeliveries, query],
  );

  const statusCounts = React.useMemo(() => {
    const counts = new Map<DeliveryStatus, number>();
    STATUS_META.forEach((status) => counts.set(status.id, 0));
    filteredDeliveries.forEach((delivery) => {
      counts.set(delivery.status, (counts.get(delivery.status) ?? 0) + 1);
    });
    return counts;
  }, [filteredDeliveries]);

  const activeDeliveries = filteredDeliveries.filter((delivery) =>
    ACTIVE_DELIVERY_STATUSES.includes(delivery.status),
  );
  const completedDeliveries = filteredDeliveries.filter((delivery) => delivery.status === 'delivered');
  const connectedCouriers = state.couriers.filter((courier) => courier.status !== 'offline');
  const onShiftCouriers = state.couriers.filter((courier) => courier.isOnShift);
  const activeRestaurants = state.restaurants.filter((restaurant) => restaurant.isActive);
  const visibleRestaurantIds = new Set(
    filteredDeliveries.map((delivery) => delivery.restaurantId).filter(Boolean),
  );
  const busiestRestaurantCount = activeRestaurants.filter((restaurant) =>
    visibleRestaurantIds.has(restaurant.id),
  ).length;

  const restaurantRows = React.useMemo(() => {
    return state.restaurants
      .map((restaurant) => {
        const deliveries = filteredDeliveries.filter(
          (delivery) =>
            delivery.restaurantId === restaurant.id ||
            normalizeText(delivery.restaurantName) === normalizeText(restaurant.name),
        );
        const activeCount = deliveries.filter((delivery) =>
          ACTIVE_DELIVERY_STATUSES.includes(delivery.status),
        ).length;
        const deliveredCount = deliveries.filter((delivery) => delivery.status === 'delivered').length;
        return {
          restaurant,
          deliveryCount: deliveries.length,
          activeCount,
          deliveredCount,
        };
      })
      .filter(({ restaurant, deliveryCount }) => {
        const matchesQuery =
          !query ||
          normalizeText([restaurant.name, restaurant.phone, restaurant.address, restaurant.type].join(' ')).includes(query);
        return deliveryCount > 0 || (matchesQuery && restaurant.isActive);
      })
      .sort((left, right) => {
        if (right.deliveryCount !== left.deliveryCount) return right.deliveryCount - left.deliveryCount;
        if (right.activeCount !== left.activeCount) return right.activeCount - left.activeCount;
        return left.restaurant.name.localeCompare(right.restaurant.name, 'he');
      })
      .slice(0, 6);
  }, [filteredDeliveries, query, state.restaurants]);

  const courierRows = React.useMemo(() => {
    return state.couriers
      .map((courier) => {
        const deliveries = filteredDeliveries.filter((delivery) => delivery.courierId === courier.id);
        const activeCount = deliveries.filter((delivery) =>
          ACTIVE_DELIVERY_STATUSES.includes(delivery.status),
        ).length;
        return {
          courier,
          deliveryCount: deliveries.length,
          activeCount,
          load: courier.activeDeliveryIds.length,
        };
      })
      .filter(({ courier, deliveryCount }) => {
        const matchesQuery =
          !query ||
          normalizeText([courier.name, courier.phone, courier.vehicleType, courier.employmentType].join(' ')).includes(query);
        return deliveryCount > 0 || (matchesQuery && (courier.status !== 'offline' || courier.isOnShift));
      })
      .sort((left, right) => {
        if (right.activeCount !== left.activeCount) return right.activeCount - left.activeCount;
        if (right.deliveryCount !== left.deliveryCount) return right.deliveryCount - left.deliveryCount;
        if (right.load !== left.load) return right.load - left.load;
        return left.courier.name.localeCompare(right.courier.name, 'he');
      })
      .slice(0, 6);
  }, [filteredDeliveries, query, state.couriers]);

  const latestDeliveries = React.useMemo(
    () =>
      [...filteredDeliveries]
        .sort((left, right) => {
          const leftTime = toDate(getDeliveryPrimaryDate(left))?.getTime() ?? 0;
          const rightTime = toDate(getDeliveryPrimaryDate(right))?.getTime() ?? 0;
          return rightTime - leftTime;
        })
        .slice(0, 4),
    [filteredDeliveries],
  );

  const totalStatusCount = Math.max(filteredDeliveries.length, 1);
  return (
    <div className="min-h-full bg-app-background text-app-text" dir="rtl">
      <PageToolbar
        showBottomBorder={false}
        pairControlsOnMobile
        periodControl={
          <ToolbarDayPicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            dayCounts={deliveryCountsByDay}
          />
        }
        actions={
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <ToolbarSearchControl
              searchOpen={searchOpen}
              onSearchOpenChange={setSearchOpen}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              placeholder="חיפוש משלוח, מסעדה, שליח או לקוח"
              widthClass="w-full"
              alwaysOpen
            />
          </div>
        }
      />

      <main className="mx-auto w-full max-w-[92rem] space-y-4 px-3 py-4 pb-8 md:px-6">
        <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <SummaryTile
            label="משלוחים"
            value={formatNumber(filteredDeliveries.length)}
            detail={`${formatNumber(activeDeliveries.length)} פתוחים עכשיו`}
            icon={<PackageCheck className="h-4 w-4" />}
          />
          <SummaryTile
            label="נמסרו"
            value={formatNumber(completedDeliveries.length)}
            detail={`${formatNumber(statusCounts.get('cancelled') ?? 0)} בוטלו`}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <SummaryTile
            label="מסעדות"
            value={formatNumber(busiestRestaurantCount)}
            detail={`${formatNumber(activeRestaurants.length)} פעילות במערכת`}
            icon={<Store className="h-4 w-4" />}
          />
          <SummaryTile
            label="שליחים"
            value={formatNumber(connectedCouriers.length)}
            detail={`${formatNumber(onShiftCouriers.length)} במשמרת`}
            icon={<Users className="h-4 w-4" />}
          />
        </section>

        <section className="space-y-2">
          <SectionHeader title="סטטוסים" />
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
            {STATUS_META.map((status) => {
              const Icon = status.icon;
              const count = statusCounts.get(status.id) ?? 0;
              const percent = Math.round((count / totalStatusCount) * 100);

              return (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => navigate('/deliveries')}
                  className="min-w-0 rounded-[8px] border border-app-border bg-app-surface p-3 text-right transition-colors hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#080808]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Icon className={`h-4 w-4 shrink-0 ${status.accentClassName}`} />
                    <span className="truncate text-xs font-semibold text-app-text-secondary">{status.label}</span>
                  </div>
                  <div className="mt-3 text-2xl font-bold leading-none text-app-text">{formatNumber(count)}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-surface-raised">
                    <div className={`h-full rounded-full ${status.barClassName}`} style={{ width: `${percent}%` }} />
                  </div>
                  <div className="mt-2 truncate text-[11px] text-app-text-secondary">{status.hint}</div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-2">
            <SectionHeader
              title="מסעדות"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/restaurants')}
                  className="text-xs font-semibold text-app-text-secondary transition-colors hover:text-app-text"
                >
                  הכל
                </button>
              }
            />
            <div className="space-y-2">
              {restaurantRows.length > 0 ? (
                restaurantRows.map(({ restaurant, deliveryCount, activeCount, deliveredCount }) => (
                  <button
                    key={restaurant.id}
                    type="button"
                    onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-[8px] border border-app-border bg-app-surface p-3 text-right transition-colors hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#080808]"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${restaurant.isActive ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                        <span className="min-w-0 truncate text-sm font-bold text-app-text">{restaurant.name}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-app-text-secondary">{restaurant.address}</div>
                    </div>
                    <div className="grid min-w-[7.5rem] grid-cols-3 gap-2 text-center">
                      <span>
                        <span className="block text-base font-bold text-app-text">{deliveryCount}</span>
                        <span className="block text-[10px] text-app-text-secondary">סה״כ</span>
                      </span>
                      <span>
                        <span className="block text-base font-bold text-amber-200">{activeCount}</span>
                        <span className="block text-[10px] text-app-text-secondary">פתוח</span>
                      </span>
                      <span>
                        <span className="block text-base font-bold text-emerald-200">{deliveredCount}</span>
                        <span className="block text-[10px] text-app-text-secondary">נמסר</span>
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[8px] border border-app-border bg-app-surface p-5 text-center text-sm text-app-text-secondary dark:border-app-nav-border dark:bg-[#080808]">
                  אין מסעדות לתצוגה
                </div>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <SectionHeader
              title="שליחים"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/couriers')}
                  className="text-xs font-semibold text-app-text-secondary transition-colors hover:text-app-text"
                >
                  הכל
                </button>
              }
            />
            <div className="space-y-2">
              {courierRows.length > 0 ? (
                courierRows.map(({ courier, deliveryCount, activeCount, load }) => (
                  <button
                    key={courier.id}
                    type="button"
                    onClick={() => navigate(`/courier/${courier.id}`)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-[8px] border border-app-border bg-app-surface p-3 text-right transition-colors hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#080808]"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            courier.status === 'offline'
                              ? 'bg-zinc-500'
                              : courier.status === 'busy'
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                          }`}
                        />
                        <span className="min-w-0 truncate text-sm font-bold text-app-text">{courier.name}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-app-text-secondary">
                        {courier.phone} · {courier.vehicleType} · {courier.isOnShift ? 'במשמרת' : 'מחוץ למשמרת'}
                      </div>
                    </div>
                    <div className="grid min-w-[7.5rem] grid-cols-3 gap-2 text-center">
                      <span>
                        <span className="block text-base font-bold text-app-text">{deliveryCount}</span>
                        <span className="block text-[10px] text-app-text-secondary">סה״כ</span>
                      </span>
                      <span>
                        <span className="block text-base font-bold text-blue-200">{activeCount}</span>
                        <span className="block text-[10px] text-app-text-secondary">פעיל</span>
                      </span>
                      <span>
                        <span className="block text-base font-bold text-emerald-200">{load}</span>
                        <span className="block text-[10px] text-app-text-secondary">עומס</span>
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[8px] border border-app-border bg-app-surface p-5 text-center text-sm text-app-text-secondary dark:border-app-nav-border dark:bg-[#080808]">
                  אין שליחים לתצוגה
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="space-y-2">
          <SectionHeader title="משלוחים אחרונים" />
          <div className="space-y-2">
            {latestDeliveries.length > 0 ? (
              latestDeliveries.map((delivery) => (
                <button
                  key={delivery.id}
                  type="button"
                  onClick={() => navigate(`/delivery/${delivery.id}`)}
                  className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[8px] border border-app-border bg-app-surface p-3 text-right transition-colors hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#080808]"
                >
                  <span className="text-sm font-bold text-app-text" dir="ltr">
                    #{delivery.orderNumber}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-app-text">{delivery.restaurantName}</span>
                    <span className="block truncate text-xs text-app-text-secondary">{delivery.customerName}</span>
                  </span>
                  <span className="text-xs text-app-text-secondary">{formatShortTime(getDeliveryPrimaryDate(delivery))}</span>
                </button>
              ))
            ) : (
              <div className="rounded-[8px] border border-app-border bg-app-surface p-5 text-center text-sm text-app-text-secondary dark:border-app-nav-border dark:bg-[#080808]">
                אין משלוחים לתאריך הזה
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
