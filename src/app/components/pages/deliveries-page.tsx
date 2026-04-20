import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useDelivery } from '../../context/delivery.context';
import { Delivery, DeliveryStatus } from '../../types/delivery.types';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  FileDown,
  Menu,
  AlignVerticalSpaceAround,
  Plus,
  Package,
  ChevronDown,
  Check,
  Users,
  Utensils,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { he } from 'date-fns/locale';
import { NewDeliveryDialog } from '../deliveries/new-delivery-dialog';
import { ExportDrawer } from '../deliveries/export-drawer';
import { DeliveryTableHeader } from '../deliveries/delivery-table-header';
import { DeliveryTableRow } from '../deliveries/delivery-table-row';
import { DeliveryDetailSidePanel } from '../deliveries/delivery-detail-side-panel';
import { DeliveryEditDialog } from '../deliveries/delivery-edit-dialog';
import { STATUS_LABELS, DEFAULT_VISIBLE_COLUMNS } from '../deliveries/status-config';
import { ALL_COLUMNS } from '../deliveries/column-defs';
import { ColumnSelector } from '../deliveries/column-selector';
import type { ColumnDef } from '../deliveries/column-defs';
import { EnhancedEmptyState } from '../deliveries/enhanced-empty-state';
import type { RowHeight } from '../deliveries/row-height-selector';
import { RowHeightSelector } from '../deliveries/row-height-selector';
import { toast } from 'sonner';
import { useDeliveriesFilters } from '../../hooks/useDeliveriesFilters';
import { useDeliveriesExport } from '../../hooks/useDeliveriesExport';
import { PeriodToolbar, PeriodMode } from '../ui/period-toolbar';

// פונקציה לחישוב זמן שנותר — נדרש עבור DeliveryTableRow
const calculateTimeRemaining = (delivery: Delivery): number | null => {
  if (delivery.status === 'delivered' || delivery.status === 'cancelled') return null;
  const now = new Date();
  if (delivery.status === 'assigned' && delivery.estimatedArrivalAtRestaurant) {
    return Math.max(0, Math.floor((delivery.estimatedArrivalAtRestaurant.getTime() - now.getTime()) / 1000));
  }
  if (delivery.status === 'delivering' && delivery.estimatedArrivalAtCustomer) {
    return Math.max(0, Math.floor((delivery.estimatedArrivalAtCustomer.getTime() - now.getTime()) / 1000));
  }
  if (delivery.status === 'pending') return delivery.estimatedTime * 60;
  return null;
};

// פונקציה להמרת שניות לפורמט קריא
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds} שניות`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes} דקות`;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} דקות`;
};

// Column order persistence key
const COLUMN_ORDER_STORAGE_KEY = 'deliveries-column-order';
const VISIBLE_COLUMNS_STORAGE_KEY = 'deliveries-visible-columns';
const ROW_HEIGHT_STORAGE_KEY = 'deliveries-row-height';

// Date filter options
const DATE_OPTIONS = [
  { value: 'all' as const, label: 'כל הזמנים' },
  { value: 'today' as const, label: 'היום' },
  { value: 'week' as const, label: 'שבוע אחרון' },
  { value: 'month' as const, label: 'חודש אחרון' },
  { value: 'custom' as const, label: 'טווח מותאם...' },
];
const DATE_LABEL: Record<string, string> = { all: 'תאריך', today: 'היום', week: 'שבוע אחרון', month: 'חודש אחרון', custom: 'טווח מותאם' };

// Status chip config
const STATUS_CHIP_CONFIG = [
  { status: 'pending'    as DeliveryStatus, label: 'ממתין', dot: 'bg-orange-500', active: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { status: 'assigned'   as DeliveryStatus, label: 'שובץ',  dot: 'bg-yellow-500', active: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  { status: 'delivering' as DeliveryStatus, label: 'נאסף',  dot: 'bg-indigo-500', active: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { status: 'delivered'  as DeliveryStatus, label: 'נמסר',  dot: 'bg-green-500',  active: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { status: 'cancelled'  as DeliveryStatus, label: 'בוטל',  dot: 'bg-red-500',    active: 'bg-red-500/10 text-red-600 dark:text-red-400' },
];

export const DeliveriesPage: React.FC = () => {
  const { state, updateDelivery, dispatch, unassignCourier, assignCourier } = useDelivery();
  const navigate = useNavigate();

  // ── Filters hook ──
  const {
    searchQuery,
    setSearchQuery,
    statusFilters,
    setStatusFilters,
    toggleStatusFilter,
    sortColumn,
    sortDirection,
    handleSort,
    dateRange,
    setDateRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    selectedCouriers,
    setSelectedCouriers,
    toggleCourier,
    selectedRestaurants,
    setSelectedRestaurants,
    toggleRestaurant,
    selectedBranches,
    setSelectedBranches,
    toggleBranch,
    selectedAreas,
    setSelectedAreas,
    toggleArea,
    courierOptions,
    restaurantOptions,
    branchOptions,
    areaOptions,
    filteredDeliveries,
    statusCounts,
    dateRangeStats,
    hasActiveFilters,
    activeFilterCount,
    handleClearAllFilters,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    PAGE_SIZE_OPTIONS,
  } = useDeliveriesFilters(state);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const allIds = new Set(ALL_COLUMNS.map((column) => column.id));
        const validColumns = parsed.filter((columnId) => allIds.has(columnId));
        if (validColumns.length > 0) {
          return new Set(validColumns);
        }
      }
    } catch (e) {
      console.warn('Failed to load visible columns from localStorage:', e);
    }
    return new Set(DEFAULT_VISIBLE_COLUMNS);
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [newDeliveryOpen, setNewDeliveryOpen] = useState(false);
  const [showRowHeightSelector, setShowRowHeightSelector] = useState(false);

  // Inline filter dropdowns
  const [dateOpen, setDateOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [courierOpen, setCourierOpen] = useState(false);
  const [restaurantOpen, setRestaurantOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [courierSearch, setCourierSearch] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const [areaOpen, setAreaOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('current_month');
  const [monthAnchor, setMonthAnchor] = useState(new Date());

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [pickingStart, setPickingStart] = useState(true); // true = waiting for start click
  const dateRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const courierRef = useRef<HTMLDivElement>(null);
  const restaurantRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (periodMode !== 'current_month') return;

    const monthStart = formatDate(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1), 'yyyy-MM-dd');
    const monthEnd = formatDate(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0), 'yyyy-MM-dd');

    if (dateRange !== 'custom') setDateRange('custom');
    if (customStartDate !== monthStart) setCustomStartDate(monthStart);
    if (customEndDate !== monthEnd) setCustomEndDate(monthEnd);
  }, [periodMode, monthAnchor, dateRange, customStartDate, customEndDate, setDateRange, setCustomStartDate, setCustomEndDate]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchOpen && !searchRef.current?.contains(e.target as Node)) { setSearchOpen(false); }
      if (datePickerOpen && !datePickerRef.current?.contains(e.target as Node)) setDatePickerOpen(false);
      if (dateOpen && !dateRef.current?.contains(e.target as Node)) setDateOpen(false);
      if (statusOpen && !statusRef.current?.contains(e.target as Node)) setStatusOpen(false);
      if (courierOpen && !courierRef.current?.contains(e.target as Node)) setCourierOpen(false);
      if (restaurantOpen && !restaurantRef.current?.contains(e.target as Node)) setRestaurantOpen(false);
      if (branchOpen && !branchRef.current?.contains(e.target as Node)) setBranchOpen(false);
      if (areaOpen && !areaRef.current?.contains(e.target as Node)) setAreaOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dateOpen, statusOpen, courierOpen, restaurantOpen, branchOpen, areaOpen]);

  // Row height (persisted in localStorage)
  const [rowHeight, setRowHeight] = useState<RowHeight>(() => {
    try {
      const saved = localStorage.getItem(ROW_HEIGHT_STORAGE_KEY);
      if (saved && ['compact', 'normal', 'comfortable'].includes(saved)) {
        return saved as RowHeight;
      }
    } catch (e) {
      console.warn('Failed to load row height from localStorage:', e);
    }
    return 'normal';
  });

  // Save row height to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ROW_HEIGHT_STORAGE_KEY, rowHeight);
    } catch (e) {
      console.warn('Failed to save row height to localStorage:', e);
    }
  }, [rowHeight]);

  // Save visible columns to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
    } catch (e) {
      console.warn('Failed to save visible columns to localStorage:', e);
    }
  }, [visibleColumns]);

  // Toggle row height in cycle: compact → normal → comfortable
  const toggleRowHeight = useCallback(() => {
    setRowHeight(prev => {
      let next: RowHeight;
      if (prev === 'compact') next = 'normal';
      else if (prev === 'normal') next = 'comfortable';
      else next = 'compact';

      const labels = { compact: 'קומפקטי', normal: 'רגיל', comfortable: 'נוח' };
      toast.success(`גובה שורות: ${labels[next]}`);
      return next;
    });
  }, []);

  // Column ordering (persisted in localStorage)
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const allIds = new Set(ALL_COLUMNS.map(c => c.id));
        const validSaved = parsed.filter(id => allIds.has(id));
        const missing = ALL_COLUMNS.filter(c => !validSaved.includes(c.id)).map(c => c.id);
        return [...validSaved, ...missing];
      }
    } catch { /* ignore */ }
    const preferred = ['orderNumber', 'creation_time', 'status', 'rest_name', 'client_full_address', 'courier'];
    const allIds = ALL_COLUMNS.map(c => c.id);
    const rest = allIds.filter(id => !preferred.includes(id));
    return [...preferred.filter(id => allIds.includes(id)), ...rest];
  });

  const orderedColumns = useMemo<ColumnDef[]>(() => {
    const map = new Map(ALL_COLUMNS.map(c => [c.id, c]));
    return columnOrder.map(id => map.get(id)!).filter(Boolean);
  }, [columnOrder]);

  const handleColumnReorder = useCallback((fromId: string, toId: string) => {
    setColumnOrder(prev => {
      const next = [...prev];
      const fromIndex = next.indexOf(fromId);
      const toIndex = next.indexOf(toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromId);
      localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    toast.success('סדר העמודות עודכן');
  }, []);

  // Selection state — לצורכי ייצוא בלבד
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer state — צפייה בלבד
  const [drawerDeliveryId, setDrawerDeliveryId] = useState<string | null>(null);

  // Edit dialog state
  const [editDeliveryId, setEditDeliveryId] = useState<string | null>(null);

  // ── Export hook ──
  const { handleUnifiedExport, reportGroupCounts } = useDeliveriesExport({
    filteredDeliveries,
    selectedIds,
    visibleColumns,
    couriers: state.couriers,
    shifts: state.shifts,
    shiftTemplates: state.shiftTemplates,
    calculateTimeRemaining,
    formatTime,
  });

  // Selection handlers — לצורכי ייצוא בלבד
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredDeliveries.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredDeliveries.map(d => d.id)));
  }, [filteredDeliveries, selectedIds.size]);

  // Drawer handlers — צפייה בלבד
  const handleOpenDrawer = useCallback((id: string) => {
    setDrawerDeliveryId(id);
  }, []);
  const handleCloseDrawer = useCallback(() => { setDrawerDeliveryId(null); }, []);

  const drawerDelivery = useMemo(() =>
    drawerDeliveryId ? filteredDeliveries.find(d => d.id === drawerDeliveryId) || null : null
  , [drawerDeliveryId, filteredDeliveries]);

  const drawerCourier = useMemo(() =>
    drawerDelivery?.courierId ? state.couriers.find(c => c.id === drawerDelivery.courierId) || null : null
  , [drawerDelivery, state.couriers]);

  const drawerIndex = useMemo(() =>
    drawerDeliveryId ? filteredDeliveries.findIndex(d => d.id === drawerDeliveryId) : -1
  , [drawerDeliveryId, filteredDeliveries]);

  const handleDrawerPrev = useCallback(() => {
    if (drawerIndex > 0) setDrawerDeliveryId(filteredDeliveries[drawerIndex - 1].id);
  }, [drawerIndex, filteredDeliveries]);

  const handleDrawerNext = useCallback(() => {
    if (drawerIndex < filteredDeliveries.length - 1) setDrawerDeliveryId(filteredDeliveries[drawerIndex + 1].id);
  }, [drawerIndex, filteredDeliveries]);

  // ── Live action handlers (real dispatches) ──
  const handleStatusChange = useCallback((deliveryId: string, status: DeliveryStatus) => {
    dispatch({ type: 'UPDATE_STATUS', payload: { deliveryId, status } });
    toast.success(`סטטוס עודכן: ${STATUS_LABELS[status]}`);
  }, [dispatch]);

  const handleAssignCourier = useCallback((deliveryId: string, courierId: string) => {
    assignCourier(deliveryId, courierId);
    const name = state.couriers.find(c => c.id === courierId)?.name ?? '';
    toast.success(`שליח שובץ${name ? ': ' + name : ''}`);
  }, [assignCourier, state.couriers]);

  const handleCancelDelivery = useCallback((deliveryId: string) => {
    dispatch({ type: 'CANCEL_DELIVERY', payload: deliveryId });
    toast.success('המשלוח בוטל');
  }, [dispatch]);

  const handleCompleteDelivery = useCallback((deliveryId: string) => {
    dispatch({ type: 'COMPLETE_DELIVERY', payload: deliveryId });
    toast.success('המשלוח סומן כנמסר ✓');
  }, [dispatch]);

  const handleUnassignCourier = useCallback((deliveryId: string) => {
    unassignCourier(deliveryId);
    toast.success('השיבוץ בוטל');
  }, [unassignCourier]);

  // Edit handlers
  const handleOpenEdit = useCallback((id: string) => { setEditDeliveryId(id); }, []);
  const handleCloseEdit = useCallback(() => { setEditDeliveryId(null); }, []);
  const handleSaveDelivery = useCallback((deliveryId: string, updates: Partial<Delivery>) => {
    updateDelivery(deliveryId, updates);
  }, [updateDelivery]);

  const editDelivery = useMemo(() =>
    editDeliveryId ? state.deliveries.find(d => d.id === editDeliveryId) || null : null
  , [editDeliveryId, state.deliveries]);

  // Table horizontal scroll
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    updateScrollIndicators();
    el.addEventListener('scroll', updateScrollIndicators, { passive: true });
    const ro = new ResizeObserver(updateScrollIndicators);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScrollIndicators); ro.disconnect(); };
  }, [updateScrollIndicators]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = tableScrollRef.current;
    if (!el) return;
    if ('ontouchstart' in window) return;
    if ((e.target as HTMLElement).closest('button, a, input, select')) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setDragScrollLeft(el.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = tableScrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = dragScrollLeft - (x - startX) * 1.5;
  }, [isDragging, startX, dragScrollLeft]);

  const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);

  // Stats
  const stats = useMemo(() => ({
    total: state.deliveries.length,
  }), [state.deliveries]);

  const filteredStats = useMemo(() => ({
    total: filteredDeliveries.length,
    pending: filteredDeliveries.filter(d => d.status === 'pending').length,
    assigned: filteredDeliveries.filter(d => d.status === 'assigned').length,
    delivering: filteredDeliveries.filter(d => d.status === 'delivering').length,
    delivered: filteredDeliveries.filter(d => d.status === 'delivered').length,
    cancelled: filteredDeliveries.filter(d => d.status === 'cancelled').length,
  }), [filteredDeliveries]);

  // Summary stats for the summary strip
  const filteredSummary = useMemo(() => {
    const d = filteredDeliveries;
    if (d.length === 0) return null;
    const delivered = d.filter(x => x.status === 'delivered').length;
    const cancelled = d.filter(x => x.status === 'cancelled').length;
    const successRate = Math.round((delivered / d.length) * 100);
    const totalRevenue = d.reduce((s, x) => s + ((x as any).price ?? 0), 0);
    const totalCourierPay = d.reduce((s, x) => s + ((x as any).runner_price ?? 0), 0);
    const deliveredWithTime = d.filter(x => x.status === 'delivered' && x.deliveredAt && x.creation_time);
    const avgMinutes = deliveredWithTime.length > 0
      ? Math.round(deliveredWithTime.reduce((s, x) => s + (x.deliveredAt!.getTime() - x.creation_time!.getTime()), 0) / deliveredWithTime.length / 60000)
      : null;
    return { delivered, cancelled, successRate, totalRevenue, totalCourierPay, avgMinutes };
  }, [filteredDeliveries]);

  // Determine empty state mode
  const emptyStateMode = useMemo<'no-data' | 'no-results' | 'filtered-empty'>(() => {
    if (stats.total === 0) return 'no-data';
    if (searchQuery && filteredDeliveries.length === 0) return 'no-results';
    return 'filtered-empty';
  }, [stats.total, searchQuery, filteredDeliveries.length]);

  // Side panel stats for empty state
  const sidePanelStats = useMemo(() => ({
    total: filteredDeliveries.length,
    delivered: filteredDeliveries.filter(d => d.status === 'delivered').length,
    cancelled: filteredDeliveries.filter(d => d.status === 'cancelled').length,
    pending: filteredDeliveries.filter(d => d.status === 'pending').length,
    revenue: filteredDeliveries.reduce((s, d) => s + (d.price ?? 0), 0),
  }), [filteredDeliveries]);

  return (
    <>
      <div className="flex flex-row h-full overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="ltr">

        {/* ── LEFT: Columns / Export side panel ── */}
        <div className={`shrink-0 transition-[width] duration-200 overflow-hidden border-l border-[#e5e5e5] dark:border-[#1f1f1f] ${(exportOpen || columnsOpen) ? 'w-[380px]' : 'w-0'}`}>
          <div className="w-[380px] h-full flex flex-col bg-white dark:bg-[#0a0a0a]" dir="rtl">

            {/* Export panel */}
            {exportOpen && (<>
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#141414]">
                <div className="flex items-center gap-2">
                  <FileDown className="w-4 h-4 text-[#0d0d12] dark:text-[#fafafa]" />
                  <span className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">ייצוא</span>
                </div>
                <button onClick={() => setExportOpen(false)} className="p-1.5 hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] rounded-lg transition-colors">
                  <X className="w-4 h-4 text-[#737373] dark:text-[#a3a3a3]" />
                </button>
              </div>
              <ExportDrawer
                isOpen={exportOpen}
                isEmbedded={true}
                onClose={() => setExportOpen(false)}
                onExport={(config) => { handleUnifiedExport(config); setExportOpen(false); }}
                visibleColumns={visibleColumns}
                deliveryCount={filteredStats.total}
                selectedCount={selectedIds.size}
                groupCounts={reportGroupCounts}
              />
            </>)}

            {/* Columns panel */}
            {columnsOpen && (<>
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#141414]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#0d0d12] dark:text-[#fafafa]" />
                  <span className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">עמודות</span>
                </div>
                <button onClick={() => setColumnsOpen(false)} className="p-1.5 hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] rounded-lg transition-colors">
                  <X className="w-4 h-4 text-[#737373] dark:text-[#a3a3a3]" />
                </button>
              </div>
              <ColumnSelector
                visibleColumns={visibleColumns}
                setVisibleColumns={setVisibleColumns}
                isOpen={columnsOpen}
                setIsOpen={setColumnsOpen}
                isEmbedded={true}
              />
            </>)}

          </div>
        </div>

        {/* ── CENTER: Main content ── */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col" dir="rtl">

          {/* ── Header: Title + New delivery ── */}
          <div className="sticky top-0 z-20 shrink-0 h-16 flex items-center justify-between px-5 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
            {/* Title */}
            <div className="flex items-center gap-2.5">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => (window as any).toggleMobileSidebar?.()}
                className="md:hidden p-1.5 rounded-lg text-[#737373] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
                <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">משלוחים</span>
              {filteredDeliveries.length > 0 && (
                <span className="text-sm text-[#a3a3a3] tabular-nums">{filteredDeliveries.length.toLocaleString()}</span>
              )}
            </div>

            {/* New delivery */}
            <button
              onClick={() => setNewDeliveryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#9fe870] hover:bg-[#8dd960] text-[#0d0d12] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              משלוח חדש
            </button>
          </div>

          {/* ── Combined toolbar ── */}
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717] flex-wrap">

            {/* Period controls — month nav + clickable label that opens date-range popover */}
            <div className="flex items-center gap-1 relative" ref={datePickerRef}>
              {periodMode !== 'custom_range' && (
                <button
                  onClick={() => setMonthAnchor(v => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                  className="h-9 w-9 flex items-center justify-center rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setDatePickerOpen(v => !v)}
                className={`h-9 px-4 min-w-[150px] flex items-center justify-center gap-2 rounded-[4px] border text-sm font-medium transition-colors ${
                  periodMode === 'custom_range'
                    ? 'border-[#0d0d12] dark:border-[#fafafa] bg-[#0d0d12] dark:bg-[#fafafa] text-white dark:text-[#0d0d12]'
                    : 'border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#0d0d12] dark:text-[#fafafa]'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0 opacity-60" />
                {periodMode === 'custom_range' && customStartDate && customEndDate
                  ? `${formatDate(new Date(customStartDate), 'dd/MM')} – ${formatDate(new Date(customEndDate), 'dd/MM/yyyy')}`
                  : formatDate(monthAnchor, 'MMMM yyyy', { locale: he })}
              </button>
              {periodMode !== 'custom_range' && (
                <button
                  onClick={() => setMonthAnchor(v => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
                  className="h-9 w-9 flex items-center justify-center rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {periodMode === 'custom_range' && (
                <button
                  onClick={() => { setPeriodMode('current_month'); setDatePickerOpen(false); setCurrentPage(1); }}
                  className="h-9 w-9 flex items-center justify-center rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors"
                  title="נקה טווח"
                >
                  <X className="w-3.5 h-3.5 text-[#737373]" />
                </button>
              )}

              {/* Date range popover */}
              {datePickerOpen && (() => {
                const today = formatDate(new Date(), 'yyyy-MM-dd');
                const y = calendarMonth.getFullYear();
                const m = calendarMonth.getMonth();
                const firstDay = new Date(y, m, 1).getDay(); // 0=Sun
                const daysInMonth = new Date(y, m + 1, 0).getDate();
                // Build grid: pad start with blanks so Sun=0
                const cells: (string | null)[] = Array(firstDay).fill(null);
                for (let d = 1; d <= daysInMonth; d++) cells.push(formatDate(new Date(y, m, d), 'yyyy-MM-dd'));
                while (cells.length % 7 !== 0) cells.push(null);

                const applyPreset = (start: string, end: string) => {
                  setCustomStartDate(start); setCustomEndDate(end);
                  setDateRange('custom'); setPeriodMode('custom_range');
                  setCurrentPage(1); setPickingStart(true); setDatePickerOpen(false);
                };

                const handleDayClick = (day: string) => {
                  if (pickingStart || (customStartDate && day < customStartDate)) {
                    setCustomStartDate(day); setCustomEndDate('');
                    setDateRange('custom'); setPeriodMode('custom_range');
                    setPickingStart(false);
                  } else {
                    setCustomEndDate(day);
                    setDateRange('custom'); setPeriodMode('custom_range');
                    setCurrentPage(1); setPickingStart(true); setDatePickerOpen(false);
                  }
                };

                const effectiveEnd = hoverDate && !pickingStart && !customEndDate ? hoverDate : customEndDate;

                return (
                  <div className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-xl p-3 w-[280px]" dir="rtl">
                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setCalendarMonth(new Date(y, m - 1, 1))} className="p-1 rounded hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"><ChevronRight className="w-4 h-4" /></button>
                      <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{formatDate(calendarMonth, 'MMMM yyyy', { locale: he })}</span>
                      <button onClick={() => setCalendarMonth(new Date(y, m + 1, 1))} className="p-1 rounded hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"><ChevronLeft className="w-4 h-4" /></button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1">
                      {['א','ב','ג','ד','ה','ו','ש'].map(d => (
                        <div key={d} className="text-center text-[10px] text-[#a3a3a3] py-0.5">{d}</div>
                      ))}
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7">
                      {cells.map((day, i) => {
                        if (!day) return <div key={i} />;
                        const isStart = day === customStartDate;
                        const isEnd = day === effectiveEnd;
                        const inRange = customStartDate && effectiveEnd && day > customStartDate && day < effectiveEnd;
                        const isToday = day === today;
                        return (
                          <button
                            key={day}
                            onClick={() => handleDayClick(day)}
                            onMouseEnter={() => !pickingStart && !customEndDate && setHoverDate(day)}
                            onMouseLeave={() => setHoverDate(null)}
                            className={`relative h-7 w-full text-xs transition-colors
                              ${isStart || isEnd ? 'bg-[#9fe870] text-[#0d0d12] font-semibold rounded-lg z-10' : ''}
                              ${inRange ? 'bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa]' : ''}
                              ${!isStart && !isEnd && !inRange ? 'text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-lg' : ''}
                              ${isToday && !isStart && !isEnd ? 'font-bold underline' : ''}
                            `}
                          >
                            {parseInt(day.slice(8))}
                          </button>
                        );
                      })}
                    </div>

                    {/* Status line */}
                    <div className="mt-2 text-center text-[11px] text-[#a3a3a3]">
                      {pickingStart ? 'לחץ על תאריך התחלה' : customStartDate && !customEndDate ? 'לחץ על תאריך סיום' : ''}
                    </div>
                  </div>
                );
              })()}
            </div>


            {/* Desktop filters — hidden on mobile */}
            <div className="hidden md:contents">

            {false && (
            <>
            {/* Date filter */}
            <div className="relative" ref={dateRef}>
              <button
                onClick={() => { setDateOpen(v => !v); setStatusOpen(false); setCourierOpen(false); setRestaurantOpen(false); setBranchOpen(false); setColumnsOpen(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateRange !== 'all'
                    ? 'bg-[#9fe870]/15 text-[#6bc84a]'
                    : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#e5e5e5] dark:hover:bg-[#303030]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{dateRange === 'custom' && customStartDate && customEndDate ? `${customStartDate.slice(5)} – ${customEndDate.slice(5)}` : DATE_LABEL[dateRange] ?? 'תאריך'}</span>
                <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${dateOpen ? 'rotate-180' : ''}`} />
              </button>
              {dateOpen && (
                <div className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-xl py-1 min-w-[200px]">
                  {DATE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (opt.value === 'custom') {
                          setDateRange('custom');
                          // keep open for date inputs
                        } else {
                          setDateRange(opt.value);
                          setCustomStartDate('');
                          setCustomEndDate('');
                          setDateOpen(false);
                          setCurrentPage(1);
                        }
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-right transition-colors ${
                        dateRange === opt.value
                          ? 'text-[#16a34a] bg-[#f0fdf4] dark:bg-[#052e16]'
                          : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                      }`}
                    >
                      {dateRange === opt.value
                        ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                        : <span className="w-3.5 h-3.5 shrink-0" />
                      }
                      {opt.label}
                    </button>
                  ))}
                  {dateRange === 'custom' && (
                    <div className="px-3 py-2 border-t border-[#f0f0f0] dark:border-[#262626] space-y-2">
                      <div>
                        <label className="text-[10px] font-medium text-[#a3a3a3] block mb-1">מתאריך</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={e => {
                            setCustomStartDate(e.target.value);
                            if (e.target.value && customEndDate) { setCurrentPage(1); setDateOpen(false); }
                          }}
                          className="w-full px-2 py-1.5 text-sm bg-[#f5f5f5] dark:bg-[#141414] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] outline-none focus:border-[#9fe870]/60"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-[#a3a3a3] block mb-1">עד תאריך</label>
                        <input
                          type="date"
                          value={customEndDate}
                          min={customStartDate}
                          onChange={e => {
                            setCustomEndDate(e.target.value);
                            if (customStartDate && e.target.value) { setCurrentPage(1); setDateOpen(false); }
                          }}
                          className="w-full px-2 py-1.5 text-sm bg-[#f5f5f5] dark:bg-[#141414] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] outline-none focus:border-[#9fe870]/60"
                        />
                      </div>
                      {customStartDate && customEndDate && (
                        <button
                          onClick={() => { setCurrentPage(1); setDateOpen(false); }}
                          className="w-full py-1.5 rounded-lg text-xs font-semibold bg-[#9fe870] text-[#0d0d12] hover:bg-[#8dd960] transition-colors"
                        >
                          החל
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            </>
            )}
            {/* Status filter */}
            <div className="relative" ref={statusRef}>
              <button
                onClick={() => { setStatusOpen(v => !v); setDateOpen(false); setCourierOpen(false); setRestaurantOpen(false); setBranchOpen(false); setColumnsOpen(false); }}
                className={`h-9 flex items-center gap-1.5 px-3 rounded-[4px] border text-sm font-medium transition-colors ${
                  statusFilters.size > 0
                    ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
                    : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
                }`}
              >
                <span>סטטוס</span>
                {statusFilters.size > 0 && (
                  <span className="bg-[#9fe870] text-[#0d0d12] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">{statusFilters.size}</span>
                )}
                {statusFilters.size === 0 && <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />}
                {statusFilters.size > 0 && (
                  <span
                    onClick={e => { e.stopPropagation(); setStatusFilters(new Set()); setStatusOpen(false); setCurrentPage(1); }}
                    className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
                    role="button"
                    aria-label="נקה סטטוס"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
              {statusOpen && (
                <div className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-xl py-1 min-w-[150px]">
                  {STATUS_CHIP_CONFIG.map(({ status, label, dot }) => {
                    const isActive = statusFilters.has(status);
                    const count = statusCounts[status] ?? 0;
                    return (
                      <button
                        key={status}
                        onClick={() => { toggleStatusFilter(status); setCurrentPage(1); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                          isActive
                            ? 'text-[#0d0d12] dark:text-[#fafafa] bg-[#f5f5f5] dark:bg-[#262626]'
                            : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                            isActive
                              ? 'border-[#9fe870] bg-[#9fe870] text-[#0d0d12]'
                              : 'border-[#d4d4d4] dark:border-[#404040] bg-white dark:bg-[#171717] text-transparent'
                          }`}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <span className={`w-2 h-2 rounded-full shrink-0 transition-opacity ${dot} ${isActive ? '' : 'opacity-50'}`} />
                        <span className={`flex-1 text-right ${isActive ? 'font-medium' : ''}`}>{label}</span>
                        <span className="text-xs text-[#a3a3a3] tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Branch filter */}
            <div className="relative" ref={branchRef}>
              <button
                onClick={() => { setBranchOpen(v => !v); setDateOpen(false); setStatusOpen(false); setCourierOpen(false); setRestaurantOpen(false); setAreaOpen(false); setColumnsOpen(false); }}
                className={`h-9 flex items-center gap-1.5 px-3 rounded-[4px] border text-sm font-medium transition-colors ${
                  selectedBranches.size > 0
                    ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
                    : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
                }`}
              >
                <span>
                  {selectedBranches.size === 0 ? 'סניף' :
                   selectedBranches.size === 1 ? (branchOptions.find(o => selectedBranches.has(o.id))?.label ?? 'סניף') :
                   `${selectedBranches.size} סניפים`}
                </span>
                {selectedBranches.size > 0 && (
                  <span
                    onClick={e => { e.stopPropagation(); setSelectedBranches(new Set()); setBranchOpen(false); setCurrentPage(1); }}
                    className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
                    role="button"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
                {selectedBranches.size === 0 && <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${branchOpen ? 'rotate-180' : ''}`} />}
              </button>
              {branchOpen && (
                <div className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-xl flex flex-col min-w-[200px] max-h-[260px]">
                  <div className="p-2 border-b border-[#f0f0f0] dark:border-[#262626]">
                    <input
                      autoFocus
                      value={branchSearch}
                      onChange={e => setBranchSearch(e.target.value)}
                      placeholder="חפש סניף..."
                      className="w-full px-2.5 py-1.5 text-sm bg-[#f5f5f5] dark:bg-[#141414] rounded-lg outline-none placeholder-[#a3a3a3] text-[#0d0d12] dark:text-[#fafafa]"
                      style={{ direction: 'rtl' }}
                    />
                  </div>
                  <div className="overflow-y-auto py-1">
                    {branchOptions.filter(o => !branchSearch || o.label.includes(branchSearch)).map(o => {
                      const isActive = selectedBranches.has(o.id);
                      return (
                        <button
                          key={o.id}
                          onClick={() => { toggleBranch(o.id); setCurrentPage(1); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-right transition-colors ${
                            isActive ? 'text-[#0d0d12] dark:text-[#fafafa] bg-[#f5f5f5] dark:bg-[#262626]' : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? 'bg-[#9fe870] border-[#9fe870]' : 'border-[#d4d4d4] dark:border-[#404040]'
                          }`}>
                            {isActive && <Check className="w-2.5 h-2.5 text-[#0d0d12]" />}
                          </span>
                          <span className="flex-1 truncate">{o.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Area filter */}
            <div className="relative" ref={areaRef}>
              <button
                onClick={() => { setAreaOpen(v => !v); setDateOpen(false); setStatusOpen(false); setCourierOpen(false); setRestaurantOpen(false); setBranchOpen(false); setColumnsOpen(false); }}
                className={`h-9 flex items-center gap-1.5 px-3 rounded-[4px] border text-sm font-medium transition-colors ${
                  selectedAreas.size > 0
                    ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
                    : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
                }`}
              >
                <span>
                  {selectedAreas.size === 0 ? 'אזור' :
                   selectedAreas.size === 1 ? (areaOptions.find(o => selectedAreas.has(o.id))?.label ?? 'אזור') :
                   `${selectedAreas.size} אזורים`}
                </span>
                {selectedAreas.size > 0 && (
                  <span
                    onClick={e => { e.stopPropagation(); setSelectedAreas(new Set()); setAreaOpen(false); setCurrentPage(1); }}
                    className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
                    role="button"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
                {selectedAreas.size === 0 && <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${areaOpen ? 'rotate-180' : ''}`} />}
              </button>
              {areaOpen && (
                <div className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-xl flex flex-col min-w-[200px] max-h-[260px]">
                  <div className="p-2 border-b border-[#f0f0f0] dark:border-[#262626]">
                    <input
                      autoFocus
                      value={areaSearch}
                      onChange={e => setAreaSearch(e.target.value)}
                      placeholder="חפש אזור..."
                      className="w-full px-2.5 py-1.5 text-sm bg-[#f5f5f5] dark:bg-[#141414] rounded-lg outline-none placeholder-[#a3a3a3] text-[#0d0d12] dark:text-[#fafafa]"
                      style={{ direction: 'rtl' }}
                    />
                  </div>
                  <div className="overflow-y-auto py-1">
                    {areaOptions.filter(o => !areaSearch || o.label.includes(areaSearch)).map(o => {
                      const isActive = selectedAreas.has(o.id);
                      return (
                        <button
                          key={o.id}
                          onClick={() => { toggleArea(o.id); setCurrentPage(1); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-right transition-colors ${
                            isActive ? 'text-[#0d0d12] dark:text-[#fafafa] bg-[#f5f5f5] dark:bg-[#262626]' : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? 'bg-[#9fe870] border-[#9fe870]' : 'border-[#d4d4d4] dark:border-[#404040]'
                          }`}>
                            {isActive && <Check className="w-2.5 h-2.5 text-[#0d0d12]" />}
                          </span>
                          <span className="flex-1 truncate">{o.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Restaurant filter */}
            <div className="relative" ref={restaurantRef}>
              <button
                onClick={() => { setRestaurantOpen(v => !v); setDateOpen(false); setStatusOpen(false); setCourierOpen(false); setBranchOpen(false); setAreaOpen(false); setColumnsOpen(false); }}
                className={`h-9 flex items-center gap-1.5 px-3 rounded-[4px] border text-sm font-medium transition-colors ${
                  selectedRestaurants.size > 0
                    ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
                    : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>
                  {selectedRestaurants.size === 0 ? 'מסעדה' :
                   selectedRestaurants.size === 1 ? (restaurantOptions.find(o => selectedRestaurants.has(o.id))?.label ?? 'מסעדה') :
                   `${selectedRestaurants.size} מסעדות`}
                </span>
                {selectedRestaurants.size > 0 && (
                  <span
                    onClick={e => { e.stopPropagation(); setSelectedRestaurants(new Set()); setRestaurantOpen(false); setCurrentPage(1); }}
                    className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
                    role="button"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
                {selectedRestaurants.size === 0 && <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${restaurantOpen ? 'rotate-180' : ''}`} />}
              </button>
              {restaurantOpen && (
                <div className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-xl flex flex-col min-w-[200px] max-h-[260px]">
                  <div className="p-2 border-b border-[#f0f0f0] dark:border-[#262626]">
                    <input
                      autoFocus
                      value={restaurantSearch}
                      onChange={e => setRestaurantSearch(e.target.value)}
                      placeholder="חפש מסעדה..."
                      className="w-full px-2.5 py-1.5 text-sm bg-[#f5f5f5] dark:bg-[#141414] rounded-lg outline-none placeholder-[#a3a3a3] text-[#0d0d12] dark:text-[#fafafa]"
                      style={{ direction: 'rtl' }}
                    />
                  </div>
                  <div className="overflow-y-auto py-1">
                    {restaurantOptions.filter(o => !restaurantSearch || o.label.includes(restaurantSearch)).map(o => {
                      const isActive = selectedRestaurants.has(o.id);
                      return (
                        <button
                          key={o.id}
                          onClick={() => { toggleRestaurant(o.id); setCurrentPage(1); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-right transition-colors ${
                            isActive ? 'text-[#0d0d12] dark:text-[#fafafa] bg-[#f5f5f5] dark:bg-[#262626]' : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? 'bg-[#9fe870] border-[#9fe870]' : 'border-[#d4d4d4] dark:border-[#404040]'
                          }`}>
                            {isActive && <Check className="w-2.5 h-2.5 text-[#0d0d12]" />}
                          </span>
                          <span className="flex-1 truncate">{o.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Courier filter */}
            <div className="relative" ref={courierRef}>
              <button
                onClick={() => { setCourierOpen(v => !v); setDateOpen(false); setStatusOpen(false); setRestaurantOpen(false); setBranchOpen(false); setAreaOpen(false); setColumnsOpen(false); }}
                className={`h-9 flex items-center gap-1.5 px-3 rounded-[4px] border text-sm font-medium transition-colors ${
                  selectedCouriers.size > 0
                    ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
                    : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>
                  {selectedCouriers.size === 0 ? 'שליח' :
                   selectedCouriers.size === 1 ? (courierOptions.find(o => selectedCouriers.has(o.id))?.label ?? 'שליח') :
                   `${selectedCouriers.size} שליחים`}
                </span>
                {selectedCouriers.size > 0 && (
                  <span
                    onClick={e => { e.stopPropagation(); setSelectedCouriers(new Set()); setCourierOpen(false); setCurrentPage(1); }}
                    className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
                    role="button"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
                {selectedCouriers.size === 0 && <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${courierOpen ? 'rotate-180' : ''}`} />}
              </button>
              {courierOpen && (
                <div className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-xl flex flex-col min-w-[200px] max-h-[260px]">
                  <div className="p-2 border-b border-[#f0f0f0] dark:border-[#262626]">
                    <input
                      autoFocus
                      value={courierSearch}
                      onChange={e => setCourierSearch(e.target.value)}
                      placeholder="חפש שליח..."
                      className="w-full px-2.5 py-1.5 text-sm bg-[#f5f5f5] dark:bg-[#141414] rounded-lg outline-none placeholder-[#a3a3a3] text-[#0d0d12] dark:text-[#fafafa]"
                      style={{ direction: 'rtl' }}
                    />
                  </div>
                  <div className="overflow-y-auto py-1">
                    {courierOptions.filter(o => !courierSearch || o.label.includes(courierSearch)).map(o => {
                      const isActive = selectedCouriers.has(o.id);
                      return (
                        <button
                          key={o.id}
                          onClick={() => { toggleCourier(o.id); setCurrentPage(1); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-right transition-colors ${
                            isActive ? 'text-[#0d0d12] dark:text-[#fafafa] bg-[#f5f5f5] dark:bg-[#262626]' : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? 'bg-[#9fe870] border-[#9fe870]' : 'border-[#d4d4d4] dark:border-[#404040]'
                          }`}>
                            {isActive && <Check className="w-2.5 h-2.5 text-[#0d0d12]" />}
                          </span>
                          <span className="flex-1 truncate">{o.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            </div>{/* end hidden md:contents */}

            {/* Mobile only: Filters button */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeFilterCount > 0
                  ? 'bg-[#9fe870]/15 text-[#6bc84a]'
                  : 'bg-[#f5f5f5] dark:bg-[#141414] text-[#525252] dark:text-[#a3a3a3]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>פילטרים</span>
              {activeFilterCount > 0 && (
                <span className="bg-[#9fe870] text-[#0d0d12] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">{activeFilterCount}</span>
              )}
            </button>

            {/* Spacer */}
            <div className="flex-1" />



            {/* Search — expandable */}
            <div className="relative flex items-center" ref={searchRef}>
              {searchOpen ? (
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3] pointer-events-none" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="חפש משלוח..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-48 h-9 pr-8 pl-6 bg-[#f5f5f5] dark:bg-[#262626] border border-transparent focus:border-[#9fe870]/50 rounded-[4px] text-sm text-[#0d0d12] dark:text-[#fafafa] placeholder-[#a3a3a3] outline-none transition-all"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[#e5e5e5] dark:hover:bg-[#262626] transition-colors">
                        <X className="w-3 h-3 text-[#a3a3a3]" />
                      </button>
                    )}
                  </div>
                  <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="p-1 rounded hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors">
                    <X className="w-3.5 h-3.5 text-[#a3a3a3]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className={`flex items-center justify-center w-9 h-9 rounded-[4px] border text-sm font-medium transition-colors ${
                    searchQuery
                      ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
                      : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
                  }`}
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Columns visibility */}
            <div className="relative">
              <button
                onClick={() => { setColumnsOpen(v => !v); if (!columnsOpen) setExportOpen(false); setDateOpen(false); setStatusOpen(false); setCourierOpen(false); setRestaurantOpen(false); setBranchOpen(false); }}
                className={`h-9 flex items-center gap-1.5 px-3 rounded-[4px] border text-sm font-medium transition-colors ${
                  columnsOpen
                    ? 'bg-[#f5f5f5] dark:bg-[#262626] border-[#e5e5e5] dark:border-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                    : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
                }`}
                title="הצג/הסתר עמודות"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden md:inline">עמודות</span>
              </button>
            </div>

            {/* Export */}
            <button
              onClick={() => { setExportOpen(true); setColumnsOpen(false); }}
              className="h-9 flex items-center gap-1.5 px-3 rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] text-sm font-medium text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">ייצוא</span>
            </button>
          </div>

          {/* ── Summary strip ── */}
          <div className="shrink-0 px-4 py-1 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
            <span className="text-xs text-[#a3a3a3] dark:text-[#737373]">
              {filteredDeliveries.length} משלוחים • {courierOptions.length} שליחים • {restaurantOptions.length} מסעדות
            </span>
          </div>

          {/* ── Mobile Filters Bottom Sheet ── */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-[60] md:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
              <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#0f0f0f] rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh]" dir="rtl">
                {/* Sheet header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5] dark:border-[#262626]">
                  <span className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">פילטרים</span>
                  <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => { setDateRange('all'); setCustomStartDate(''); setCustomEndDate(''); setStatusFilters(new Set()); setSelectedCouriers(new Set()); setSelectedRestaurants(new Set()); setSelectedBranches(new Set()); setSelectedAreas(new Set()); setCurrentPage(1); }}
                        className="text-xs text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] transition-colors"
                      >
                        נקה הכל
                      </button>
                    )}
                    <button onClick={() => setMobileFiltersOpen(false)} className="p-1.5 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors">
                      <X className="w-4 h-4 text-[#737373]" />
                    </button>
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-4 py-3 space-y-5">

                  {/* Date */}
                  <div>
                    <p className="text-xs font-semibold text-[#a3a3a3] mb-2">תאריך</p>
                    <div className="flex flex-wrap gap-2">
                      {DATE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setDateRange(opt.value); setCustomStartDate(''); setCustomEndDate(''); setCurrentPage(1); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            dateRange === opt.value
                              ? 'bg-[#9fe870]/15 text-[#6bc84a] ring-1 ring-[#9fe870]/40'
                              : 'bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#525252] dark:text-[#a3a3a3]'
                          }`}
                        >
                          {dateRange === opt.value && <Check className="w-3 h-3 shrink-0" />}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-xs font-semibold text-[#a3a3a3] mb-2">סטטוס</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_CHIP_CONFIG.map(({ status, label, dot }) => {
                        const isActive = statusFilters.has(status);
                        const count = statusCounts[status] ?? 0;
                        return (
                          <button
                            key={status}
                            onClick={() => { toggleStatusFilter(status); setCurrentPage(1); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-[#9fe870]/15 text-[#6bc84a] ring-1 ring-[#9fe870]/40'
                                : 'bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#525252] dark:text-[#a3a3a3]'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                            {label}
                            <span className="text-xs opacity-60 tabular-nums">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Courier */}
                  <div>
                    <p className="text-xs font-semibold text-[#a3a3a3] mb-2">שליח</p>
                    <div className="relative">
                      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3] pointer-events-none" />
                      <input
                        value={courierSearch}
                        onChange={e => setCourierSearch(e.target.value)}
                        placeholder="חפש שליח..."
                        className="w-full pr-8 pl-3 py-2 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg text-sm outline-none placeholder-[#a3a3a3] text-[#0d0d12] dark:text-[#fafafa]"
                        style={{ direction: 'rtl' }}
                      />
                    </div>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {courierOptions.filter(o => !courierSearch || o.label.includes(courierSearch)).map(o => {
                        const isActive = selectedCouriers.has(o.id);
                        return (
                          <button
                            key={o.id}
                            onClick={() => { toggleCourier(o.id); setCurrentPage(1); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-right transition-colors ${isActive ? 'bg-[#9fe870]/15 text-[#6bc84a]' : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]'}`}
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-[#9fe870] border-[#9fe870]' : 'border-[#d4d4d4] dark:border-[#404040]'}`}>
                              {isActive && <Check className="w-2.5 h-2.5 text-[#0d0d12]" />}
                            </span>
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Restaurant */}
                  <div>
                    <p className="text-xs font-semibold text-[#a3a3a3] mb-2">מסעדה</p>
                    <div className="relative">
                      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3] pointer-events-none" />
                      <input
                        value={restaurantSearch}
                        onChange={e => setRestaurantSearch(e.target.value)}
                        placeholder="חפש מסעדה..."
                        className="w-full pr-8 pl-3 py-2 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg text-sm outline-none placeholder-[#a3a3a3] text-[#0d0d12] dark:text-[#fafafa]"
                        style={{ direction: 'rtl' }}
                      />
                    </div>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      <button
                        onClick={() => { setSelectedRestaurant(null); setRestaurantSearch(''); setCurrentPage(1); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-right transition-colors ${!selectedRestaurant ? 'bg-[#9fe870]/15 text-[#6bc84a]' : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]'}`}
                      >
                        {!selectedRestaurant && <Check className="w-3.5 h-3.5 shrink-0" />}
                        כל המסעדות
                      </button>
                      {restaurantOptions.filter(o => !restaurantSearch || o.label.includes(restaurantSearch)).map(o => (
                        <button
                          key={o.id}
                          onClick={() => { setSelectedRestaurant(o.id); setRestaurantSearch(''); setCurrentPage(1); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-right transition-colors ${selectedRestaurant === o.id ? 'bg-[#9fe870]/15 text-[#6bc84a]' : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]'}`}
                        >
                          {selectedRestaurant === o.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Branch */}
                  <div>
                    <p className="text-xs font-semibold text-[#a3a3a3] mb-2">סניף</p>
                    <div className="relative">
                      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3] pointer-events-none" />
                      <input
                        value={branchSearch}
                        onChange={e => setBranchSearch(e.target.value)}
                        placeholder="חפש סניף..."
                        className="w-full pr-8 pl-3 py-2 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg text-sm outline-none placeholder-[#a3a3a3] text-[#0d0d12] dark:text-[#fafafa]"
                        style={{ direction: 'rtl' }}
                      />
                    </div>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      <button
                        onClick={() => { setSelectedBranch(null); setBranchSearch(''); setCurrentPage(1); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-right transition-colors ${!selectedBranch ? 'bg-[#9fe870]/15 text-[#6bc84a]' : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]'}`}
                      >
                        {!selectedBranch && <Check className="w-3.5 h-3.5 shrink-0" />}
                        כל הסניפים
                      </button>
                      {branchOptions.filter(o => !branchSearch || o.label.includes(branchSearch)).map(o => (
                        <button
                          key={o.id}
                          onClick={() => { setSelectedBranch(o.id); setBranchSearch(''); setCurrentPage(1); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-right transition-colors ${selectedBranch === o.id ? 'bg-[#9fe870]/15 text-[#6bc84a]' : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]'}`}
                        >
                          {selectedBranch === o.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Area */}
                  <div>
                    <p className="text-xs font-semibold text-[#a3a3a3] mb-2">אזור</p>
                    <div className="relative">
                      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3] pointer-events-none" />
                      <input
                        value={areaSearch}
                        onChange={e => setAreaSearch(e.target.value)}
                        placeholder="חפש אזור..."
                        className="w-full pr-8 pl-3 py-2 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg text-sm outline-none placeholder-[#a3a3a3] text-[#0d0d12] dark:text-[#fafafa]"
                        style={{ direction: 'rtl' }}
                      />
                    </div>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      <button
                        onClick={() => { setSelectedArea(null); setAreaSearch(''); setCurrentPage(1); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-right transition-colors ${!selectedArea ? 'bg-[#9fe870]/15 text-[#6bc84a]' : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]'}`}
                      >
                        {!selectedArea && <Check className="w-3.5 h-3.5 shrink-0" />}
                        כל האזורים
                      </button>
                      {areaOptions.filter(o => !areaSearch || o.label.includes(areaSearch)).map(o => (
                        <button
                          key={o.id}
                          onClick={() => { setSelectedArea(o.id); setAreaSearch(''); setCurrentPage(1); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-right transition-colors ${selectedArea === o.id ? 'bg-[#9fe870]/15 text-[#6bc84a]' : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]'}`}
                        >
                          {selectedArea === o.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Apply button */}
                <div className="px-4 py-3 border-t border-[#e5e5e5] dark:border-[#262626]">
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#9fe870] text-[#0d0d12] hover:bg-[#8dd960] transition-colors"
                  >
                    הצג תוצאות
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* ── Active filter chips (date / courier / restaurant / branch only) ── */}
          {false && (() => {
            const chips: { key: string; label: string; onRemove: () => void }[] = [];

            if (dateRange !== 'all') chips.push({
              key: 'date',
              label: DATE_LABEL[dateRange] ?? dateRange,
              onRemove: () => { setDateRange('all'); setCustomStartDate(''); setCustomEndDate(''); setCurrentPage(1); },
            });

            if (selectedCourier) {
              const name = courierOptions.find(o => o.id === selectedCourier)?.label ?? selectedCourier;
              chips.push({ key: 'courier', label: `שליח: ${name}`, onRemove: () => { setSelectedCourier(null); setCurrentPage(1); } });
            }

            if (selectedRestaurant) {
              const name = restaurantOptions.find(o => o.id === selectedRestaurant)?.label ?? selectedRestaurant;
              chips.push({ key: 'restaurant', label: `מסעדה: ${name}`, onRemove: () => { setSelectedRestaurant(null); setCurrentPage(1); } });
            }

            if (selectedBranch) {
              chips.push({ key: 'branch', label: `סניף: ${selectedBranch}`, onRemove: () => { setSelectedBranch(null); setCurrentPage(1); } });
            }
            if (selectedArea) {
              chips.push({ key: 'area', label: `אזור: ${selectedArea}`, onRemove: () => { setSelectedArea(null); setCurrentPage(1); } });
            }

            if (chips.length === 0) return null;

            return (
              <div className="shrink-0 flex items-center gap-1.5 px-5 pt-2 pb-2 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717] flex-wrap">
                {chips.map(chip => (
                  <span key={chip.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#f0f9ff] dark:bg-[#0c1a2e] text-[#0369a1] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#0369a1]/40">
                    {chip.label}
                    <button onClick={chip.onRemove} className="hover:text-[#0c4a6e] dark:hover:text-white transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={handleClearAllFilters}
                  className="text-xs text-[#a3a3a3] hover:text-[#ef4444] transition-colors"
                >
                  נקה הכל
                </button>
              </div>
            );
          })()}


          {/* ── Row 5: Table + Pagination ── */}
          <div className="flex-1 min-h-0 flex flex-col">

            {/* Table */}
            <div className="flex-1 min-h-0 flex flex-col">
              {filteredDeliveries.length === 0 ? (
                <div className="bg-white dark:bg-[#171717]">
                  <EnhancedEmptyState mode={emptyStateMode} onClearFilters={handleClearAllFilters} totalCount={stats.total} />
                </div>
              ) : (
                <div className="bg-white dark:bg-[#171717] overflow-hidden relative flex flex-col min-h-0">
                  {canScrollLeft && (
                    <div className="absolute top-0 left-[48px] bottom-0 w-8 bg-gradient-to-r from-white/80 dark:from-[#171717]/80 to-transparent z-10 pointer-events-none" />
                  )}

                  <div
                    ref={tableScrollRef}
                    className={`overflow-auto scroll-smooth flex-1 min-h-0 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                    style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
              <table className="w-full" role="grid" aria-label="טבלת משלוחים">
                      <DeliveryTableHeader
                        visibleColumns={visibleColumns}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        handleSort={handleSort}
                        allSelected={selectedIds.size === filteredDeliveries.length && filteredDeliveries.length > 0}
                        someSelected={selectedIds.size > 0}
                        onToggleSelectAll={handleToggleSelectAll}
                        orderedColumns={orderedColumns}
                        onColumnReorder={handleColumnReorder}
                      />
                      <tbody>
                        {filteredDeliveries.map(delivery => {
                          const courier = delivery.courierId
                            ? state.couriers.find(c => c.id === delivery.courierId) || null
                            : null;
                          const timeRemaining = calculateTimeRemaining(delivery);
                          return (
                            <DeliveryTableRow
                              key={delivery.id}
                              delivery={delivery}
                              courier={courier}
                              timeRemaining={timeRemaining}
                              formatTime={formatTime}
                              visibleColumns={visibleColumns}
                              onNavigate={() => navigate(`/delivery/${delivery.id}`)}
                              isSelected={selectedIds.has(delivery.id)}
                              onToggleSelect={handleToggleSelect}
                              onOpenDrawer={handleOpenDrawer}
                              onStatusChange={handleStatusChange}
                              onCancelDelivery={handleCancelDelivery}
                              onCompleteDelivery={handleCompleteDelivery}
                              onUnassignCourier={handleUnassignCourier}
                              onEditDelivery={handleOpenEdit}
                              isDrawerTarget={drawerDeliveryId === delivery.id}
                              orderedColumns={orderedColumns}
                              rowHeight={rowHeight}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ── Overlays ── */}

      {drawerDeliveryId && (
        <>
          <div className="fixed inset-0 z-[200]" onClick={handleCloseDrawer} />
          <div className="fixed md:left-4 md:top-4 md:bottom-4 md:w-[500px] bottom-0 left-0 right-0 md:right-auto max-h-[85vh] md:max-h-none z-[201] delivery-panel-enter">
            <div className="h-full bg-white dark:bg-[#171717] md:rounded-2xl rounded-t-3xl shadow-2xl border-t md:border border-[#e5e5e5] dark:border-[#262626] overflow-hidden flex flex-col">
              <div className="md:hidden flex-shrink-0 py-2 flex justify-center">
                <div className="w-10 h-1 bg-[#d4d4d4] dark:bg-[#404040] rounded-full" />
              </div>
              <DeliveryDetailSidePanel
                delivery={drawerDelivery}
                courier={drawerCourier}
                allCouriers={state.couriers}
                onClose={handleCloseDrawer}
                onNavigatePrev={handleDrawerPrev}
                onNavigateNext={handleDrawerNext}
                hasPrev={drawerIndex > 0}
                hasNext={drawerIndex < filteredDeliveries.length - 1}
                currentIndex={drawerIndex}
                totalCount={filteredDeliveries.length}
                onStatusChange={handleStatusChange}
                onAssignCourier={handleAssignCourier}
                onCancelDelivery={handleCancelDelivery}
                onCompleteDelivery={handleCompleteDelivery}
                onEditDelivery={handleOpenEdit}
                stats={sidePanelStats}
              />
            </div>
          </div>
        </>
      )}

      {/* New Delivery Dialog */}
      <NewDeliveryDialog
        isOpen={newDeliveryOpen}
        onClose={() => setNewDeliveryOpen(false)}
        restaurantOptions={restaurantOptions}
        courierOptions={courierOptions}
      />


      <DeliveryEditDialog
        delivery={editDelivery}
        isOpen={!!editDeliveryId}
        onClose={handleCloseEdit}
        onSave={handleSaveDelivery}
      />

      <RowHeightSelector
        isOpen={showRowHeightSelector}
        onClose={() => setShowRowHeightSelector(false)}
        selectedHeight={rowHeight}
        onHeightChange={setRowHeight}
      />

    </>
  );
};

