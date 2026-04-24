import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Power, Download, Store as StoreIcon, Trash2, X, Sparkles, Search, Filter, FileText, FileSpreadsheet } from 'lucide-react';
import { useDelivery } from '../context/delivery.context';
import { useNavigate } from 'react-router';
import { Delivery, Restaurant } from '../types/delivery.types';
import { format } from 'date-fns';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { ListColumnsPanel } from '../components/common/list-columns-panel';
import { ListExportDrawer } from '../components/common/list-export-drawer';
import { ListInlineFilters } from '../components/common/list-inline-filters';
import { PageToolbar } from '../components/common/page-toolbar';
import { ListSidePanel } from '../components/common/list-side-panel';
import { SelectionActionBar } from '../components/common/selection-action-bar';
import { type SingleSelectFilterOption } from '../components/common/list-filter-controls';
import { ListToolbarActions } from '../components/common/list-toolbar-actions';
import { getRestaurantChainId } from '../utils/restaurant-branding';
import {
  createExcelWorkbook,
  exportRowsToExcel,
  downloadExcelBuffer,
  sanitizeExportFileName,
  workbookToExcelBuffer,
} from '../utils/export-utils';
import {
  EntityActionMenu,
  EntityActionMenuDivider,
  EntityActionMenuHeader,
  EntityActionMenuItem,
  EntityActionMenuOverlay,
} from '../components/common/entity-action-menu';
import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import { EntityEmptyState, EntityNoResultsState } from '../components/common/entity-empty-state';
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

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════
type RestaurantRow = {
  id: number; restaurantId: string; name: string; status: 'פעיל' | 'לא פעיל';
  isActive: boolean; totalDeliveries: number; linkedHubs: string[];
  contactPerson: string; phone: string; city: string; street: string; username: string; type: string; chainId: string;
};

// ═══════════════════════════════════════
// Financial helper
// ═══════════════════════════════════════
const calcFinancials = (dels: Delivery[]) => {
  const delivered = dels.filter(d => d.status === 'delivered');
  const cancelled = dels.filter(d => d.status === 'cancelled');
  const totalRevenue = delivered.reduce((s, d) => s + d.price, 0);
  const totalCourierPay = dels.reduce((s, d) => s + (d.runner_price ?? d.courierPayment ?? 0), 0);
  const totalTips = dels.reduce((s, d) => s + (d.runner_tip ?? 0), 0);
  const totalCash = dels.reduce((s, d) => s + (d.sum_cash ?? 0), 0);
  const totalCommission = dels.reduce((s, d) => s + (d.commissionAmount ?? 0), 0);
  const totalRestPrice = dels.reduce((s, d) => s + (d.rest_price ?? d.restaurantPrice ?? 0), 0);
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
const COL_ORDER_KEY = 'restaurants-column-order-v3';
const RESTAURANT_VISIBLE_COLUMNS_KEY = 'restaurants-visible-columns-v1';
const RESTAURANT_STATUS_FILTER_OPTIONS: SingleSelectFilterOption[] = [
  { id: 'all', label: 'סטטוס' },
  { id: 'active', label: 'פעיל' },
  { id: 'inactive', label: 'לא פעיל' },
];
const RESTAURANT_COLUMN_CATEGORIES = [
  {
    id: 'core',
    label: 'ליבה',
    columns: [
      { id: 'name', label: 'מסעדה' },
      { id: 'status', label: 'סטטוס' },
      { id: 'type', label: 'סוג' },
      { id: 'chainId', label: 'מזהה רשת' },
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
] as const;

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<RestaurantSortableColumnId>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [openActionsRestaurantId, setOpenActionsRestaurantId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<Set<string>>(new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);

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
    return new Set(RESTAURANT_COLS.map((col) => col.id));
  });

  const orderedCols = useMemo(() => {
    const map = new Map(RESTAURANT_COLS.map(c => [c.id, c]));
    return columnOrder.map(id => map.get(id as RestaurantColId)!).filter(Boolean);
  }, [columnOrder]);
  const visibleOrderedCols = useMemo(
    () => orderedCols.filter((col) => visibleColumns.has(col.id)),
    [orderedCols, visibleColumns],
  );

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

  const deliveriesCountByRestaurant = useMemo(() => {
    const counts = new Map<string, number>();
    state.deliveries.forEach((delivery) => {
      if (!delivery.restaurantId) return;
      counts.set(delivery.restaurantId, (counts.get(delivery.restaurantId) ?? 0) + 1);
    });
    return counts;
  }, [state.deliveries]);

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

  const uniqueCities = useMemo(() => [...new Set(restaurants.map(r => r.city))].sort((a, b) => a.localeCompare(b, 'he')), [restaurants]);
  const uniqueTypes = useMemo(() => [...new Set(restaurants.map(r => r.type))].sort((a, b) => a.localeCompare(b, 'he')), [restaurants]);

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
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && r.isActive) ||
        (statusFilter === 'inactive' && !r.isActive);
      const matchesCity = cityFilter === 'all' || r.city === cityFilter;
      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      return matchesSearch && matchesStatus && matchesCity && matchesType;
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
  }, [restaurants, searchQuery, statusFilter, cityFilter, typeFilter, sortColumn, sortDirection]);

  // Stats
  const stats = useMemo(() => ({
    total: restaurants.length,
    filtered: filteredRestaurants.length,
    active: restaurants.filter(r => r.isActive).length,
    inactive: restaurants.filter(r => !r.isActive).length,
  }), [restaurants, filteredRestaurants]);

  const statusCounts = useMemo(() => ({
    all: restaurants.length,
    active: restaurants.filter(r => r.isActive).length,
    inactive: restaurants.filter(r => !r.isActive).length,
  }), [restaurants]);
  const restaurantStatusFilterOptions = useMemo(
    () =>
      RESTAURANT_STATUS_FILTER_OPTIONS.map((option) => ({
        ...option,
        count:
          option.id === 'all'
            ? undefined
            : statusCounts[option.id as keyof typeof statusCounts],
      })),
    [statusCounts],
  );
  const cityFilterOptions = useMemo<SingleSelectFilterOption[]>(
    () => [{ id: 'all', label: 'עיר' }, ...uniqueCities.map((city) => ({ id: city, label: city }))],
    [uniqueCities],
  );
  const typeFilterOptions = useMemo<SingleSelectFilterOption[]>(
    () => [{ id: 'all', label: 'סוג' }, ...uniqueTypes.map((type) => ({ id: type, label: type }))],
    [uniqueTypes],
  );
  const restaurantInlineFilters = useMemo(
    () => [
      {
        key: 'status',
        value: statusFilter,
        onChange: (value: string) => setStatusFilter(value as typeof statusFilter),
        options: restaurantStatusFilterOptions,
        defaultLabel: 'סטטוס',
      },
      {
        key: 'city',
        value: cityFilter,
        onChange: setCityFilter,
        options: cityFilterOptions,
        defaultLabel: 'עיר',
      },
      {
        key: 'type',
        value: typeFilter,
        onChange: setTypeFilter,
        options: typeFilterOptions,
        defaultLabel: 'סוג',
      },
    ],
    [
      cityFilter,
      cityFilterOptions,
      restaurantStatusFilterOptions,
      statusFilter,
      typeFilter,
      typeFilterOptions,
    ],
  );

  // Check active filters
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || cityFilter !== 'all' || typeFilter !== 'all';
  const allVisibleRestaurantsSelected = filteredRestaurants.length > 0 && filteredRestaurants.every(restaurant => selectedRestaurantIds.has(restaurant.restaurantId));
  const someVisibleRestaurantsSelected = filteredRestaurants.some(restaurant => selectedRestaurantIds.has(restaurant.restaurantId));

  // Clear handlers
  const handleClearAll = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCityFilter('all');
    setTypeFilter('all');
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
      toast.success(summary);
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
    toast.success(`המסעדה ${restaurant.name} נוספה`);
  };

  // ── Handlers ──
  const handleToggleRestaurant = (restaurantId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch({ type: 'TOGGLE_RESTAURANT', payload: restaurantId });
  };

  const handleRemoveRestaurant = (restaurantId: string, name: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenActionsRestaurantId(null);

    const hasActiveDeliveries = state.deliveries.some(d =>
      d.restaurantId === restaurantId &&
      d.status !== 'delivered' &&
      d.status !== 'cancelled'
    );

    if (hasActiveDeliveries) {
      toast.error('אי אפשר למחוק מסעדה עם משלוחים פעילים.');
      return;
    }

    dispatch({ type: 'REMOVE_RESTAURANT', payload: restaurantId } as any);
    toast.success(`המסעדה ${name} נמחקה.`);
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
      { 'פרט': 'הכנסות', 'ערך': `₪${f.totalRevenue.toLocaleString()}` },
      { 'פרט': 'מחיר מסעדה', 'ערך': `₪${f.totalRestPrice.toLocaleString()}` },
      { 'פרט': 'תשלום שליח', 'ערך': `₪${f.totalCourierPay.toLocaleString()}` },
      { 'פרט': 'טיפים', 'ערך': `₪${f.totalTips.toLocaleString()}` },
      { 'פרט': 'מזומן', 'ערך': `₪${f.totalCash.toLocaleString()}` },
      { 'פרט': 'עמלות', 'ערך': `₪${f.totalCommission.toLocaleString()}` },
      { 'פרט': 'רווח נקי', 'ערך': `₪${f.profit.toLocaleString()}` },
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
    const allDeliveries = state.deliveries;

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
    const deliveries = state.deliveries.filter(d =>
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
      <div className="flex flex-row h-full overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="ltr">
        <ListSidePanel isOpen={isExportOpen || columnsOpen}>
          {isExportOpen && (
            <ListExportDrawer
              onClose={() => setIsExportOpen(false)}
              actions={[
                {
                  id: 'visible-restaurants',
                  title: 'ייצוא טבלת המסעדות',
                  description: 'Excel עם העמודות המוצגות כרגע בטבלה',
                  meta: `${selectedRestaurantIds.size > 0 ? selectedRestaurantIds.size : filteredRestaurants.length} מסעדות · ${visibleOrderedCols.length} עמודות`,
                  icon: <FileSpreadsheet className="h-5 w-5" />,
                  onClick: handleExportVisibleRestaurants,
                },
                {
                  id: 'zip-per-restaurant',
                  title: 'ייצוא ZIP לפי מסעדה',
                  description: 'קובץ Excel נפרד לכל מסעדה עם המשלוחים שלה',
                  meta: `${stats.total} מסעדות · ${state.deliveries.length} משלוחים`,
                  icon: <Download className="h-5 w-5" />,
                  onClick: handleExportZipPerRestaurant,
                },
              ]}
            />
          )}

          {columnsOpen && (
            <ListColumnsPanel
              isOpen={columnsOpen}
              setIsOpen={setColumnsOpen}
              visibleColumns={visibleColumns}
              setVisibleColumns={setVisibleColumns}
              categories={[...RESTAURANT_COLUMN_CATEGORIES]}
              defaultVisibleColumns={RESTAURANT_COLS.map((column) => column.id)}
              title="עמודות מסעדות"
              description="בחר אילו פרטים יופיעו בטבלת המסעדות"
              presetsKey="restaurants-column-presets-v1"
            />
          )}
        </ListSidePanel>

        <div className="flex-1 min-w-0 overflow-hidden flex flex-col" dir="rtl">

        <PageToolbar
          title="מסעדות"
          count={state.restaurants.length}
          onToggleMobileSidebar={() => (window as any).toggleMobileSidebar?.()}
          primaryActionLabel="הוסף מסעדה"
          onPrimaryAction={() => setIsAddModalOpen(true)}
          headerControls={
            <ListToolbarActions
              showSearch={false}
              columnsOpen={columnsOpen}
              onExport={() => { setIsExportOpen((v) => !v); setColumnsOpen(false); }}
              onToggleColumns={() => { setColumnsOpen(true); setIsExportOpen(false); }}
            />
          }
          controls={<ListInlineFilters filters={restaurantInlineFilters} />}
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
          summary={`${filteredRestaurants.length} מסעדות`}
        />

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

            {/* Table / Empty state */}
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
                  <EntityNoResultsState
                    description={
                      searchQuery
                        ? `לא נמצאו מסעדות לחיפוש "${searchQuery}"`
                        : 'הפילטרים שבחרת לא מצאו מסעדות תואמות'
                    }
                    onClearAll={handleClearAll}
                  />
                )
              }
              selectionBar={
                <SelectionActionBar
                  selectedCount={selectedRestaurantIds.size}
                  selectionLabel={`נבחרו ${selectedRestaurantIds.size} מסעדות`}
                  onClear={() => setSelectedRestaurantIds(new Set())}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => handleBulkSetRestaurantsActive(true)}
                        className="rounded-lg bg-[#16a34a] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[#16a34a]/20 transition-colors hover:bg-[#15803d]"
                      >
                        הפעל
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkSetRestaurantsActive(false)}
                        className="rounded-lg bg-[#404040] px-4 py-2 text-sm font-bold text-white shadow-md shadow-black/10 transition-colors hover:bg-[#262626]"
                      >
                        השבת
                      </button>
                      <button
                        type="button"
                        onClick={handleExportVisibleRestaurants}
                        className="rounded-lg border border-[#d4d4d4] bg-white px-4 py-2 text-sm font-bold text-[#0d0d12] transition-colors hover:bg-[#f5f5f5] dark:border-[#404040] dark:bg-[#171717] dark:text-[#fafafa] dark:hover:bg-[#262626]"
                      >
                        ייצוא נבחרות
                      </button>
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
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuPos({ x: e.clientX, y: e.clientY });
                    setOpenActionsRestaurantId(restaurant.restaurantId);
                  }}
                  className={`${ENTITY_TABLE_ROW_CLASS} cursor-default`}
                >
                  <EntityTableRowCheckbox
                    checked={selectedRestaurantIds.has(restaurant.restaurantId)}
                    onChange={() => handleToggleSelectRestaurant(restaurant.restaurantId)}
                  />
                  {visibleOrderedCols.map((col) => (
                    <td key={col.id} className={ENTITY_TABLE_DATA_CELL_CLASS}>
                      {col.id === 'name' && (
                        <span className="block truncate font-medium text-xs text-[#0d0d12] dark:text-[#fafafa] whitespace-nowrap">
                          {restaurant.name}
                        </span>
                      )}
                      {col.id === 'type' && (
                        <span className="block truncate text-xs text-[#737373] dark:text-[#a3a3a3] whitespace-nowrap">
                          {restaurant.type}
                        </span>
                      )}
                      {col.id === 'chainId' && (
                        <span className="block truncate text-xs text-[#666d80] dark:text-[#a3a3a3] whitespace-nowrap">
                          {restaurant.chainId}
                        </span>
                      )}
                      {col.id === 'status' && (
                        <span
                          className={`text-xs font-medium whitespace-nowrap ${
                            restaurant.isActive
                              ? 'text-[#16a34a] dark:text-[#9fe870]'
                              : 'text-[#737373] dark:text-[#a3a3a3]'
                          }`}
                        >
                          {restaurant.status}
                        </span>
                      )}
                      {col.id === 'address' && (
                        <span className="block truncate text-xs text-[#666d80] dark:text-[#a3a3a3] whitespace-nowrap">
                          {restaurant.street}, {restaurant.city}
                        </span>
                      )}
                      {col.id === 'phone' && (
                        <span className="block truncate text-xs text-[#666d80] dark:text-[#a3a3a3] whitespace-nowrap">
                          {restaurant.phone}
                        </span>
                      )}
                      {col.id === 'contact' && (
                        <span className="block truncate text-xs text-[#666d80] dark:text-[#a3a3a3] whitespace-nowrap">
                          {restaurant.contactPerson}
                        </span>
                      )}
                      {col.id === 'deliveries' && (
                        <span className="text-xs font-medium text-[#0d0d12] dark:text-[#fafafa] whitespace-nowrap">
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

          </div>
        </div>
      </div>

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
                        : 'text-[#737373] dark:text-[#a3a3a3]'
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
                icon={<FileText className="w-3.5 h-3.5 text-[#737373] dark:text-[#a3a3a3]" />}
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

              <EntityActionMenuDivider />

              <EntityActionMenuItem
                onClick={(e) => {
                  handleRemoveRestaurant(restaurant.id, restaurant.name, e);
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
            className="w-full max-w-md rounded-2xl border border-[#e5e5e5] bg-white p-6 dark:border-[#262626] dark:bg-[#171717]"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">הוסף מסעדה חדשה</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="rounded-lg p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors">
                <X className="h-5 w-5 text-[#737373] dark:text-[#a3a3a3]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-[#a3a3a3]">שם מסעדה *</label>
                <input
                  type="text"
                  value={newRestaurant.name}
                  onChange={e => setNewRestaurant(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa]"
                  placeholder="שם המסעדה"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-[#a3a3a3]">טלפון</label>
                <input
                  type="tel"
                  value={newRestaurant.phone}
                  onChange={e => setNewRestaurant(p => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa]"
                  placeholder="050-0000000"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-[#a3a3a3]">כתובת</label>
                <input
                  type="text"
                  value={newRestaurant.address}
                  onChange={e => setNewRestaurant(p => ({ ...p, address: e.target.value }))}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa]"
                  placeholder="רחוב, עיר"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-[#a3a3a3]">סוג מטבח</label>
                <input
                  type="text"
                  value={newRestaurant.type}
                  onChange={e => setNewRestaurant(p => ({ ...p, type: e.target.value }))}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa]"
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
                className="rounded-lg bg-[#f5f5f5] px-4 py-2.5 font-medium text-[#0d0d12] transition-colors hover:bg-[#e5e5e5] dark:bg-[#262626] dark:text-[#fafafa] dark:hover:bg-[#404040]"
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

