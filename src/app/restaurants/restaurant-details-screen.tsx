import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  FileText,
  Gauge,
  ImageIcon,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  Save,
  Search,
  Settings,
  Store,
  Timer,
  TrendingUp,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { DeliveryStageTimelineTooltip } from '../components/common/delivery-stage-timeline';
import { DELIVERY_HUBS, TLV_RUNNERS_HUB_ID, getDeliveryHubNames } from '../constants/delivery-hubs';
import { getDefaultRestaurantOwnerName, getDefaultRestaurantOwnerPhone } from '../context/delivery-bootstrap';
import { useDelivery } from '../context/delivery-context-value';
import { ALL_STATUSES, STATUS_CONFIG, STATUS_ORDER } from '../deliveries/status-config';
import type { Delivery, DeliveryStatus, Restaurant } from '../types/delivery.types';
import { formatCurrency, getDeliveryCustomerCharge, sumDeliveryMoney } from '../utils/delivery-finance';
import { exportRowsToExcel, sanitizeExportFileName } from '../utils/export-utils';
import { formatOrderNumber } from '../utils/order-number';
import { getRestaurantChainId } from '../utils/restaurant-branding';
import { RestaurantLogoMark } from './restaurant-logo-mark';

type RestaurantDetailsForm = {
  name: string;
  managerUsername: string;
  managerPassword: string;
  contactPerson: string;
  ownerName: string;
  ownerPhone: string;
  phone: string;
  logoUrl: string;
  photoUrl: string;
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
  preparationMode: 'immediate' | 'future';
  preventReadyRepeatUpdates: boolean;
  courierEtaDisplayMode: 'arrival' | 'pickup';
};

type RestaurantDetailsTab = 'overview' | 'transactions' | 'statistics' | 'deliveries';
type RestaurantMediaField = 'logoUrl' | 'photoUrl';

const emptyValue = '-';
const maxRestaurantMediaFileSize = 3 * 1024 * 1024;
const defaultSelectedStatuses = new Set<DeliveryStatus>(STATUS_ORDER);
const restaurantDetailsTabs: Array<{ key: RestaurantDetailsTab; label: string }> = [
  { key: 'overview', label: 'פרטים' },
  { key: 'transactions', label: 'טרנזקציות' },
  { key: 'statistics', label: 'סטטיסטיקות' },
  { key: 'deliveries', label: 'פירוט משלוחים' },
];

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

const readImageFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const formatNumber = (value?: number | null, suffix = '') => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return emptyValue;
  return `${value.toLocaleString('he-IL')}${suffix}`;
};

const getDefaultManagerUsername = (restaurant: Restaurant) =>
  restaurant.managerUsername ||
  restaurant.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\w\u0590-\u05ff]/g, '') ||
  restaurant.id;

const formatPreparationMode = (value?: Restaurant['preparationMode']) =>
  value === 'future' ? 'עתידי' : 'מיידי';

const formatCourierEtaDisplayMode = (value?: Restaurant['courierEtaDisplayMode']) =>
  value === 'pickup' ? 'זמן איסוף' : 'זמן הגעה';

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
  managerUsername: getDefaultManagerUsername(restaurant),
  managerPassword: restaurant.managerPassword || '',
  contactPerson: restaurant.contactPerson || '',
  ownerName: getDefaultRestaurantOwnerName(restaurant),
  ownerPhone: getDefaultRestaurantOwnerPhone(restaurant),
  phone: restaurant.phone,
  logoUrl: restaurant.logoUrl || '',
  photoUrl: restaurant.photoUrl || '',
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
  preparationMode: restaurant.preparationMode || 'immediate',
  preventReadyRepeatUpdates: restaurant.preventReadyRepeatUpdates ?? true,
  courierEtaDisplayMode: restaurant.courierEtaDisplayMode || 'arrival',
});

const belongsToRestaurant = (delivery: Delivery, restaurant: Restaurant) =>
  delivery.restaurantId === restaurant.id ||
  delivery.rest_id === restaurant.id ||
  delivery.restaurantName === restaurant.name ||
  delivery.rest_name === restaurant.name;

const createEmptyStatusCounts = (): Record<DeliveryStatus, number> => ({
  pending: 0,
  assigned: 0,
  delivering: 0,
  delivered: 0,
  cancelled: 0,
  expired: 0,
});

const getDeliverySearchText = (delivery: Delivery) =>
  [
    delivery.orderNumber,
    delivery.api_short_order_id,
    delivery.client_name,
    delivery.customerName,
    delivery.client_full_address,
    delivery.address,
    delivery.courierName,
    delivery.runner_id,
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
  variant = 'card',
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  variant?: 'card' | 'embedded';
}) => {
  if (variant === 'embedded') {
    return (
      <section className={`min-w-0 rounded-[6px] bg-app-surface px-4 py-1 ${className}`}>
        {children}
      </section>
    );
  }

  return (
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
};

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
    <div className="min-w-0 px-4 py-3">
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

const IdentifierTile = ({
  label,
  value,
  dir,
}: {
  label: string;
  value: ReactNode;
  dir?: 'rtl' | 'ltr';
}) => (
  <div className="min-w-0 rounded-[6px] border border-app-border bg-app-background px-3 py-2.5">
    <div className="text-[11px] text-app-text-secondary">{label}</div>
    <div className="mt-1 truncate text-sm font-semibold text-app-text" dir={dir}>
      {value || emptyValue}
    </div>
  </div>
);

const SummaryField = ({
  label,
  value,
  children,
  dir,
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  dir?: 'rtl' | 'ltr';
}) => (
  <div className="min-w-0">
    <div className="text-sm leading-5 text-app-text-secondary">{label}</div>
    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm leading-5 text-app-text" dir={dir}>
      {children ?? <span className="truncate">{value || emptyValue}</span>}
    </div>
  </div>
);

const RestaurantPhotoPreview = ({
  name,
  photoUrl,
  className = '',
}: {
  name: string;
  photoUrl?: string;
  className?: string;
}) => (
  <div
    className={`relative flex min-h-[220px] overflow-hidden rounded-[6px] border border-app-border bg-app-background ${className}`}
  >
    {photoUrl ? (
      <img src={photoUrl} alt={`תמונת חזית של ${name}`} className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
        <ImageIcon className="h-9 w-9 text-app-text-muted" />
        <div className="text-sm font-semibold text-app-text">תמונת מסעדה</div>
        <div className="max-w-[260px] text-xs leading-5 text-app-text-secondary">
          כאן תופיע תמונת חזית או כניסה שתצולם למסעדה.
        </div>
      </div>
    )}
  </div>
);

const MediaUploadTile = ({
  title,
  description,
  value,
  restaurantName,
  kind,
  editing,
  onUpload,
  onClear,
}: {
  title: string;
  description: string;
  value: string;
  restaurantName: string;
  kind: RestaurantMediaField;
  editing: boolean;
  onUpload: (file?: File) => void;
  onClear: () => void;
}) => (
  <div className="min-w-0 rounded-[6px] border border-app-border bg-app-background p-3">
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-app-text">{title}</div>
        <div className="mt-1 text-xs leading-5 text-app-text-secondary">{description}</div>
      </div>
      {editing ? (
        <div className="flex shrink-0 items-center gap-2">
          {value ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-app-border bg-app-surface text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
              aria-label="הסר מדיה"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[4px] border border-app-border bg-app-surface px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised">
            <Upload className="h-4 w-4" />
            העלאה
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                onUpload(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
          </label>
        </div>
      ) : null}
    </div>

    <div className="mt-3">
      {kind === 'photoUrl' ? (
        <RestaurantPhotoPreview name={restaurantName} photoUrl={value} className="min-h-[170px]" />
      ) : (
        <div className="flex min-h-[170px] items-center justify-center rounded-[6px] border border-app-border bg-app-surface">
          <RestaurantLogoMark
            name={restaurantName}
            logoUrl={value}
            size="lg"
            className="h-24 w-24 rounded-[12px] text-2xl"
          />
        </div>
      )}
    </div>
  </div>
);

const RestaurantDetailsTabs = ({
  activeTab,
  onChange,
}: {
  activeTab: RestaurantDetailsTab;
  onChange: (tab: RestaurantDetailsTab) => void;
}) => (
  <div className="sticky top-0 z-10 border-b border-app-nav-border bg-[#FAFAFA] dark:bg-app-background">
    <div className="flex h-12 w-full flex-row items-center gap-px overflow-x-auto px-2 py-2 md:px-2">
      {restaurantDetailsTabs.map((tab) => {
        const selected = tab.key === activeTab;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            aria-current={selected ? 'page' : undefined}
            className={`relative inline-flex h-8 shrink-0 items-center rounded-[6px] border border-transparent px-3 text-sm font-medium transition-colors ${
              selected
                ? 'bg-app-nav-active-bg text-app-nav-active-text'
                : 'text-app-text-secondary hover:bg-app-nav-hover-bg hover:text-app-text'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
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
  type?: 'text' | 'password';
}) => (
  <input
    type={type}
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

const InlineRadioGroup = <Value extends string>({
  value,
  onChange,
  options,
}: {
  value: Value;
  onChange: (value: Value) => void;
  options: Array<{ value: Value; label: string }>;
}) => (
  <div className="flex min-h-9 flex-wrap items-center gap-2">
    {options.map((option) => {
      const selected = option.value === value;

      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`inline-flex h-8 items-center gap-2 rounded-[6px] border px-3 text-sm font-medium transition-colors ${
            selected
              ? 'border-app-brand bg-app-brand-subtle text-app-brand-text'
              : 'border-app-border bg-app-background text-app-text-secondary hover:text-app-text'
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full border ${
              selected ? 'border-app-brand bg-app-brand' : 'border-app-text-secondary'
            }`}
          />
          {option.label}
        </button>
      );
    })}
  </div>
);

const StatusFilterBar = ({
  counts,
  selectedStatuses,
  onToggleStatus,
  onSelectAll,
}: {
  counts: Record<DeliveryStatus, number>;
  selectedStatuses: Set<DeliveryStatus>;
  onToggleStatus: (status: DeliveryStatus) => void;
  onSelectAll: () => void;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    {ALL_STATUSES.map((statusOption) => {
      const isSelected = selectedStatuses.has(statusOption.key);
      const StatusIcon = statusOption.icon;
      const config = STATUS_CONFIG[statusOption.key];

      return (
        <button
          key={statusOption.key}
          type="button"
          aria-pressed={isSelected}
          onClick={() => onToggleStatus(statusOption.key)}
          className={`inline-flex h-8 min-w-0 items-center gap-2 rounded-[6px] border px-2.5 text-xs font-semibold transition-colors ${
            isSelected
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

const DeliveryOperationsRow = ({
  delivery,
  onOpen,
}: {
  delivery: Delivery;
  onOpen: (deliveryId: string) => void;
}) => {
  const config = STATUS_CONFIG[delivery.status];
  const StatusIcon = config.icon;
  const clientName = delivery.client_name || delivery.customerName || emptyValue;
  const clientAddress = delivery.client_full_address || delivery.address || emptyValue;
  const courierName = delivery.courierName || (delivery.runner_id ? delivery.runner_id : 'לא שובץ');

  return (
    <button
      type="button"
      onClick={() => onOpen(delivery.id)}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-app-border px-3 py-3 text-right transition-colors last:border-b-0 hover:bg-app-surface-raised md:grid-cols-[minmax(112px,150px)_minmax(0,1.2fr)_minmax(120px,180px)_minmax(96px,136px)_48px] md:px-4"
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
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-app-text">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
          <span className="truncate">{clientName}</span>
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-app-text-secondary">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{clientAddress}</span>
        </span>
      </span>

      <span className="hidden min-w-0 md:block">
        <span className="block truncate text-xs text-app-text-secondary">שליח</span>
        <span className="mt-1 block truncate text-sm font-medium text-app-text">{courierName}</span>
      </span>

      <span className="flex min-w-0 flex-col items-end gap-1 md:items-start">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${config.badgeColor}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {config.label}
        </span>
        <span className="text-xs font-medium text-app-text">
          {formatCurrency(getDeliveryCustomerCharge(delivery))}
        </span>
      </span>

      <span className="hidden justify-center md:flex" onClick={(event) => event.stopPropagation()}>
        <DeliveryStageTimelineTooltip delivery={delivery} />
      </span>

      <span className="col-span-2 min-w-0 text-right md:hidden">
        <span className="block truncate text-xs text-app-text-secondary">
          {clientName} · {clientAddress}
        </span>
      </span>
    </button>
  );
};

export function RestaurantDetailsScreen() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useDelivery();
  const restaurant = state.restaurants.find((item) => item.id === restaurantId);
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<RestaurantDetailsTab>('overview');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<DeliveryStatus>>(
    () => new Set(defaultSelectedStatuses),
  );
  const [form, setForm] = useState<RestaurantDetailsForm | null>(null);

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

  const statusCounts = useMemo(() => {
    const counts = createEmptyStatusCounts();
    restaurantDeliveries.forEach((delivery) => {
      counts[delivery.status] += 1;
    });
    return counts;
  }, [restaurantDeliveries]);

  const sortedDeliveries = useMemo(
    () => [...restaurantDeliveries].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    [restaurantDeliveries],
  );

  const visibleDeliveries = useMemo(() => {
    const search = deliverySearch.trim().toLowerCase();

    return sortedDeliveries.filter((delivery) => {
      const matchesStatus = selectedStatuses.has(delivery.status);
      const matchesSearch = !search || getDeliverySearchText(delivery).includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [deliverySearch, selectedStatuses, sortedDeliveries]);

  useEffect(() => {
    if (!restaurant) return;
    setForm(createFormFromRestaurant(restaurant));
  }, [restaurant]);

  useEffect(() => {
    setSettingsOpen(false);
    setEditing(false);
  }, [restaurantId]);

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
  const restaurantCreatedAt = (restaurant as Restaurant & { createdAt?: Date | string | null }).createdAt;
  const totalRevenue = sumDeliveryMoney(completedDeliveries, getDeliveryCustomerCharge);
  const activeRevenue = sumDeliveryMoney(activeDeliveries, getDeliveryCustomerCharge);
  const averageOrderValue =
    completedDeliveries.length > 0 ? Math.round(totalRevenue / completedDeliveries.length) : 0;
  const completionRate =
    restaurantDeliveries.length > 0
      ? Math.round((completedDeliveries.length / restaurantDeliveries.length) * 100)
      : 0;

  const updateForm = <Key extends keyof RestaurantDetailsForm>(key: Key, value: RestaurantDetailsForm[Key]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleMediaFileChange = async (field: RestaurantMediaField, file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('אפשר להעלות רק קובץ תמונה.');
      return;
    }

    if (file.size > maxRestaurantMediaFileSize) {
      toast.error('התמונה גדולה מדי לדמו. נסה קובץ עד 3MB.');
      return;
    }

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      updateForm(field, dataUrl);
      toast.success('התמונה נוספה לטופס. לחץ שמור כדי לעדכן את המסעדה.');
    } catch {
      toast.error('לא הצלחנו לקרוא את קובץ התמונה.');
    }
  };

  const handleCancelEdit = () => {
    setForm(createFormFromRestaurant(restaurant));
    setEditing(false);
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
        'לקוח': delivery.client_name || delivery.customerName || emptyValue,
        'טלפון לקוח': delivery.client_phone || delivery.customerPhone || emptyValue,
        'כתובת מסירה': delivery.client_full_address || delivery.address || emptyValue,
        'שליח': delivery.courierName || delivery.runner_id || emptyValue,
        'חיוב לקוח': getDeliveryCustomerCharge(delivery),
      })),
      sheetName: 'היסטוריית משלוחים',
      fileName: `${sanitizeExportFileName(restaurant.name, 'restaurant')}-deliveries.xlsx`,
      columnWidths: [16, 18, 16, 22, 18, 38, 22, 16],
    });
    toast.success(`יוצאו ${visibleDeliveries.length.toLocaleString('he-IL')} משלוחים`);
  };

  const handleSave = () => {
    const nextName = form.name.trim();
    const nextManagerUsername = form.managerUsername.trim();
    const nextManagerPassword = form.managerPassword.trim();
    const nextOwnerName = form.ownerName.trim();
    const nextOwnerPhone = form.ownerPhone.trim();
    const nextContactPerson = form.contactPerson.trim() || nextOwnerName;
    const nextPhone = form.phone.trim();
    const nextAddress = form.address.trim();
    const nextLogoUrl = form.logoUrl.trim();
    const nextPhotoUrl = form.photoUrl.trim();

    if (!nextName || !nextManagerUsername || !nextOwnerName || !nextOwnerPhone || !nextPhone || !nextAddress) {
      toast.error('שם מסעדה, שם משתמש, בעלים, טלפון בעלים, טלפון מסעדה וכתובת הם שדות חובה.');
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
      toast.error('זמני משלוחים וקצבים חייבים להיות מספרים תקינים.');
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
          managerUsername: nextManagerUsername,
          managerPassword: nextManagerPassword,
          contactPerson: nextContactPerson,
          ownerName: nextOwnerName,
          ownerPhone: nextOwnerPhone,
          phone: nextPhone,
          logoUrl: nextLogoUrl || undefined,
          photoUrl: nextPhotoUrl || undefined,
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
          preparationMode: form.preparationMode,
          preventReadyRepeatUpdates: form.preventReadyRepeatUpdates,
          courierEtaDisplayMode: form.courierEtaDisplayMode,
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
      <div className="resource-list-scroll min-h-0 flex-1 overflow-auto">
        <RestaurantDetailsTabs activeTab={activeTab} onChange={setActiveTab} />
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 py-4">
          {activeTab === 'overview' ? (
            <>
          <header className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b border-app-border px-4">
              <h2 className="truncate text-sm font-semibold text-app-text">פרטי מסעדה</h2>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-app-text-secondary transition-colors hover:bg-app-nav-hover-bg hover:text-app-text"
                aria-label="עוד פעולות"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
              <RestaurantPhotoPreview name={form.name} photoUrl={form.photoUrl || restaurant.photoUrl} />

              <div className="min-w-0">
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryField label="שם מסעדה">
                    <RestaurantLogoMark name={form.name} logoUrl={form.logoUrl} size="xs" />
                    <span className="truncate">{form.name || emptyValue}</span>
                  </SummaryField>
                  <SummaryField label="סטטוס">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        form.isActive ? 'bg-emerald-400' : 'bg-zinc-400'
                      }`}
                    />
                    <span className="truncate">{form.isActive ? 'פעילה' : 'לא פעילה'}</span>
                  </SummaryField>
                  <SummaryField label="תאריך הצטרפות" value={formatDateTime(restaurantCreatedAt)} />
                  <SummaryField label="סוג מסעדה" value={form.type} />
                </div>

                <div className="mt-5">
                  <div className="text-sm leading-5 text-app-text-secondary">כתובת מלאה</div>
                  <div className="mt-2 space-y-1.5 text-sm leading-5 text-app-text">
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-app-text-secondary" />
                      <span className="truncate">{form.address || emptyValue}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 text-app-text-secondary">
                      <span className="shrink-0 text-xs font-medium">נ.צ</span>
                      <span className="truncate" dir="ltr">
                        {formatNumber(restaurant.lat)}, {formatNumber(restaurant.lng)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex min-h-12 w-full items-center justify-between gap-3 border-t border-app-border px-4">
              <button
                type="button"
                onClick={() => setSettingsOpen((current) => !current)}
                className="flex min-h-12 min-w-0 flex-1 items-center gap-2 text-right text-sm font-semibold text-app-text transition-colors hover:text-app-brand"
              >
                {settingsOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                <span className="truncate">פרטים ועריכה</span>
              </button>
              {settingsOpen ? (
                <div className="flex shrink-0 items-center gap-2">
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
              ) : (
                <Settings className="h-4 w-4 shrink-0 text-app-text-secondary" />
              )}
            </div>

          {settingsOpen ? (
            <section className="bg-app-background/40">
              <div className="grid grid-cols-1 gap-5 p-4 pt-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.45fr)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
                    <MediaUploadTile
                      title="תמונת מסעדה"
                      description="תמונת חזית או כניסה שתצולם למסעדה בשטח."
                      value={form.photoUrl}
                      restaurantName={form.name}
                      kind="photoUrl"
                      editing={editing}
                      onUpload={(file) => void handleMediaFileChange('photoUrl', file)}
                      onClear={() => updateForm('photoUrl', '')}
                    />
                    <MediaUploadTile
                      title="לוגו מסעדה"
                      description="הלוגו הקטן שמופיע ליד שם המסעדה ובטבלאות."
                      value={form.logoUrl}
                      restaurantName={form.name}
                      kind="logoUrl"
                      editing={editing}
                      onUpload={(file) => void handleMediaFileChange('logoUrl', file)}
                      onClear={() => updateForm('logoUrl', '')}
                    />
                  </div>
                  <Panel title="פרופיל מסעדה" icon={Store} variant="embedded">
                    <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                      <DetailField label="שם מסעדה" value={form.name} editing={editing}>
                        <TextInput value={form.name} onChange={(value) => updateForm('name', value)} />
                      </DetailField>
                      <DetailField label="שם בעלים" value={form.ownerName} editing={editing}>
                        <TextInput value={form.ownerName} onChange={(value) => updateForm('ownerName', value)} />
                      </DetailField>
                      <DetailField label="טלפון בעלים" value={form.ownerPhone} editing={editing} dir="ltr">
                        <TextInput value={form.ownerPhone} onChange={(value) => updateForm('ownerPhone', value)} dir="ltr" />
                      </DetailField>
                      <DetailField label="טלפון מסעדה" value={form.phone} editing={editing} dir="ltr">
                        <TextInput value={form.phone} onChange={(value) => updateForm('phone', value)} dir="ltr" />
                      </DetailField>
                      <DetailField label="שם משתמש למסעדה" value={form.managerUsername} editing={editing} dir="ltr">
                        <TextInput value={form.managerUsername} onChange={(value) => updateForm('managerUsername', value)} dir="ltr" />
                      </DetailField>
                      <DetailField label="סיסמה למסעדה" value={form.managerPassword ? '******' : emptyValue} editing={editing} dir="ltr">
                        <TextInput value={form.managerPassword} onChange={(value) => updateForm('managerPassword', value)} dir="ltr" type="password" />
                      </DetailField>
                      <DetailField label="סוג מסעדה" value={form.type} editing={editing}>
                        <TextInput value={form.type} onChange={(value) => updateForm('type', value)} />
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

                  <Panel title="כתובת ומיקום" icon={MapPin} variant="embedded">
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

                  <Panel title="מוקדים משויכים" icon={Store} variant="embedded">
                    <DetailField label="חברות משלוחים / מוקדים" value={linkedHubNames.join(', ')} editing={editing}>
                      <HubPicker value={form.linkedHubIds} onChange={(value) => updateForm('linkedHubIds', value)} />
                    </DetailField>
                  </Panel>

                  <Panel title="הגדרות משלוחים" icon={Timer} variant="embedded">
                    <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2 lg:grid-cols-3">
                      <DetailField label="זמן הכנה ברירת מחדל" value={formatNumber(restaurant.defaultPreparationTime, ' דק׳')} editing={editing}>
                        <TextInput value={form.defaultPreparationTime} onChange={(value) => updateForm('defaultPreparationTime', value)} dir="ltr" />
                      </DetailField>
                      <DetailField label="זמן התחייבות למשלוח במסעדה" value={formatNumber(restaurant.maxDeliveryTime, ' דק׳')} editing={editing}>
                        <TextInput value={form.maxDeliveryTime} onChange={(value) => updateForm('maxDeliveryTime', value)} dir="ltr" />
                      </DetailField>
                      <DetailField label="זמן משלוח ממוצע" value={formatNumber(restaurant.averageDeliveryTime, ' דק׳')} editing={editing}>
                        <TextInput value={form.averageDeliveryTime} onChange={(value) => updateForm('averageDeliveryTime', value)} dir="ltr" />
                      </DetailField>
                      <DetailField label="סוג הכנה במסעדה" value={formatPreparationMode(form.preparationMode)} editing={editing}>
                        <InlineRadioGroup
                          value={form.preparationMode}
                          onChange={(value) => updateForm('preparationMode', value)}
                          options={[
                            { value: 'immediate', label: 'מיידי' },
                            { value: 'future', label: 'עתידי' },
                          ]}
                        />
                      </DetailField>
                      <DetailField label="שיטת הצגת זמן הגעת שליח לאיסוף" value={formatCourierEtaDisplayMode(form.courierEtaDisplayMode)} editing={editing}>
                        <InlineRadioGroup
                          value={form.courierEtaDisplayMode}
                          onChange={(value) => updateForm('courierEtaDisplayMode', value)}
                          options={[
                            { value: 'arrival', label: 'זמן הגעה' },
                            { value: 'pickup', label: 'זמן איסוף' },
                          ]}
                        />
                      </DetailField>
                      <DetailField label="עדכוני מוכן חוזרים" value={form.preventReadyRepeatUpdates ? 'חסום' : 'מאפשר'} editing={editing}>
                        <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-2.5 text-sm text-app-text">
                          <input
                            type="checkbox"
                            checked={form.preventReadyRepeatUpdates}
                            onChange={(event) => updateForm('preventReadyRepeatUpdates', event.target.checked)}
                            className="h-4 w-4 accent-app-brand"
                          />
                          <span>מנע עדכוני "משלוחה מוכן" חוזרים</span>
                        </label>
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
                </div>

                <aside className="grid min-w-0 grid-cols-1 gap-3 self-start sm:grid-cols-3 xl:grid-cols-1">
                  <Panel title="מזהים" icon={FileText} variant="embedded" className="sm:contents xl:block">
                    <div className="grid grid-cols-1 gap-3 sm:contents xl:grid xl:grid-cols-1">
                      <IdentifierTile label="מזהה פנימי" value={restaurant.id} dir="ltr" />
                      <IdentifierTile label="מוקדים" value={linkedHubNames.join(', ')} />
                    </div>
                  </Panel>
                </aside>
              </div>
            </section>
          ) : null}
          </header>

          <section className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface">
            <div className="flex min-h-12 items-center gap-2 border-b border-app-border px-4">
              <TrendingUp className="h-4 w-4 text-app-text-secondary" />
              <h2 className="truncate text-sm font-semibold text-app-text">סיכום פעילות</h2>
            </div>
            <div className="grid grid-cols-1 divide-y divide-app-border sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
              <Metric label="סה״כ משלוחים" value={restaurantDeliveries.length.toLocaleString('he-IL')} icon={Package} tone="warning" />
              <Metric label="הושלמו" value={completedDeliveries.length.toLocaleString('he-IL')} icon={CheckCircle2} tone="success" />
              <Metric label="הכנסות" value={formatCurrency(totalRevenue)} icon={CreditCard} tone="blue" />
              <Metric label="אחוז השלמה" value={`${completionRate}%`} icon={Gauge} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel title="הגדרות משלוחים" icon={Timer}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <DetailField label="זמן הכנה" value={formatNumber(restaurant.defaultPreparationTime, ' דק׳')} />
                <DetailField label="זמן התחייבות למשלוח" value={formatNumber(restaurant.maxDeliveryTime, ' דק׳')} />
                <DetailField label="מקסימום לשעה" value={formatNumber(restaurant.maxDeliveriesPerHour)} />
                <DetailField label="בוטלו" value={cancelledDeliveries.length.toLocaleString('he-IL')} />
              </div>
            </Panel>

            <Panel title="כספים" icon={CreditCard}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <DetailField label="הכנסות ממסעדה" value={formatCurrency(totalRevenue)} />
                <DetailField label="פעילים בצנרת" value={formatCurrency(activeRevenue)} />
                <DetailField label="ממוצע חיוב" value={formatCurrency(averageOrderValue)} />
                <DetailField label="סה״כ הזמנות במודל" value={restaurant.totalOrders.toLocaleString('he-IL')} />
              </div>
            </Panel>
          </div>

            </>
          ) : null}

          {activeTab === 'transactions' ? (
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Panel title="יתרה למסעדה" icon={CreditCard}>
                  <div className="text-2xl font-semibold text-app-text">{formatCurrency(totalRevenue)}</div>
                  <div className="mt-1 text-sm text-app-text-secondary">מבוסס על משלוחים שהושלמו</div>
                </Panel>
                <Panel title="פתוח בצנרת" icon={Timer}>
                  <div className="text-2xl font-semibold text-app-text">{formatCurrency(activeRevenue)}</div>
                  <div className="mt-1 text-sm text-app-text-secondary">משלוחים פעילים שעדיין לא נסגרו</div>
                </Panel>
                <Panel title="ממוצע טרנזקציה" icon={Gauge}>
                  <div className="text-2xl font-semibold text-app-text">{formatCurrency(averageOrderValue)}</div>
                  <div className="mt-1 text-sm text-app-text-secondary">ממוצע חיוב למשלוח שהושלם</div>
                </Panel>
              </div>

              <section className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface">
                <div className="flex min-h-12 items-center justify-between gap-3 border-b border-app-border px-4">
                  <div>
                    <h2 className="text-sm font-semibold text-app-text">טרנזקציות אחרונות</h2>
                    <p className="mt-1 text-xs text-app-text-secondary">שלד ראשוני לתשלומים מול המסעדה</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportVisibleDeliveries}
                    className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-app-border bg-app-background px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                  >
                    <Download className="h-4 w-4" />
                    ייצוא
                  </button>
                </div>
                <div className="divide-y divide-app-border">
                  {completedDeliveries.slice(0, 10).map((delivery) => (
                    <button
                      key={delivery.id}
                      type="button"
                      onClick={() => navigate(`/delivery/${delivery.id}`)}
                      className="grid w-full grid-cols-1 gap-2 px-4 py-3 text-right transition-colors hover:bg-app-surface-raised md:grid-cols-[minmax(120px,160px)_minmax(0,1fr)_minmax(120px,160px)_minmax(120px,160px)]"
                    >
                      <span className="min-w-0">
                        <span className="block text-xs text-app-text-secondary">משלוח</span>
                        <span className="mt-1 block truncate text-sm font-semibold text-app-text">{formatOrderNumber(delivery.orderNumber)}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-app-text-secondary">לקוח</span>
                        <span className="mt-1 block truncate text-sm text-app-text">{delivery.client_name || delivery.customerName || emptyValue}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-app-text-secondary">תאריך</span>
                        <span className="mt-1 block truncate text-sm text-app-text" dir="ltr">{formatDateTime(delivery.createdAt)}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-app-text-secondary">סכום</span>
                        <span className="mt-1 block truncate text-sm font-semibold text-app-text">{formatCurrency(getDeliveryCustomerCharge(delivery))}</span>
                      </span>
                    </button>
                  ))}
                  {completedDeliveries.length === 0 ? (
                    <div className="flex min-h-[220px] items-center justify-center px-4 text-center text-sm text-app-text-secondary">
                      אין עדיין טרנזקציות סגורות למסעדה הזו.
                    </div>
                  ) : null}
                </div>
              </section>
            </section>
          ) : null}

          {activeTab === 'statistics' ? (
            <section className="space-y-4">
              <section className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface">
                <div className="flex min-h-12 items-center gap-2 border-b border-app-border px-4">
                  <TrendingUp className="h-4 w-4 text-app-text-secondary" />
                  <h2 className="text-sm font-semibold text-app-text">סטטיסטיקות מסעדה</h2>
                </div>
                <div className="grid grid-cols-1 divide-y divide-app-border sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
                  <Metric label="סה״כ משלוחים" value={restaurantDeliveries.length.toLocaleString('he-IL')} icon={Package} tone="warning" />
                  <Metric label="הושלמו" value={completedDeliveries.length.toLocaleString('he-IL')} icon={CheckCircle2} tone="success" />
                  <Metric label="בוטלו" value={cancelledDeliveries.length.toLocaleString('he-IL')} icon={X} />
                  <Metric label="אחוז השלמה" value={`${completionRate}%`} icon={Gauge} />
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel title="סטטוס משלוחים" icon={Package}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {ALL_STATUSES.map((statusOption) => (
                      <DetailField
                        key={statusOption.key}
                        label={STATUS_CONFIG[statusOption.key].label}
                        value={statusCounts[statusOption.key].toLocaleString('he-IL')}
                      />
                    ))}
                  </div>
                </Panel>
                <Panel title="ביצועים פיננסיים" icon={CreditCard}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <DetailField label="הכנסות" value={formatCurrency(totalRevenue)} />
                    <DetailField label="פעילים בצנרת" value={formatCurrency(activeRevenue)} />
                    <DetailField label="ממוצע חיוב" value={formatCurrency(averageOrderValue)} />
                    <DetailField label="דירוג" value={formatNumber(restaurant.rating)} />
                  </div>
                </Panel>
              </div>
            </section>
          ) : null}

          {activeTab === 'deliveries' ? (
            <section className="min-h-[520px] rounded-[8px] border border-app-border bg-app-surface">
              <div className="flex flex-col gap-3 border-b border-app-border px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-app-text">פירוט משלוחים</h2>
                    <p className="mt-1 text-xs text-app-text-secondary">
                      {visibleDeliveries.length.toLocaleString('he-IL')} מתוך {restaurantDeliveries.length.toLocaleString('he-IL')} משלוחים
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
                    <DeliveryOperationsRow
                      key={delivery.id}
                      delivery={delivery}
                      onOpen={(deliveryId) => navigate(`/delivery/${deliveryId}`)}
                    />
                  ))
                ) : (
                  <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-4 text-center">
                    <Package className="h-10 w-10 text-app-text-muted" />
                    <div>
                      <div className="text-sm font-semibold text-app-text">אין משלוחים להצגה</div>
                      <div className="mt-1 text-sm text-app-text-secondary">אפשר לשנות סטטוס או לחפש מספר הזמנה אחר.</div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
