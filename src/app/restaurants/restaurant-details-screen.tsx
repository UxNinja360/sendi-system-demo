import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  MapPin,
  Package,
  Pencil,
  Save,
  Store,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { DELIVERY_HUBS, TLV_RUNNERS_HUB_ID, getDeliveryHubNames } from '../constants/delivery-hubs';
import { useDelivery } from '../context/delivery-context-value';
import type { Delivery, Restaurant } from '../types/delivery.types';
import { formatCurrency, getDeliveryCustomerCharge, sumDeliveryMoney } from '../utils/delivery-finance';
import { formatOrderNumber } from '../utils/order-number';
import { getRestaurantChainId } from '../utils/restaurant-branding';

type RestaurantDetailsForm = {
  name: string;
  phone: string;
  address: string;
  city: string;
  street: string;
  type: string;
  chainId: string;
  linkedHubIds: string[];
  isActive: boolean;
  defaultPreparationTime: string;
  maxDeliveryTime: string;
  deliveryRate: string;
  deliveryInterval: string;
  maxDeliveriesPerHour: string;
  averageDeliveryTime: string;
  rating: string;
  lat: string;
  lng: string;
};

type RestaurantDetailsTab = 'details' | 'performance';

const emptyValue = '—';

const getRestaurantLinkedHubIds = (restaurant: Restaurant) =>
  restaurant.linkedHubIds && restaurant.linkedHubIds.length > 0
    ? restaurant.linkedHubIds
    : [TLV_RUNNERS_HUB_ID];

const toInputNumber = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

const parseNumber = (value: string, fallback: number) => {
  if (!value.trim()) return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const formatNumber = (value?: number | null, suffix = '') => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return emptyValue;
  return `${value.toLocaleString('he-IL')}${suffix}`;
};

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

const createFormFromRestaurant = (restaurant: Restaurant): RestaurantDetailsForm => ({
  name: restaurant.name,
  phone: restaurant.phone,
  address: restaurant.address,
  city: restaurant.city,
  street: restaurant.street,
  type: restaurant.type,
  chainId: restaurant.chainId || getRestaurantChainId(restaurant.name),
  linkedHubIds: getRestaurantLinkedHubIds(restaurant),
  isActive: restaurant.isActive,
  defaultPreparationTime: toInputNumber(restaurant.defaultPreparationTime),
  maxDeliveryTime: toInputNumber(restaurant.maxDeliveryTime),
  deliveryRate: toInputNumber(restaurant.deliveryRate),
  deliveryInterval: toInputNumber(restaurant.deliveryInterval),
  maxDeliveriesPerHour: toInputNumber(restaurant.maxDeliveriesPerHour),
  averageDeliveryTime: toInputNumber(restaurant.averageDeliveryTime),
  rating: toInputNumber(restaurant.rating),
  lat: toInputNumber(restaurant.lat),
  lng: toInputNumber(restaurant.lng),
});

const belongsToRestaurant = (delivery: Delivery, restaurant: Restaurant) =>
  delivery.restaurantId === restaurant.id ||
  delivery.rest_id === restaurant.id ||
  delivery.restaurantName === restaurant.name ||
  delivery.rest_name === restaurant.name;

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
    <div className="rounded-[8px] border border-app-border bg-app-surface px-4 py-3">
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
}: {
  value: string;
  onChange: (value: string) => void;
  dir?: 'rtl' | 'ltr';
}) => (
  <input
    value={value}
    onChange={(event) => onChange(event.target.value)}
    dir={dir}
    className="h-9 w-full rounded-[4px] border border-app-border bg-app-background px-2.5 text-sm text-app-text outline-none transition-colors focus:border-app-brand"
  />
);

const HubPicker = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) => {
  const toggleHub = (hubId: string, checked: boolean) => {
    onChange(
      checked
        ? Array.from(new Set([...value, hubId]))
        : value.filter((item) => item !== hubId),
    );
  };

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-2">
      {DELIVERY_HUBS.map((hub) => (
        <label
          key={hub.id}
          className="inline-flex cursor-pointer items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-2.5 py-1.5 text-sm text-app-text"
        >
          <input
            type="checkbox"
            checked={value.includes(hub.id)}
            onChange={(event) => toggleHub(hub.id, event.target.checked)}
            className="h-4 w-4 cursor-pointer accent-app-brand"
          />
          <span>{hub.name}</span>
        </label>
      ))}
    </div>
  );
};

export function RestaurantDetailsScreen() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useDelivery();
  const restaurant = state.restaurants.find((item) => item.id === restaurantId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RestaurantDetailsForm | null>(null);
  const [activeTab, setActiveTab] = useState<RestaurantDetailsTab>('performance');

  const restaurantDeliveries = useMemo(
    () => (
      restaurant
        ? state.deliveries.filter((delivery) => belongsToRestaurant(delivery, restaurant))
        : []
    ),
    [restaurant, state.deliveries],
  );

  const completedDeliveries = useMemo(
    () => restaurantDeliveries.filter((delivery) => delivery.status === 'delivered'),
    [restaurantDeliveries],
  );

  const activeDeliveries = useMemo(
    () => restaurantDeliveries.filter((delivery) => !['delivered', 'cancelled', 'expired'].includes(delivery.status)),
    [restaurantDeliveries],
  );

  const cancelledDeliveries = useMemo(
    () => restaurantDeliveries.filter((delivery) => delivery.status === 'cancelled'),
    [restaurantDeliveries],
  );

  useEffect(() => {
    if (!restaurant) return;
    setForm(createFormFromRestaurant(restaurant));
  }, [restaurant]);

  if (!restaurant) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-app-background p-8 text-center">
        <Store className="h-12 w-12 text-app-text-muted" />
        <p className="text-sm text-app-text-secondary">מסעדה לא נמצאה</p>
        <button
          onClick={() => navigate('/restaurants')}
          className="rounded-[4px] border border-app-border px-3 py-2 text-sm text-app-text transition-colors hover:bg-app-surface-raised"
        >
          חזרה למסעדות
        </button>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex h-full items-center justify-center bg-app-background text-sm text-app-text-secondary">
        טוען פרטי מסעדה...
      </div>
    );
  }

  const linkedHubNames = getDeliveryHubNames(form.linkedHubIds);
  const totalRevenue = sumDeliveryMoney(completedDeliveries, getDeliveryCustomerCharge);
  const averageOrderValue =
    completedDeliveries.length > 0 ? Math.round(totalRevenue / completedDeliveries.length) : 0;
  const completionRate =
    restaurantDeliveries.length > 0
      ? Math.round((completedDeliveries.length / restaurantDeliveries.length) * 100)
      : 0;
  const lastDelivery = [...restaurantDeliveries].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  )[0];
  const recentDeliveries = [...restaurantDeliveries]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 10);

  const updateForm = <Key extends keyof RestaurantDetailsForm>(key: Key, value: RestaurantDetailsForm[Key]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleCancelEdit = () => {
    setForm(createFormFromRestaurant(restaurant));
    setEditing(false);
  };

  const handleSave = () => {
    const nextName = form.name.trim();
    const nextPhone = form.phone.trim();
    const nextAddress = form.address.trim();

    if (!nextName || !nextPhone || !nextAddress) {
      toast.error('שם מסעדה, טלפון וכתובת הם שדות חובה.');
      return;
    }

    const nextLinkedHubIds = form.linkedHubIds.filter((hubId) =>
      DELIVERY_HUBS.some((hub) => hub.id === hubId && hub.isActive),
    );

    if (nextLinkedHubIds.length === 0) {
      toast.error('צריך לבחור לפחות מוקד משויך אחד.');
      return;
    }

    const nextDefaultPreparationTime = parseNumber(
      form.defaultPreparationTime,
      restaurant.defaultPreparationTime,
    );
    const nextMaxDeliveryTime = parseNumber(form.maxDeliveryTime, restaurant.maxDeliveryTime);
    const nextDeliveryRate = parseNumber(form.deliveryRate, restaurant.deliveryRate);
    const nextDeliveryInterval = parseNumber(form.deliveryInterval, restaurant.deliveryInterval);
    const nextMaxDeliveriesPerHour = parseNumber(
      form.maxDeliveriesPerHour,
      restaurant.maxDeliveriesPerHour,
    );

    if (
      nextDefaultPreparationTime <= 0 ||
      nextMaxDeliveryTime <= 0 ||
      nextDeliveryRate < 0 ||
      nextDeliveryInterval < 0 ||
      nextMaxDeliveriesPerHour < 0
    ) {
      toast.error('זמני תפעול וקצבים חייבים להיות מספרים תקינים.');
      return;
    }

    const nextChainId = form.chainId.trim() || getRestaurantChainId(nextName);
    const nextCity = form.city.trim();
    const nextStreet = form.street.trim();

    dispatch({
      type: 'UPDATE_RESTAURANT',
      payload: {
        restaurantId: restaurant.id,
        updates: {
          name: nextName,
          phone: nextPhone,
          address: nextAddress,
          city: nextCity,
          street: nextStreet,
          type: form.type.trim(),
          chainId: nextChainId,
          linkedHubIds: nextLinkedHubIds,
          isActive: form.isActive,
          defaultPreparationTime: nextDefaultPreparationTime,
          maxDeliveryTime: nextMaxDeliveryTime,
          deliveryRate: nextDeliveryRate,
          deliveryInterval: nextDeliveryInterval,
          maxDeliveriesPerHour: nextMaxDeliveriesPerHour,
          averageDeliveryTime: parseNumber(form.averageDeliveryTime, restaurant.averageDeliveryTime),
          rating: parseNumber(form.rating, restaurant.rating),
          lat: parseOptionalNumber(form.lat) ?? restaurant.lat,
          lng: parseOptionalNumber(form.lng) ?? restaurant.lng,
        },
      },
    });

    restaurantDeliveries.forEach((delivery) => {
      dispatch({
        type: 'UPDATE_DELIVERY',
        payload: {
          deliveryId: delivery.id,
          updates: {
            restaurantId: restaurant.id,
            rest_id: restaurant.id,
            restaurantName: nextName,
            rest_name: nextName,
            restaurantAddress: nextAddress,
            restaurantCity: nextCity,
            restaurantStreet: nextStreet,
            rest_city: nextCity,
            rest_street: nextStreet,
            cook_time: nextDefaultPreparationTime,
            preparationTime: nextDefaultPreparationTime,
            max_time_to_deliver: nextMaxDeliveryTime,
            maxDeliveryTime: nextMaxDeliveryTime,
          },
        },
      });
    });

    setEditing(false);
    toast.success('פרטי המסעדה עודכנו');
  };

  return (
    <div className="flex h-full flex-col bg-app-background" dir="rtl">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-4">
          <header className="rounded-[8px] border border-app-border bg-app-surface">
            <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-semibold text-app-text">{form.name}</h1>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      form.isActive
                        ? 'bg-app-success-subtle text-app-success-text'
                        : 'bg-zinc-500/10 text-zinc-400'
                    }`}
                  >
                    {form.isActive ? 'פעילה' : 'לא פעילה'}
                  </span>
                  {form.chainId && form.chainId !== '-' ? (
                    <span className="rounded-full bg-app-background px-2.5 py-1 text-xs font-medium text-app-text-secondary">
                      {form.chainId}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-app-text-secondary">
                  <span>{form.phone}</span>
                  <span>{form.address}</span>
                  <span>{linkedHubNames.join(', ')}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeTab === 'details' && (
                  editing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                      >
                        <X className="h-4 w-4" />
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-app-brand-solid px-3 text-sm font-semibold text-app-background transition-colors hover:bg-app-brand-hover"
                      >
                        <Save className="h-4 w-4" />
                        שמור
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                    >
                      <Pencil className="h-4 w-4" />
                      עריכה
                    </button>
                  )
                )}
              </div>
            </div>
          </header>

          <div className="inline-flex w-fit rounded-[8px] border border-app-border bg-app-surface p-1">
            {[
              { id: 'performance' as const, label: 'ביצועים', icon: TrendingUp },
              { id: 'details' as const, label: 'פרטים', icon: Store },
            ].map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    if (tab.id === 'performance' && editing) handleCancelEdit();
                    setActiveTab(tab.id);
                  }}
                  className={`inline-flex h-8 items-center gap-2 rounded-[6px] px-3 text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-app-background text-app-text shadow-sm'
                      : 'text-app-text-secondary hover:text-app-text'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'performance' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="סה״כ משלוחים" value={restaurantDeliveries.length.toLocaleString('he-IL')} icon={Package} />
            <Metric label="הושלמו" value={completedDeliveries.length.toLocaleString('he-IL')} icon={CheckCircle2} tone="success" />
            <Metric label="פעילים עכשיו" value={activeDeliveries.length.toLocaleString('he-IL')} icon={Activity} tone="warning" />
            <Metric label="הכנסות" value={formatCurrency(totalRevenue)} icon={CreditCard} tone="blue" />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
            <div className="space-y-4">
              {activeTab === 'details' ? (
                <>
              <Panel title="פרופיל מסעדה" icon={Store}>
                <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                  <DetailField label="שם מסעדה" value={form.name} editing={editing}>
                    <TextInput value={form.name} onChange={(value) => updateForm('name', value)} />
                  </DetailField>
                  <DetailField label="טלפון" value={form.phone} editing={editing} dir="ltr">
                    <TextInput value={form.phone} onChange={(value) => updateForm('phone', value)} dir="ltr" />
                  </DetailField>
                  <DetailField label="סוג מסעדה" value={form.type} editing={editing}>
                    <TextInput value={form.type} onChange={(value) => updateForm('type', value)} />
                  </DetailField>
                  <DetailField label="מזהה רשת" value={form.chainId || emptyValue} editing={editing}>
                    <TextInput value={form.chainId} onChange={(value) => updateForm('chainId', value)} />
                  </DetailField>
                  <DetailField label="סטטוס פעילות" value={form.isActive ? 'פעילה' : 'לא פעילה'} editing={editing}>
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-2.5 text-sm text-app-text">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(event) => updateForm('isActive', event.target.checked)}
                        className="h-4 w-4 accent-app-brand"
                      />
                      <span>{form.isActive ? 'פעילה' : 'לא פעילה'}</span>
                    </label>
                  </DetailField>
                  <DetailField label="דירוג" value={formatNumber(restaurant.rating)} editing={editing}>
                    <TextInput value={form.rating} onChange={(value) => updateForm('rating', value)} dir="ltr" />
                  </DetailField>
                </div>
              </Panel>

              <Panel title="כתובת ומיקום" icon={MapPin}>
                <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                  <DetailField label="כתובת מלאה" value={form.address} editing={editing}>
                    <TextInput value={form.address} onChange={(value) => updateForm('address', value)} />
                  </DetailField>
                  <DetailField label="עיר" value={form.city} editing={editing}>
                    <TextInput value={form.city} onChange={(value) => updateForm('city', value)} />
                  </DetailField>
                  <DetailField label="רחוב" value={form.street} editing={editing}>
                    <TextInput value={form.street} onChange={(value) => updateForm('street', value)} />
                  </DetailField>
                  <DetailField label="נקודות GPS" value={`${restaurant.lat}, ${restaurant.lng}`} editing={editing} dir="ltr">
                    <div className="grid grid-cols-2 gap-2" dir="ltr">
                      <TextInput value={form.lat} onChange={(value) => updateForm('lat', value)} dir="ltr" />
                      <TextInput value={form.lng} onChange={(value) => updateForm('lng', value)} dir="ltr" />
                    </div>
                  </DetailField>
                </div>
              </Panel>

              <Panel title="מוקדים משויכים" icon={Store}>
                <DetailField label="חברות משלוחים / מוקדים" value={linkedHubNames.join(', ')} editing={editing}>
                  <HubPicker value={form.linkedHubIds} onChange={(value) => updateForm('linkedHubIds', value)} />
                </DetailField>
              </Panel>

              <Panel title="הגדרות תפעול" icon={Timer}>
                <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="זמן הכנה ברירת מחדל" value={formatNumber(restaurant.defaultPreparationTime, ' דק׳')} editing={editing}>
                    <TextInput value={form.defaultPreparationTime} onChange={(value) => updateForm('defaultPreparationTime', value)} dir="ltr" />
                  </DetailField>
                  <DetailField label="זמן מקסימלי למשלוח" value={formatNumber(restaurant.maxDeliveryTime, ' דק׳')} editing={editing}>
                    <TextInput value={form.maxDeliveryTime} onChange={(value) => updateForm('maxDeliveryTime', value)} dir="ltr" />
                  </DetailField>
                  <DetailField label="זמן משלוח ממוצע" value={formatNumber(restaurant.averageDeliveryTime, ' דק׳')} editing={editing}>
                    <TextInput value={form.averageDeliveryTime} onChange={(value) => updateForm('averageDeliveryTime', value)} dir="ltr" />
                  </DetailField>
                  <DetailField label="קצב משלוחים" value={formatNumber(restaurant.deliveryRate)} editing={editing}>
                    <TextInput value={form.deliveryRate} onChange={(value) => updateForm('deliveryRate', value)} dir="ltr" />
                  </DetailField>
                  <DetailField label="חלון קצב" value={formatNumber(restaurant.deliveryInterval, ' דק׳')} editing={editing}>
                    <TextInput value={form.deliveryInterval} onChange={(value) => updateForm('deliveryInterval', value)} dir="ltr" />
                  </DetailField>
                  <DetailField label="מקסימום משלוחים לשעה" value={formatNumber(restaurant.maxDeliveriesPerHour)} editing={editing}>
                    <TextInput value={form.maxDeliveriesPerHour} onChange={(value) => updateForm('maxDeliveriesPerHour', value)} dir="ltr" />
                  </DetailField>
                </div>
              </Panel>

                </>
              ) : (
                <>

              <Panel title="משלוחים אחרונים" icon={Package}>
                <div className="divide-y divide-app-border">
                  {recentDeliveries.map((delivery) => (
                    <button
                      key={delivery.id}
                      type="button"
                      onClick={() => navigate(`/delivery/${delivery.id}`)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-right transition-colors hover:bg-app-surface-raised"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-app-text">
                          {formatOrderNumber(delivery.orderNumber)}
                        </span>
                        <span className="mt-1 block truncate text-xs text-app-text-secondary">
                          {delivery.customerName} · {delivery.address}
                        </span>
                      </span>
                      <span className="text-left">
                        <span className="block text-xs font-medium text-app-text">{formatCurrency(getDeliveryCustomerCharge(delivery))}</span>
                        <span className="mt-1 block text-xs text-app-text-secondary">{formatDateTime(delivery.createdAt)}</span>
                      </span>
                    </button>
                  ))}
                  {recentDeliveries.length === 0 ? (
                    <div className="py-8 text-center text-sm text-app-text-secondary">אין משלוחים למסעדה הזו עדיין</div>
                  ) : null}
                </div>
              </Panel>
                </>
              )}
            </div>

            <aside className="space-y-4">
              {activeTab === 'performance' ? (
                <>
              <Panel title="ביצועים" icon={TrendingUp}>
                <div className="space-y-3">
                  <DetailField label="אחוז השלמה" value={`${completionRate}%`} />
                  <DetailField label="ממוצע הזמנה" value={formatCurrency(averageOrderValue)} />
                  <DetailField label="משלוחים מבוטלים" value={cancelledDeliveries.length.toLocaleString('he-IL')} />
                  <DetailField label="משלוחים פעילים" value={activeDeliveries.length.toLocaleString('he-IL')} />
                  <DetailField label="משלוח אחרון" value={lastDelivery ? formatDateTime(lastDelivery.createdAt) : emptyValue} />
                </div>
              </Panel>

              <Panel title="כספים" icon={CreditCard}>
                <div className="space-y-3">
                  <DetailField label="הכנסות ממסעדה" value={formatCurrency(totalRevenue)} />
                  <DetailField label="ממוצע חיוב" value={formatCurrency(averageOrderValue)} />
                  <DetailField label="סה״כ הזמנות במודל" value={restaurant.totalOrders.toLocaleString('he-IL')} />
                </div>
              </Panel>

                </>
              ) : (
                <>

              <Panel title="מזהים" icon={FileText}>
                <div className="space-y-3">
                  <DetailField label="מזהה פנימי" value={restaurant.id} dir="ltr" />
                  <DetailField label="מזהה רשת" value={form.chainId || emptyValue} />
                  <DetailField label="מוקדים" value={linkedHubNames.join(', ')} />
                </div>
              </Panel>

              <Panel title="בריאות מודל" icon={AlertCircle}>
                <div className="space-y-3">
                  <DetailField label="שם" value={form.name ? 'קיים' : 'חסר'} />
                  <DetailField label="טלפון" value={form.phone ? 'קיים' : 'חסר'} />
                  <DetailField label="כתובת" value={form.address ? 'קיימת' : 'חסרה'} />
                  <DetailField label="מוקד משויך" value={form.linkedHubIds.length > 0 ? 'קיים' : 'חסר'} />
                  <DetailField label="זמני תפעול" value={form.defaultPreparationTime && form.maxDeliveryTime ? 'קיימים' : 'חסרים'} />
                </div>
              </Panel>
                </>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
