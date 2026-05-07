import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  ChevronDown,
  Clock,
  ClockAlert,
  CreditCard,
  FileText,
  MapPin,
  Navigation,
  Package,
  Save,
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

const DELIVERY_DETAILS_TABS: Array<{ id: DeliveryDetailsTab; label: string }> = [
  { id: 'overview', label: 'טיפול' },
  { id: 'edit', label: 'עריכה ונתונים' },
];

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

const AccordionPanel = ({
  title,
  icon: Icon,
  children,
  meta,
  defaultOpen,
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
  meta?: ReactNode;
  defaultOpen?: boolean;
}) => (
  <details
    className="group overflow-hidden rounded-[8px] border border-app-border bg-app-surface"
    open={defaultOpen}
  >
    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-app-text transition-colors hover:bg-app-surface-raised [&::-webkit-details-marker]:hidden">
      <span className="flex min-w-0 items-center gap-2">
        <ChevronDown className="h-4 w-4 shrink-0 text-app-text-secondary transition-transform group-open:rotate-180" />
        <Icon className="h-4 w-4 shrink-0 text-app-text-secondary" />
        <span className="truncate">{title}</span>
      </span>
      {meta ? (
        <span className="shrink-0 text-xs font-medium text-app-text-secondary">{meta}</span>
      ) : null}
    </summary>
    <div className="border-t border-app-border p-4">{children}</div>
  </details>
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

const SummaryItem = ({
  label,
  value,
  detail,
  icon: Icon,
  dir,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ElementType;
  dir?: 'rtl' | 'ltr';
}) => (
  <div className="min-w-0">
    <div className="mb-1 flex items-center gap-1.5 text-xs text-app-text-secondary">
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{label}</span>
    </div>
    <div className="truncate text-sm font-semibold text-app-text" dir={dir}>
      {value || emptyValue}
    </div>
    {detail ? <div className="mt-1 truncate text-xs text-app-text-secondary">{detail}</div> : null}
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
  const elapsedMinutes = Number.isNaN(createdAt.getTime())
    ? null
    : Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60000));
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

  const updateForm = <Key extends keyof DeliveryDetailsForm>(key: Key, value: DeliveryDetailsForm[Key]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleCancelEdit = () => {
    setForm(createFormFromDelivery(delivery));
    setEditing(false);
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
    toast.success('פרטי המשלוח עודכנו');
  };

  return (
    <div className="flex h-full flex-col bg-app-background" dir="rtl">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="sticky top-0 z-20 border-b border-[#1A1A1A] bg-app-background/95 backdrop-blur">
          <nav className="flex h-11 w-full items-center gap-1 overflow-x-auto px-4" aria-label="ניווט עמוד משלוח">
            {DELIVERY_DETAILS_TABS.map((tab) => {
              const selected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'edit') {
                      setEditing(true);
                    } else {
                      setEditing(false);
                    }
                  }}
                  className={`h-8 shrink-0 rounded-[4px] px-3 text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-app-surface-raised text-app-text'
                      : 'text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-4">
          {activeTab === 'overview' ? (
          <section className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface">
            <div className="flex min-h-14 flex-col gap-3 border-b border-app-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-semibold text-app-text">פרטי משלוח</h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {courier ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/courier/${courier.id}`)}
                    className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                  >
                    <Bike className="h-4 w-4" />
                    שליח
                  </button>
                ) : null}

              </div>
            </div>

            <div className="p-4">
              <div className="min-w-0 py-1">
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryItem
                    icon={Clock}
                    label="נוצר"
                    value={formatDateTime(delivery.createdAt)}
                    detail={elapsedMinutes === null ? emptyValue : `${elapsedMinutes} דק׳ בטיפול`}
                  />
                  <SummaryItem
                    icon={Navigation}
                    label="ETA"
                    value={etaLabel}
                    detail={distanceLabel}
                  />
                  <SummaryItem icon={Store} label="מסעדה" value={restaurant?.name ?? form.restaurantName} detail={form.restaurantAddress || restaurant?.address} />
                  <SummaryItem icon={User} label="לקוח" value={form.customerName} detail={form.address} />
                  <SummaryItem icon={Bike} label="שליח" value={courierName} detail={courier?.phone ?? delivery.courierEmploymentType ?? emptyValue} />
                </div>

              </div>
            </div>
          </section>
          ) : null}

          {activeTab === 'overview' ? (
            <div className="space-y-3">
              <AccordionPanel title="ציר זמן" icon={Clock} meta={`${completedSteps}/${timelineSteps.length}`}>
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-app-background">
                  <div
                    className="h-full rounded-full bg-app-brand-solid transition-all"
                    style={{ width: `${Math.round((completedSteps / timelineSteps.length) * 100)}%` }}
                  />
                </div>
                <div className="divide-y divide-app-border">
                  {timelineSteps.map((step) => (
                    <div key={step.label} className="grid grid-cols-[24px_minmax(0,1fr)_110px] items-center gap-3 py-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step.done ? 'bg-app-brand-solid text-app-background' : 'bg-app-background text-app-text-secondary'}`}>
                        {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      </span>
                      <span className={`truncate text-sm ${step.done ? 'font-medium text-app-text' : 'text-app-text-secondary'}`}>
                        {step.label}
                      </span>
                      <span className="text-left text-xs text-app-text-secondary">{formatDateTime(step.time)}</span>
                    </div>
                  ))}
                </div>
              </AccordionPanel>

              <AccordionPanel title="פרטי משלוח" icon={Package}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="מזהה הזמנה" value={orderNumberLabel} />
                  <DetailField label="סטטוס" value={statusConfig.label} />
                  <DetailField label="נוצר" value={formatDateTime(delivery.createdAt)} />
                  <DetailField label="זמן בטיפול" value={elapsedMinutes === null ? emptyValue : `${elapsedMinutes} דק׳`} />
                  <DetailField label="אזור" value={form.area} />
                  <DetailField label="עדיפות" value={delivery.orderPriority ?? delivery.priority ?? emptyValue} />
                </div>
              </AccordionPanel>

              <AccordionPanel title="מסעדה ואיסוף" icon={Store} meta={restaurant?.name ?? form.restaurantName ?? emptyValue}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="שם מסעדה" value={form.restaurantName} />
                  <DetailField label="טלפון מסעדה" value={restaurant?.phone ?? emptyValue} dir="ltr" />
                  <DetailField label="כתובת איסוף" value={form.restaurantAddress || restaurant?.address} />
                  <DetailField label="סוג מסעדה" value={restaurant?.type ?? emptyValue} />
                  <DetailField label="זמן הכנה" value={formatMinutes(delivery.preparationTime ?? delivery.cook_time)} />
                  <DetailField label="זמן מקסימלי למשלוח" value={formatMinutes(delivery.maxDeliveryTime ?? delivery.max_time_to_deliver)} />
                </div>
                {restaurant ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                    className="mt-3 inline-flex h-8 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                  >
                    <Store className="h-4 w-4" />
                    עמוד מסעדה
                  </button>
                ) : null}
              </AccordionPanel>

              <AccordionPanel title="לקוח ומסירה" icon={User} meta={form.customerName || emptyValue}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DetailField label="שם לקוח" value={form.customerName} />
                  <DetailField label="טלפון לקוח" value={form.customerPhone} dir="ltr" />
                  <DetailField label="כתובת מסירה" value={form.address} />
                  <DetailField label="עיר/רחוב/בניין" value={[delivery.client_city, delivery.client_street, delivery.client_building].filter(Boolean).join(', ')} />
                  <DetailField label="הערות משלוח" value={form.deliveryNotes} />
                  <DetailField label="הערות לקוח" value={form.orderNotes} />
                </div>
              </AccordionPanel>

              <AccordionPanel title="שליח ושיבוץ" icon={Bike} meta={courierName}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="שליח" value={courierName} />
                  <DetailField label="טלפון" value={courier?.phone ?? emptyValue} dir="ltr" />
                  <DetailField label="שיטת העסקה" value={courier?.employmentType ?? delivery.courierEmploymentType ?? emptyValue} />
                  <DetailField label="רכב" value={courier?.vehicleType ?? delivery.vehicle_type ?? emptyValue} />
                  <DetailField label="משמרת" value={courier ? (courier.isOnShift ? 'במשמרת' : 'לא במשמרת') : emptyValue} />
                  <DetailField label="אישור שליח" value={approvalLabel} />
                </div>
                {courier ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/courier/${courier.id}`)}
                    className="mt-3 inline-flex h-8 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                  >
                    <Bike className="h-4 w-4" />
                    עמוד שליח
                  </button>
                ) : null}
              </AccordionPanel>

              <AccordionPanel title="כספים" icon={CreditCard} meta={formatCurrency(getDeliveryCustomerCharge(delivery))}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <DetailField label="חיוב לקוח" value={formatCurrency(getDeliveryCustomerCharge(delivery))} />
                  <DetailField label="חיוב מסעדה" value={formatCurrency(delivery.restaurantPrice ?? delivery.rest_price ?? 0)} />
                  <DetailField label="תשלום לשליח" value={formatCurrency(delivery.courierPayment ?? delivery.runner_price ?? 0)} />
                  <DetailField label="מזומן" value={delivery.is_cash ? 'כן' : 'לא'} />
                </div>
              </AccordionPanel>

              <AccordionPanel title="מזהים ומיקום" icon={FileText} meta={delivery.source_platform ?? delivery.api_source ?? delivery.api_type ?? emptyValue}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="מזהה פנימי" value={delivery.id} dir="ltr" />
                  <DetailField label="מזהה API קצר" value={delivery.api_short_order_id ?? delivery.orderNumber ?? emptyValue} dir="ltr" />
                  <DetailField label="מזהה חיצוני" value={delivery.api_str_order_id ?? emptyValue} dir="ltr" />
                  <DetailField label="מקור" value={delivery.source_platform ?? delivery.api_source ?? delivery.api_type ?? emptyValue} />
                  <DetailField label="API" value={delivery.is_api ? 'כן' : 'לא'} />
                  <DetailField label="סגירת הזמנה" value={delivery.close_order ? 'כן' : 'לא'} />
                  <DetailField label="נקודת איסוף" value={[delivery.pickup_latitude, delivery.pickup_longitude].filter((value) => typeof value === 'number').join(', ')} dir="ltr" />
                  <DetailField label="נקודת מסירה" value={[delivery.dropoff_latitude, delivery.dropoff_longitude].filter((value) => typeof value === 'number').join(', ')} dir="ltr" />
                  <DetailField label="מרחק" value={delivery.delivery_distance ? `${delivery.delivery_distance} ק״מ` : emptyValue} />
                </div>
              </AccordionPanel>
            </div>
          ) : null}

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
                      <DetailField label="זמן בטיפול" value={elapsedMinutes === null ? emptyValue : `${elapsedMinutes} דק׳`} />
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
