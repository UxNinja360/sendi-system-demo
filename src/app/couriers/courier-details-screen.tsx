import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Activity,
  AlertCircle,
  Bike,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  FileText,
  Gauge,
  Package,
  Pencil,
  Phone,
  Power,
  Save,
  Search,
  Settings,
  Star,
  Timer,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useDelivery } from '../context/delivery-context-value';
import { ALL_STATUSES, STATUS_CONFIG, STATUS_ORDER } from '../deliveries/status-config';
import type {
  Courier,
  CourierEmploymentType,
  CourierStatus,
  CourierVehicleType,
  Delivery,
  DeliveryStatus,
} from '../types/delivery.types';
import { formatCurrency, getDeliveryCourierBasePay, sumDeliveryMoney } from '../utils/delivery-finance';
import { exportRowsToExcel, sanitizeExportFileName } from '../utils/export-utils';
import { formatOrderNumber } from '../utils/order-number';
import { formatWorkedDuration, getWorkedMinutesWithinRange } from '../utils/shift-work';

type CourierDetailsForm = {
  name: string;
  phone: string;
  vehicleType: CourierVehicleType;
  employmentType: CourierEmploymentType;
  status: CourierStatus;
  rating: string;
};

const emptyValue = '-';
const defaultSelectedStatuses = new Set<DeliveryStatus>(STATUS_ORDER);
const courierVehicleOptions: CourierVehicleType[] = ['אופנוע', 'רכב', 'קורקינט'];
const courierEmploymentOptions: CourierEmploymentType[] = ['שעתי', 'פר משלוח'];
const courierStatusOptions: Array<{ value: CourierStatus; label: string }> = [
  { value: 'available', label: 'זמין' },
  { value: 'busy', label: 'עסוק' },
  { value: 'offline', label: 'לא פעיל' },
];

const courierStatusConfig: Record<CourierStatus, { label: string; badgeClassName: string }> = {
  available: {
    label: 'זמין',
    badgeClassName: 'bg-app-success-subtle text-app-success-text',
  },
  busy: {
    label: 'עסוק',
    badgeClassName: 'bg-orange-500/10 text-orange-500',
  },
  offline: {
    label: 'לא פעיל',
    badgeClassName: 'bg-zinc-500/10 text-zinc-400',
  },
};

const createCourierDetailsForm = (courier: Courier): CourierDetailsForm => ({
  name: courier.name,
  phone: courier.phone,
  vehicleType: courier.vehicleType,
  employmentType: courier.employmentType,
  status: courier.status,
  rating: courier.rating.toString(),
});

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return emptyValue;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return emptyValue;

  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getCourierDeliverySearchText = (delivery: Delivery) =>
  [
    delivery.orderNumber,
    delivery.api_short_order_id,
    delivery.restaurantName,
    delivery.rest_name,
    delivery.customerName,
    delivery.client_name,
    delivery.address,
    delivery.client_full_address,
    STATUS_CONFIG[delivery.status].label,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const Panel = ({
  title,
  icon: Icon,
  children,
  action,
  className = '',
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <section className={`rounded-[8px] border border-app-border bg-app-surface ${className}`}>
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-app-border px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-app-text-secondary" />
        <h2 className="truncate text-sm font-semibold text-app-text">{title}</h2>
      </div>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const Metric = ({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  icon: ElementType;
  tone?: 'neutral' | 'success' | 'warning' | 'blue';
}) => {
  const toneClassName =
    tone === 'success'
      ? 'text-app-success-text bg-app-success-subtle'
      : tone === 'warning'
        ? 'text-orange-500 bg-orange-500/10'
        : tone === 'blue'
          ? 'text-blue-500 bg-blue-500/10'
          : 'text-app-text-secondary bg-app-background';

  return (
    <div className="min-w-0 border-t border-app-border px-4 py-3 sm:border-r sm:border-t-0">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-[6px] ${toneClassName}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs text-app-text-secondary">{label}</div>
          <div className="mt-0.5 truncate text-xl font-semibold text-app-text">{value}</div>
        </div>
      </div>
    </div>
  );
};

const DetailField = ({
  label,
  value,
  children,
  editing,
  dir,
}: {
  label: string;
  value: ReactNode;
  children?: ReactNode;
  editing?: boolean;
  dir?: 'rtl' | 'ltr';
}) => (
  <div className="min-w-0 border-b border-app-border py-3 last:border-b-0">
    <div className="mb-1 text-[11px] text-app-text-secondary">{label}</div>
    {editing && children ? (
      children
    ) : (
      <div className="min-h-5 truncate text-sm font-medium text-app-text" dir={dir}>
        {value || emptyValue}
      </div>
    )}
  </div>
);

const TextInput = ({
  value,
  onChange,
  dir = 'rtl',
  type = 'text',
}: {
  value: string;
  onChange: (value: string) => void;
  dir?: 'rtl' | 'ltr';
  type?: string;
}) => (
  <input
    type={type}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    dir={dir}
    className="h-9 w-full rounded-[4px] border border-app-border bg-app-background px-2.5 text-sm text-app-text outline-none transition-colors focus:border-app-brand"
  />
);

const ChecklistItem = ({ done, label }: { done: boolean; label: string }) => (
  <div
    className={`flex min-h-9 items-center justify-between gap-3 rounded-[6px] px-3 text-sm ${
      done
        ? 'bg-blue-500/15 text-blue-300'
        : 'bg-app-background text-app-text-secondary'
    }`}
  >
    <span className="min-w-0 truncate">{label}</span>
    {done ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
  </div>
);

const StatusFilterBar = ({
  selectedStatuses,
  counts,
  onToggleStatus,
  onSelectAll,
}: {
  selectedStatuses: Set<DeliveryStatus>;
  counts: Record<DeliveryStatus, number>;
  onToggleStatus: (status: DeliveryStatus) => void;
  onSelectAll: () => void;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {ALL_STATUSES.map((statusOption) => {
      const selected = selectedStatuses.has(statusOption.key);
      const StatusIcon = statusOption.icon;
      const config = STATUS_CONFIG[statusOption.key];

      return (
        <button
          key={statusOption.key}
          type="button"
          aria-pressed={selected}
          onClick={() => onToggleStatus(statusOption.key)}
          className={`inline-flex h-8 min-w-0 items-center gap-2 rounded-[6px] border px-2.5 text-xs font-semibold transition-colors ${
            selected
              ? `${config.badgeColor} border-current`
              : 'border-app-border bg-app-background text-app-text-secondary hover:text-app-text'
          }`}
        >
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{config.label}</span>
          <span className="tabular-nums">{counts[statusOption.key]}</span>
        </button>
      );
    })}
    <button
      type="button"
      onClick={onSelectAll}
      className="inline-flex h-8 items-center rounded-[6px] border border-app-border bg-app-background px-2.5 text-xs font-semibold text-app-text-secondary transition-colors hover:text-app-text"
    >
      הכל
    </button>
  </div>
);

const CourierDeliveryRow = ({
  delivery,
  onOpen,
}: {
  delivery: Delivery;
  onOpen: (deliveryId: string) => void;
}) => {
  const config = STATUS_CONFIG[delivery.status];
  const StatusIcon = config.icon;
  const restaurantName = delivery.restaurantName || delivery.rest_name || emptyValue;
  const customerName = delivery.customerName || delivery.client_name || emptyValue;
  const customerAddress = delivery.address || delivery.client_full_address || emptyValue;

  return (
    <button
      type="button"
      onClick={() => onOpen(delivery.id)}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-app-border px-3 py-3 text-right transition-colors last:border-b-0 hover:bg-app-surface-raised md:grid-cols-[minmax(112px,150px)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(96px,136px)] md:px-4"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-app-text">
          {formatOrderNumber(delivery.orderNumber)}
        </span>
        <span className="mt-1 block truncate text-xs text-app-text-secondary" dir="ltr">
          {formatDateTime(delivery.createdAt)}
        </span>
      </span>

      <span className="hidden min-w-0 md:block">
        <span className="block truncate text-sm font-medium text-app-text">{restaurantName}</span>
        <span className="mt-1 block truncate text-xs text-app-text-secondary">{customerName}</span>
      </span>

      <span className="hidden min-w-0 md:block">
        <span className="block truncate text-xs text-app-text-secondary">כתובת מסירה</span>
        <span className="mt-1 block truncate text-sm font-medium text-app-text">{customerAddress}</span>
      </span>

      <span className="flex min-w-0 flex-col items-end gap-1 md:items-start">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${config.badgeColor}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {config.label}
        </span>
        <span className="text-xs font-medium text-app-text">
          {formatCurrency(getDeliveryCourierBasePay(delivery))}
        </span>
      </span>

      <span className="col-span-2 min-w-0 text-right md:hidden">
        <span className="block truncate text-xs text-app-text-secondary">
          {restaurantName} · {customerName} · {customerAddress}
        </span>
      </span>
    </button>
  );
};

const createEmptyStatusCounts = (): Record<DeliveryStatus, number> => ({
  pending: 0,
  assigned: 0,
  delivering: 0,
  delivered: 0,
  cancelled: 0,
  expired: 0,
});

export function CourierDetailsScreen() {
  const { courierId } = useParams<{ courierId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useDelivery();
  const courier = state.couriers.find((item) => item.id === courierId);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deliverySearch, setDeliverySearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<DeliveryStatus>>(
    () => new Set(defaultSelectedStatuses),
  );
  const [form, setForm] = useState<CourierDetailsForm | null>(null);

  const courierDeliveries = useMemo(
    () =>
      courier
        ? state.deliveries.filter((delivery) =>
            delivery.courierId === courier.id ||
            delivery.runner_id === courier.id ||
            delivery.courierName === courier.name
          )
        : [],
    [courier, state.deliveries],
  );

  const activeDeliveries = useMemo(
    () => courierDeliveries.filter((delivery) => !['delivered', 'cancelled', 'expired'].includes(delivery.status)),
    [courierDeliveries],
  );
  const completedDeliveries = useMemo(
    () => courierDeliveries.filter((delivery) => delivery.status === 'delivered'),
    [courierDeliveries],
  );
  const cancelledDeliveries = useMemo(
    () => courierDeliveries.filter((delivery) => delivery.status === 'cancelled'),
    [courierDeliveries],
  );

  const statusCounts = useMemo(() => {
    const counts = createEmptyStatusCounts();
    courierDeliveries.forEach((delivery) => {
      counts[delivery.status] += 1;
    });
    return counts;
  }, [courierDeliveries]);

  const sortedDeliveries = useMemo(
    () => [...courierDeliveries].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    [courierDeliveries],
  );

  const visibleDeliveries = useMemo(() => {
    const search = deliverySearch.trim().toLowerCase();

    return sortedDeliveries.filter((delivery) => {
      const matchesStatus = selectedStatuses.has(delivery.status);
      const matchesSearch = !search || getCourierDeliverySearchText(delivery).includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [deliverySearch, selectedStatuses, sortedDeliveries]);

  const shiftAssignments = useMemo(
    () =>
      state.shifts.flatMap((shift) =>
        shift.courierAssignments
          .filter((assignment) => assignment.courierId === courierId)
          .map((assignment) => ({
            ...assignment,
            shiftDate: shift.date,
          }))
      ),
    [state.shifts, courierId],
  );

  useEffect(() => {
    if (!courier) return;
    setForm(createCourierDetailsForm(courier));
  }, [courier]);

  if (!courier) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-app-background p-8 text-center">
        <Bike className="h-12 w-12 text-app-text-muted" />
        <p className="text-sm text-app-text-secondary">שליח לא נמצא</p>
        <button
          type="button"
          onClick={() => navigate('/couriers')}
          className="rounded-[4px] border border-app-border px-3 py-2 text-sm text-app-text transition-colors hover:bg-app-surface-raised"
        >
          חזרה לשליחים
        </button>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex h-full items-center justify-center bg-app-background text-sm text-app-text-secondary">
        טוען פרטי שליח...
      </div>
    );
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const todayWorkedMinutes = shiftAssignments.reduce(
    (sum, assignment) => sum + getWorkedMinutesWithinRange(assignment, todayStart, tomorrowStart),
    0,
  );
  const weekWorkedMinutes = shiftAssignments.reduce(
    (sum, assignment) => sum + getWorkedMinutesWithinRange(assignment, weekStart, now),
    0,
  );
  const todayDeliveries = completedDeliveries.filter((delivery) => {
    const date = delivery.deliveredAt ?? delivery.createdAt;
    return date >= todayStart && date < tomorrowStart;
  });
  const totalEarnings = sumDeliveryMoney(completedDeliveries, getDeliveryCourierBasePay);
  const activeEarnings = sumDeliveryMoney(activeDeliveries, getDeliveryCourierBasePay);
  const completionRate =
    courierDeliveries.length > 0 ? Math.round((completedDeliveries.length / courierDeliveries.length) * 100) : 0;
  const averageCourierPay =
    completedDeliveries.length > 0 ? Math.round(totalEarnings / completedDeliveries.length) : 0;
  const statusBadge = courierStatusConfig[courier.status];
  const checklist = [
    { label: 'פרטי קשר מלאים', done: Boolean(form.name && form.phone) },
    { label: 'זמין או במשמרת', done: courier.status !== 'offline' || courier.isOnShift },
    { label: 'אין עומס חריג', done: activeDeliveries.length <= 2 },
    { label: 'דירוג תקין', done: courier.rating >= 4 },
  ];
  const completedChecklistItems = checklist.filter((item) => item.done).length;

  const updateForm = <Key extends keyof CourierDetailsForm>(key: Key, value: CourierDetailsForm[Key]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleCancelEdit = () => {
    setForm(createCourierDetailsForm(courier));
    setEditing(false);
  };

  const handleSave = () => {
    const nextName = form.name.trim();
    const nextPhone = form.phone.trim();
    const nextRating = Number(form.rating);

    if (!nextName || !nextPhone) {
      toast.error('שם וטלפון הם שדות חובה.');
      return;
    }

    if (!Number.isFinite(nextRating) || nextRating < 0 || nextRating > 5) {
      toast.error('דירוג שליח חייב להיות בין 0 ל-5.');
      return;
    }

    dispatch({
      type: 'UPDATE_COURIER',
      payload: {
        courierId: courier.id,
        updates: {
          name: nextName,
          phone: nextPhone,
          vehicleType: form.vehicleType,
          employmentType: form.employmentType,
          rating: nextRating,
        },
      },
    });

    if (form.status !== courier.status) {
      dispatch({
        type: 'UPDATE_COURIER_STATUS',
        payload: {
          courierId: courier.id,
          status: form.status,
        },
      });
    }

    setEditing(false);
    toast.success('פרטי השליח עודכנו');
  };

  const handleToggleAvailability = () => {
    dispatch({
      type: 'UPDATE_COURIER_STATUS',
      payload: {
        courierId: courier.id,
        status: courier.status === 'offline' ? 'available' : 'offline',
      },
    });
  };

  const handleToggleStatus = (status: DeliveryStatus) => {
    setSelectedStatuses((current) => {
      const next = new Set(current);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }

      return next.size > 0 ? next : new Set([status]);
    });
  };

  const handleSelectAllStatuses = () => {
    setSelectedStatuses(new Set(ALL_STATUSES.map((status) => status.key)));
  };

  const handleExportVisibleDeliveries = () => {
    if (visibleDeliveries.length === 0) {
      toast.error('אין משלוחים לייצוא');
      return;
    }

    exportRowsToExcel({
      rows: visibleDeliveries.map((delivery) => ({
        'מספר משלוח': formatOrderNumber(delivery.orderNumber),
        'תאריך יצירה': formatDateTime(delivery.createdAt),
        'סטטוס': STATUS_CONFIG[delivery.status].label,
        'מסעדה': delivery.restaurantName || delivery.rest_name || emptyValue,
        'לקוח': delivery.customerName || delivery.client_name || emptyValue,
        'כתובת מסירה': delivery.address || delivery.client_full_address || emptyValue,
        'תשלום לשליח': getDeliveryCourierBasePay(delivery),
      })),
      sheetName: 'היסטוריית משלוחים',
      fileName: `${sanitizeExportFileName(courier.name, 'courier')}-deliveries.xlsx`,
      columnWidths: [16, 18, 16, 24, 22, 38, 16],
    });
    toast.success(`יוצאו ${visibleDeliveries.length.toLocaleString('he-IL')} משלוחים`);
  };

  return (
    <div className="flex h-full flex-col bg-app-background" dir="rtl">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-4">
          <header className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <div className="min-w-0 p-4">
                <div className="mb-3 text-xs font-semibold text-app-text-secondary">פרופיל שליח</div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold text-app-text">{courier.name}</h1>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge.badgeClassName}`}>
                    {statusBadge.label}
                  </span>
                  <span className="rounded-full bg-app-background px-2.5 py-1 text-xs font-medium text-app-text-secondary">
                    {courier.vehicleType}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-app-text-secondary md:grid-cols-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate" dir="ltr">{courier.phone}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Bike className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{courier.employmentType}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{courier.rating.toFixed(1)} / 5</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{courier.isOnShift ? 'במשמרת' : 'לא במשמרת'}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 border-t border-app-border sm:grid-cols-2 lg:border-r lg:border-t-0">
                <Metric label="סה״כ משלוחים" value={courierDeliveries.length.toLocaleString('he-IL')} icon={Package} tone="warning" />
                <Metric label="הושלמו" value={completedDeliveries.length.toLocaleString('he-IL')} icon={CheckCircle2} tone="success" />
                <Metric label="שכר מצטבר" value={formatCurrency(totalEarnings)} icon={CreditCard} tone="blue" />
                <Metric label="אחוז השלמה" value={`${completionRate}%`} icon={Gauge} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen((current) => !current)}
              className="flex min-h-12 w-full items-center justify-between gap-3 border-t border-app-border px-4 text-right text-sm font-semibold text-app-text transition-colors hover:bg-app-surface-raised"
            >
              <span className="flex min-w-0 items-center gap-2">
                {settingsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span>פרטים ועריכה</span>
                <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300">
                  {statusBadge.label}
                </span>
              </span>
              <Settings className="h-4 w-4 text-app-text-secondary" />
            </button>
          </header>

          {settingsOpen ? (
            <section className="space-y-4">
              <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-[8px] border border-app-border bg-app-surface px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Settings className="h-4 w-4 text-app-text-secondary" />
                  <h2 className="truncate text-sm font-semibold text-app-text">ניהול פרטי שליח</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleAvailability}
                    className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                  >
                    <Power className="h-4 w-4" />
                    {courier.status === 'offline' ? 'הפוך לזמין' : 'הורד מזמינות'}
                  </button>
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                      >
                        <X className="h-4 w-4" />
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-app-brand-solid px-3 text-sm font-semibold text-app-background transition-colors hover:bg-app-brand-hover"
                      >
                        <Save className="h-4 w-4" />
                        שמור
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                    >
                      <Pencil className="h-4 w-4" />
                      עריכה
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.45fr)]">
                <Panel title="פרופיל שליח" icon={UserRound}>
                  <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                    <DetailField label="שם מלא" value={courier.name} editing={editing}>
                      <TextInput value={form.name} onChange={(value) => updateForm('name', value)} />
                    </DetailField>
                    <DetailField label="טלפון" value={courier.phone} editing={editing} dir="ltr">
                      <TextInput value={form.phone} onChange={(value) => updateForm('phone', value)} dir="ltr" />
                    </DetailField>
                    <DetailField label="כלי רכב" value={courier.vehicleType} editing={editing}>
                      <select
                        value={form.vehicleType}
                        onChange={(event) => updateForm('vehicleType', event.target.value as CourierVehicleType)}
                        className="h-9 w-full rounded-[4px] border border-app-border bg-app-background px-2.5 text-sm text-app-text outline-none focus:border-app-brand"
                      >
                        {courierVehicleOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </DetailField>
                    <DetailField label="שיטת העסקה" value={courier.employmentType} editing={editing}>
                      <select
                        value={form.employmentType}
                        onChange={(event) => updateForm('employmentType', event.target.value as CourierEmploymentType)}
                        className="h-9 w-full rounded-[4px] border border-app-border bg-app-background px-2.5 text-sm text-app-text outline-none focus:border-app-brand"
                      >
                        {courierEmploymentOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </DetailField>
                    <DetailField label="סטטוס" value={statusBadge.label} editing={editing}>
                      <select
                        value={form.status}
                        onChange={(event) => updateForm('status', event.target.value as CourierStatus)}
                        className="h-9 w-full rounded-[4px] border border-app-border bg-app-background px-2.5 text-sm text-app-text outline-none focus:border-app-brand"
                      >
                        {courierStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </DetailField>
                    <DetailField label="דירוג" value={`${courier.rating.toFixed(1)} / 5`} editing={editing}>
                      <TextInput value={form.rating} onChange={(value) => updateForm('rating', value)} dir="ltr" type="number" />
                    </DetailField>
                  </div>
                </Panel>

                <aside className="space-y-4">
                  <Panel title="בדיקות פרופיל" icon={AlertCircle}>
                    <div className="space-y-2">
                      {checklist.map((item) => (
                        <ChecklistItem key={item.label} done={item.done} label={item.label} />
                      ))}
                    </div>
                  </Panel>
                  <Panel title="מזהים" icon={FileText}>
                    <div className="space-y-3">
                      <DetailField label="מזהה פנימי" value={courier.id} dir="ltr" />
                      <DetailField label="משמרת נוכחית" value={courier.currentShiftAssignmentId ?? emptyValue} dir="ltr" />
                      <DetailField label="משלוחים פתוחים" value={activeDeliveries.length.toLocaleString('he-IL')} />
                    </div>
                  </Panel>
                </aside>
              </div>
            </section>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel
              title="סיכום משלוחים"
              icon={Package}
              action={<span className="rounded-full bg-app-background px-2 py-0.5 text-xs text-app-text-secondary">{courierDeliveries.length.toLocaleString('he-IL')}</span>}
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <DetailField label="סה״כ במערכת" value={courierDeliveries.length.toLocaleString('he-IL')} />
                <DetailField label="הושלמו" value={completedDeliveries.length.toLocaleString('he-IL')} />
                <DetailField label="בוטלו" value={cancelledDeliveries.length.toLocaleString('he-IL')} />
                <DetailField label="אחוז השלמה" value={`${completionRate}%`} />
              </div>
            </Panel>

            <Panel title="עבודה וזמינות" icon={Activity}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <DetailField label="סטטוס" value={statusBadge.label} />
                <DetailField label="במשמרת" value={courier.isOnShift ? 'כן' : 'לא'} />
                <DetailField label="שעות היום" value={formatWorkedDuration(todayWorkedMinutes)} />
                <DetailField label="שעות השבוע" value={formatWorkedDuration(weekWorkedMinutes)} />
              </div>
            </Panel>

            <Panel title="כספים" icon={CreditCard}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <DetailField label="שכר מצטבר" value={formatCurrency(totalEarnings)} />
                <DetailField label="שכר פתוח" value={formatCurrency(activeEarnings)} />
                <DetailField label="ממוצע לשליחות" value={formatCurrency(averageCourierPay)} />
                <DetailField label="נמסרו היום" value={todayDeliveries.length.toLocaleString('he-IL')} />
              </div>
            </Panel>
          </div>

          <section className="min-h-[360px] rounded-[8px] border border-app-border bg-app-surface">
            <div className="flex flex-col gap-3 border-b border-app-border px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-app-text">היסטוריית משלוחים</h2>
                  <p className="mt-1 text-xs text-app-text-secondary">
                    {visibleDeliveries.length.toLocaleString('he-IL')} מתוך {courierDeliveries.length.toLocaleString('he-IL')} משלוחים לפי הסינון הנוכחי
                  </p>
                </div>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleExportVisibleDeliveries}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                  >
                    <Download className="h-4 w-4" />
                    ייצוא מסוננים
                  </button>
                  <div className="relative min-w-0 sm:w-[320px]">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-secondary" />
                    <input
                      value={deliverySearch}
                      onChange={(event) => setDeliverySearch(event.target.value)}
                      placeholder="חיפוש משלוח..."
                      className="h-9 w-full rounded-[6px] border border-app-border bg-app-background pr-9 pl-3 text-sm text-app-text outline-none transition-colors placeholder:text-app-text-muted focus:border-app-brand"
                    />
                  </div>
                </div>
              </div>
              <StatusFilterBar
                counts={statusCounts}
                selectedStatuses={selectedStatuses}
                onToggleStatus={handleToggleStatus}
                onSelectAll={handleSelectAllStatuses}
              />
            </div>

            <div className="min-h-0">
              {visibleDeliveries.length > 0 ? (
                visibleDeliveries.map((delivery) => (
                  <CourierDeliveryRow
                    key={delivery.id}
                    delivery={delivery}
                    onOpen={(deliveryId) => navigate(`/delivery/${deliveryId}`)}
                  />
                ))
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-4 text-center">
                  <Package className="h-10 w-10 text-app-text-muted" />
                  <div>
                    <div className="text-sm font-semibold text-app-text">אין משלוחים להצגה</div>
                    <div className="mt-1 text-sm text-app-text-secondary">אפשר לשנות סטטוס או לחפש מספר הזמנה אחר.</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
