import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Power, Download, Search, Store as StoreIcon, Trash2, X, FileText, FileSpreadsheet } from 'lucide-react';
import { useDelivery } from '../context/delivery-context-value';
import { useNavigate } from 'react-router';
import { Delivery, Restaurant } from '../types/delivery.types';
import { format } from 'date-fns';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { EntityListSidePanel } from '../components/common/entity-list-side-panel';
import { EntityListShell } from '../components/common/entity-list-shell';
import { addAppTopBarActionListener } from '../components/layout/app-top-bar-actions';
import { ListExportDrawer } from '../components/common/list-export-drawer';
import { PageToolbar } from '../components/common/page-toolbar';
import type { PeriodMode } from '../components/common/toolbar-date-picker';
import { VercelEmptyState } from '../components/common/vercel-empty-state';
import { InfoBar, type InfoBarItem } from '../components/common/info-bar';
import {
  SelectionActionBar,
  SelectionActionButton,
} from '../components/common/selection-action-bar';
import { ListToolbarActions } from '../components/common/list-toolbar-actions';
import { getRestaurantChainId } from '../utils/restaurant-branding';
import {
  formatCurrency,
  getDeliveryCashAmount,
  getDeliveryCommission,
  getDeliveryCourierBasePay,
  getDeliveryCourierTip,
  getDeliveryCustomerCharge,
  getDeliveryRestaurantCharge,
  sumDeliveryMoney,
} from '../utils/delivery-finance';
import {
  createExcelWorkbook,
  exportRowsToExcel,
  downloadExcelBuffer,
  sanitizeExportFileName,
  workbookToExcelBuffer,
} from '../utils/export-utils';
import { getPeriodDateRange, isDeliveryInPeriod, toDateInputValue } from '../utils/date-period';
import {
  EntityActionMenu,
  EntityActionMenuDivider,
  EntityActionMenuHeader,
  EntityActionMenuItem,
  EntityActionMenuOverlay,
} from '../components/common/entity-action-menu';
import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import { EntityEmptyState } from '../components/common/entity-empty-state';
import { EntityTableHeaderCell } from '../components/common/entity-table-header-cell';
import {
  EntityTableActionsCell,
  EntityTableActionsHeader,
  EntityTableHeaderCheckbox,
  EntityTableRowCheckbox,
} from '../components/common/entity-table-shell';
import { ListTableSection } from '../components/common/list-table-section';
import {
  ENTITY_TABLE_DATA_CELL_CLASS,
  ENTITY_TABLE_HEAD_CLASS,
  ENTITY_TABLE_ROW_CLASS,
  ENTITY_TABLE_WIDTHS,
} from '../components/common/entity-table-shared';
import { DELIVERY_STORAGE_KEYS } from '../context/delivery-storage';
import { RestaurantsVercelList } from './restaurants-vercel-list';

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════
type RestaurantRow = {
  id: number; restaurantId: string; name: string; status: 'פעיל' | 'לא פעיל';
  isActive: boolean; totalDeliveries: number; linkedHubs: string[];
  contactPerson: string; phone: string; city: string; street: string; username: string; type: string; chainId: string;
};

type RestaurantStats = {
  total: number;
  filtered: number;
};

// ═══════════════════════════════════════
// Financial helper
// ═══════════════════════════════════════
const calcFinancials = (dels: Delivery[]) => {
  const delivered = dels.filter(d => d.status === 'delivered');
  const cancelled = dels.filter(d => d.status === 'cancelled');
  const totalRevenue = sumDeliveryMoney(delivered, getDeliveryCustomerCharge);
  const totalCourierPay = sumDeliveryMoney(dels, getDeliveryCourierBasePay);
  const totalTips = sumDeliveryMoney(dels, getDeliveryCourierTip);
  const totalCash = sumDeliveryMoney(dels, getDeliveryCashAmount);
  const totalCommission = sumDeliveryMoney(dels, getDeliveryCommission);
  const totalRestPrice = sumDeliveryMoney(dels, getDeliveryRestaurantCharge);
  const profit = totalRevenue - totalCourierPay - totalCommission;
  const avgTime = delivered.length > 0
    ? Math.round(delivered.reduce((s, d) => {
        if (d.deliveredAt && d.createdAt) return s + (new Date(d.deliveredAt).getTime() - new Date(d.createdAt).getTime()) / 60000;
        return s;
      }, 0) / delivered.length)
    : 0;
  return { deliveredCount: delivered.length, cancelledCount: cancelled.length, totalRevenue, totalCourierPay, totalTips, totalCash, totalCommission, totalRestPrice, profit, avgTime };
};

// ═══════════════════════════════════════
// Column definitions
// ═══════════════════════════════════════
const RESTAURANT_COLS = [
  { id: 'name',      label: 'מסעדה' },
  { id: 'chainId',   label: 'מזהה רשת' },
  { id: 'type',      label: 'סוג' },
  { id: 'status',    label: 'סטטוס' },
  { id: 'address',   label: 'כתובת' },
  { id: 'phone',     label: 'טלפון' },
  { id: 'contact',   label: 'איש קשר' },
  { id: 'deliveries',label: 'סך משלוחים' },
] as const;

const getRestaurantColumnWidth = (columnId: RestaurantColId) => {
  switch (columnId) {
    case 'name':
      return ENTITY_TABLE_WIDTHS.name;
    case 'chainId':
      return ENTITY_TABLE_WIDTHS.md;
    case 'type':
      return ENTITY_TABLE_WIDTHS.sm;
    case 'status':
      return ENTITY_TABLE_WIDTHS.sm;
    case 'address':
      return ENTITY_TABLE_WIDTHS.address;
    case 'phone':
      return ENTITY_TABLE_WIDTHS.phone;
    case 'contact':
      return ENTITY_TABLE_WIDTHS.lg;
    case 'deliveries':
      return ENTITY_TABLE_WIDTHS.sm;
    default:
      return ENTITY_TABLE_WIDTHS.lg;
  }
};
type RestaurantColId = typeof RESTAURANT_COLS[number]['id'];
type RestaurantSortableColumnId = RestaurantColId;
const COL_ORDER_KEY = DELIVERY_STORAGE_KEYS.restaurantsColumnOrder;
const DEFAULT_RESTAURANT_VISIBLE_COLUMNS: RestaurantColId[] = [
  'name',
  'status',
  'address',
  'phone',
  'contact',
  'deliveries',
];
const RESTAURANT_VISIBLE_COLUMNS_KEY = `${DELIVERY_STORAGE_KEYS.restaurantsVisibleColumns}:product-v2`;
const RESTAURANT_COLUMN_CATEGORIES = [
  {
    id: 'core',
    label: 'ליבה',
    columns: [
      { id: 'name', label: 'מסעדה' },
      { id: 'status', label: 'סטטוס' },
      { id: 'deliveries', label: 'סך משלוחים' },
    ],
  },
  {
    id: 'contact',
    label: 'קשר וכתובת',
    columns: [
      { id: 'address', label: 'כתובת' },
      { id: 'phone', label: 'טלפון' },
      { id: 'contact', label: 'איש קשר' },
    ],
  },
  {
    id: 'details',
    label: 'פרטים נוספים',
    columns: [
      { id: 'type', label: 'סוג' },
      { id: 'chainId', label: 'מזהה רשת' },
    ],
  },
] as const;

const RestaurantOverviewStrip: React.FC<{ stats: RestaurantStats; hasSearch: boolean }> = ({
  stats,
  hasSearch,
}) => {
  const items: InfoBarItem[] = [
    { label: 'סה״כ מסעדות', value: stats.total.toLocaleString('he-IL') },
    ...(hasSearch
      ? [{ label: 'תוצאות חיפוש', value: stats.filtered.toLocaleString('he-IL') }]
      : []),
  ];

  return <InfoBar items={items} />;
};

const RestaurantNoResultsState: React.FC<{ query: string; onClear: () => void }> = ({
  query,
  onClear,
}) => (
  <div className="flex flex-col items-center justify-center px-4 py-20">
    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-[#f5f5f5] dark:bg-[#262626]">
      <Search className="h-10 w-10 text-[#737373] dark:text-app-text-secondary" />
    </div>
    <h3 className="mb-2 text-xl font-bold text-[#0d0d12] dark:text-app-text">לא נמצאו מסעדות</h3>
    <p className="mb-5 max-w-md text-center text-sm text-[#737373] dark:text-app-text-secondary">
      {query ? `אין התאמה לחיפוש "${query}"` : 'אין מסעדות שתואמות לחיפוש הנוכחי'}
    </p>
    <button
      type="button"
      onClick={onClear}
      className="rounded-lg border border-[#d4d4d4] bg-white px-4 py-2 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#f5f5f5] dark:border-[#404040] dark:bg-app-surface dark:text-app-text dark:hover:bg-[#262626]"
    >
      נקה חיפוש
    </button>
  </div>
);

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════
export const RestaurantsScreen: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const navigate = useNavigate();

  // ── Basic state ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({ name: '', phone: '', address: '', type: 'מסעדה' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<RestaurantSortableColumnId>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [openActionsRestaurantId, setOpenActionsRestaurantId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<Set<string>>(new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [periodMode] = useState<PeriodMode>('current_month');
  const [monthAnchor] = useState(() => new Date());
  const [customStartDate] = useState(() => {
    const now = new Date();
    return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [customEndDate] = useState(() => toDateInputValue(new Date()));

  // ── Column drag-and-drop ──
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(COL_ORDER_KEY);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        const valid = new Set(RESTAURANT_COLS.map(c => c.id));
        const filtered = parsed.filter(id => valid.has(id as RestaurantColId));
        const missing = RESTAURANT_COLS.map(c => c.id).filter(id => !filtered.includes(id));
        return [...filtered, ...missing];
      }
    } catch {}
    return RESTAURANT_COLS.map(c => c.id);
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId]   = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(RESTAURANT_VISIBLE_COLUMNS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const valid = new Set(RESTAURANT_COLS.map((col) => col.id));
        const filtered = parsed.filter((id) => valid.has(id as RestaurantColId));
        if (filtered.length > 0) return new Set(filtered);
      }
    } catch {}
    return new Set(DEFAULT_RESTAURANT_VISIBLE_COLUMNS);
  });

  const orderedCols = useMemo(() => {
    const map = new Map(RESTAURANT_COLS.map(c => [c.id, c]));
    return columnOrder.map(id => map.get(id as RestaurantColId)!).filter(Boolean);
  }, [columnOrder]);
  const visibleOrderedCols = useMemo(
    () => orderedCols.filter((col) => visibleColumns.has(col.id)),
    [orderedCols, visibleColumns],
  );

  useEffect(() => (
    addAppTopBarActionListener('create-restaurant', () => setIsAddModalOpen(true))
  ), []);

  useEffect(() => {
    try {
      localStorage.setItem(RESTAURANT_VISIBLE_COLUMNS_KEY, JSON.stringify(Array.from(visibleColumns)));
    } catch {}
  }, [visibleColumns]);

  const handleColumnReorder = useCallback((fromId: string, toId: string) => {
    setColumnOrder(prev => {
      const next = [...prev];
      const fi = next.indexOf(fromId);
      const ti = next.indexOf(toId);
      if (fi === -1 || ti === -1) return prev;
      next.splice(fi, 1);
      next.splice(ti, 0, fromId);
      localStorage.setItem(COL_ORDER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const periodRange = useMemo(
    () => getPeriodDateRange(periodMode, monthAnchor, customStartDate, customEndDate),
    [customEndDate, customStartDate, monthAnchor, periodMode],
  );

  const periodDeliveries = useMemo(
    () => state.deliveries.filter((delivery) => isDeliveryInPeriod(delivery, periodRange)),
    [periodRange, state.deliveries],
  );

  const deliveriesCountByRestaurant = useMemo(() => {
    const counts = new Map<string, number>();
    periodDeliveries.forEach((delivery) => {
      const restaurantId = delivery.restaurantId ?? delivery.rest_id;
      if (!restaurantId) return;
      counts.set(restaurantId, (counts.get(restaurantId) ?? 0) + 1);
    });
    return counts;
  }, [periodDeliveries]);

  // ── Data ──
  const restaurants: RestaurantRow[] = useMemo(() => state.restaurants.map((r, idx) => ({
    id: parseInt(r.id.replace('r', '')),
    restaurantId: r.id,
    name: r.name,
    status: r.isActive ? 'פעיל' as const : 'לא פעיל' as const,
    isActive: r.isActive,
    totalDeliveries: deliveriesCountByRestaurant.get(r.id) ?? 0,
    linkedHubs: idx % 3 === 0 ? ['תל אביב מרכז', 'תל אביב צפון'] : idx % 2 === 0 ? ['תל אביב מרכז'] : ['תל אביב דרום'],
    contactPerson: ['משה כהן', 'דנה לוי', 'יוסי אברהם', 'רונית גולן', 'אבי זהבי', 'דוד ישראלי', 'שרה מזרחי'][idx % 7],
    phone: r.phone,
    city: r.address.split(', ')[1] || 'תל אביב',
    street: r.address.split(', ')[0] || r.address,
    username: r.name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, ''),
    type: r.type,
    chainId: r.chainId || getRestaurantChainId(r.name),
  })), [state.restaurants, deliveriesCountByRestaurant]);

  const handleRestaurantSort = useCallback((columnId: RestaurantSortableColumnId) => {
    if (sortColumn === columnId) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(columnId);
    setSortDirection('asc');
  }, [sortColumn]);

  const filteredRestaurants = useMemo(() => {
    const filtered = restaurants.filter((r) => {
      const matchesSearch = !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.phone.includes(searchQuery);
      return matchesSearch;
    });

    const direction = sortDirection === 'asc' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      switch (sortColumn) {
        case 'name':
          return a.name.localeCompare(b.name, 'he') * direction;
        case 'chainId':
          return (a.chainId || '-').localeCompare(b.chainId || '-', 'he') * direction;
        case 'type':
          return a.type.localeCompare(b.type, 'he') * direction;
        case 'status':
          return a.status.localeCompare(b.status, 'he') * direction;
        case 'address':
          return `${a.street}, ${a.city}`.localeCompare(`${b.street}, ${b.city}`, 'he') * direction;
        case 'phone':
          return a.phone.localeCompare(b.phone, 'he') * direction;
        case 'contact':
          return a.contactPerson.localeCompare(b.contactPerson, 'he') * direction;
        case 'deliveries':
          return (a.totalDeliveries - b.totalDeliveries) * direction;
        default:
          return 0;
      }
    });
  }, [restaurants, searchQuery, sortColumn, sortDirection]);

  // Stats
  const stats = useMemo(() => ({
    total: restaurants.length,
    filtered: filteredRestaurants.length,
  }), [restaurants.length, filteredRestaurants.length]);

  // Selection state
  const allVisibleRestaurantsSelected = filteredRestaurants.length > 0 && filteredRestaurants.every(restaurant => selectedRestaurantIds.has(restaurant.restaurantId));
  const someVisibleRestaurantsSelected = filteredRestaurants.some(restaurant => selectedRestaurantIds.has(restaurant.restaurantId));

  // Clear handlers
  const handleClearAll = () => {
    setSearchQuery('');
  };

  const handleToggleSelectRestaurant = (restaurantId: string) => {
    setSelectedRestaurantIds(prev => {
      const next = new Set(prev);
      if (next.has(restaurantId)) next.delete(restaurantId);
      else next.add(restaurantId);
      return next;
    });
  };

  const handleToggleSelectAllRestaurants = () => {
    setSelectedRestaurantIds(prev => {
      const next = new Set(prev);
      if (allVisibleRestaurantsSelected) {
        filteredRestaurants.forEach(restaurant => next.delete(restaurant.restaurantId));
      } else {
        filteredRestaurants.forEach(restaurant => next.add(restaurant.restaurantId));
      }
      return next;
    });
  };

  const handleBulkSetRestaurantsActive = useCallback((isActive: boolean) => {
    const selectedRestaurants = restaurants.filter((restaurant) =>
      selectedRestaurantIds.has(restaurant.restaurantId),
    );

    if (selectedRestaurants.length === 0) {
      toast.error('לא נבחרו מסעדות לפעולה');
      return;
    }

    const restaurantsToUpdate = selectedRestaurants.filter((restaurant) => restaurant.isActive !== isActive);

    restaurantsToUpdate.forEach((restaurant) => {
      dispatch({ type: 'TOGGLE_RESTAURANT', payload: restaurant.restaurantId });
    });

    const alreadyInTargetStateCount = selectedRestaurants.length - restaurantsToUpdate.length;
    const summary = [
      restaurantsToUpdate.length > 0
        ? isActive
          ? `הופעלו ${restaurantsToUpdate.length} מסעדות`
          : `הושבתו ${restaurantsToUpdate.length} מסעדות`
        : null,
      alreadyInTargetStateCount > 0
        ? isActive
          ? `${alreadyInTargetStateCount} כבר היו פעילות`
          : `${alreadyInTargetStateCount} כבר היו מושבתות`
        : null,
    ]
      .filter(Boolean)
      .join('. ');

    if (restaurantsToUpdate.length > 0) {
      setSelectedRestaurantIds(new Set());
      return;
    }

    toast.error(summary || 'לא בוצע שינוי במסעדות שנבחרו');
  }, [dispatch, restaurants, selectedRestaurantIds]);

  // ── Add restaurant ──
  const handleAddRestaurant = async () => {
    if (!newRestaurant.name.trim()) return;

    // Geocode address with Nominatim
    let lat = 32.0853;
    let lng = 34.7818;
    const addressQuery = newRestaurant.address.trim();
    if (addressQuery) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery + ', ישראל')}&format=json&limit=1&countrycodes=il`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'he' } });
        const data = await res.json();
        if (data && data[0]) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      } catch {
        // fallback to Tel Aviv center
      }
    }

    // Delivery config by cuisine type
    const getRestaurantConfig = (type: string) => {
      switch (type) {
        case 'פיצה':
        case 'המבורגר':
        case 'סושי':
          return { deliveryRate: 1, deliveryInterval: 6, maxDeliveriesPerHour: 10 };
        case 'איטלקי':
          return { deliveryRate: 1, deliveryInterval: 12, maxDeliveriesPerHour: 5 };
        default:
          return { deliveryRate: 1, deliveryInterval: 20, maxDeliveriesPerHour: 3 };
      }
    };
    const config = getRestaurantConfig(newRestaurant.type.trim());

    const restaurant: Restaurant = {
      id: `r${Date.now()}`,
      name: newRestaurant.name.trim(),
      chainId: getRestaurantChainId(newRestaurant.name.trim()),
      phone: newRestaurant.phone.trim(),
      address: newRestaurant.address.trim() || 'ישראל',
      city: newRestaurant.address.includes(',') ? newRestaurant.address.split(',').pop()?.trim() ?? '' : '',
      street: newRestaurant.address.split(',')[0]?.trim() ?? newRestaurant.address.trim(),
      type: newRestaurant.type.trim() || 'מסעדה',
      lat,
      lng,
      rating: 5,
      isActive: true,
      totalOrders: 0,
      averageDeliveryTime: 30,
      defaultPreparationTime: 15,
      maxDeliveryTime: 30,
      deliveryRate: config.deliveryRate,
      deliveryInterval: config.deliveryInterval,
      maxDeliveriesPerHour: config.maxDeliveriesPerHour,
    };
    dispatch({ type: 'ADD_RESTAURANT', payload: restaurant });
    setIsAddModalOpen(false);
    setNewRestaurant({ name: '', phone: '', address: '', type: 'מסעדה' });
  };

  // ── Handlers ──
  const handleToggleRestaurant = (restaurantId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch({ type: 'TOGGLE_RESTAURANT', payload: restaurantId });
  };

  const handleRemoveRestaurant = (restaurantId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenActionsRestaurantId(null);

    const hasActiveDeliveries = state.deliveries.some(d =>
      d.restaurantId === restaurantId &&
      d.status !== 'delivered' &&
      d.status !== 'cancelled' &&
      d.status !== 'expired'
    );

    if (hasActiveDeliveries) {
      toast.error('אי אפשר למחוק מסעדה עם משלוחים פעילים.');
      return;
    }

    dispatch({ type: 'REMOVE_RESTAURANT', payload: restaurantId });
  };

  // ═══════════════════════════════════════
  // Build single restaurant workbook
  // ═══════════════════════════════════════
  const buildRestaurantWorkbook = (restaurantName: string, deliveries: Delivery[]): ArrayBuffer => {
    const f = calcFinancials(deliveries);
    const summaryRows = [
      { 'פרט': 'מסעדה', 'ערך': restaurantName },
      { 'פרט': 'סה״כ משלוחים', 'ערך': deliveries.length },
      { 'פרט': 'נמסרו', 'ערך': f.deliveredCount },
      { 'פרט': 'בוטלו', 'ערך': f.cancelledCount },
      { 'פרט': 'אחוז הצלחה', 'ערך': deliveries.length > 0 ? `${Math.round((f.deliveredCount / deliveries.length) * 100)}%` : '0%' },
      { 'פרט': 'זמן ממוצע (דק׳)', 'ערך': f.avgTime || '-' },
      { 'פרט': '', 'ערך': '' },
      { 'פרט': 'חיובי משלוחים', 'ערך': formatCurrency(f.totalRevenue) },
      { 'פרט': 'מחיר מסעדה', 'ערך': formatCurrency(f.totalRestPrice) },
      { 'פרט': 'תשלום שליח', 'ערך': formatCurrency(f.totalCourierPay) },
      { 'פרט': 'טיפים', 'ערך': formatCurrency(f.totalTips) },
      { 'פרט': 'מזומן', 'ערך': formatCurrency(f.totalCash) },
      { 'פרט': 'עמלות', 'ערך': formatCurrency(f.totalCommission) },
      { 'פרט': 'רווח נקי', 'ערך': formatCurrency(f.profit) },
    ];

    const workbook = createExcelWorkbook({
      rows: summaryRows,
      sheetName: 'סיכום',
      columnWidths: [20, 22],
    });

    return workbookToExcelBuffer(workbook);
  };

  // ═══════════════════════════════════════
  // Export: ZIP with one Excel per restaurant
  // ═══════════════════════════════════════
  const handleExportZipPerRestaurant = async () => {
    setIsExportOpen(false);
    const dateStr = format(new Date(), 'dd-MM-yyyy');
    const allDeliveries = periodDeliveries;

    const groups = new Map<string, { name: string; deliveries: Delivery[] }>();

    allDeliveries.forEach(d => {
      const rId = d.restaurantId || d.rest_id || '';
      const matchedRest = filteredRestaurants.find(r => r.restaurantId === rId || r.name === d.rest_name);
      if (!matchedRest) return;
      const key = matchedRest.restaurantId;
      if (!groups.has(key)) groups.set(key, { name: matchedRest.name, deliveries: [] });
      groups.get(key)!.deliveries.push(d);
    });

    if (groups.size === 0) { toast.error('אין משלוחים לייצוא'); return; }

    toast.loading(`מכין ${groups.size} קבצי Excel...`, { id: 'rest-zip-export' });

    const zip = new JSZip();
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name, 'he'));

    // Individual files
    const usedNames = new Set<string>();
    sortedGroups.forEach(([, group]) => {
      let safeName = sanitizeExportFileName(group.name);
      if (usedNames.has(safeName)) { let c = 2; while (usedNames.has(`${safeName}_${c}`)) c++; safeName = `${safeName}_${c}`; }
      usedNames.add(safeName);
      zip.file(`${safeName}_${dateStr}.xlsx`, buildRestaurantWorkbook(group.name, group.deliveries));
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `דוחות_מסעדות_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.zip`);
    toast.dismiss('rest-zip-export');
    toast.success(`${groups.size} קבצי Excel נארזו ב-ZIP`);
  };

  // ═══════════════════════════════════════
  // Export: Single restaurant Excel
  // ═══════════════════════════════════════
  const handleExportSingleRestaurant = (restaurantId: string, restaurantName: string) => {
    const deliveries = periodDeliveries.filter(d =>
      d.restaurantId === restaurantId || d.rest_id === restaurantId || d.rest_name === restaurantName
    );
    if (deliveries.length === 0) { toast.error(`אין משלוחים למסעדה ${restaurantName}`); return; }
    const buf = buildRestaurantWorkbook(restaurantName, deliveries);
    const safeName = sanitizeExportFileName(restaurantName);
    downloadExcelBuffer(buf, `${safeName}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success(`דוח ${restaurantName} הורד`);
  };

  const getRestaurantExportCellValue = useCallback((restaurant: RestaurantRow, columnId: RestaurantColId) => {
    switch (columnId) {
      case 'name':
        return restaurant.name;
      case 'chainId':
        return restaurant.chainId || '-';
      case 'type':
        return restaurant.type;
      case 'status':
        return restaurant.status;
      case 'address':
        return `${restaurant.street}, ${restaurant.city}`;
      case 'phone':
        return restaurant.phone;
      case 'contact':
        return restaurant.contactPerson;
      case 'deliveries':
        return restaurant.totalDeliveries;
      default:
        return '';
    }
  }, []);

  const handleExportVisibleRestaurants = useCallback(() => {
    const restaurantsToExport = selectedRestaurantIds.size > 0
      ? filteredRestaurants.filter((restaurant) => selectedRestaurantIds.has(restaurant.restaurantId))
      : filteredRestaurants;

    if (restaurantsToExport.length === 0) {
      toast.error('אין מסעדות לייצוא');
      return;
    }

    const rows = restaurantsToExport.map((restaurant) =>
      Object.fromEntries(
        visibleOrderedCols.map((column) => [
          column.label,
          getRestaurantExportCellValue(restaurant, column.id),
        ]),
      ),
    );

    exportRowsToExcel({
      rows,
      sheetName: 'מסעדות',
      fileName: `מסעדות_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`,
      columnWidths: visibleOrderedCols.map((column) => Math.max(12, column.label.length + 4)),
    });

    setIsExportOpen(false);
    toast.success(`יוצאו ${restaurantsToExport.length} מסעדות ל-Excel`);
  }, [filteredRestaurants, getRestaurantExportCellValue, selectedRestaurantIds, visibleOrderedCols]);

  // ═══════════════════════════════════════
  // Render
  // ═══════════════════════════════════════
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
                    id: 'visible-restaurants',
                    title: '\u05d9\u05d9\u05e6\u05d5\u05d0 \u05d8\u05d1\u05dc\u05ea \u05d4\u05de\u05e1\u05e2\u05d3\u05d5\u05ea',
                    description:
                      'Excel \u05e2\u05dd \u05d4\u05e2\u05de\u05d5\u05d3\u05d5\u05ea \u05d4\u05de\u05d5\u05e6\u05d2\u05d5\u05ea \u05db\u05e8\u05d2\u05e2 \u05d1\u05d8\u05d1\u05dc\u05d4',
                    meta: `${selectedRestaurantIds.size > 0 ? selectedRestaurantIds.size : filteredRestaurants.length} \u05de\u05e1\u05e2\u05d3\u05d5\u05ea \u00b7 ${visibleOrderedCols.length} \u05e2\u05de\u05d5\u05d3\u05d5\u05ea`,
                    icon: <FileSpreadsheet className="h-5 w-5" />,
                    onClick: handleExportVisibleRestaurants,
                  },
                  {
                    id: 'zip-per-restaurant',
                    title: '\u05d9\u05d9\u05e6\u05d5\u05d0 ZIP \u05dc\u05e4\u05d9 \u05de\u05e1\u05e2\u05d3\u05d4',
                    description:
                      '\u05e7\u05d5\u05d1\u05e5 Excel \u05e0\u05e4\u05e8\u05d3 \u05dc\u05db\u05dc \u05de\u05e1\u05e2\u05d3\u05d4 \u05e2\u05dd \u05d4\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05e9\u05dc\u05d4',
                    meta: `${stats.total} \u05de\u05e1\u05e2\u05d3\u05d5\u05ea \u00b7 ${periodDeliveries.length} \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd`,
                    icon: <Download className="h-5 w-5" />,
                    onClick: handleExportZipPerRestaurant,
                  },
                ]}
              />
            }
            columnsPanel={{
              setIsOpen: setColumnsOpen,
              visibleColumns,
              setVisibleColumns,
              categories: [...RESTAURANT_COLUMN_CATEGORIES],
              defaultVisibleColumns: DEFAULT_RESTAURANT_VISIBLE_COLUMNS,
              title: '\u05e2\u05de\u05d5\u05d3\u05d5\u05ea \u05de\u05e1\u05e2\u05d3\u05d5\u05ea',
              description:
                '\u05d1\u05d7\u05e8 \u05d0\u05d9\u05dc\u05d5 \u05e4\u05e8\u05d8\u05d9\u05dd \u05d9\u05d5\u05e4\u05d9\u05e2\u05d5 \u05d1\u05d8\u05d1\u05dc\u05ea \u05d4\u05de\u05e1\u05e2\u05d3\u05d5\u05ea',
              presetsKey: 'restaurants-column-presets-v1',
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
                onExport={() => { setIsExportOpen((v) => !v); setColumnsOpen(false); }}
                onToggleColumns={() => { setColumnsOpen((value) => !value); setIsExportOpen(false); }}
              />
            }
            actions={
              <ListToolbarActions
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchPlaceholder="חפש מסעדה, עיר או איש קשר..."
                searchWidthClass="w-52"
                showColumnsToggle={false}
                showExportButton={false}
              />
            }
          />
        }
      >

        {/* Content */}
            {/* Table / Empty state */}
            <RestaurantsVercelList
              restaurants={filteredRestaurants}
              selectedIds={selectedRestaurantIds}
              onToggleSelect={handleToggleSelectRestaurant}
              onOpenActionsMenu={(restaurant, event) => {
                event.stopPropagation();
                const rect = event.currentTarget.getBoundingClientRect();
                setContextMenuPos({ x: Math.max(8, rect.left - 132), y: rect.bottom + 8 });
                setOpenActionsRestaurantId(restaurant.restaurantId);
              }}
              onOpenContextMenu={(restaurant, event) => {
                event.preventDefault();
                setContextMenuPos({ x: event.clientX, y: event.clientY });
                setOpenActionsRestaurantId(restaurant.restaurantId);
              }}
              emptyState={
                restaurants.length === 0 ? (
                  <VercelEmptyState
                    title="אין מסעדות"
                    description="עדיין לא נוספו מסעדות למערכת."
                  />
                ) : (
                  <VercelEmptyState
                    title="אין תוצאות"
                    description={
                      searchQuery
                        ? `אין מסעדות שתואמות לחיפוש "${searchQuery}".`
                        : 'אין מסעדות שתואמות לסינון הנוכחי.'
                    }
                    actionLabel="נקה סינון"
                    onAction={handleClearAll}
                  />
                )
              }
              selectionBar={
                <SelectionActionBar
                  selectedCount={selectedRestaurantIds.size}
                  entitySingular={'\u05de\u05e1\u05e2\u05d3\u05d4'}
                  entityPlural={'\u05de\u05e1\u05e2\u05d3\u05d5\u05ea'}
                  onClear={() => setSelectedRestaurantIds(new Set())}
                  actions={
                    <>
                      <SelectionActionButton onClick={() => handleBulkSetRestaurantsActive(true)}>
                        {'\u05d4\u05e4\u05e2\u05dc'}
                      </SelectionActionButton>
                      <SelectionActionButton
                        onClick={() => handleBulkSetRestaurantsActive(false)}
                        variant="neutral"
                      >
                        {'\u05d4\u05e9\u05d1\u05ea'}
                      </SelectionActionButton>
                      <SelectionActionButton
                        onClick={handleExportVisibleRestaurants}
                        variant="outline"
                      >
                        {'\u05d9\u05d9\u05e6\u05d5\u05d0 \u05e0\u05d1\u05d7\u05e8\u05d5\u05ea'}
                      </SelectionActionButton>
                    </>
                  }
                />
              }
            />
            {false && (
            <ListTableSection
              isEmpty={filteredRestaurants.length === 0}
              emptyState={
                restaurants.length === 0 ? (
                  <EntityEmptyState
                    icon={<StoreIcon className="h-12 w-12 text-[#9fe870]" />}
                    title="טרם נוספו מסעדות"
                    description="כאשר יתווספו מסעדות למערכת, הן יופיעו כאן עם כל הפרטים והאפשרויות לניהול מתקדם"
                    footerText="המערכת מוכנה לקבלת מסעדות חדשות"
                  />
                ) : (
                  <RestaurantNoResultsState query={searchQuery} onClear={handleClearAll} />
                )
              }
              selectionBar={
                <SelectionActionBar
                  selectedCount={selectedRestaurantIds.size}
                  entitySingular={'\u05de\u05e1\u05e2\u05d3\u05d4'}
                  entityPlural={'\u05de\u05e1\u05e2\u05d3\u05d5\u05ea'}
                  onClear={() => setSelectedRestaurantIds(new Set())}
                  actions={
                    <>
                      <SelectionActionButton
                        onClick={() => handleBulkSetRestaurantsActive(true)}
                      >
                        {'\u05d4\u05e4\u05e2\u05dc'}
                      </SelectionActionButton>
                      <SelectionActionButton
                        onClick={() => handleBulkSetRestaurantsActive(false)}
                        variant="neutral"
                      >
                        {'\u05d4\u05e9\u05d1\u05ea'}
                      </SelectionActionButton>
                      <SelectionActionButton
                        onClick={handleExportVisibleRestaurants}
                        variant="outline"
                      >
                        {'\u05d9\u05d9\u05e6\u05d5\u05d0 \u05e0\u05d1\u05d7\u05e8\u05d5\u05ea'}
                      </SelectionActionButton>
                    </>
                  }
                />
              }
              ariaLabel="טבלת מסעדות"
              colgroup={
                <colgroup>
                  <col style={{ width: ENTITY_TABLE_WIDTHS.checkbox }} />
                  {visibleOrderedCols.map((col) => (
                    <col key={col.id} style={{ width: getRestaurantColumnWidth(col.id) }} />
                  ))}
                  <col style={{ width: ENTITY_TABLE_WIDTHS.actions }} />
                </colgroup>
              }
              headerRow={
                <tr>
                  <EntityTableHeaderCheckbox
                    checked={allVisibleRestaurantsSelected}
                    indeterminate={someVisibleRestaurantsSelected}
                    onChange={handleToggleSelectAllRestaurants}
                  />
                  {visibleOrderedCols.map((col) => (
                    <EntityTableHeaderCell
                      key={col.id}
                      label={col.label}
                      onSort={() => handleRestaurantSort(col.id)}
                      sortDirection={sortColumn === col.id ? sortDirection : null}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', col.id);
                        setDraggingId(col.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(col.id);
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = e.dataTransfer.getData('text/plain');
                        handleColumnReorder(from, col.id);
                        setDragOverId(null);
                        setDraggingId(null);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverId(null);
                      }}
                      isDragging={draggingId === col.id}
                      isDragOver={dragOverId === col.id && draggingId !== col.id}
                    />
                  ))}
                  <EntityTableActionsHeader />
                </tr>
              }
            >
              {filteredRestaurants.map((restaurant, idx) => (
                <tr
                  key={restaurant.restaurantId}
                  onClick={() => navigate(`/restaurant/${restaurant.restaurantId}`)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuPos({ x: e.clientX, y: e.clientY });
                    setOpenActionsRestaurantId(restaurant.restaurantId);
                  }}
                  className={`${ENTITY_TABLE_ROW_CLASS} cursor-pointer`}
                >
                  <EntityTableRowCheckbox
                    checked={selectedRestaurantIds.has(restaurant.restaurantId)}
                    onChange={() => handleToggleSelectRestaurant(restaurant.restaurantId)}
                  />
                  {visibleOrderedCols.map((col) => (
                    <td key={col.id} className={ENTITY_TABLE_DATA_CELL_CLASS}>
                      {col.id === 'name' && (
                        <span className="block truncate font-medium text-xs text-[#0d0d12] dark:text-app-text whitespace-nowrap">
                          {restaurant.name}
                        </span>
                      )}
                      {col.id === 'type' && (
                        <span className="block truncate text-xs text-[#737373] dark:text-app-text-secondary whitespace-nowrap">
                          {restaurant.type}
                        </span>
                      )}
                      {col.id === 'chainId' && (
                        <span className="block truncate text-xs text-[#666d80] dark:text-app-text-secondary whitespace-nowrap">
                          {restaurant.chainId}
                        </span>
                      )}
                      {col.id === 'status' && (
                        <span
                          className={`text-xs font-medium whitespace-nowrap ${
                            restaurant.isActive
                              ? 'text-[#16a34a] dark:text-[#9fe870]'
                              : 'text-[#737373] dark:text-app-text-secondary'
                          }`}
                        >
                          {restaurant.status}
                        </span>
                      )}
                      {col.id === 'address' && (
                        <span className="block truncate text-xs text-[#666d80] dark:text-app-text-secondary whitespace-nowrap">
                          {restaurant.street}, {restaurant.city}
                        </span>
                      )}
                      {col.id === 'phone' && (
                        <span className="block truncate text-xs text-[#666d80] dark:text-app-text-secondary whitespace-nowrap">
                          {restaurant.phone}
                        </span>
                      )}
                      {col.id === 'contact' && (
                        <span className="block truncate text-xs text-[#666d80] dark:text-app-text-secondary whitespace-nowrap">
                          {restaurant.contactPerson}
                        </span>
                      )}
                      {col.id === 'deliveries' && (
                        <span className="text-xs font-medium text-[#0d0d12] dark:text-app-text whitespace-nowrap">
                          {restaurant.totalDeliveries}
                        </span>
                      )}
                    </td>
                  ))}
                  <EntityTableActionsCell onClick={(e) => e.stopPropagation()}>
                    <EntityRowActionTrigger
                      title="עוד"
                      data-onboarding={idx === 0 ? 'restaurant-toggle' : undefined}
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                        setContextMenuPos({ x: rect.left, y: rect.bottom + 4 });
                        setOpenActionsRestaurantId(restaurant.restaurantId);
                      }}
                    />
                  </EntityTableActionsCell>
                </tr>
              ))}
            </ListTableSection>
            )}
      </EntityListShell>

      <EntityActionMenuOverlay
        open={Boolean(contextMenuPos && openActionsRestaurantId)}
        position={contextMenuPos}
        onClose={() => {
          setOpenActionsRestaurantId(null);
          setContextMenuPos(null);
        }}
      >
        {contextMenuPos && openActionsRestaurantId && (() => {
          const restaurant = state.restaurants.find((r) => r.id === openActionsRestaurantId);
          if (!restaurant) return null;

          return (
            <EntityActionMenu
              style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <EntityActionMenuHeader
                title={restaurant.name}
                subtitle={
                  <span
                    className={`text-[11px] font-medium ${
                      restaurant.isActive
                        ? 'text-[#16a34a] dark:text-[#9fe870]'
                        : 'text-[#737373] dark:text-app-text-secondary'
                    }`}
                  >
                    {restaurant.isActive ? 'פעיל' : 'לא פעיל'}
                  </span>
                }
              />

              <EntityActionMenuItem
                onClick={() => {
                  setContextMenuPos(null);
                  setOpenActionsRestaurantId(null);
                  navigate(`/restaurant/${restaurant.id}`);
                }}
                icon={<FileText className="w-3.5 h-3.5 text-[#737373] dark:text-app-text-secondary" />}
              >
                פרטים מלאים
              </EntityActionMenuItem>

              <EntityActionMenuItem
                onClick={(e) => {
                  handleToggleRestaurant(restaurant.id, e);
                  setContextMenuPos(null);
                  setOpenActionsRestaurantId(null);
                }}
                icon={<Power className="w-3.5 h-3.5 text-[#16a34a] dark:text-[#9fe870]" />}
              >
                {restaurant.isActive ? 'השבת מסעדה' : 'הפעל מסעדה'}
              </EntityActionMenuItem>

              <EntityActionMenuItem
                onClick={() => {
                  handleExportSingleRestaurant(restaurant.id, restaurant.name);
                  setContextMenuPos(null);
                  setOpenActionsRestaurantId(null);
                }}
                icon={<Download className="w-3.5 h-3.5 text-[#737373] dark:text-app-text-secondary" />}
              >
                ייצא דוח מסעדה
              </EntityActionMenuItem>

              <EntityActionMenuDivider />

              <EntityActionMenuItem
                onClick={(e) => {
                  handleRemoveRestaurant(restaurant.id, e);
                  setContextMenuPos(null);
                }}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                danger
              >
                מחק מסעדה
              </EntityActionMenuItem>
            </EntityActionMenu>
          );
        })()}
      </EntityActionMenuOverlay>

      {/* Add restaurant modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#e5e5e5] bg-white p-6 dark:border-app-border dark:bg-app-surface"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0d0d12] dark:text-app-text">הוסף מסעדה חדשה</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="rounded-lg p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors">
                <X className="h-5 w-5 text-[#737373] dark:text-app-text-secondary" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-app-text-secondary">שם מסעדה *</label>
                <input
                  type="text"
                  value={newRestaurant.name}
                  onChange={e => setNewRestaurant(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-app-border dark:bg-app-surface dark:text-app-text"
                  placeholder="שם המסעדה"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-app-text-secondary">טלפון</label>
                <input
                  type="tel"
                  value={newRestaurant.phone}
                  onChange={e => setNewRestaurant(p => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-app-border dark:bg-app-surface dark:text-app-text"
                  placeholder="050-0000000"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-app-text-secondary">כתובת</label>
                <input
                  type="text"
                  value={newRestaurant.address}
                  onChange={e => setNewRestaurant(p => ({ ...p, address: e.target.value }))}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-app-border dark:bg-app-surface dark:text-app-text"
                  placeholder="רחוב, עיר"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-app-text-secondary">סוג מטבח</label>
                <input
                  type="text"
                  value={newRestaurant.type}
                  onChange={e => setNewRestaurant(p => ({ ...p, type: e.target.value }))}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-app-border dark:bg-app-surface dark:text-app-text"
                  placeholder="פיצה, סושי, המבורגר..."
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddRestaurant}
                disabled={!newRestaurant.name.trim()}
                className="flex-1 rounded-lg bg-[#9fe870] px-4 py-2.5 font-medium text-[#0d0d12] transition-colors hover:bg-[#8fd65f] disabled:bg-[#e5e5e5] disabled:text-[#a3a3a3]"
              >
                הוסף מסעדה
              </button>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg bg-[#f5f5f5] px-4 py-2.5 font-medium text-[#0d0d12] transition-colors hover:bg-[#e5e5e5] dark:bg-[#262626] dark:text-app-text dark:hover:bg-[#404040]"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

