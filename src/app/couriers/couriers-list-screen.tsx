import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { format } from 'date-fns';
import {
  Bike,
  Clock,
  FileSpreadsheet,
  FileText,
  LogOut,
  Package,
  Power,
  Search,
  Star,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { EntityActionMenu, EntityActionMenuDivider, EntityActionMenuHeader, EntityActionMenuItem, EntityActionMenuOverlay } from '../components/common/entity-action-menu';
import { EntityEmptyState } from '../components/common/entity-empty-state';
import { EntityListSidePanel } from '../components/common/entity-list-side-panel';
import { EntityListShell } from '../components/common/entity-list-shell';
import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import { EntityTableActionsCell, EntityTableActionsHeader, EntityTableHeaderCheckbox, EntityTableRowCheckbox } from '../components/common/entity-table-shell';
import { EntityTableHeaderCell } from '../components/common/entity-table-header-cell';
import { ENTITY_TABLE_DATA_CELL_CLASS, ENTITY_TABLE_ROW_CLASS, ENTITY_TABLE_WIDTHS } from '../components/common/entity-table-shared';
import { ListExportDrawer } from '../components/common/list-export-drawer';
import { type SingleSelectFilterOption } from '../components/common/list-filter-controls';
import { ListInlineFilters } from '../components/common/list-inline-filters';
import { ListTableSection } from '../components/common/list-table-section';
import { ListToolbarActions } from '../components/common/list-toolbar-actions';
import { PageToolbar } from '../components/common/page-toolbar';
import {
  SelectionActionBar,
  SelectionActionButton,
} from '../components/common/selection-action-bar';
import { useDelivery } from '../context/delivery-context-value';
import { DELIVERY_STORAGE_KEYS } from '../context/delivery-storage';
import { Courier } from '../types/delivery.types';
import { exportRowsToExcel } from '../utils/export-utils';

const TEXT = {
  searchPlaceholder: '\u05d7\u05e4\u05e9\u0020\u05e9\u05dc\u05d9\u05d7\u0020\u05d0\u05d5\u0020\u05de\u05e1\u05e4\u05e8\u0020\u05d8\u05dc\u05e4\u05d5\u05df...',
  pageTitle: 'שליחים',
  addCourier: 'הוסף שליח',
  addNewCourier: 'הוסף שליח חדש',
  fullName: 'שם מלא',
  enterFullName: 'הזן שם מלא',
  phone: 'טלפון',
  enterPhone: 'הזן מספר טלפון',
  vehicleType: 'סוג רכב',
  cancel: 'ביטול',
  available: 'זמין',
  busy: 'בתפוסה',
  offline: 'לא מחובר',
  connected: 'מחובר',
  notConnected: 'לא מחובר',
  onShift: 'במשמרת',
  offShift: 'לא במשמרת',
  free: 'פנוי',
  inDelivery: 'במשלוח',
  activate: 'הפעל',
  disable: 'השבת',
  startShift: 'התחל משמרת',
  endShift: 'סיים משמרת',
  details: 'פרטים מלאים',
  deleteCourier: 'מחק שליח',
  exportSelected: 'ייצוא נבחרים',
  noActiveCouriers: 'לא נבחרו שליחים לפעולה',
  cannotDelete: 'אי אפשר למחוק שליח עם משלוחים פעילים.',
  cannotDisableActive: 'אי אפשר להשבית שליח עם משלוח פעיל.',
  cannotStartOffline: 'אי אפשר להתחיל משמרת לשליח לא מחובר.',
  deliveriesSuffix: 'משלוחים',
  deliveryLabel: 'משלוח',
  more: 'עוד',
} as const;

type CourierColumnId =
  | 'name'
  | 'connection'
  | 'shift'
  | 'availability'
  | 'vehicleType'
  | 'employmentType'
  | 'phone'
  | 'rating'
  | 'totalDeliveries'
  | 'currentDelivery'
  | 'actions';

type SortableCourierColumnId = Exclude<CourierColumnId, 'actions'>;

type CourierStats = {
  total: number;
  filtered: number;
  available: number;
  busy: number;
  offline: number;
  onShift: number;
  withActiveDelivery: number;
};

const VEHICLE_TYPES: Courier['vehicleType'][] = ['אופנוע', 'רכב', 'קורקינט'];
const COURIER_VISIBLE_COLUMNS_KEY = `${DELIVERY_STORAGE_KEYS.couriersVisibleColumns}:product-v2`;
const DEFAULT_COURIER_VISIBLE_COLUMNS: CourierColumnId[] = [
  'name',
  'connection',
  'shift',
  'availability',
  'phone',
  'currentDelivery',
  'totalDeliveries',
];

const COURIER_STATUS_FILTER_OPTIONS: SingleSelectFilterOption[] = [
  { id: 'all', label: 'סטטוס' },
  { id: 'available', label: 'זמין' },
  { id: 'busy', label: 'תפוס' },
  { id: 'offline', label: 'לא מחובר' },
];

const COURIER_DELIVERY_FILTER_OPTIONS: SingleSelectFilterOption[] = [
  { id: 'all', label: 'משלוחים' },
  { id: 'with_delivery', label: 'עם משלוח פעיל' },
  { id: 'without_delivery', label: 'ללא משלוח' },
];

const COURIER_COLUMNS: { id: CourierColumnId; label: string }[] = [
  { id: 'name', label: 'שם שליח' },
  { id: 'connection', label: 'חיבור' },
  { id: 'shift', label: 'משמרת' },
  { id: 'availability', label: 'זמינות' },
  { id: 'vehicleType', label: 'סוג רכב' },
  { id: 'employmentType', label: 'שיטת העסקה' },
  { id: 'phone', label: 'טלפון' },
  { id: 'rating', label: 'דירוג' },
  { id: 'totalDeliveries', label: 'סך משלוחים' },
  { id: 'currentDelivery', label: 'משלוח נוכחי' },
  { id: 'actions', label: 'פעולות' },
];

const COURIER_ACTION_COLUMN = COURIER_COLUMNS.find((column) => column.id === 'actions')!;

const COURIER_COLUMN_CATEGORIES = [
  {
    id: 'core',
    label: 'ליבה',
    columns: [
      { id: 'name', label: 'שם שליח' },
      { id: 'connection', label: 'חיבור' },
      { id: 'shift', label: 'משמרת' },
      { id: 'availability', label: 'זמינות' },
      { id: 'currentDelivery', label: 'משלוח נוכחי' },
    ],
  },
  {
    id: 'profile',
    label: 'פרופיל',
    columns: [
      { id: 'phone', label: 'טלפון' },
      { id: 'vehicleType', label: 'סוג רכב' },
      { id: 'employmentType', label: 'שיטת העסקה' },
      { id: 'rating', label: 'דירוג' },
      { id: 'totalDeliveries', label: 'סך משלוחים' },
    ],
  },
] as const;

const getCourierColumnWidth = (columnId: CourierColumnId) => {
  switch (columnId) {
    case 'name':
      return ENTITY_TABLE_WIDTHS.name;
    case 'connection':
    case 'shift':
    case 'availability':
    case 'vehicleType':
    case 'employmentType':
    case 'totalDeliveries':
      return ENTITY_TABLE_WIDTHS.sm;
    case 'phone':
      return ENTITY_TABLE_WIDTHS.phone;
    case 'rating':
      return ENTITY_TABLE_WIDTHS.xs;
    case 'currentDelivery':
      return ENTITY_TABLE_WIDTHS.md;
    case 'actions':
      return ENTITY_TABLE_WIDTHS.actions;
    default:
      return ENTITY_TABLE_WIDTHS.lg;
  }
};

const getStatusLabel = (status: Courier['status']) => {
  if (status === 'available') return TEXT.available;
  if (status === 'busy') return TEXT.busy;
  return TEXT.offline;
};

const getStatusColor = (status: Courier['status']) => {
  if (status === 'available') return 'text-[#16a34a] dark:text-[#9fe870]';
  if (status === 'busy') return 'text-[#f97316] dark:text-[#ffa94d]';
  return 'text-[#737373] dark:text-[#a3a3a3]';
};

const CourierOverviewStrip: React.FC<{ stats: CourierStats; hasFilters: boolean }> = ({ stats, hasFilters }) => {
  const items = [
    { label: 'סה״כ שליחים', value: stats.total.toLocaleString('he-IL') },
    { label: 'זמינים', value: stats.available.toLocaleString('he-IL'), tone: 'success' },
    { label: 'במשלוח', value: stats.busy.toLocaleString('he-IL'), tone: 'warning' },
    { label: 'במשמרת', value: stats.onShift.toLocaleString('he-IL') },
    { label: 'לא מחוברים', value: stats.offline.toLocaleString('he-IL') },
    { label: 'עם משלוח פעיל', value: stats.withActiveDelivery.toLocaleString('he-IL') },
    ...(hasFilters ? [{ label: 'תוצאות', value: stats.filtered.toLocaleString('he-IL'), tone: 'focus' }] : []),
  ];

  return (
    <div className="shrink-0 border-b border-[#e5e5e5] bg-white px-5 py-2.5 dark:border-[#262626] dark:bg-[#171717]">
      <div className="flex max-w-full flex-wrap items-center gap-x-5 gap-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 items-baseline gap-2">
            <span
              className={`text-sm font-semibold tabular-nums ${
                item.tone === 'success'
                  ? 'text-[#16a34a] dark:text-[#9fe870]'
                  : item.tone === 'warning'
                    ? 'text-[#f97316] dark:text-[#ffa94d]'
                    : 'text-[#0d0d12] dark:text-[#fafafa]'
              }`}
            >
              {item.value}
            </span>
            <span className="truncate text-xs text-[#737373] dark:text-[#a3a3a3]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CourierNoResultsState: React.FC<{ searchQuery: string; onClear: () => void }> = ({ searchQuery, onClear }) => (
  <div className="flex flex-col items-center justify-center px-4 py-20">
    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-[#f5f5f5] dark:bg-[#262626]">
      <Search className="h-10 w-10 text-[#737373] dark:text-[#a3a3a3]" />
    </div>
    <h3 className="mb-2 text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">לא נמצאו שליחים</h3>
    <p className="mb-5 max-w-md text-center text-sm text-[#737373] dark:text-[#a3a3a3]">
      {searchQuery ? `אין התאמה לחיפוש "${searchQuery}"` : 'אין שליחים שתואמים לסינון הנוכחי'}
    </p>
    <button
      type="button"
      onClick={onClear}
      className="rounded-lg border border-[#d4d4d4] bg-white px-4 py-2 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#f5f5f5] dark:border-[#404040] dark:bg-[#171717] dark:text-[#fafafa] dark:hover:bg-[#262626]"
    >
      נקה סינון
    </button>
  </div>
);

export const CouriersListScreen: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Courier['status']>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'with_delivery' | 'without_delivery'>('all');
  const [sortColumn, setSortColumn] = useState<SortableCourierColumnId>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; courier: Courier } | null>(null);
  const [selectedCourierIds, setSelectedCourierIds] = useState<Set<string>>(new Set());
  const [newCourier, setNewCourier] = useState<{ name: string; phone: string; vehicleType: Courier['vehicleType'] }>({
    name: '',
    phone: '',
    vehicleType: 'אופנוע',
  });
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(COURIER_VISIBLE_COLUMNS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const valid = new Set(COURIER_COLUMNS.map((column) => column.id));
        const filtered = parsed.filter((id) => valid.has(id as CourierColumnId) && id !== 'actions');
        if (filtered.length > 0) return new Set(filtered);
      }
    } catch {}
    return new Set(DEFAULT_COURIER_VISIBLE_COLUMNS);
  });

  const activeDeliveriesByCourier = useMemo(() => {
    const map = new Map<string, typeof state.deliveries[number]>();
    state.deliveries.forEach((delivery) => {
      if (!delivery.courierId) return;
      if (delivery.status === 'delivered' || delivery.status === 'cancelled' || delivery.status === 'expired') return;
      if (!map.has(delivery.courierId)) map.set(delivery.courierId, delivery);
    });
    return map;
  }, [state.deliveries]);

  useEffect(() => {
    try {
      localStorage.setItem(COURIER_VISIBLE_COLUMNS_KEY, JSON.stringify(Array.from(visibleColumns)));
    } catch {}
  }, [visibleColumns]);

  const visibleCourierColumns = useMemo(() => {
    const dataColumns = COURIER_COLUMNS.filter((column) => column.id !== 'actions' && visibleColumns.has(column.id));
    return [...dataColumns, COURIER_ACTION_COLUMN];
  }, [visibleColumns]);

  const filteredCouriers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    let couriers = state.couriers;

    if (normalizedSearch) {
      couriers = couriers.filter((courier) =>
        courier.name.toLowerCase().includes(normalizedSearch) ||
        courier.phone.toLowerCase().includes(normalizedSearch),
      );
    }

    if (statusFilter !== 'all') {
      couriers = couriers.filter((courier) => courier.status === statusFilter);
    }

    if (deliveryFilter !== 'all') {
      couriers = couriers.filter((courier) => {
        const hasActiveDelivery = activeDeliveriesByCourier.has(courier.id);
        return deliveryFilter === 'with_delivery' ? hasActiveDelivery : !hasActiveDelivery;
      });
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    const connectionOrder = { available: 0, busy: 1, offline: 2 };
    const availabilityValue = (courier: Courier) => {
      if (courier.status === 'busy') return 0;
      if (courier.status === 'offline' || !courier.isOnShift) return 2;
      return 1;
    };

    return [...couriers].sort((a, b) => {
      switch (sortColumn) {
        case 'name':
          return a.name.localeCompare(b.name, 'he') * direction;
        case 'connection':
          return (connectionOrder[a.status] - connectionOrder[b.status]) * direction;
        case 'shift':
          return ((a.isOnShift ? 1 : 0) - (b.isOnShift ? 1 : 0)) * direction;
        case 'availability':
          return (availabilityValue(a) - availabilityValue(b)) * direction;
        case 'vehicleType':
          return a.vehicleType.localeCompare(b.vehicleType, 'he') * direction;
        case 'employmentType':
          return a.employmentType.localeCompare(b.employmentType, 'he') * direction;
        case 'phone':
          return a.phone.localeCompare(b.phone, 'he') * direction;
        case 'rating':
          return (a.rating - b.rating) * direction;
        case 'totalDeliveries':
          return (a.totalDeliveries - b.totalDeliveries) * direction;
        case 'currentDelivery': {
          const aDelivery = activeDeliveriesByCourier.get(a.id)?.orderNumber ?? '';
          const bDelivery = activeDeliveriesByCourier.get(b.id)?.orderNumber ?? '';
          return aDelivery.localeCompare(bDelivery, 'he') * direction;
        }
        default:
          return 0;
      }
    });
  }, [activeDeliveriesByCourier, deliveryFilter, searchQuery, sortColumn, sortDirection, state.couriers, statusFilter]);

  const stats = useMemo<CourierStats>(() => ({
    total: state.couriers.length,
    filtered: filteredCouriers.length,
    available: state.couriers.filter((courier) => courier.status === 'available').length,
    busy: state.couriers.filter((courier) => courier.status === 'busy').length,
    offline: state.couriers.filter((courier) => courier.status === 'offline').length,
    onShift: state.couriers.filter((courier) => courier.isOnShift).length,
    withActiveDelivery: activeDeliveriesByCourier.size,
  }), [activeDeliveriesByCourier.size, filteredCouriers.length, state.couriers]);

  const statusCounts = useMemo(
    () => ({
      available: stats.available,
      busy: stats.busy,
      offline: stats.offline,
    }),
    [stats.available, stats.busy, stats.offline],
  );

  const courierInlineFilters = useMemo(
    () => [
      {
        key: 'status',
        value: statusFilter,
        onChange: (value: string) => setStatusFilter(value as typeof statusFilter),
        options: COURIER_STATUS_FILTER_OPTIONS.map((option) => ({
          ...option,
          count: option.id === 'all' ? undefined : statusCounts[option.id as keyof typeof statusCounts],
        })),
        defaultLabel: 'סטטוס',
      },
      {
        key: 'deliveries',
        value: deliveryFilter,
        onChange: (value: string) => setDeliveryFilter(value as typeof deliveryFilter),
        options: COURIER_DELIVERY_FILTER_OPTIONS,
        defaultLabel: 'משלוחים',
      },
    ],
    [deliveryFilter, statusCounts, statusFilter],
  );

  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter !== 'all' || deliveryFilter !== 'all');
  const allVisibleCouriersSelected =
    filteredCouriers.length > 0 && filteredCouriers.every((courier) => selectedCourierIds.has(courier.id));
  const someVisibleCouriersSelected = filteredCouriers.some((courier) => selectedCourierIds.has(courier.id));

  const handleClearAll = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDeliveryFilter('all');
  };

  const handleCourierSort = (columnId: SortableCourierColumnId) => {
    if (sortColumn === columnId) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(columnId);
    setSortDirection('asc');
  };

  const getCurrentDelivery = (courierId: string) => activeDeliveriesByCourier.get(courierId) ?? null;

  const handleToggleSelectCourier = (courierId: string) => {
    setSelectedCourierIds((prev) => {
      const next = new Set(prev);
      if (next.has(courierId)) next.delete(courierId);
      else next.add(courierId);
      return next;
    });
  };

  const handleToggleSelectAllCouriers = () => {
    setSelectedCourierIds((prev) => {
      const next = new Set(prev);
      if (allVisibleCouriersSelected) {
        filteredCouriers.forEach((courier) => next.delete(courier.id));
      } else {
        filteredCouriers.forEach((courier) => next.add(courier.id));
      }
      return next;
    });
  };

  const getCourierExportCellValue = (courier: Courier, columnId: CourierColumnId) => {
    const currentDelivery = getCurrentDelivery(courier.id);
    switch (columnId) {
      case 'name':
        return courier.name;
      case 'connection':
        return courier.status === 'offline' ? TEXT.notConnected : TEXT.connected;
      case 'shift':
        return courier.isOnShift ? TEXT.onShift : TEXT.offShift;
      case 'availability':
        return courier.status === 'busy' ? TEXT.inDelivery : courier.status === 'offline' || !courier.isOnShift ? '-' : TEXT.free;
      case 'vehicleType':
        return courier.vehicleType;
      case 'employmentType':
        return courier.employmentType;
      case 'phone':
        return courier.phone;
      case 'rating':
        return courier.rating.toFixed(1);
      case 'totalDeliveries':
        return courier.totalDeliveries;
      case 'currentDelivery':
        return currentDelivery ? currentDelivery.api_short_order_id || currentDelivery.id.slice(0, 6) : '-';
      case 'actions':
        return '';
      default:
        return '';
    }
  };

  const handleExportVisibleCouriers = () => {
    const couriersToExport = selectedCourierIds.size > 0
      ? filteredCouriers.filter((courier) => selectedCourierIds.has(courier.id))
      : filteredCouriers;

    if (couriersToExport.length === 0) {
      toast.error('אין שליחים לייצוא');
      return;
    }

    const exportColumns = visibleCourierColumns.filter((column) => column.id !== 'actions');
    const rows = couriersToExport.map((courier) =>
      Object.fromEntries(
        exportColumns.map((column) => [column.label, getCourierExportCellValue(courier, column.id)]),
      ),
    );

    exportRowsToExcel({
      rows,
      sheetName: 'שליחים',
      fileName: `שליחים_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`,
    });
    setIsExportOpen(false);
    toast.success(`יוצאו ${couriersToExport.length} שליחים ל-Excel`);
  };

  const handleBulkSetCourierStatus = (targetStatus: Courier['status']) => {
    const selectedCouriers = state.couriers.filter((courier) => selectedCourierIds.has(courier.id));
    if (selectedCouriers.length === 0) {
      toast.error(TEXT.noActiveCouriers);
      return;
    }

    const eligibleCouriers = selectedCouriers.filter((courier) => {
      if (targetStatus === 'available') return courier.status === 'offline';
      return courier.status !== 'offline' && !activeDeliveriesByCourier.has(courier.id);
    });

    eligibleCouriers.forEach((courier) => {
      dispatch({ type: 'UPDATE_COURIER_STATUS', payload: { courierId: courier.id, status: targetStatus } });
    });

    if (eligibleCouriers.length > 0) {
      setSelectedCourierIds(new Set());
      toast.success(targetStatus === 'available'
        ? `הופעלו ${eligibleCouriers.length} שליחים`
        : `הושבתו ${eligibleCouriers.length} שליחים`);
      return;
    }

    toast.error(targetStatus === 'offline' ? TEXT.cannotDisableActive : 'לא בוצע שינוי בשליחים שנבחרו');
  };

  const handleBulkStartShift = () => {
    const selectedCouriers = state.couriers.filter((courier) => selectedCourierIds.has(courier.id));
    if (selectedCouriers.length === 0) {
      toast.error(TEXT.noActiveCouriers);
      return;
    }

    const eligibleCouriers = selectedCouriers.filter((courier) => courier.status !== 'offline' && !courier.isOnShift);
    eligibleCouriers.forEach((courier) => dispatch({ type: 'START_COURIER_SHIFT', payload: { courierId: courier.id } }));

    if (eligibleCouriers.length > 0) {
      setSelectedCourierIds(new Set());
      toast.success(`התחילה משמרת ל-${eligibleCouriers.length} שליחים`);
      return;
    }

    toast.error('לא נמצאו שליחים שניתן להתחיל להם משמרת');
  };

  const handleBulkEndShift = () => {
    const selectedCouriers = state.couriers.filter((courier) => selectedCourierIds.has(courier.id));
    if (selectedCouriers.length === 0) {
      toast.error(TEXT.noActiveCouriers);
      return;
    }

    const eligibleCouriers = selectedCouriers.filter((courier) => courier.isOnShift);
    eligibleCouriers.forEach((courier) => dispatch({ type: 'END_COURIER_SHIFT', payload: { courierId: courier.id } }));

    if (eligibleCouriers.length > 0) {
      setSelectedCourierIds(new Set());
      toast.success(`הסתיימה משמרת ל-${eligibleCouriers.length} שליחים`);
      return;
    }

    toast.error('לא נמצאו שליחים שנמצאים במשמרת');
  };

  const addCourier = () => {
    if (!newCourier.name.trim() || !newCourier.phone.trim()) return;

    const courier: Courier = {
      id: `c${Date.now()}`,
      name: newCourier.name.trim(),
      phone: newCourier.phone.trim(),
      vehicleType: newCourier.vehicleType,
      employmentType: 'פר משלוח',
      status: 'available',
      isOnShift: false,
      shiftStartedAt: null,
      shiftEndedAt: null,
      currentShiftAssignmentId: null,
      activeDeliveryIds: [],
      rating: 5,
      totalDeliveries: 0,
    };

    dispatch({ type: 'ADD_COURIER', payload: courier });
    setIsModalOpen(false);
    setNewCourier({ name: '', phone: '', vehicleType: 'אופנוע' });
    toast.success(`השליח ${courier.name} נוסף`);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewCourier({ name: '', phone: '', vehicleType: 'אופנוע' });
  };

  const closeCourierActionsMenu = () => setContextMenu(null);

  const toggleCourierPower = (courier: Courier) => {
    if (courier.status !== 'offline' && activeDeliveriesByCourier.has(courier.id)) {
      toast.error(TEXT.cannotDisableActive);
      return;
    }

    dispatch({
      type: 'UPDATE_COURIER_STATUS',
      payload: { courierId: courier.id, status: courier.status === 'offline' ? 'available' : 'offline' },
    });
  };

  const handleToggleShift = (courier: Courier) => {
    closeCourierActionsMenu();
    if (!courier.isOnShift && courier.status === 'offline') {
      toast.error(TEXT.cannotStartOffline);
      return;
    }

    if (courier.isOnShift) {
      dispatch({ type: 'END_COURIER_SHIFT', payload: { courierId: courier.id } });
      toast.success(`משמרת ${courier.name} הסתיימה`);
      return;
    }

    dispatch({ type: 'START_COURIER_SHIFT', payload: { courierId: courier.id } });
    toast.success(`משמרת ${courier.name} התחילה`);
  };

  const handleRemoveCourier = (courier: Courier, event: React.MouseEvent) => {
    event.stopPropagation();
    closeCourierActionsMenu();

    if (activeDeliveriesByCourier.has(courier.id) || courier.activeDeliveryIds.length > 0) {
      toast.error(TEXT.cannotDelete);
      return;
    }

    dispatch({ type: 'REMOVE_COURIER', payload: courier.id });
    toast.success(`השליח ${courier.name} נמחק`);
  };

  const openCourierActionsMenu = (courier: Courier, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const triggerRect = event.currentTarget.getBoundingClientRect();
    setContextMenu({ x: Math.max(8, triggerRect.left - 132), y: triggerRect.bottom + 8, courier });
  };

  const renderCourierCell = (columnId: CourierColumnId, courier: Courier) => {
    const currentDelivery = getCurrentDelivery(courier.id);

    switch (columnId) {
      case 'name':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className="block truncate whitespace-nowrap text-xs font-medium text-[#0d0d12] dark:text-[#fafafa]">
              {courier.name}
            </span>
          </td>
        );
      case 'connection':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className={`whitespace-nowrap text-xs font-medium ${courier.status === 'offline' ? 'text-[#737373] dark:text-[#a3a3a3]' : 'text-[#16a34a] dark:text-[#9fe870]'}`}>
              {courier.status === 'offline' ? TEXT.notConnected : TEXT.connected}
            </span>
          </td>
        );
      case 'shift':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className={`whitespace-nowrap text-xs font-medium ${courier.isOnShift ? 'text-[#a78bfa] dark:text-[#c4b5fd]' : 'text-[#737373] dark:text-[#525252]'}`}>
              {courier.isOnShift ? TEXT.onShift : TEXT.offShift}
            </span>
          </td>
        );
      case 'availability':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className={`whitespace-nowrap text-xs font-medium ${
              courier.status === 'busy'
                ? 'text-[#f97316] dark:text-[#ffa94d]'
                : courier.status === 'offline' || !courier.isOnShift
                  ? 'text-[#737373] dark:text-[#a3a3a3]'
                  : 'text-[#16a34a] dark:text-[#9fe870]'
            }`}>
              {courier.status === 'busy' ? TEXT.inDelivery : courier.status === 'offline' || !courier.isOnShift ? '-' : TEXT.free}
            </span>
          </td>
        );
      case 'vehicleType':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className="whitespace-nowrap text-xs text-[#666d80] dark:text-[#a3a3a3]">{courier.vehicleType}</span>
          </td>
        );
      case 'employmentType':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className="whitespace-nowrap text-xs text-[#666d80] dark:text-[#a3a3a3]">{courier.employmentType}</span>
          </td>
        );
      case 'phone':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className="block truncate direction-ltr whitespace-nowrap text-xs text-[#666d80] dark:text-[#a3a3a3]">{courier.phone}</span>
          </td>
        );
      case 'rating':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
              <span className="whitespace-nowrap text-xs font-medium text-[#0d0d12] dark:text-[#fafafa]">{courier.rating.toFixed(1)}</span>
            </div>
          </td>
        );
      case 'totalDeliveries':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className="whitespace-nowrap text-xs font-medium text-[#0d0d12] dark:text-[#fafafa]">{courier.totalDeliveries}</span>
          </td>
        );
      case 'currentDelivery':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            {currentDelivery ? (
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="block truncate whitespace-nowrap text-xs text-blue-600 dark:text-blue-400">
                  {currentDelivery.api_short_order_id || currentDelivery.id.slice(0, 6)}
                </span>
              </div>
            ) : (
              <span className="text-xs text-[#a3a3a3]">-</span>
            )}
          </td>
        );
      case 'actions':
        return (
          <EntityTableActionsCell key={columnId} onClick={(event) => event.stopPropagation()}>
            <EntityRowActionTrigger onClick={(event) => openCourierActionsMenu(courier, event)} title={TEXT.more} />
          </EntityTableActionsCell>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <EntityListShell
        sidePanel={
          <EntityListSidePanel
            exportOpen={isExportOpen}
            columnsOpen={columnsOpen}
            exportPanel={
              <ListExportDrawer
                onClose={() => setIsExportOpen(false)}
                actions={[
                  {
                    id: 'visible-couriers',
                    title: '\u05d9\u05d9\u05e6\u05d5\u05d0 \u05d8\u05d1\u05dc\u05ea \u05d4\u05e9\u05dc\u05d9\u05d7\u05d9\u05dd',
                    description:
                      'Excel \u05e2\u05dd \u05d4\u05e2\u05de\u05d5\u05d3\u05d5\u05ea \u05d4\u05de\u05d5\u05e6\u05d2\u05d5\u05ea \u05db\u05e8\u05d2\u05e2 \u05d1\u05d8\u05d1\u05dc\u05d4',
                    meta: `${selectedCourierIds.size > 0 ? selectedCourierIds.size : filteredCouriers.length} \u05e9\u05dc\u05d9\u05d7\u05d9\u05dd \u00b7 ${visibleCourierColumns.filter((column) => column.id !== 'actions').length} \u05e2\u05de\u05d5\u05d3\u05d5\u05ea`,
                    icon: <FileSpreadsheet className="h-5 w-5" />,
                    onClick: handleExportVisibleCouriers,
                  },
                ]}
              />
            }
            columnsPanel={{
              setIsOpen: setColumnsOpen,
              visibleColumns,
              setVisibleColumns,
              categories: [...COURIER_COLUMN_CATEGORIES],
              defaultVisibleColumns: DEFAULT_COURIER_VISIBLE_COLUMNS,
              title: '\u05e2\u05de\u05d5\u05d3\u05d5\u05ea \u05e9\u05dc\u05d9\u05d7\u05d9\u05dd',
              description:
                '\u05d1\u05d7\u05e8 \u05d0\u05d9\u05dc\u05d5 \u05e4\u05e8\u05d8\u05d9\u05dd \u05d9\u05d5\u05e4\u05d9\u05e2\u05d5 \u05d1\u05d8\u05d1\u05dc\u05ea \u05d4\u05e9\u05dc\u05d9\u05d7\u05d9\u05dd',
              presetsKey: 'couriers-column-presets-v2',
            }}
          />
        }
        toolbar={
          <PageToolbar
            primaryActionLabel={TEXT.addCourier}
            onPrimaryAction={() => setIsModalOpen(true)}
            primaryActionDataOnboarding="add-courier-btn"
            showPeriodControl={false}
            headerControls={
              <ListToolbarActions
                showSearch={false}
                columnsOpen={columnsOpen}
                onToggleColumns={() => { setColumnsOpen((value) => !value); setIsExportOpen(false); }}
                onExport={() => { setIsExportOpen((value) => !value); setColumnsOpen(false); }}
              />
            }
            controls={<ListInlineFilters filters={courierInlineFilters} />}
            actions={
              <ListToolbarActions
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchPlaceholder={TEXT.searchPlaceholder}
                searchWidthClass="w-48"
                showColumnsToggle={false}
                showExportButton={false}
              />
            }
          />
        }
        overview={
          <CourierOverviewStrip stats={stats} hasFilters={hasActiveFilters} />
        }
      >
            <ListTableSection
              isEmpty={filteredCouriers.length === 0}
              emptyState={
                state.couriers.length === 0 ? (
                  <EntityEmptyState
                    icon={<Bike className="h-12 w-12 text-[#9fe870]" />}
                    title="טרם נוספו שליחים"
                    description="כאשר יתווספו שליחים למערכת, הם יופיעו כאן עם זמינות, משמרת ומשלוח פעיל."
                    footerText="המערכת מוכנה לקבלת שליחים חדשים"
                  />
                ) : (
                  <CourierNoResultsState searchQuery={searchQuery} onClear={handleClearAll} />
                )
              }
              selectionBar={
                <SelectionActionBar
                  selectedCount={selectedCourierIds.size}
                  entitySingular={'\u05e9\u05dc\u05d9\u05d7'}
                  entityPlural={'\u05e9\u05dc\u05d9\u05d7\u05d9\u05dd'}
                  onClear={() => setSelectedCourierIds(new Set())}
                  actions={
                    <>
                      <SelectionActionButton
                        onClick={() => handleBulkSetCourierStatus('available')}
                      >
                        {'\u05d4\u05e4\u05e2\u05dc'}
                      </SelectionActionButton>
                      <SelectionActionButton
                        onClick={() => handleBulkSetCourierStatus('offline')}
                        variant="neutral"
                      >
                        {'\u05d4\u05e9\u05d1\u05ea'}
                      </SelectionActionButton>
                      <SelectionActionButton
                        onClick={handleBulkStartShift}
                        variant="accent"
                      >
                        {'\u05d4\u05ea\u05d7\u05dc \u05de\u05e9\u05de\u05e8\u05ea'}
                      </SelectionActionButton>
                      <SelectionActionButton
                        onClick={handleBulkEndShift}
                        variant="warning"
                      >
                        {'\u05e1\u05d9\u05d9\u05dd \u05de\u05e9\u05de\u05e8\u05ea'}
                      </SelectionActionButton>
                      <SelectionActionButton
                        onClick={handleExportVisibleCouriers}
                        variant="outline"
                      >
                        {TEXT.exportSelected}
                      </SelectionActionButton>
                    </>
                  }
                />
              }
              ariaLabel="טבלת שליחים"
              colgroup={
                <colgroup>
                  <col style={{ width: ENTITY_TABLE_WIDTHS.checkbox }} />
                  {visibleCourierColumns.map((column) => (
                    <col key={column.id} style={{ width: getCourierColumnWidth(column.id) }} />
                  ))}
                </colgroup>
              }
              headerRow={
                <tr>
                  <EntityTableHeaderCheckbox
                    checked={allVisibleCouriersSelected}
                    indeterminate={someVisibleCouriersSelected}
                    onChange={handleToggleSelectAllCouriers}
                  />
                  {visibleCourierColumns.map((column) => (
                    column.id === 'actions' ? (
                      <EntityTableActionsHeader key={column.id} label={column.label} />
                    ) : (
                      <EntityTableHeaderCell
                        key={column.id}
                        label={column.label}
                        onSort={() => handleCourierSort(column.id as SortableCourierColumnId)}
                        sortDirection={sortColumn === column.id ? sortDirection : null}
                      />
                    )
                  ))}
                </tr>
              }
            >
              {filteredCouriers.map((courier) => (
                <tr
                  key={courier.id}
                  onClick={() => navigate(`/courier/${courier.id}`)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContextMenu({ x: event.clientX, y: event.clientY, courier });
                  }}
                  className={`${ENTITY_TABLE_ROW_CLASS} cursor-pointer`}
                >
                  <EntityTableRowCheckbox
                    checked={selectedCourierIds.has(courier.id)}
                    onChange={() => handleToggleSelectCourier(courier.id)}
                  />
                  {visibleCourierColumns.map((column) => renderCourierCell(column.id, courier))}
                </tr>
              ))}
            </ListTableSection>
      </EntityListShell>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleModalClose}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#e5e5e5] bg-white p-6 dark:border-[#262626] dark:bg-[#171717]"
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">{TEXT.addNewCourier}</h2>
              <button
                type="button"
                onClick={handleModalClose}
                className="rounded-lg p-2 transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
              >
                <X className="h-5 w-5 text-[#737373] dark:text-[#a3a3a3]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-[#a3a3a3]">{TEXT.fullName}</label>
                <input
                  type="text"
                  value={newCourier.name}
                  onChange={(event) => setNewCourier({ ...newCourier, name: event.target.value })}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa]"
                  placeholder={TEXT.enterFullName}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-[#a3a3a3]">{TEXT.phone}</label>
                <input
                  type="tel"
                  value={newCourier.phone}
                  onChange={(event) => setNewCourier({ ...newCourier, phone: event.target.value })}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa]"
                  placeholder={TEXT.enterPhone}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-[#a3a3a3]">{TEXT.vehicleType}</label>
                <select
                  value={newCourier.vehicleType}
                  onChange={(event) => setNewCourier({ ...newCourier, vehicleType: event.target.value as Courier['vehicleType'] })}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa]"
                >
                  {VEHICLE_TYPES.map((vehicleType) => (
                    <option key={vehicleType} value={vehicleType}>
                      {vehicleType}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={addCourier}
                disabled={!newCourier.name.trim() || !newCourier.phone.trim()}
                className="flex-1 rounded-lg bg-[#9fe870] px-4 py-2.5 font-medium text-[#0d0d12] transition-colors hover:bg-[#8fd65f] disabled:bg-[#e5e5e5] disabled:text-[#a3a3a3]"
              >
                {TEXT.addCourier}
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="rounded-lg bg-[#f5f5f5] px-4 py-2.5 font-medium text-[#0d0d12] transition-colors hover:bg-[#e5e5e5] dark:bg-[#262626] dark:text-[#fafafa] dark:hover:bg-[#404040]"
              >
                {TEXT.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      <EntityActionMenuOverlay
        open={Boolean(contextMenu)}
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        onClose={closeCourierActionsMenu}
      >
        {contextMenu && (
          <EntityActionMenu
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <EntityActionMenuHeader
              title={contextMenu.courier.name}
              subtitle={
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-medium ${getStatusColor(contextMenu.courier.status)}`}>
                    {getStatusLabel(contextMenu.courier.status)}
                  </span>
                  <span className="text-[10px] text-[#525252] dark:text-[#737373]">·</span>
                  <span className={`text-[11px] font-medium ${contextMenu.courier.isOnShift ? 'text-[#a78bfa] dark:text-[#c4b5fd]' : 'text-[#737373] dark:text-[#525252]'}`}>
                    {contextMenu.courier.isOnShift ? TEXT.onShift : TEXT.offShift}
                  </span>
                </div>
              }
            />

            <EntityActionMenuItem
              onClick={() => {
                closeCourierActionsMenu();
                navigate(`/courier/${contextMenu.courier.id}`);
              }}
              icon={<FileText className="w-3.5 h-3.5 text-[#737373] dark:text-[#a3a3a3]" />}
            >
              {TEXT.details}
            </EntityActionMenuItem>

            <EntityActionMenuItem
              onClick={() => {
                toggleCourierPower(contextMenu.courier);
                closeCourierActionsMenu();
              }}
              icon={<Power className="w-3.5 h-3.5 text-[#16a34a] dark:text-[#9fe870]" />}
            >
              {contextMenu.courier.status === 'offline' ? TEXT.activate : TEXT.disable}
            </EntityActionMenuItem>

            <EntityActionMenuItem
              onClick={() => handleToggleShift(contextMenu.courier)}
              disabled={!contextMenu.courier.isOnShift && contextMenu.courier.status === 'offline'}
              icon={
                contextMenu.courier.isOnShift ? (
                  <LogOut className="w-3.5 h-3.5 text-[#f97316]" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-[#16a34a] dark:text-[#9fe870]" />
                )
              }
            >
              {contextMenu.courier.isOnShift ? TEXT.endShift : TEXT.startShift}
            </EntityActionMenuItem>

            <EntityActionMenuDivider />

            <EntityActionMenuItem
              onClick={(event) => handleRemoveCourier(contextMenu.courier, event)}
              icon={<Trash2 className="w-3.5 h-3.5" />}
              danger
            >
              {TEXT.deleteCourier}
            </EntityActionMenuItem>
          </EntityActionMenu>
        )}
      </EntityActionMenuOverlay>
    </>
  );
};
