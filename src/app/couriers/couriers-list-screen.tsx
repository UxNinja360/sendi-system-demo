import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { format } from 'date-fns';
import {
  Bike,
  Clock,
  Clock3,
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
import { addAppTopBarActionListener } from '../components/layout/app-top-bar-actions';
import { ListExportDrawer } from '../components/common/list-export-drawer';
import { ListTableSection } from '../components/common/list-table-section';
import { ListToolbarActions } from '../components/common/list-toolbar-actions';
import { PageToolbar } from '../components/common/page-toolbar';
import { ToolbarIconButton } from '../components/common/toolbar-icon-button';
import type { PeriodMode } from '../components/common/toolbar-date-picker';
import { VercelEmptyState } from '../components/common/vercel-empty-state';
import { InfoBar, type InfoBarItem } from '../components/common/info-bar';
import {
  SelectionActionBar,
  SelectionActionButton,
} from '../components/common/selection-action-bar';
import { useDelivery } from '../context/delivery-context-value';
import { DELIVERY_STORAGE_KEYS } from '../context/delivery-storage';
import { Courier } from '../types/delivery.types';
import { getPeriodDateRange, isDeliveryInPeriod, toDateInputValue } from '../utils/date-period';
import { exportRowsToExcel } from '../utils/export-utils';
import { CouriersVercelList } from './couriers-vercel-list';

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
};

const VEHICLE_TYPES: Courier['vehicleType'][] = ['אופנוע', 'רכב', 'קורקינט'];
const COURIER_COLUMN_ORDER_KEY = `${DELIVERY_STORAGE_KEYS.couriersColumnOrder}:product-v1`;
const COURIER_VISIBLE_COLUMNS_KEY = `${DELIVERY_STORAGE_KEYS.couriersVisibleColumns}:product-v3`;
const DEFAULT_COURIER_VISIBLE_COLUMNS: CourierColumnId[] = [
  'name',
  'connection',
  'shift',
  'availability',
  'phone',
  'totalDeliveries',
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
const COURIER_DATA_COLUMNS = COURIER_COLUMNS.filter((column) => column.id !== 'actions');

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
  return 'text-[#737373] dark:text-app-text-secondary';
};

const CourierOverviewStrip: React.FC<{ stats: CourierStats; hasFilters: boolean }> = ({ stats, hasFilters }) => {
  const items: InfoBarItem[] = [
    { label: 'סה״כ שליחים', value: stats.total.toLocaleString('he-IL') },
    { label: 'זמינים', value: stats.available.toLocaleString('he-IL'), tone: 'success' },
    { label: 'במשלוח', value: stats.busy.toLocaleString('he-IL'), tone: 'orange' },
    ...(hasFilters ? [{ label: 'תוצאות', value: stats.filtered.toLocaleString('he-IL') }] : []),
  ];

  return <InfoBar items={items} />;
};

const CourierNoResultsState: React.FC<{ searchQuery: string; onClear: () => void }> = ({ searchQuery, onClear }) => (
  <div className="flex flex-col items-center justify-center px-4 py-20">
    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-[#f5f5f5] dark:bg-[#262626]">
      <Search className="h-10 w-10 text-[#737373] dark:text-app-text-secondary" />
    </div>
    <h3 className="mb-2 text-xl font-bold text-[#0d0d12] dark:text-app-text">לא נמצאו שליחים</h3>
    <p className="mb-5 max-w-md text-center text-sm text-[#737373] dark:text-app-text-secondary">
      {searchQuery ? `אין התאמה לחיפוש "${searchQuery}"` : 'אין שליחים שתואמים לסינון הנוכחי'}
    </p>
    <button
      type="button"
      onClick={onClear}
      className="rounded-lg border border-[#d4d4d4] bg-white px-4 py-2 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#f5f5f5] dark:border-[#404040] dark:bg-app-surface dark:text-app-text dark:hover:bg-[#262626]"
    >
      נקה סינון
    </button>
  </div>
);

const CourierToolbarToggle: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ active, icon, label, onClick }) => (
  <div className="relative flex h-10 shrink-0 items-center justify-center">
    <ToolbarIconButton
      active={active}
      aria-pressed={active}
      label={label}
      title={label}
      onClick={onClick}
      className={
        active
          ? 'border-[#ededed] bg-[#101010] text-[#ededed] shadow-[inset_0_0_0_1px_rgba(237,237,237,0.35)]'
          : 'border-app-nav-border text-[#8f8f8f]'
      }
    >
      <span
        className={`
          flex items-center justify-center transition-transform
          ${active ? '-translate-y-1' : 'translate-y-0'}
        `}
      >
        {icon}
      </span>
    </ToolbarIconButton>
    <span
      className={`
        pointer-events-none absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#ededed] transition-opacity
        ${active ? 'opacity-100' : 'opacity-0'}
      `}
    />
  </div>
);

export const CouriersListScreen: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showConnectedOnly, setShowConnectedOnly] = useState(false);
  const [showOnShiftOnly, setShowOnShiftOnly] = useState(false);
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
  const [periodMode] = useState<PeriodMode>('current_month');
  const [monthAnchor] = useState(() => new Date());
  const [customStartDate] = useState(() => {
    const now = new Date();
    return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [customEndDate] = useState(() => toDateInputValue(new Date()));
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(COURIER_COLUMN_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const valid = new Set(COURIER_DATA_COLUMNS.map((column) => column.id));
        const filtered = parsed.filter((id) => valid.has(id as CourierColumnId));
        const missing = COURIER_DATA_COLUMNS.map((column) => column.id).filter((id) => !filtered.includes(id));
        return [...filtered, ...missing];
      }
    } catch {}

    return COURIER_DATA_COLUMNS.map((column) => column.id);
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
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

  useEffect(() => (
    addAppTopBarActionListener('create-courier', () => setIsModalOpen(true))
  ), []);

  const activeDeliveriesByCourier = useMemo(() => {
    const map = new Map<string, typeof state.deliveries[number]>();
    state.deliveries.forEach((delivery) => {
      if (!delivery.courierId) return;
      if (delivery.status === 'delivered' || delivery.status === 'cancelled' || delivery.status === 'expired') return;
      if (!map.has(delivery.courierId)) map.set(delivery.courierId, delivery);
    });
    return map;
  }, [state.deliveries]);

  const periodRange = useMemo(
    () => getPeriodDateRange(periodMode, monthAnchor, customStartDate, customEndDate),
    [customEndDate, customStartDate, monthAnchor, periodMode],
  );

  const deliveriesCountByCourierInPeriod = useMemo(() => {
    const counts = new Map<string, number>();
    state.deliveries.forEach((delivery) => {
      const courierId = delivery.courierId ?? delivery.runner_id;
      if (!courierId || !isDeliveryInPeriod(delivery, periodRange)) return;
      counts.set(courierId, (counts.get(courierId) ?? 0) + 1);
    });
    return counts;
  }, [periodRange, state.deliveries]);

  useEffect(() => {
    try {
      localStorage.setItem(COURIER_VISIBLE_COLUMNS_KEY, JSON.stringify(Array.from(visibleColumns)));
    } catch {}
  }, [visibleColumns]);

  const orderedCourierColumns = useMemo(() => {
    const map = new Map(COURIER_DATA_COLUMNS.map((column) => [column.id, column]));
    return columnOrder.map((id) => map.get(id as CourierColumnId)!).filter(Boolean);
  }, [columnOrder]);

  const visibleCourierColumns = useMemo(() => {
    const dataColumns = orderedCourierColumns.filter((column) => visibleColumns.has(column.id));
    return [...dataColumns, COURIER_ACTION_COLUMN];
  }, [orderedCourierColumns, visibleColumns]);

  const handleColumnReorder = useCallback((fromId: string, toId: string) => {
    if (!fromId || fromId === toId) return;

    setColumnOrder((current) => {
      const next = [...current];
      const fromIndex = next.indexOf(fromId);
      const toIndex = next.indexOf(toId);
      if (fromIndex === -1 || toIndex === -1) return current;

      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromId);
      localStorage.setItem(COURIER_COLUMN_ORDER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const filteredCouriers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    let couriers = state.couriers;

    if (showConnectedOnly) {
      couriers = couriers.filter((courier) => courier.status !== 'offline');
    }

    if (showOnShiftOnly) {
      couriers = couriers.filter((courier) => courier.isOnShift);
    }

    if (normalizedSearch) {
      couriers = couriers.filter((courier) =>
        courier.name.toLowerCase().includes(normalizedSearch) ||
        courier.phone.toLowerCase().includes(normalizedSearch),
      );
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
          return (
            (deliveriesCountByCourierInPeriod.get(a.id) ?? 0) -
            (deliveriesCountByCourierInPeriod.get(b.id) ?? 0)
          ) * direction;
        case 'currentDelivery': {
          const aDelivery = activeDeliveriesByCourier.get(a.id)?.orderNumber ?? '';
          const bDelivery = activeDeliveriesByCourier.get(b.id)?.orderNumber ?? '';
          return aDelivery.localeCompare(bDelivery, 'he') * direction;
        }
        default:
          return 0;
      }
    });
  }, [
    activeDeliveriesByCourier,
    deliveriesCountByCourierInPeriod,
    searchQuery,
    showConnectedOnly,
    showOnShiftOnly,
    sortColumn,
    sortDirection,
    state.couriers,
  ]);

  const stats = useMemo<CourierStats>(() => ({
    total: state.couriers.length,
    filtered: filteredCouriers.length,
    available: state.couriers.filter((courier) => courier.status === 'available').length,
    busy: state.couriers.filter((courier) => courier.status === 'busy').length,
    offline: state.couriers.filter((courier) => courier.status === 'offline').length,
  }), [filteredCouriers.length, state.couriers]);

  const hasActiveFilters = Boolean(searchQuery.trim()) || showConnectedOnly || showOnShiftOnly;
  const allVisibleCouriersSelected =
    filteredCouriers.length > 0 && filteredCouriers.every((courier) => selectedCourierIds.has(courier.id));
  const someVisibleCouriersSelected = filteredCouriers.some((courier) => selectedCourierIds.has(courier.id));

  const handleClearAll = () => {
    setSearchQuery('');
    setShowConnectedOnly(false);
    setShowOnShiftOnly(false);
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
        return deliveriesCountByCourierInPeriod.get(courier.id) ?? 0;
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
      return;
    }

    dispatch({ type: 'START_COURIER_SHIFT', payload: { courierId: courier.id } });
  };

  const handleRemoveCourier = (courier: Courier, event: React.MouseEvent) => {
    event.stopPropagation();
    closeCourierActionsMenu();

    if (activeDeliveriesByCourier.has(courier.id) || courier.activeDeliveryIds.length > 0) {
      toast.error(TEXT.cannotDelete);
      return;
    }

    dispatch({ type: 'REMOVE_COURIER', payload: courier.id });
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
            <span className="block truncate whitespace-nowrap text-xs font-medium text-[#0d0d12] dark:text-app-text">
              {courier.name}
            </span>
          </td>
        );
      case 'connection':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className={`whitespace-nowrap text-xs font-medium ${courier.status === 'offline' ? 'text-[#737373] dark:text-app-text-secondary' : 'text-[#16a34a] dark:text-[#9fe870]'}`}>
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
                  ? 'text-[#737373] dark:text-app-text-secondary'
                  : 'text-[#16a34a] dark:text-[#9fe870]'
            }`}>
              {courier.status === 'busy' ? TEXT.inDelivery : courier.status === 'offline' || !courier.isOnShift ? '-' : TEXT.free}
            </span>
          </td>
        );
      case 'vehicleType':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className="whitespace-nowrap text-xs text-[#666d80] dark:text-app-text-secondary">{courier.vehicleType}</span>
          </td>
        );
      case 'employmentType':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className="whitespace-nowrap text-xs text-[#666d80] dark:text-app-text-secondary">{courier.employmentType}</span>
          </td>
        );
      case 'phone':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className="block truncate direction-ltr whitespace-nowrap text-xs text-[#666d80] dark:text-app-text-secondary">{courier.phone}</span>
          </td>
        );
      case 'rating':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
              <span className="whitespace-nowrap text-xs font-medium text-[#0d0d12] dark:text-app-text">{courier.rating.toFixed(1)}</span>
            </div>
          </td>
        );
      case 'totalDeliveries':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className="whitespace-nowrap text-xs font-medium text-[#0d0d12] dark:text-app-text">
              {deliveriesCountByCourierInPeriod.get(courier.id) ?? 0}
            </span>
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
            showBottomBorder={false}
            showPeriodControl={false}
            headerControls={
              <ListToolbarActions
                showSearch={false}
                showColumnsToggle={false}
                columnsOpen={columnsOpen}
                onToggleColumns={() => { setColumnsOpen((value) => !value); setIsExportOpen(false); }}
                onExport={() => { setIsExportOpen((value) => !value); setColumnsOpen(false); }}
              />
            }
            actions={
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <div className="flex shrink-0 items-center gap-1">
                  <CourierToolbarToggle
                    active={showConnectedOnly}
                    label="הצג רק שליחים מחוברים"
                    onClick={() => setShowConnectedOnly((value) => !value)}
                    icon={<Bike className="h-3.5 w-3.5" />}
                  />
                  <CourierToolbarToggle
                    active={showOnShiftOnly}
                    label="הצג שליחים במשמרת"
                    onClick={() => setShowOnShiftOnly((value) => !value)}
                    icon={<Clock3 className="h-3.5 w-3.5" />}
                  />
                </div>
                <ListToolbarActions
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  searchPlaceholder={TEXT.searchPlaceholder}
                  searchWidthClass="w-48"
                  showColumnsToggle={false}
                  showExportButton={false}
                />
              </div>
            }
          />
        }
      >
            <CouriersVercelList
              couriers={filteredCouriers}
              selectedIds={selectedCourierIds}
              activeDeliveriesByCourier={activeDeliveriesByCourier}
              deliveriesCountByCourierInPeriod={deliveriesCountByCourierInPeriod}
              onToggleSelect={handleToggleSelectCourier}
              onOpenActionsMenu={openCourierActionsMenu}
              onOpenContextMenu={(courier, event) => {
                event.preventDefault();
                setContextMenu({ x: event.clientX, y: event.clientY, courier });
              }}
              emptyState={
                state.couriers.length === 0 ? (
                  <VercelEmptyState
                    title="אין שליחים"
                    description="עדיין לא נוספו שליחים למערכת."
                  />
                ) : (
                  <VercelEmptyState
                    title="אין תוצאות"
                    description={
                      searchQuery
                        ? `אין שליחים שתואמים לחיפוש "${searchQuery}".`
                        : 'אין שליחים שתואמים לסינון הנוכחי.'
                    }
                    actionLabel="נקה סינון"
                    onAction={handleClearAll}
                  />
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
                      <SelectionActionButton onClick={() => handleBulkSetCourierStatus('available')}>
                        {'\u05d4\u05e4\u05e2\u05dc'}
                      </SelectionActionButton>
                      <SelectionActionButton
                        onClick={() => handleBulkSetCourierStatus('offline')}
                        variant="neutral"
                      >
                        {'\u05d4\u05e9\u05d1\u05ea'}
                      </SelectionActionButton>
                      <SelectionActionButton onClick={handleBulkStartShift} variant="accent">
                        {'\u05d4\u05ea\u05d7\u05dc \u05de\u05e9\u05de\u05e8\u05ea'}
                      </SelectionActionButton>
                      <SelectionActionButton onClick={handleBulkEndShift} variant="warning">
                        {'\u05e1\u05d9\u05d9\u05dd \u05de\u05e9\u05de\u05e8\u05ea'}
                      </SelectionActionButton>
                      <SelectionActionButton onClick={handleExportVisibleCouriers} variant="outline">
                        {TEXT.exportSelected}
                      </SelectionActionButton>
                    </>
                  }
                />
              }
            />
            {false && (
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
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', column.id);
                          setDraggingId(column.id);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOverId(column.id);
                        }}
                        onDragLeave={() => setDragOverId(null)}
                        onDrop={(event) => {
                          event.preventDefault();
                          const from = event.dataTransfer.getData('text/plain');
                          handleColumnReorder(from, column.id);
                          setDragOverId(null);
                          setDraggingId(null);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverId(null);
                        }}
                        isDragging={draggingId === column.id}
                        isDragOver={dragOverId === column.id && draggingId !== column.id}
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
            )}
      </EntityListShell>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleModalClose}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#e5e5e5] bg-white p-6 dark:border-app-border dark:bg-app-surface"
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0d0d12] dark:text-app-text">{TEXT.addNewCourier}</h2>
              <button
                type="button"
                onClick={handleModalClose}
                className="rounded-lg p-2 transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
              >
                <X className="h-5 w-5 text-[#737373] dark:text-app-text-secondary" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-app-text-secondary">{TEXT.fullName}</label>
                <input
                  type="text"
                  value={newCourier.name}
                  onChange={(event) => setNewCourier({ ...newCourier, name: event.target.value })}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-app-border dark:bg-app-surface dark:text-app-text"
                  placeholder={TEXT.enterFullName}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-app-text-secondary">{TEXT.phone}</label>
                <input
                  type="tel"
                  value={newCourier.phone}
                  onChange={(event) => setNewCourier({ ...newCourier, phone: event.target.value })}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-app-border dark:bg-app-surface dark:text-app-text"
                  placeholder={TEXT.enterPhone}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-app-text-secondary">{TEXT.vehicleType}</label>
                <select
                  value={newCourier.vehicleType}
                  onChange={(event) => setNewCourier({ ...newCourier, vehicleType: event.target.value as Courier['vehicleType'] })}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-app-border dark:bg-app-surface dark:text-app-text"
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
                className="rounded-lg bg-[#f5f5f5] px-4 py-2.5 font-medium text-[#0d0d12] transition-colors hover:bg-[#e5e5e5] dark:bg-[#262626] dark:text-app-text dark:hover:bg-[#404040]"
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
              icon={<FileText className="w-3.5 h-3.5 text-[#737373] dark:text-app-text-secondary" />}
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
