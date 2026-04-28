import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { format as formatDate } from 'date-fns';
import { useDelivery } from '../context/delivery-context-value';
import { Delivery, DeliveryStatus } from '../types/delivery.types';
import { DeliveriesSidePanel } from '../deliveries/deliveries-side-panel';
import { DeliveriesVercelList } from '../deliveries/deliveries-vercel-list';
import { DeliveriesOverlays } from '../deliveries/deliveries-overlays';
import { DeliveriesCommandSearch } from '../deliveries/deliveries-command-search';
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
import {
  SelectionActionBar,
  SelectionActionButton,
} from '../components/common/selection-action-bar';
import { EntityListShell } from '../components/common/entity-list-shell';
import { ENTITY_TABLE_WIDTHS } from '../components/common/entity-table-shared';
import { addAppTopBarActionListener } from '../components/layout/app-top-bar-actions';
import { getDeliveryCustomerCharge, sumDeliveryMoney } from '../utils/delivery-finance';
import { DELIVERY_STORAGE_KEYS } from '../context/delivery-storage';
import {
  DELIVERY_ASSIGNMENT_BLOCK_COPY,
  getDeliveryAssignmentBlockReason,
} from '../utils/delivery-assignment';

const calculateTimeRemaining = (delivery: Delivery): number | null => {
  if (delivery.status === 'delivered' || delivery.status === 'cancelled' || delivery.status === 'expired') return null;
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

const PRODUCT_DEFAULT_VISIBLE_COLUMNS = new Set([
  'orderNumber',
  'creation_time',
  'status',
  'rest_name',
  'client_name',
  'client_full_address',
  'courier',
]);
const REQUIRED_PRODUCT_VISIBLE_COLUMNS = ['creation_time'];
const COLUMN_ORDER_STORAGE_KEY = `${DELIVERY_STORAGE_KEYS.deliveriesColumnOrder}:product-v2`;
const VISIBLE_COLUMNS_STORAGE_KEY = `${DELIVERY_STORAGE_KEYS.deliveriesVisibleColumns}:product-v7`;
const DELIVERY_COLUMN_CATEGORIES = [
  {
    id: 'core',
    label: 'ליבה תפעולית',
    columns: [
      { id: 'orderNumber', label: 'מספר הזמנה' },
      { id: 'creation_time', label: 'זמן יצירה' },
      { id: 'offerExpiresAt', label: 'תוקף הצעה' },
      { id: 'status', label: 'סטטוס' },
      { id: 'rest_name', label: 'מסעדה' },
      { id: 'client_name', label: 'לקוח' },
      { id: 'client_full_address', label: 'כתובת לקוח' },
      { id: 'courier', label: 'שליח' },
      { id: 'timeRemaining', label: 'זמן נותר' },
    ],
  },
  {
    id: 'money',
    label: 'כסף',
    columns: [
      { id: 'price', label: 'חיוב משלוח' },
      { id: 'runner_price', label: 'תשלום שליח' },
      { id: 'runner_tip', label: 'טיפ' },
      { id: 'sum_cash', label: 'מזומן' },
      { id: 'rest_price', label: 'מחיר מסעדה' },
    ],
  },
  {
    id: 'timeline',
    label: 'ציר זמן',
    columns: [
      { id: 'deliveryCreditConsumedAt', label: 'ניצול קרדיט' },
      { id: 'coupled_time', label: 'זמן שיוך' },
      { id: 'arrived_at_rest', label: 'הגעה למסעדה' },
      { id: 'took_it_time', label: 'זמן איסוף' },
      { id: 'arrived_at_client', label: 'הגעה ללקוח' },
      { id: 'delivered_time', label: 'זמן מסירה' },
    ],
  },
  {
    id: 'details',
    label: 'פרטים נוספים',
    columns: [
      { id: 'restaurantAddress', label: 'כתובת מסעדה' },
      { id: 'client_phone', label: 'טלפון לקוח' },
      { id: 'delivery_distance', label: 'מרחק משלוח' },
      { id: 'priority', label: 'עדיפות' },
      { id: 'comment', label: 'הערת מערכת' },
    ],
  },
] as const;
const STATUS_CHIP_CONFIG = [
  { status: 'pending'    as DeliveryStatus, label: 'ממתין', dot: 'bg-orange-500', active: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { status: 'assigned'   as DeliveryStatus, label: 'שובץ',  dot: 'bg-yellow-500', active: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  { status: 'delivering' as DeliveryStatus, label: 'נאסף',  dot: 'bg-green-500', active: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { status: 'delivered'  as DeliveryStatus, label: 'נמסר',  dot: 'bg-blue-500',  active: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { status: 'cancelled'  as DeliveryStatus, label: 'בוטל',  dot: 'bg-red-500',    active: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  { status: 'expired'    as DeliveryStatus, label: 'פג תוקף', dot: 'bg-zinc-500', active: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300' },
];

type DeliveriesOverviewStats = {
  filtered: number;
};

const getDeliveryColumnWidth = (columnId: string) => {
  switch (columnId) {
    case 'orderNumber':
      return ENTITY_TABLE_WIDTHS.md;
    case 'creation_time':
    case 'offerExpiresAt':
    case 'deliveryCreditConsumedAt':
    case 'coupled_time':
    case 'arrived_at_rest':
    case 'took_it_time':
    case 'started_pickup':
    case 'started_dropoff':
    case 'arrived_at_client':
    case 'delivered_time':
      return ENTITY_TABLE_WIDTHS.lg;
    case 'status':
      return ENTITY_TABLE_WIDTHS.xs;
    case 'courier':
      return ENTITY_TABLE_WIDTHS.name;
    case 'rest_name':
      return ENTITY_TABLE_WIDTHS.name;
    case 'client_name':
      return ENTITY_TABLE_WIDTHS.name;
    case 'client_full_address':
    case 'restaurantAddress':
      return ENTITY_TABLE_WIDTHS.address;
    case 'timeRemaining':
      return ENTITY_TABLE_WIDTHS.sm;
    case 'price':
    case 'runner_price':
    case 'runner_tip':
    case 'sum_cash':
    case 'rest_price':
      return ENTITY_TABLE_WIDTHS.sm;
    default: {
      const column = COLUMN_MAP.get(columnId);
      if (!column) return '128px';
      switch (column.type) {
        case 'boolean':
          return ENTITY_TABLE_WIDTHS.xs;
        case 'number':
          return ENTITY_TABLE_WIDTHS.sm;
        case 'money':
          return ENTITY_TABLE_WIDTHS.sm;
        case 'date':
          return ENTITY_TABLE_WIDTHS.lg;
        case 'coord':
          return '156px';
        case 'custom':
          return ENTITY_TABLE_WIDTHS.md;
        case 'text':
        default:
          return ENTITY_TABLE_WIDTHS.lg;
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
          return new Set([...validColumns, ...REQUIRED_PRODUCT_VISIBLE_COLUMNS]);
        }
      }
    } catch (e) {
      console.warn('Failed to load visible columns from localStorage:', e);
    }
    return new Set(PRODUCT_DEFAULT_VISIBLE_COLUMNS);
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [newDeliveryOpen, setNewDeliveryOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('current_month');
  const [monthAnchor, setMonthAnchor] = useState(new Date());

  useEffect(() => (
    addAppTopBarActionListener('create-delivery', () => setNewDeliveryOpen(true))
  ), []);

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

  useEffect(() => {
    setVisibleColumns((current) => {
      if (REQUIRED_PRODUCT_VISIBLE_COLUMNS.every((columnId) => current.has(columnId))) {
        return current;
      }

      return new Set([...current, ...REQUIRED_PRODUCT_VISIBLE_COLUMNS]);
    });
  }, []);

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
    const preferred = ['orderNumber', 'status', 'rest_name', 'client_name', 'client_full_address', 'courier'];
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
    setSelectedIds((previous) => {
      const next = new Set(previous);
      const allVisibleSelected =
        filteredDeliveries.length > 0 && filteredDeliveries.every((delivery) => next.has(delivery.id));

      if (allVisibleSelected) {
        filteredDeliveries.forEach((delivery) => next.delete(delivery.id));
      } else {
        filteredDeliveries.forEach((delivery) => next.add(delivery.id));
      }

      return next;
    });
  }, [filteredDeliveries]);

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
  }, [dispatch]);

  const handleAssignCourier = useCallback((deliveryId: string, courierId: string) => {
    const assigned = assignCourier(deliveryId, courierId);
    if (!assigned) {
      const delivery = state.deliveries.find((item) => item.id === deliveryId);
      const availableCourierCount = state.couriers.filter((item) => item.status !== 'offline').length;
      const blockReason = delivery
        ? getDeliveryAssignmentBlockReason(delivery, {
            deliveryBalance: state.deliveryBalance,
            availableCourierCount,
          })
        : null;
      toast.error(blockReason ? DELIVERY_ASSIGNMENT_BLOCK_COPY[blockReason] : 'לא ניתן לשבץ כרגע.');
      return;
    }

  }, [assignCourier, state.couriers, state.deliveries, state.deliveryBalance]);

  const handleCancelDelivery = useCallback((deliveryId: string) => {
    dispatch({ type: 'CANCEL_DELIVERY', payload: deliveryId });
  }, [dispatch]);

  const handleCompleteDelivery = useCallback((deliveryId: string) => {
    dispatch({ type: 'COMPLETE_DELIVERY', payload: deliveryId });
  }, [dispatch]);

  const handleUnassignCourier = useCallback((deliveryId: string) => {
    unassignCourier(deliveryId);
  }, [unassignCourier]);

  const handleOpenEdit = useCallback((id: string) => { setEditDeliveryId(id); }, []);
  const handleCloseEdit = useCallback(() => { setEditDeliveryId(null); }, []);
  const handleSaveDelivery = useCallback((deliveryId: string, updates: Partial<Delivery>) => {
    updateDelivery(deliveryId, updates);
  }, [updateDelivery]);

  const editDelivery = useMemo(() =>
    editDeliveryId ? state.deliveries.find(d => d.id === editDeliveryId) || null : null
  , [editDeliveryId, state.deliveries]);

  const stats = useMemo(() => ({
    total: state.deliveries.length,
  }), [state.deliveries]);

  const filteredStats = useMemo<DeliveriesOverviewStats>(() => ({
    filtered: filteredDeliveries.length,
  }), [filteredDeliveries.length]);

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
    expired: filteredDeliveries.filter(d => d.status === 'expired').length,
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
        appearance: 'status' as const,
        setCurrentPage,
      },
    ],
    [
      deliveryStatusOptions,
      setCurrentPage,
      setStatusFilters,
      statusFilters,
      toggleStatusFilter,
    ],
  );
  return (
    <>
      <EntityListShell
        sidePanel={
          <DeliveriesSidePanel
            exportOpen={exportOpen}
            columnsOpen={columnsOpen}
            onCloseExport={() => setExportOpen(false)}
            setColumnsOpen={setColumnsOpen}
            onExport={(config) => {
              handleUnifiedExport(config);
              setExportOpen(false);
            }}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            deliveryCount={filteredStats.filtered}
            selectedCount={selectedIds.size}
            groupCounts={reportGroupCounts}
            columnCategories={[...DELIVERY_COLUMN_CATEGORIES]}
            defaultVisibleColumns={PRODUCT_DEFAULT_VISIBLE_COLUMNS}
          />
        }
        toolbar={
          <PageToolbar
            showBottomBorder={false}
            headerControls={
              <ListToolbarActions
                showSearch={false}
                showColumnsToggle={false}
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
              <DeliveriesCommandSearch
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                restaurantOptions={restaurantOptions}
                selectedRestaurants={selectedRestaurants}
                setSelectedRestaurants={setSelectedRestaurants}
                toggleRestaurant={toggleRestaurant}
                courierOptions={courierOptions}
                selectedCouriers={selectedCouriers}
                setSelectedCouriers={setSelectedCouriers}
                toggleCourier={toggleCourier}
                setCurrentPage={setCurrentPage}
              />
            }
          />
        }
      >
            <DeliveriesVercelList
              filteredDeliveries={filteredDeliveries}
              emptyStateMode={emptyStateMode}
              onClearFilters={handleClearAllFilters}
              totalCount={stats.total}
              selectedIds={selectedIds}
              couriers={state.couriers}
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
                  entitySingular={'\u05de\u05e9\u05dc\u05d5\u05d7'}
                  entityPlural={'\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd'}
                  onClear={() => setSelectedIds(new Set())}
                  actions={
                    <SelectionActionButton
                      onClick={() => {
                        setExportOpen(true);
                        setColumnsOpen(false);
                      }}
                    >
                      {'\u05d9\u05d9\u05e6\u05d5\u05d0 \u05e0\u05d1\u05d7\u05e8\u05d9\u05dd'}
                    </SelectionActionButton>
                  }
                />
              }
            />
      </EntityListShell>

      <DeliveriesOverlays
        drawerDeliveryId={drawerDeliveryId}
        drawerDelivery={drawerDelivery}
        drawerCourier={drawerCourier}
        allCouriers={state.couriers}
        deliveryBalance={state.deliveryBalance}
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


