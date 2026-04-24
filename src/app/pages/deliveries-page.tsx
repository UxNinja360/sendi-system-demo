import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { format as formatDate } from 'date-fns';
import { useDelivery } from '../context/delivery-context-value';
import { Delivery, DeliveryStatus } from '../types/delivery.types';
import { DeliveriesSidePanel } from '../deliveries/deliveries-side-panel';
import { DeliveriesTableSection } from '../deliveries/deliveries-table-section';
import { DeliveriesOverlays } from '../deliveries/deliveries-overlays';
import { STATUS_LABELS, DEFAULT_VISIBLE_COLUMNS } from '../deliveries/status-config';
import { ALL_COLUMNS, COLUMN_MAP } from '../deliveries/column-defs';
import type { ColumnDef } from '../deliveries/column-defs';
import { toast } from 'sonner';
import { useDeliveriesFilters } from '../deliveries/use-deliveries-filters';
import { useDeliveriesExport } from '../deliveries/use-deliveries-export';
import type { PeriodMode } from '../components/common/toolbar-period-control';
import { PageToolbar } from '../components/common/page-toolbar';
import { ToolbarPeriodControl } from '../components/common/toolbar-period-control';
import { ListInlineFilters } from '../components/common/list-inline-filters';
import { ListToolbarActions } from '../components/common/list-toolbar-actions';
import { SelectionActionBar } from '../components/common/selection-action-bar';
import { getDeliveryCustomerCharge, sumDeliveryMoney } from '../utils/delivery-finance';

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

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds} שניות`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes} דקות`;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} דקות`;
};

const COLUMN_ORDER_STORAGE_KEY = 'deliveries-column-order';
const VISIBLE_COLUMNS_STORAGE_KEY = 'deliveries-visible-columns';
const STATUS_CHIP_CONFIG = [
  { status: 'pending'    as DeliveryStatus, label: 'ממתין', dot: 'bg-orange-500', active: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { status: 'assigned'   as DeliveryStatus, label: 'שובץ',  dot: 'bg-yellow-500', active: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  { status: 'delivering' as DeliveryStatus, label: 'נאסף',  dot: 'bg-indigo-500', active: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { status: 'delivered'  as DeliveryStatus, label: 'נמסר',  dot: 'bg-green-500',  active: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { status: 'cancelled'  as DeliveryStatus, label: 'בוטל',  dot: 'bg-red-500',    active: 'bg-red-500/10 text-red-600 dark:text-red-400' },
];

const getDeliveryColumnWidth = (columnId: string) => {
  switch (columnId) {
    case 'orderNumber':
      return '118px';
    case 'creation_time':
    case 'coupled_time':
    case 'arrived_at_rest':
    case 'took_it_time':
    case 'started_pickup':
    case 'started_dropoff':
    case 'arrived_at_client':
    case 'delivered_time':
      return '132px';
    case 'status':
      return '86px';
    case 'courier':
      return '148px';
    case 'rest_name':
      return '190px';
    case 'client_name':
      return '150px';
    case 'client_full_address':
    case 'restaurantAddress':
      return '220px';
    case 'timeRemaining':
      return '108px';
    case 'price':
      return '96px';
    default: {
      const column = COLUMN_MAP.get(columnId);
      if (!column) return '128px';
      switch (column.type) {
        case 'boolean':
          return '88px';
        case 'number':
          return '96px';
        case 'money':
          return '104px';
        case 'date':
          return '132px';
        case 'coord':
          return '156px';
        case 'custom':
          return '120px';
        case 'text':
        default:
          return '140px';
      }
    }
  }
};

export const DeliveriesPage: React.FC = () => {
  const { state, updateDelivery, dispatch, unassignCourier, assignCourier } = useDelivery();
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
    courierOptions,
    restaurantOptions,
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
  const [newDeliveryOpen, setNewDeliveryOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [courierSearch, setCourierSearch] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('current_month');
  const [monthAnchor, setMonthAnchor] = useState(new Date());

  useEffect(() => {
    if (periodMode !== 'current_month') return;

    const monthStart = formatDate(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1), 'yyyy-MM-dd');
    const monthEnd = formatDate(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0), 'yyyy-MM-dd');

    if (dateRange !== 'custom') setDateRange('custom');
    if (customStartDate !== monthStart) setCustomStartDate(monthStart);
    if (customEndDate !== monthEnd) setCustomEndDate(monthEnd);
  }, [periodMode, monthAnchor, dateRange, customStartDate, customEndDate, setDateRange, setCustomStartDate, setCustomEndDate]);

  useEffect(() => {
    try {
      localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
    } catch (e) {
      console.warn('Failed to save visible columns to localStorage:', e);
    }
  }, [visibleColumns]);

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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [drawerDeliveryId, setDrawerDeliveryId] = useState<string | null>(null);

  const [editDeliveryId, setEditDeliveryId] = useState<string | null>(null);

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
    toast.success('המשלוח סומן כנמסר');
  }, [dispatch]);

  const handleUnassignCourier = useCallback((deliveryId: string) => {
    unassignCourier(deliveryId);
    toast.success('השיבוץ בוטל');
  }, [unassignCourier]);

  const handleOpenEdit = useCallback((id: string) => { setEditDeliveryId(id); }, []);
  const handleCloseEdit = useCallback(() => { setEditDeliveryId(null); }, []);
  const handleSaveDelivery = useCallback((deliveryId: string, updates: Partial<Delivery>) => {
    updateDelivery(deliveryId, updates);
  }, [updateDelivery]);

  const editDelivery = useMemo(() =>
    editDeliveryId ? state.deliveries.find(d => d.id === editDeliveryId) || null : null
  , [editDeliveryId, state.deliveries]);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);
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

  const emptyStateMode = useMemo<'no-data' | 'no-results' | 'filtered-empty'>(() => {
    if (stats.total === 0) return 'no-data';
    if (searchQuery && filteredDeliveries.length === 0) return 'no-results';
    return 'filtered-empty';
  }, [stats.total, searchQuery, filteredDeliveries.length]);

  const sidePanelStats = useMemo(() => ({
    total: filteredDeliveries.length,
    delivered: filteredDeliveries.filter(d => d.status === 'delivered').length,
    cancelled: filteredDeliveries.filter(d => d.status === 'cancelled').length,
    pending: filteredDeliveries.filter(d => d.status === 'pending').length,
    revenue: sumDeliveryMoney(filteredDeliveries, getDeliveryCustomerCharge),
  }), [filteredDeliveries]);

  const deliveryStatusOptions = useMemo(
    () =>
      STATUS_CHIP_CONFIG.map(({ status, label, dot }) => ({
        id: status,
        label,
        dotClassName: dot,
        count: statusCounts[status] ?? 0,
      })),
    [statusCounts],
  );

  const deliveryInlineFilters = useMemo(
    () => [
      {
        key: 'status',
        kind: 'multi-select' as const,
        selectedValues: new Set(Array.from(statusFilters) as string[]),
        setSelectedValues: (
          nextValue: React.SetStateAction<Set<string>>,
        ) => {
          setStatusFilters((previous) => {
            const previousValues = new Set(Array.from(previous) as string[]);
            const resolved =
              typeof nextValue === 'function'
                ? nextValue(previousValues)
                : nextValue;
            return new Set(Array.from(resolved) as DeliveryStatus[]);
          });
        },
        toggleValue: (value: string) => toggleStatusFilter(value as DeliveryStatus),
        options: deliveryStatusOptions,
        defaultLabel: 'סטטוס',
        pluralLabel: 'סטטוסים',
        showSearch: false,
        setCurrentPage,
      },
      {
        key: 'restaurants',
        kind: 'multi-select' as const,
        selectedValues: selectedRestaurants,
        setSelectedValues: setSelectedRestaurants,
        toggleValue: toggleRestaurant,
        options: restaurantOptions,
        searchValue: restaurantSearch,
        setSearchValue: setRestaurantSearch,
        defaultLabel: 'מסעדה',
        pluralLabel: 'מסעדות',
        placeholder: 'חפש מסעדה...',
        setCurrentPage,
      },
      {
        key: 'couriers',
        kind: 'multi-select' as const,
        selectedValues: selectedCouriers,
        setSelectedValues: setSelectedCouriers,
        toggleValue: toggleCourier,
        options: courierOptions,
        searchValue: courierSearch,
        setSearchValue: setCourierSearch,
        defaultLabel: 'שליח',
        pluralLabel: 'שליחים',
        placeholder: 'חפש שליח...',
        setCurrentPage,
      },
    ],
    [
      courierOptions,
      courierSearch,
      deliveryStatusOptions,
      restaurantOptions,
      restaurantSearch,
      selectedCouriers,
      selectedRestaurants,
      setCurrentPage,
      setSelectedCouriers,
      setSelectedRestaurants,
      setStatusFilters,
      statusFilters,
      toggleCourier,
      toggleRestaurant,
      toggleStatusFilter,
    ],
  );

  return (
    <>
      <div className="flex flex-row h-full overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="ltr">

        <DeliveriesSidePanel
          exportOpen={exportOpen}
          columnsOpen={columnsOpen}
          onCloseExport={() => setExportOpen(false)}
          onCloseColumns={() => setColumnsOpen(false)}
          setColumnsOpen={setColumnsOpen}
          onExport={(config) => {
            handleUnifiedExport(config);
            setExportOpen(false);
          }}
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          deliveryCount={filteredStats.total}
          selectedCount={selectedIds.size}
          groupCounts={reportGroupCounts}
        />

        <div className="flex-1 min-w-0 overflow-hidden flex flex-col" dir="rtl">

          <PageToolbar
            title="משלוחים"
            count={filteredDeliveries.length}
            onToggleMobileSidebar={() => (window as any).toggleMobileSidebar?.()}
            primaryActionLabel="משלוח חדש"
            onPrimaryAction={() => setNewDeliveryOpen(true)}
            headerControls={
              <ListToolbarActions
                showSearch={false}
                columnsOpen={columnsOpen}
                onToggleColumns={() => {
                  setColumnsOpen((current) => !current);
                  setExportOpen(false);
                }}
                onExport={() => {
                  setExportOpen(true);
                  setColumnsOpen(false);
                }}
              />
            }
            periodControl={
              <ToolbarPeriodControl
                periodMode={periodMode}
                setPeriodMode={setPeriodMode}
                monthAnchor={monthAnchor}
                setMonthAnchor={setMonthAnchor}
                customStartDate={customStartDate}
                setCustomStartDate={setCustomStartDate}
                customEndDate={customEndDate}
                setCustomEndDate={setCustomEndDate}
                onCustomRangeChange={() => setDateRange('custom')}
                onCustomRangeComplete={() => setCurrentPage(1)}
                onReset={() => setCurrentPage(1)}
              />
            }
            controls={
              <ListInlineFilters filters={deliveryInlineFilters} />
            }
            actions={
              <ListToolbarActions
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchPlaceholder="חפש משלוח..."
                searchWidthClass="w-48"
                showColumnsToggle={false}
                showExportButton={false}
              />
            }
            summary={`${filteredStats.total} משלוחים`}
          />

          <div className="flex-1 min-h-0 flex flex-col">
            <DeliveriesTableSection
              filteredDeliveries={filteredDeliveries}
              emptyStateMode={emptyStateMode}
              onClearFilters={handleClearAllFilters}
              totalCount={stats.total}
              tableScrollRef={tableScrollRef}
              isDragging={isDragging}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              orderedColumns={orderedColumns}
              visibleColumns={visibleColumns}
              getDeliveryColumnWidth={getDeliveryColumnWidth}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              selectedIds={selectedIds}
              onToggleSelectAll={handleToggleSelectAll}
              onColumnReorder={handleColumnReorder}
              couriers={state.couriers}
              calculateTimeRemaining={calculateTimeRemaining}
              formatTime={formatTime}
              onToggleSelect={handleToggleSelect}
              onOpenDrawer={handleOpenDrawer}
              onStatusChange={handleStatusChange}
              onCancelDelivery={handleCancelDelivery}
              onCompleteDelivery={handleCompleteDelivery}
              onUnassignCourier={handleUnassignCourier}
              onEditDelivery={handleOpenEdit}
              drawerDeliveryId={drawerDeliveryId}
              selectionBar={
                <SelectionActionBar
                  selectedCount={selectedIds.size}
                  selectionLabel={`נבחרו ${selectedIds.size} משלוחים`}
                  onClear={() => setSelectedIds(new Set())}
                  actions={
                    <button
                      type="button"
                      onClick={() => {
                        setExportOpen(true);
                        setColumnsOpen(false);
                      }}
                      className="rounded-lg bg-[#16a34a] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[#16a34a]/20 transition-colors hover:bg-[#15803d]"
                    >
                      ייצוא נבחרים
                    </button>
                  }
                />
              }
            />

          </div>
        </div>

      </div>

      <DeliveriesOverlays
        drawerDeliveryId={drawerDeliveryId}
        drawerDelivery={drawerDelivery}
        drawerCourier={drawerCourier}
        allCouriers={state.couriers}
        onCloseDrawer={handleCloseDrawer}
        onDrawerPrev={handleDrawerPrev}
        onDrawerNext={handleDrawerNext}
        hasDrawerPrev={drawerIndex > 0}
        hasDrawerNext={drawerIndex < filteredDeliveries.length - 1}
        drawerIndex={drawerIndex}
        filteredDeliveryCount={filteredDeliveries.length}
        onStatusChange={handleStatusChange}
        onAssignCourier={handleAssignCourier}
        onCancelDelivery={handleCancelDelivery}
        onCompleteDelivery={handleCompleteDelivery}
        onEditDelivery={handleOpenEdit}
        sidePanelStats={sidePanelStats}
        newDeliveryOpen={newDeliveryOpen}
        onCloseNewDelivery={() => setNewDeliveryOpen(false)}
        restaurantOptions={restaurantOptions}
        courierOptions={courierOptions}
        editDelivery={editDelivery}
        editDeliveryOpen={!!editDeliveryId}
        onCloseEdit={handleCloseEdit}
        onSaveDelivery={handleSaveDelivery}
      />

    </>
  );
};


