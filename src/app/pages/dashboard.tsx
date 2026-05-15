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
import type { Courier, Delivery, DeliveryStatus } from '../types/delivery.types';

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
  normalizeText(
    [
      delivery.orderNumber,
      delivery.restaurantName,
      delivery.customerName,
      delivery.address,
      delivery.customerPhone,
      delivery.courierName,
      courier?.name,
    ].join(' '),
  );

const SummaryTile: React.FC<{
  label: string;
  value: React.ReactNode;
  detail: React.ReactNode;
  icon: React.ReactNode;
}> = ({ label, value, detail, icon }) => (
  <div className="min-w-0 rounded-[8px] border border-app-border bg-app-surface px-3 py-3 dark:border-app-nav-border dark:bg-[#080808]">
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-xs font-semibold text-app-text-secondary">
        {label}
      </span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-app-surface-raised text-app-text-secondary">
        {icon}
      </span>
    </div>
    <div className="mt-2 text-2xl font-bold leading-none text-app-text">{value}</div>
    <div className="mt-1 min-h-4 truncate text-xs text-app-text-secondary">{detail}</div>
  </div>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center justify-between gap-3">
    <h2 className="text-sm font-bold text-app-text">{title}</h2>
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
        delivery.status === 'delivered' ||
          delivery.status === 'cancelled' ||
          delivery.status === 'expired'
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
        if (
          delivery.status === 'delivered' ||
          delivery.status === 'cancelled' ||
          delivery.status === 'expired'
        ) {
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
  const completedDeliveries = filteredDeliveries.filter(
    (delivery) => delivery.status === 'delivered',
  );
  const connectedCouriers = state.couriers.filter((courier) => courier.status !== 'offline');
  const onShiftCouriers = state.couriers.filter((courier) => courier.isOnShift);
  const activeRestaurants = state.restaurants.filter((restaurant) => restaurant.isActive);
  const visibleRestaurantIds = new Set(
    filteredDeliveries.map((delivery) => delivery.restaurantId).filter(Boolean),
  );
  const busiestRestaurantCount = activeRestaurants.filter((restaurant) =>
    visibleRestaurantIds.has(restaurant.id),
  ).length;
  const totalStatusCount = Math.max(filteredDeliveries.length, 1);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-app-background text-app-text" dir="rtl">
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

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 pb-[calc(2rem+env(safe-area-inset-bottom))] md:px-6 md:pb-8">
        <div className="mx-auto w-full max-w-[92rem] space-y-4">
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
                      <span className="truncate text-xs font-semibold text-app-text-secondary">
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-3 text-2xl font-bold leading-none text-app-text">
                      {formatNumber(count)}
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-surface-raised">
                      <div
                        className={`h-full rounded-full ${status.barClassName}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="mt-2 truncate text-[11px] text-app-text-secondary">
                      {status.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
