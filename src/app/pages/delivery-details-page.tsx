import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock,
  ClockAlert,
  Copy,
  CreditCard,
  FileText,
  MapPin,
  Navigation,
  Package,
  Save,
  Settings,
  Store,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { useDelivery } from '../context/delivery-context-value';
import type { Courier, Delivery, DeliveryStatus, Restaurant } from '../types/delivery.types';
import { formatCurrency, getDeliveryCustomerCharge } from '../utils/delivery-finance';
import { formatOrderNumber } from '../utils/order-number';

type DeliveryDetailsForm = {
  status: DeliveryStatus;
  restaurantName: string;
  restaurantAddress: string;
  customerName: string;
  customerPhone: string;
  address: string;
  area: string;
  price: string;
  restaurantPrice: string;
  courierPayment: string;
  preparationTime: string;
  maxDeliveryTime: string;
  deliveryNotes: string;
  orderNotes: string;
};

type DeliveryDetailsTab = 'overview' | 'edit';

type StatusConfig = {
  label: string;
  icon: ElementType;
  badgeClassName: string;
};

const STATUS_CONFIG: Record<DeliveryStatus, StatusConfig> = {
  pending: {
    label: 'ממתין לשיבוץ',
    icon: AlertCircle,
    badgeClassName: 'bg-orange-500/10 text-orange-500',
  },
  assigned: {
    label: 'שובץ לשליח',
    icon: Navigation,
    badgeClassName: 'bg-yellow-500/10 text-yellow-500',
  },
  delivering: {
    label: 'בדרך ללקוח',
    icon: Bike,
    badgeClassName: 'bg-green-500/10 text-green-500',
  },
  delivered: {
    label: 'נמסר ללקוח',
    icon: CheckCircle2,
    badgeClassName: 'bg-blue-500/10 text-blue-500',
  },
  cancelled: {
    label: 'בוטל',
    icon: XCircle,
    badgeClassName: 'bg-red-500/10 text-red-500',
  },
  expired: {
    label: 'פג תוקף',
    icon: ClockAlert,
    badgeClassName: 'bg-zinc-500/10 text-zinc-400',
  },
};

const STATUS_OPTIONS: Array<{ value: DeliveryStatus; label: string }> = [
  { value: 'pending', label: STATUS_CONFIG.pending.label },
  { value: 'assigned', label: STATUS_CONFIG.assigned.label },
  { value: 'delivering', label: STATUS_CONFIG.delivering.label },
  { value: 'delivered', label: STATUS_CONFIG.delivered.label },
  { value: 'cancelled', label: STATUS_CONFIG.cancelled.label },
  { value: 'expired', label: STATUS_CONFIG.expired.label },
];

const emptyValue = '—';

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

const formatMinutes = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value} דק׳` : emptyValue;

const formatDuration = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return emptyValue;

  const totalMinutes = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} דק׳`;

  const hoursLabel = hours === 1 ? '1 שעה' : `${hours} שעות`;
  return minutes ? `${hoursLabel} ו-${minutes} דק׳` : hoursLabel;
};

const toInputNumber = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const getRestaurantForDelivery = (
  delivery: Delivery,
  restaurants: Restaurant[],
) =>
  restaurants.find((restaurant) =>
    restaurant.id === delivery.restaurantId ||
    restaurant.id === delivery.rest_id ||
    restaurant.name === delivery.restaurantName ||
    restaurant.name === delivery.rest_name
  ) ?? null;

const getCourierForDelivery = (
  delivery: Delivery,
  couriers: Courier[],
) => {
  const courierId = delivery.courierId ?? delivery.runner_id ?? null;
  if (!courierId) return null;
  return couriers.find((courier) => courier.id === courierId) ?? null;
};

const createFormFromDelivery = (delivery: Delivery): DeliveryDetailsForm => ({
  status: delivery.status,
  restaurantName: delivery.restaurantName || delivery.rest_name || '',
  restaurantAddress: delivery.restaurantAddress || [delivery.rest_street, delivery.rest_city].filter(Boolean).join(', '),
  customerName: delivery.customerName || delivery.client_name || '',
  customerPhone: delivery.customerPhone || delivery.client_phone || '',
  address: delivery.address || delivery.client_full_address || '',
  area: delivery.area || '',
  price: toInputNumber(delivery.price ?? delivery.sum_cash),
  restaurantPrice: toInputNumber(delivery.restaurantPrice ?? delivery.rest_price),
  courierPayment: toInputNumber(delivery.courierPayment ?? delivery.runner_price),
  preparationTime: toInputNumber(delivery.preparationTime ?? delivery.cook_time),
  maxDeliveryTime: toInputNumber(delivery.maxDeliveryTime ?? delivery.max_time_to_deliver),
  deliveryNotes: delivery.deliveryNotes || delivery.comment || '',
  orderNotes: delivery.orderNotes || delivery.client_comment || '',
});

const Panel = ({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
  action?: ReactNode;
}) => (
  <section className="rounded-[8px] border border-app-border bg-app-surface">
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-app-border px-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-app-text-secondary" />
        <h2 className="text-sm font-semibold text-app-text">{title}</h2>
      </div>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

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
  <div className="min-w-0 rounded-[6px] border border-app-border bg-app-background px-3 py-2.5">
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
}: {
  value: string;
  onChange: (value: string) => void;
  dir?: 'rtl' | 'ltr';
}) => (
  <input
    value={value}
    onChange={(event) => onChange(event.target.value)}
    dir={dir}
    className="h-9 w-full rounded-[4px] border border-app-border bg-app-surface px-2.5 text-sm text-app-text outline-none transition-colors focus:border-app-brand"
  />
);

const StatusBadge = ({ config }: { config: StatusConfig }) => {
  const Icon = config.icon;

  return (
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-semibold ${config.badgeClassName}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
};

const OverviewActionButton = ({
  children,
  icon: Icon,
  onClick,
  primary,
}: {
  children: ReactNode;
  icon: ElementType;
  onClick: () => void;
  primary?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex h-8 items-center gap-2 rounded-[4px] px-3 text-sm font-medium transition-colors ${
      primary
        ? 'bg-app-brand-solid text-app-background hover:bg-app-brand-hover'
        : 'border border-app-border bg-app-background text-app-text hover:bg-app-surface-raised'
    }`}
  >
    <Icon className="h-4 w-4" />
    {children}
  </button>
);

const OverviewPanel = ({
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
  <section className={`overflow-hidden rounded-[8px] border border-app-border bg-app-surface ${className}`}>
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-app-border px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-app-text-secondary" />
        <h2 className="truncate text-sm font-semibold text-app-text">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const OverviewMetric = ({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'default',
  dir,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon: ElementType;
  tone?: 'default' | 'success' | 'warning' | 'info';
  dir?: 'rtl' | 'ltr';
}) => {
  const toneClassName = {
    default: 'text-app-text-secondary',
    success: 'text-app-success-text',
    warning: 'text-app-warning-text',
    info: 'text-app-info-text',
  }[tone];

  return (
    <div className="min-w-0 px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-app-text-secondary">
        <Icon className={`h-3.5 w-3.5 ${toneClassName}`} />
        <span>{label}</span>
      </div>
      <div className="truncate text-xl font-semibold tabular-nums text-app-text" dir={dir}>
        {value || emptyValue}
      </div>
      {detail ? <div className="mt-1 truncate text-xs text-app-text-muted">{detail}</div> : null}
    </div>
  );
};

const RouteStop = ({
  label,
  title,
  subtitle,
  meta,
  icon: Icon,
}: {
  label: string;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  icon: ElementType;
}) => (
  <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 px-4 py-3">
    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[4px] border border-app-border bg-app-background text-app-text-secondary">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-app-text-muted">{label}</div>
        {meta ? <div className="text-xs text-app-text-secondary">{meta}</div> : null}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-app-text">{title || emptyValue}</div>
      {subtitle ? <div className="mt-1 truncate text-xs text-app-text-secondary">{subtitle}</div> : null}
    </div>
  </div>
);

type OverviewTimelineStep = {
  label: string;
  done: boolean;
  time?: Date | string | null;
};

const TimelineOverview = ({
  steps,
  formatTime,
}: {
  steps: OverviewTimelineStep[];
  formatTime: (value?: Date | string | null) => string;
}) => (
  <ol className="grid grid-cols-1 divide-y divide-app-border lg:grid-cols-6 lg:divide-x lg:divide-x-reverse lg:divide-y-0">
    {steps.map((step, index) => (
      <li key={step.label} className="min-w-0 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              step.done
                ? 'bg-app-brand-solid text-app-background'
                : 'border border-app-border bg-app-background text-app-text-muted'
            }`}
          >
            {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <span className="text-xs tabular-nums text-app-text-muted">{index + 1}</span>
        </div>
        <div className={`mt-2 truncate text-sm ${step.done ? 'font-semibold text-app-text' : 'text-app-text-secondary'}`}>
          {step.label}
        </div>
        <div className="mt-1 truncate text-xs tabular-nums text-app-text-muted" dir="ltr">
          {formatTime(step.time)}
        </div>
      </li>
    ))}
  </ol>
);

const InfoLine = ({
  label,
  value,
  dir,
  strong,
}: {
  label: string;
  value: ReactNode;
  dir?: 'rtl' | 'ltr';
  strong?: boolean;
}) => (
  <div className="flex min-h-10 items-center justify-between gap-4 border-b border-app-border px-4 py-2.5 last:border-b-0">
    <span className="shrink-0 text-xs text-app-text-secondary">{label}</span>
    <span
      className={`min-w-0 truncate text-left text-sm ${strong ? 'font-semibold text-app-text' : 'font-medium text-app-text-secondary'}`}
      dir={dir}
    >
      {value || emptyValue}
    </span>
  </div>
);

export function DeliveryDetailsPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useDelivery();
  const delivery = state.deliveries.find((item) => item.id === deliveryId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<DeliveryDetailsForm | null>(null);
  const [activeTab, setActiveTab] = useState<DeliveryDetailsTab>('overview');

  const restaurant = useMemo(
    () => (delivery ? getRestaurantForDelivery(delivery, state.restaurants) : null),
    [delivery, state.restaurants],
  );

  const courier = useMemo(
    () => (delivery ? getCourierForDelivery(delivery, state.couriers) : null),
    [delivery, state.couriers],
  );

  const pendingCourier = useMemo(() => {
    if (!delivery?.pending_runner_id) return null;
    return state.couriers.find((item) => item.id === delivery.pending_runner_id) ?? null;
  }, [delivery?.pending_runner_id, state.couriers]);

  useEffect(() => {
    if (!delivery) return;
    setForm(createFormFromDelivery(delivery));
  }, [delivery]);

  if (!delivery || !form) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-app-background p-8 text-center">
        <Package className="h-12 w-12 text-app-text-muted" />
        <p className="text-sm text-app-text-secondary">משלוח לא נמצא</p>
        <button
          onClick={() => navigate('/deliveries')}
          className="rounded-[4px] border border-app-border px-3 py-2 text-sm text-app-text transition-colors hover:bg-app-surface-raised"
        >
          חזרה למשלוחים
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[form.status] ?? STATUS_CONFIG.pending;
  const orderNumberLabel = formatOrderNumber(delivery.orderNumber);
  const createdAt = new Date(delivery.createdAt);
  const lifecycleEndAt = delivery.deliveredAt ?? delivery.cancelledAt ?? delivery.expiredAt ?? null;
  const lifecycleEndDate = lifecycleEndAt ? new Date(lifecycleEndAt) : new Date();
  const elapsedMinutes = Number.isNaN(createdAt.getTime()) || Number.isNaN(lifecycleEndDate.getTime())
    ? null
    : Math.max(0, Math.floor((lifecycleEndDate.getTime() - createdAt.getTime()) / 60000));
  const elapsedLabel = formatDuration(elapsedMinutes);
  const courierName = courier?.name ?? pendingCourier?.name ?? delivery.courierName ?? emptyValue;
  const approvalLabel = delivery.is_requires_approval
    ? delivery.is_approved
      ? 'אושר על ידי השליח'
      : 'ממתין לאישור שליח'
    : 'לא נדרש אישור';
  const etaLabel = delivery.estimatedArrivalAtCustomer
    ? formatDateTime(delivery.estimatedArrivalAtCustomer)
    : formatMinutes(delivery.estimatedTime);
  const distanceLabel = delivery.delivery_distance ? `${delivery.delivery_distance.toFixed(1)} ק״מ` : 'מרחק לא חושב';

  const timelineSteps = [
    { label: 'הזמנה התקבלה', done: true, time: delivery.createdAt },
    { label: 'שליח שובץ', done: Boolean(delivery.assignedAt) || delivery.status !== 'pending', time: delivery.assignedAt },
    { label: 'הגיע למסעדה', done: Boolean(delivery.arrivedAtRestaurantAt), time: delivery.arrivedAtRestaurantAt },
    { label: 'נאסף מהמסעדה', done: Boolean(delivery.pickedUpAt) || ['delivering', 'delivered'].includes(delivery.status), time: delivery.pickedUpAt },
    { label: 'הגיע ללקוח', done: Boolean(delivery.arrivedAtCustomerAt), time: delivery.arrivedAtCustomerAt },
    { label: 'נמסר ללקוח', done: delivery.status === 'delivered', time: delivery.deliveredAt },
  ];
  const completedSteps = timelineSteps.filter((step) => step.done).length;
  const isEditView = activeTab === 'edit' || editing;
  const progressPercent = Math.round((completedSteps / timelineSteps.length) * 100);
  const customerCharge = getDeliveryCustomerCharge(delivery);
  const restaurantCharge = delivery.restaurantPrice ?? delivery.rest_price ?? 0;
  const courierPayment = delivery.courierPayment ?? delivery.runner_price ?? 0;
  const restaurantAddress = form.restaurantAddress || restaurant?.address || emptyValue;
  const customerStructuredAddress = [delivery.client_city, delivery.client_street, delivery.client_building]
    .filter(Boolean)
    .join(', ');
  const customerAddress = form.address || customerStructuredAddress || emptyValue;
  const customerAccess = [
    delivery.client_entry ? `כניסה ${delivery.client_entry}` : null,
    delivery.client_floor ? `קומה ${delivery.client_floor}` : null,
    delivery.client_apartment ? `דירה ${delivery.client_apartment}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const sourceLabel = delivery.source_platform ?? delivery.api_source ?? delivery.api_type ?? emptyValue;
  const deliveryNotes = [
    form.deliveryNotes ? `משלוח: ${form.deliveryNotes}` : null,
    form.orderNotes ? `לקוח: ${form.orderNotes}` : null,
    delivery.runner_took_comment ? `שליח באיסוף: ${delivery.runner_took_comment}` : null,
    delivery.runner_delivered_comment ? `שליח במסירה: ${delivery.runner_delivered_comment}` : null,
  ].filter(Boolean) as string[];

  const updateForm = <Key extends keyof DeliveryDetailsForm>(key: Key, value: DeliveryDetailsForm[Key]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleCancelEdit = () => {
    setForm(createFormFromDelivery(delivery));
    setEditing(false);
    setActiveTab('overview');
  };

  const handleSave = () => {
    const customerName = form.customerName.trim();
    const customerPhone = form.customerPhone.trim();
    const address = form.address.trim();
    const restaurantName = form.restaurantName.trim();

    if (!restaurantName || !customerName || !customerPhone || !address) {
      toast.error('שם מסעדה, שם לקוח, טלפון וכתובת מסירה הם שדות חובה.');
      return;
    }

    const nextPrice = parseOptionalNumber(form.price);
    const nextRestaurantPrice = parseOptionalNumber(form.restaurantPrice);
    const nextCourierPayment = parseOptionalNumber(form.courierPayment);
    const nextPreparationTime = parseOptionalNumber(form.preparationTime);
    const nextMaxDeliveryTime = parseOptionalNumber(form.maxDeliveryTime);

    dispatch({
      type: 'UPDATE_DELIVERY',
      payload: {
        deliveryId: delivery.id,
        updates: {
          status: form.status,
          restaurantName,
          rest_name: restaurantName,
          restaurantAddress: form.restaurantAddress.trim(),
          customerName,
          client_name: customerName,
          customerPhone,
          client_phone: customerPhone,
          address,
          client_full_address: address,
          area: form.area.trim(),
          price: nextPrice ?? delivery.price,
          sum_cash: nextPrice,
          restaurantPrice: nextRestaurantPrice,
          rest_price: nextRestaurantPrice,
          courierPayment: nextCourierPayment,
          runner_price: nextCourierPayment,
          preparationTime: nextPreparationTime,
          cook_time: nextPreparationTime,
          maxDeliveryTime: nextMaxDeliveryTime,
          max_time_to_deliver: nextMaxDeliveryTime,
          deliveryNotes: form.deliveryNotes.trim(),
          comment: form.deliveryNotes.trim(),
          orderNotes: form.orderNotes.trim(),
          client_comment: form.orderNotes.trim(),
        },
      },
    });

    setEditing(false);
    setActiveTab('overview');
    toast.success('פרטי המשלוח עודכנו');
  };

  const handleCopyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(orderNumberLabel);
      toast.success('מספר המשלוח הועתק');
    } catch {
      toast.error('לא הצלחתי להעתיק את מספר המשלוח');
    }
  };

  return (
    <div className="flex h-full flex-col bg-app-background" dir="rtl">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-4">
          <div className="space-y-4">
            <header className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface">
                <div className="flex flex-col gap-4 p-4 lg:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate('/deliveries')}
                          className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                        >
                          <ArrowRight className="h-4 w-4" />
                          משלוחים
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyOrderNumber}
                          className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-semibold tabular-nums text-app-text transition-colors hover:bg-app-surface-raised"
                          dir="ltr"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {orderNumberLabel}
                        </button>
                        <StatusBadge config={statusConfig} />
                      </div>

                      <div className="min-w-0">
                        <h1 className="truncate text-xl font-semibold text-app-text md:text-2xl">
                          {form.restaurantName || emptyValue} · {form.customerName || emptyValue}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-app-text-secondary">
                          <span className="truncate">נוצר {formatDateTime(delivery.createdAt)}</span>
                          <span className="truncate">משך {elapsedLabel}</span>
                          <span className="truncate">{distanceLabel}</span>
                          <span className="truncate">{etaLabel}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-xs text-app-text-secondary md:grid-cols-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{restaurantAddress}</span>
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{customerAddress}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {restaurant ? (
                        <OverviewActionButton icon={Store} onClick={() => navigate(`/restaurant/${restaurant.id}`)}>
                          מסעדה
                        </OverviewActionButton>
                      ) : null}
                      {courier ? (
                        <OverviewActionButton icon={Bike} onClick={() => navigate(`/courier/${courier.id}`)}>
                          שליח
                        </OverviewActionButton>
                      ) : null}
                      {activeTab === 'edit' ? (
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
                          onClick={() => {
                            setActiveTab('edit');
                            setEditing(true);
                          }}
                          className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                        >
                          <Settings className="h-4 w-4" />
                          עריכה
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid overflow-hidden rounded-[8px] border border-app-border bg-app-background sm:grid-cols-2 xl:grid-cols-4">
                    <OverviewMetric
                      icon={statusConfig.icon}
                      label="סטטוס"
                      value={statusConfig.label}
                      detail={`${completedSteps}/${timelineSteps.length} · ${progressPercent}%`}
                      tone={form.status === 'delivered' ? 'info' : form.status === 'cancelled' || form.status === 'expired' ? 'warning' : 'default'}
                    />
                    <OverviewMetric
                      icon={Clock}
                      label="משך"
                      value={elapsedLabel}
                      detail={lifecycleEndAt ? `נסגר ${formatDateTime(lifecycleEndAt)}` : `נוצר ${formatDateTime(delivery.createdAt)}`}
                      tone={elapsedMinutes !== null && elapsedMinutes > 45 ? 'warning' : 'default'}
                    />
                    <OverviewMetric
                      icon={Navigation}
                      label="ETA ומרחק"
                      value={etaLabel}
                      detail={distanceLabel}
                      tone="info"
                    />
                    <OverviewMetric
                      icon={CreditCard}
                      label="חיוב לקוח"
                      value={formatCurrency(customerCharge)}
                      detail={delivery.is_cash ? 'מזומן' : 'אשראי/אונליין'}
                      tone={delivery.is_cash ? 'success' : 'default'}
                    />
                  </div>
                </div>
            </header>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                  <OverviewPanel title="מסלול ובעלי עניין" icon={MapPin}>
                    <div className="divide-y divide-app-border">
                      <RouteStop
                        icon={Store}
                        label="איסוף"
                        title={form.restaurantName}
                        subtitle={restaurantAddress}
                        meta={restaurant?.phone ?? emptyValue}
                      />
                      <RouteStop
                        icon={User}
                        label="מסירה"
                        title={form.customerName}
                        subtitle={customerAccess ? `${customerAddress} · ${customerAccess}` : customerAddress}
                        meta={form.customerPhone || emptyValue}
                      />
                      <RouteStop
                        icon={Bike}
                        label="שליח"
                        title={courierName}
                        subtitle={courier ? `${courier.vehicleType} · ${courier.employmentType}` : approvalLabel}
                        meta={courier?.isOnShift ? 'במשמרת' : courier ? 'לא במשמרת' : emptyValue}
                      />
                    </div>
                  </OverviewPanel>

                  <OverviewPanel
                    title="ציר זמן"
                    icon={Clock}
                    action={<span className="text-xs font-medium text-app-text-secondary">{completedSteps}/{timelineSteps.length}</span>}
                  >
                    <div className="border-b border-app-border px-4 py-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-app-background">
                        <div
                          className="h-full rounded-full bg-app-brand-solid transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <TimelineOverview steps={timelineSteps} formatTime={formatDateTime} />
                  </OverviewPanel>

                  <OverviewPanel title="הערות ובדיקות" icon={FileText}>
                    {deliveryNotes.length ? (
                      <div className="divide-y divide-app-border">
                        {deliveryNotes.map((note) => (
                          <div key={note} className="px-4 py-3 text-sm leading-6 text-app-text-secondary">
                            {note}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-4 text-sm text-app-text-secondary">אין הערות למשלוח הזה.</div>
                    )}
                  </OverviewPanel>
                </div>

                <aside className="space-y-4">
                  <OverviewPanel title="כספים" icon={CreditCard}>
                    <InfoLine label="חיוב לקוח" value={formatCurrency(customerCharge)} strong />
                    <InfoLine label="חיוב מסעדה" value={formatCurrency(restaurantCharge)} />
                    <InfoLine label="תשלום לשליח" value={formatCurrency(courierPayment)} />
                    <InfoLine label="מזומן" value={delivery.is_cash ? 'כן' : 'לא'} />
                  </OverviewPanel>

                  <OverviewPanel title="מסעדה" icon={Store}>
                    <InfoLine label="שם" value={form.restaurantName} strong />
                    <InfoLine label="טלפון" value={restaurant?.phone ?? emptyValue} dir="ltr" />
                    <InfoLine label="זמן הכנה" value={formatMinutes(delivery.preparationTime ?? delivery.cook_time)} />
                    <InfoLine label="זמן מקסימלי" value={formatMinutes(delivery.maxDeliveryTime ?? delivery.max_time_to_deliver)} />
                  </OverviewPanel>

                  <OverviewPanel title="מזהים ומקור" icon={FileText}>
                    <InfoLine label="מזהה פנימי" value={delivery.id} dir="ltr" />
                    <InfoLine label="מזהה API קצר" value={delivery.api_short_order_id ?? delivery.orderNumber ?? emptyValue} dir="ltr" />
                    <InfoLine label="מקור" value={sourceLabel} />
                    <InfoLine label="API" value={delivery.is_api ? 'כן' : 'לא'} />
                    <InfoLine label="מרחק" value={delivery.delivery_distance ? `${delivery.delivery_distance.toFixed(1)} ק״מ` : emptyValue} />
                  </OverviewPanel>
                </aside>
              </div>
          </div>

          {activeTab === 'edit' ? (
            <div className="space-y-4">
              <section className="rounded-[8px] border border-app-border bg-app-surface">
                <div className="flex min-h-14 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-app-text">עריכה ונתונים</h2>
                    <p className="mt-1 text-xs text-app-text-secondary">כל השדות שאנחנו יכולים לשנות או לבדוק עכשיו במקום אחד.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
                <div className="space-y-4">
                  <Panel title="פרטי משלוח" icon={Package}>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <DetailField label="מזהה הזמנה" value={orderNumberLabel} />
                      <DetailField label="סטטוס" value={statusConfig.label} editing={isEditView}>
                        <select
                          value={form.status}
                          onChange={(event) => updateForm('status', event.target.value as DeliveryStatus)}
                          className="h-9 w-full rounded-[4px] border border-app-border bg-app-surface px-2.5 text-sm text-app-text outline-none focus:border-app-brand"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </DetailField>
                      <DetailField label="נוצר" value={formatDateTime(delivery.createdAt)} />
                      <DetailField label="זמן בטיפול" value={elapsedLabel} />
                      <DetailField label="אזור" value={form.area} editing={isEditView}>
                        <TextInput value={form.area} onChange={(value) => updateForm('area', value)} />
                      </DetailField>
                      <DetailField label="עדיפות" value={delivery.orderPriority ?? delivery.priority ?? emptyValue} />
                    </div>
                  </Panel>

                  <Panel title="מסעדה ואיסוף" icon={Store} action={
                    restaurant ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                        className="text-xs font-medium text-app-brand-text transition-colors hover:text-app-brand"
                      >
                        עמוד מסעדה
                      </button>
                    ) : null
                  }>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <DetailField label="שם מסעדה" value={form.restaurantName} editing={isEditView}>
                        <TextInput value={form.restaurantName} onChange={(value) => updateForm('restaurantName', value)} />
                      </DetailField>
                      <DetailField label="טלפון מסעדה" value={restaurant?.phone ?? emptyValue} dir="ltr" />
                      <DetailField label="כתובת איסוף" value={form.restaurantAddress || restaurant?.address} editing={isEditView}>
                        <TextInput value={form.restaurantAddress} onChange={(value) => updateForm('restaurantAddress', value)} />
                      </DetailField>
                      <DetailField label="סוג מסעדה" value={restaurant?.type ?? emptyValue} />
                      <DetailField label="זמן הכנה" value={formatMinutes(delivery.preparationTime ?? delivery.cook_time)} editing={isEditView}>
                        <TextInput value={form.preparationTime} onChange={(value) => updateForm('preparationTime', value)} dir="ltr" />
                      </DetailField>
                      <DetailField label="זמן מקסימלי למשלוח" value={formatMinutes(delivery.maxDeliveryTime ?? delivery.max_time_to_deliver)} editing={isEditView}>
                        <TextInput value={form.maxDeliveryTime} onChange={(value) => updateForm('maxDeliveryTime', value)} dir="ltr" />
                      </DetailField>
                    </div>
                  </Panel>

                  <Panel title="לקוח ומסירה" icon={User}>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <DetailField label="שם לקוח" value={form.customerName} editing={isEditView}>
                        <TextInput value={form.customerName} onChange={(value) => updateForm('customerName', value)} />
                      </DetailField>
                      <DetailField label="טלפון לקוח" value={form.customerPhone} editing={isEditView} dir="ltr">
                        <TextInput value={form.customerPhone} onChange={(value) => updateForm('customerPhone', value)} dir="ltr" />
                      </DetailField>
                      <DetailField label="כתובת מסירה" value={form.address} editing={isEditView}>
                        <TextInput value={form.address} onChange={(value) => updateForm('address', value)} />
                      </DetailField>
                      <DetailField label="עיר/רחוב/בניין" value={[delivery.client_city, delivery.client_street, delivery.client_building].filter(Boolean).join(', ')} />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <DetailField label="הערות משלוח" value={form.deliveryNotes} editing={isEditView}>
                        <textarea
                          value={form.deliveryNotes}
                          onChange={(event) => updateForm('deliveryNotes', event.target.value)}
                          className="min-h-20 w-full resize-y rounded-[4px] border border-app-border bg-app-surface px-2.5 py-2 text-sm text-app-text outline-none focus:border-app-brand"
                        />
                      </DetailField>
                      <DetailField label="הערות לקוח" value={form.orderNotes} editing={isEditView}>
                        <textarea
                          value={form.orderNotes}
                          onChange={(event) => updateForm('orderNotes', event.target.value)}
                          className="min-h-20 w-full resize-y rounded-[4px] border border-app-border bg-app-surface px-2.5 py-2 text-sm text-app-text outline-none focus:border-app-brand"
                        />
                      </DetailField>
                    </div>
                  </Panel>
                </div>

                <aside className="space-y-4">
                  <Panel title="שליח ושיבוץ" icon={Bike} action={
                    courier ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/courier/${courier.id}`)}
                        className="text-xs font-medium text-app-brand-text transition-colors hover:text-app-brand"
                      >
                        עמוד שליח
                      </button>
                    ) : null
                  }>
                    <div className="space-y-3">
                      <DetailField label="שליח" value={courierName} />
                      <DetailField label="טלפון" value={courier?.phone ?? emptyValue} dir="ltr" />
                      <DetailField label="שיטת העסקה" value={courier?.employmentType ?? delivery.courierEmploymentType ?? emptyValue} />
                      <DetailField label="רכב" value={courier?.vehicleType ?? delivery.vehicle_type ?? emptyValue} />
                      <DetailField label="משמרת" value={courier ? (courier.isOnShift ? 'במשמרת' : 'לא במשמרת') : emptyValue} />
                      <DetailField label="אישור שליח" value={approvalLabel} />
                    </div>
                  </Panel>

                  <Panel title="כספים" icon={CreditCard}>
                    <div className="space-y-3">
                      <DetailField label="חיוב לקוח" value={formatCurrency(getDeliveryCustomerCharge(delivery))} editing={isEditView}>
                        <TextInput value={form.price} onChange={(value) => updateForm('price', value)} dir="ltr" />
                      </DetailField>
                      <DetailField label="חיוב מסעדה" value={formatCurrency(delivery.restaurantPrice ?? delivery.rest_price ?? 0)} editing={isEditView}>
                        <TextInput value={form.restaurantPrice} onChange={(value) => updateForm('restaurantPrice', value)} dir="ltr" />
                      </DetailField>
                      <DetailField label="תשלום לשליח" value={formatCurrency(delivery.courierPayment ?? delivery.runner_price ?? 0)} editing={isEditView}>
                        <TextInput value={form.courierPayment} onChange={(value) => updateForm('courierPayment', value)} dir="ltr" />
                      </DetailField>
                      <DetailField label="מזומן" value={delivery.is_cash ? 'כן' : 'לא'} />
                    </div>
                  </Panel>

                  <Panel title="מזהים ומקור" icon={FileText}>
                    <div className="space-y-3">
                      <DetailField label="מזהה פנימי" value={delivery.id} dir="ltr" />
                      <DetailField label="מזהה API קצר" value={delivery.api_short_order_id ?? delivery.orderNumber ?? emptyValue} dir="ltr" />
                      <DetailField label="מזהה חיצוני" value={delivery.api_str_order_id ?? emptyValue} dir="ltr" />
                      <DetailField label="מקור" value={delivery.source_platform ?? delivery.api_source ?? delivery.api_type ?? emptyValue} />
                      <DetailField label="API" value={delivery.is_api ? 'כן' : 'לא'} />
                      <DetailField label="סגירת הזמנה" value={delivery.close_order ? 'כן' : 'לא'} />
                    </div>
                  </Panel>

                  <Panel title="מיקום" icon={MapPin}>
                    <div className="space-y-3">
                      <DetailField label="נקודת איסוף" value={[delivery.pickup_latitude, delivery.pickup_longitude].filter((value) => typeof value === 'number').join(', ')} dir="ltr" />
                      <DetailField label="נקודת מסירה" value={[delivery.dropoff_latitude, delivery.dropoff_longitude].filter((value) => typeof value === 'number').join(', ')} dir="ltr" />
                      <DetailField label="מרחק" value={delivery.delivery_distance ? `${delivery.delivery_distance} ק״מ` : emptyValue} />
                    </div>
                  </Panel>
                </aside>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
