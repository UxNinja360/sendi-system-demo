import React, { useMemo, useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, FileText, Filter, Menu, Package, Phone, Plus, Power, Star, Trash2, User, X, Clock, LogOut, SlidersHorizontal, Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ListInfoBar } from '../../common/list-info-bar';
import { useDelivery } from '../../../context/delivery.context';
import { Courier } from '../../../types/delivery.types';
import {
  EntityActionMenu,
  EntityActionMenuDivider,
  EntityActionMenuHeader,
  EntityActionMenuItem,
  EntityActionMenuOverlay,
} from './entity-action-menu';
import { ColumnSelector } from '../../deliveries/column-selector';
import { CouriersInlineFilters } from './couriers-inline-filters';
import { EntityExportDrawer } from './entity-export-drawer';
import { EntityExportButton } from './entity-export-button';
import { exportRowsToExcel } from './entity-export-utils';
import { EntityEmptyState, EntityNoResultsState } from './entity-empty-state';
import { EntityRowActionTrigger } from './entity-row-action-trigger';
import { EntitySidePanel } from './entity-side-panel';
import { EntitySidePanelHeader } from './entity-side-panel-header';
import { EntityTableHeaderCell } from './entity-table-header-cell';
import {
  EntityTableActionsCell,
  EntityTableHeaderCheckbox,
  EntityTableRowCheckbox,
  EntityTableShell,
} from './entity-table-shell';
import { CouriersToolbar } from './couriers-toolbar';
import {
  ENTITY_TABLE_ACTIONS_HEAD_CLASS,
  ENTITY_TABLE_DATA_CELL_CLASS,
  ENTITY_TABLE_ROW_CLASS,
  ENTITY_TABLE_WIDTHS,
} from './entity-table-shared';

const TEXT = {
  pageTitle: '\u05e9\u05dc\u05d9\u05d7\u05d9\u05dd',
  available: '\u05d6\u05de\u05d9\u05df',
  busy: '\u05ea\u05e4\u05d5\u05e1',
  offline: '\u05dc\u05d0 \u05de\u05d7\u05d5\u05d1\u05e8',
  cannotDelete: '\u05d0\u05d9 \u05d0\u05e4\u05e9\u05e8 \u05dc\u05de\u05d7\u05d5\u05e7 \u05e9\u05dc\u05d9\u05d7 \u05e2\u05dd \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05e4\u05e2\u05d9\u05dc\u05d9\u05dd.',
  deleted: '\u05d4\u05e9\u05dc\u05d9\u05d7',
  deletedSuffix: '\u05e0\u05de\u05d7\u05e7.',
  headers: [
    '\u05e9\u05dd \u05e9\u05dc\u05d9\u05d7',
    '\u05d7\u05d9\u05d1\u05d5\u05e8',
    '\u05de\u05e9\u05de\u05e8\u05ea',
    '\u05d6\u05de\u05d9\u05e0\u05d5\u05ea',
    '\u05e1\u05d5\u05d2 \u05e8\u05db\u05d1',
    '\u05e9\u05d9\u05d8\u05ea \u05d4\u05e2\u05e1\u05e7\u05d4',
    '\u05d8\u05dc\u05e4\u05d5\u05df',
    '\u05d3\u05d9\u05e8\u05d5\u05d2',
    '\u05e1\u05da \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
    '\u05de\u05e9\u05dc\u05d5\u05d7 \u05e0\u05d5\u05db\u05d7\u05d9',
    '\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea',
  ],
  activateCourier: '\u05d4\u05e4\u05e2\u05dc \u05e9\u05dc\u05d9\u05d7',
  disableCourier: '\u05d4\u05e9\u05d1\u05ea \u05e9\u05dc\u05d9\u05d7',
  more: '\u05e2\u05d5\u05d3',
  deleteCourier: '\u05de\u05d7\u05e7 \u05e9\u05dc\u05d9\u05d7',
  noCouriers: '\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d5 \u05e9\u05dc\u05d9\u05d7\u05d9\u05dd',
  noResultsPrefix: '\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d5 \u05ea\u05d5\u05e6\u05d0\u05d5\u05ea \u05dc\u05d7\u05d9\u05e4\u05d5\u05e9',
  changeFilters: '\u05e0\u05e1\u05d4 \u05dc\u05e9\u05e0\u05d5\u05ea \u05d0\u05ea \u05d4\u05e4\u05d9\u05dc\u05d8\u05e8\u05d9\u05dd',
  clearFilters: '\u05e0\u05e7\u05d4 \u05e4\u05d9\u05dc\u05d8\u05e8\u05d9\u05dd',
  addCourier: '\u05d4\u05d5\u05e1\u05e3 \u05e9\u05dc\u05d9\u05d7',
  deliveriesSuffix: '\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
  deliveryLabel: '\u05de\u05e9\u05dc\u05d5\u05d7',
  activate: '\u05d4\u05e4\u05e2\u05dc',
  disable: '\u05d4\u05e9\u05d1\u05ea',
  addNewCourier: '\u05d4\u05d5\u05e1\u05e3 \u05e9\u05dc\u05d9\u05d7 \u05d7\u05d3\u05e9',
  fullName: '\u05e9\u05dd \u05de\u05dc\u05d0',
  enterFullName: '\u05d4\u05d6\u05df \u05e9\u05dd \u05de\u05dc\u05d0',
  vehicleType: '\u05e1\u05d5\u05d2 \u05e8\u05db\u05d1',
  employmentType: '\u05e9\u05d9\u05d8\u05ea \u05d4\u05e2\u05e1\u05e7\u05d4',
  phone: '\u05d8\u05dc\u05e4\u05d5\u05df',
  enterPhone: '\u05d4\u05d6\u05df \u05de\u05e1\u05e4\u05e8 \u05d8\u05dc\u05e4\u05d5\u05df',
  cancel: '\u05d1\u05d9\u05d8\u05d5\u05dc',
} as const;

const VEHICLE_TYPES: Courier['vehicleType'][] = ['אופנוע', 'רכב', 'קורקינט'];
const COURIER_VISIBLE_COLUMNS_KEY = 'couriers-visible-columns-v1';
const COURIER_COLUMNS = [
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
] as const;
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
      { id: 'vehicleType', label: 'סוג רכב' },
      { id: 'employmentType', label: 'שיטת העסקה' },
      { id: 'phone', label: 'טלפון' },
      { id: 'rating', label: 'דירוג' },
      { id: 'totalDeliveries', label: 'סך משלוחים' },
    ],
  },
] as const;
type SortableCourierColumnId =
  | 'name'
  | 'connection'
  | 'shift'
  | 'availability'
  | 'vehicleType'
  | 'employmentType'
  | 'phone'
  | 'rating'
  | 'totalDeliveries'
  | 'currentDelivery';

const getCourierColumnWidth = (columnId: (typeof COURIER_COLUMNS)[number]['id']) => {
  switch (columnId) {
    case 'name':
      return ENTITY_TABLE_WIDTHS.name;
    case 'connection':
      return ENTITY_TABLE_WIDTHS.sm;
    case 'shift':
      return ENTITY_TABLE_WIDTHS.sm;
    case 'availability':
      return ENTITY_TABLE_WIDTHS.sm;
    case 'vehicleType':
      return ENTITY_TABLE_WIDTHS.sm;
    case 'employmentType':
      return ENTITY_TABLE_WIDTHS.sm;
    case 'phone':
      return ENTITY_TABLE_WIDTHS.phone;
    case 'rating':
      return ENTITY_TABLE_WIDTHS.xs;
    case 'totalDeliveries':
      return ENTITY_TABLE_WIDTHS.sm;
    case 'currentDelivery':
      return ENTITY_TABLE_WIDTHS.md;
    case 'actions':
      return ENTITY_TABLE_WIDTHS.actions;
    default:
      return ENTITY_TABLE_WIDTHS.lg;
  }
};

export const CouriersListPage: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'busy' | 'offline'>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'with_delivery' | 'without_delivery'>('all');
  const [sortColumn, setSortColumn] = useState<SortableCourierColumnId>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [newCourier, setNewCourier] = useState<{ name: string; phone: string; vehicleType: Courier['vehicleType'] }>({
    name: '',
    phone: '',
    vehicleType: 'אופנוע',
  });
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(COURIER_VISIBLE_COLUMNS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const valid = new Set(COURIER_COLUMNS.map((column) => column.id));
        const filtered = parsed.filter((id) => valid.has(id));
        if (filtered.length > 0) return new Set(filtered);
      }
    } catch {}
    return new Set(COURIER_COLUMNS.map((column) => column.id));
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; courier: Courier } | null>(null);
  const [selectedCourierIds, setSelectedCourierIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(COURIER_VISIBLE_COLUMNS_KEY, JSON.stringify(Array.from(visibleColumns)));
    } catch {}
  }, [visibleColumns]);

  const filteredCouriers = useMemo(() => {
    let filtered = state.couriers;

    if (searchQuery) {
      filtered = filtered.filter(
        courier =>
          courier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          courier.phone.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(courier => courier.status === statusFilter);
    }

    if (deliveryFilter !== 'all') {
      filtered = filtered.filter(courier => {
        const hasActiveDelivery = state.deliveries.some(
          delivery =>
            delivery.courierId === courier.id &&
            (delivery.status === 'assigned' || delivery.status === 'delivering'),
        );
        return deliveryFilter === 'with_delivery' ? hasActiveDelivery : !hasActiveDelivery;
      });
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    const connectionOrder = { available: 0, busy: 1, offline: 2 };
    const shiftValue = (courier: Courier) => (courier.isOnShift ? 1 : 0);
    const availabilityValue = (courier: Courier) => {
      if (courier.status === 'busy') return 0;
      if (courier.status === 'offline' || !courier.isOnShift) return 2;
      return 1;
    };

    return [...filtered].sort((a, b) => {
      switch (sortColumn) {
        case 'name':
          return a.name.localeCompare(b.name, 'he') * direction;
        case 'connection':
          return (connectionOrder[a.status] - connectionOrder[b.status]) * direction;
        case 'shift':
          return (shiftValue(a) - shiftValue(b)) * direction;
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
          const aDelivery = state.deliveries.find(
            delivery =>
              delivery.courierId === a.id &&
              delivery.status !== 'delivered' &&
              delivery.status !== 'cancelled',
          );
          const bDelivery = state.deliveries.find(
            delivery =>
              delivery.courierId === b.id &&
              delivery.status !== 'delivered' &&
              delivery.status !== 'cancelled',
          );
          const aValue = aDelivery?.orderNumber ?? '';
          const bValue = bDelivery?.orderNumber ?? '';
          return aValue.localeCompare(bValue, 'he') * direction;
        }
        default:
          return 0;
      }
    });
  }, [deliveryFilter, searchQuery, sortColumn, sortDirection, state.couriers, state.deliveries, statusFilter]);
  const visibleCourierColumns = useMemo(
    () => COURIER_COLUMNS.filter((column) => visibleColumns.has(column.id)),
    [visibleColumns],
  );

  const handleCourierSort = (columnId: SortableCourierColumnId) => {
    if (sortColumn === columnId) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(columnId);
    setSortDirection('asc');
  };

  const stats = useMemo(
    () => ({
      total: state.couriers.length,
      filtered: filteredCouriers.length,
      available: state.couriers.filter(courier => courier.status === 'available').length,
      busy: state.couriers.filter(courier => courier.status === 'busy').length,
      offline: state.couriers.filter(courier => courier.status === 'offline').length,
    }),
    [filteredCouriers.length, state.couriers],
  );

  const statusCounts = useMemo(
    () => ({
      all: state.couriers.length,
      available: state.couriers.filter(courier => courier.status === 'available').length,
      busy: state.couriers.filter(courier => courier.status === 'busy').length,
      offline: state.couriers.filter(courier => courier.status === 'offline').length,
    }),
    [state.couriers],
  );

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || deliveryFilter !== 'all';
  const allVisibleCouriersSelected = filteredCouriers.length > 0 && filteredCouriers.every(courier => selectedCourierIds.has(courier.id));
  const someVisibleCouriersSelected = filteredCouriers.some(courier => selectedCourierIds.has(courier.id));

  const handleClearAll = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDeliveryFilter('all');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return TEXT.available;
      case 'busy':
        return TEXT.busy;
      case 'offline':
        return TEXT.offline;
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-[#16a34a] dark:text-[#9fe870]';
      case 'busy':      return 'text-[#f97316] dark:text-[#ffa94d]';
      case 'offline':   return 'text-[#737373] dark:text-[#a3a3a3]';
      default:          return 'text-[#737373] dark:text-[#a3a3a3]';
    }
  };

  const getCurrentDelivery = (courierId: string) =>
    state.deliveries.find(
      delivery =>
        delivery.courierId === courierId &&
        delivery.status !== 'delivered' &&
        delivery.status !== 'cancelled',
    );

  const getCourierExportCellValue = (
    courier: Courier,
    columnId: (typeof COURIER_COLUMNS)[number]['id'],
  ) => {
    const currentDelivery = getCurrentDelivery(courier.id);

    switch (columnId) {
      case 'name':
        return courier.name;
      case 'connection':
        return courier.status === 'offline' ? 'לא מחובר' : 'מחובר';
      case 'shift':
        return courier.isOnShift ? 'במשמרת' : 'לא במשמרת';
      case 'availability':
        return courier.status === 'busy'
          ? 'במשלוח'
          : courier.status === 'offline' || !courier.isOnShift
            ? '-'
            : 'פנוי';
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
        return currentDelivery
          ? currentDelivery.api_short_order_id || currentDelivery.id.slice(0, 6)
          : '-';
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
    const rows = couriersToExport.map((courier) => {
      const row: Record<string, string | number> = {};

      exportColumns.forEach((column) => {
        row[column.label] = getCourierExportCellValue(courier, column.id);
      });

      return row;
    });

    exportRowsToExcel({
      rows,
      sheetName: 'שליחים',
      fileName: `שליחים_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`,
    });
    setIsExportOpen(false);
    toast.success(`יוצאו ${couriersToExport.length} שליחים ל-Excel`);
  };

  const handleToggleSelectCourier = (courierId: string) => {
    setSelectedCourierIds(prev => {
      const next = new Set(prev);
      if (next.has(courierId)) next.delete(courierId);
      else next.add(courierId);
      return next;
    });
  };

  const handleToggleSelectAllCouriers = () => {
    setSelectedCourierIds(prev => {
      const next = new Set(prev);
      if (allVisibleCouriersSelected) {
        filteredCouriers.forEach(courier => next.delete(courier.id));
      } else {
        filteredCouriers.forEach(courier => next.add(courier.id));
      }
      return next;
    });
  };

  const addCourier = () => {
    if (!newCourier.name.trim() || !newCourier.phone.trim()) {
      return;
    }

    const newCourierObj: Courier = {
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

    dispatch({ type: 'ADD_COURIER', payload: newCourierObj });
    setIsModalOpen(false);
    setNewCourier({ name: '', phone: '', vehicleType: 'אופנוע' });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewCourier({ name: '', phone: '', vehicleType: 'אופנוע' });
  };

  const closeCourierActionsMenu = () => {
    setContextMenu(null);
  };

  const toggleCourierPower = (courierId: string, currentStatus: string) => {
    const hasActiveDelivery = state.deliveries.some(
      delivery =>
        delivery.courierId === courierId &&
        (delivery.status === 'assigned' || delivery.status === 'delivering'),
    );

    if (hasActiveDelivery && currentStatus !== 'offline') {
      return;
    }

    dispatch({
      type: 'UPDATE_COURIER_STATUS',
      payload: {
        courierId,
        status: currentStatus === 'offline' ? 'available' : 'offline',
      },
    });
  };

  const handleToggleShift = (courier: Courier) => {
    closeCourierActionsMenu();
    if (courier.status === 'offline') {
      toast.error(`אי אפשר להתחיל משמרת ל${courier.name} כשהוא לא מחובר`);
      return;
    }
    if (courier.isOnShift) {
      dispatch({ type: 'END_COURIER_SHIFT', payload: { courierId: courier.id } });
      toast.success(`משמרת ${courier.name} הסתיימה`);
    } else {
      dispatch({ type: 'START_COURIER_SHIFT', payload: { courierId: courier.id } });
      toast.success(`משמרת ${courier.name} התחילה`);
    }
  };

  const handleRemoveCourier = (courier: Courier, event: React.MouseEvent) => {
    event.stopPropagation();
    closeCourierActionsMenu();

    if (courier.activeDeliveryIds.length > 0) {
      toast.error(TEXT.cannotDelete);
      return;
    }

    dispatch({ type: 'REMOVE_COURIER', payload: courier.id });
    toast.success(`${TEXT.deleted} ${courier.name} ${TEXT.deletedSuffix}`);
  };

  const openCourierActionsMenu = (
    courier: Courier,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const nextX = Math.max(8, triggerRect.left - 132);
    const nextY = triggerRect.bottom + 8;

    setContextMenu((prev) => {
      if (
        prev &&
        prev.courier.id === courier.id &&
        Math.abs(prev.x - nextX) < 2 &&
        Math.abs(prev.y - nextY) < 2
      ) {
        return null;
      }

      return { x: nextX, y: nextY, courier };
    });
  };

  const renderCourierCell = (
    columnId: (typeof COURIER_COLUMNS)[number]['id'],
    courier: Courier,
    currentDelivery: ReturnType<typeof getCurrentDelivery>,
  ) => {
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
              {courier.status === 'offline' ? 'לא מחובר' : 'מחובר'}
            </span>
          </td>
        );
      case 'shift':
        return (
          <td key={columnId} className={ENTITY_TABLE_DATA_CELL_CLASS}>
            <span className={`whitespace-nowrap text-xs font-medium ${courier.isOnShift ? 'text-[#a78bfa] dark:text-[#c4b5fd]' : 'text-[#737373] dark:text-[#525252]'}`}>
              {courier.isOnShift ? 'במשמרת' : 'לא במשמרת'}
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
              {courier.status === 'busy' ? 'במשלוח' : courier.status === 'offline' || !courier.isOnShift ? '-' : 'פנוי'}
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
          <EntityTableActionsCell key={columnId}>
            <EntityRowActionTrigger
              onClick={event => {
                event.stopPropagation();
                openCourierActionsMenu(courier, event);
              }}
              title={TEXT.more}
            />
          </EntityTableActionsCell>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex flex-row h-full overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="ltr">
        <EntitySidePanel isOpen={isExportOpen || columnsOpen}>
            {isExportOpen && (
              <EntityExportDrawer
                onClose={() => setIsExportOpen(false)}
                actions={[
                  {
                    id: 'visible-couriers',
                    title: 'ייצוא טבלת השליחים',
                    description: 'Excel עם העמודות המוצגות כרגע בטבלה',
                    meta: `${selectedCourierIds.size > 0 ? selectedCourierIds.size : filteredCouriers.length} שליחים · ${visibleCourierColumns.filter((column) => column.id !== 'actions').length} עמודות`,
                    icon: <FileSpreadsheet className="h-5 w-5" />,
                    onClick: handleExportVisibleCouriers,
                  },
                ]}
              />
            )}
            {columnsOpen && (
              <>
                <EntitySidePanelHeader
                  icon={<SlidersHorizontal className="w-4 h-4" />}
                  title="עמודות"
                  onClose={() => setColumnsOpen(false)}
                />
                <ColumnSelector
                  visibleColumns={visibleColumns}
                  setVisibleColumns={setVisibleColumns}
                  isOpen={columnsOpen}
                  setIsOpen={setColumnsOpen}
                  isEmbedded={true}
                  categories={[...COURIER_COLUMN_CATEGORIES]}
                  defaultVisibleColumns={COURIER_COLUMNS.map((column) => column.id)}
                  title="עמודות שליחים"
                  description="בחר אילו פרטים יופיעו בטבלת השליחים"
                  presetsKey="couriers-column-presets-v1"
                />
              </>
            )}
        </EntitySidePanel>

        <div className="flex-1 min-w-0 overflow-hidden flex flex-col" dir="rtl">
        <div className="sticky top-0 z-20 shrink-0 h-16 flex items-center justify-between border-b border-[#e5e5e5] bg-white dark:border-[#1f1f1f] dark:bg-[#171717] px-5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => (window as any).toggleMobileSidebar?.()}
              className="md:hidden p-1.5 rounded-lg text-[#737373] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">{TEXT.pageTitle}</span>
            {filteredCouriers.length > 0 && (
              <span className="text-sm text-[#a3a3a3] tabular-nums">
                {filteredCouriers.length.toLocaleString()}
              </span>
            )}
          </div>
          <button
            type="button"
            data-onboarding="add-courier-btn"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#9fe870] px-3 py-1.5 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#8fd65f]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{TEXT.addCourier}</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
            <CouriersInlineFilters
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              deliveryFilter={deliveryFilter}
              onDeliveryChange={setDeliveryFilter}
              statusCounts={statusCounts}
            />
            <div className="flex-1" />
            <CouriersToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              columnsOpen={columnsOpen}
              stats={stats}
              onAddCourier={() => setIsModalOpen(true)}
              onClearAll={handleClearAll}
              hasActiveFilters={hasActiveFilters}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onToggleColumns={() => { setColumnsOpen(true); setIsExportOpen(false); }}
            />
              <EntityExportButton onClick={() => { setIsExportOpen((v) => !v); setColumnsOpen(false); }} />
            </div>

          <ListInfoBar>{filteredCouriers.length} שליחים</ListInfoBar>

          {viewMode === 'list' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              {filteredCouriers.length === 0 ? (
                <div className="bg-white dark:bg-[#171717]">
                  {state.couriers.length === 0 ? (
                    <EntityEmptyState
                      icon={<User className="h-12 w-12 text-[#9fe870]" />}
                      title="טרם נוספו שליחים"
                      description="כאשר יתווספו שליחים למערכת, הם יופיעו כאן עם כל הפרטים והאפשרויות לניהול מתקדם"
                      footerText="המערכת מוכנה לקבלת שליחים חדשים"
                    />
                  ) : (
                    <EntityNoResultsState
                      description={searchQuery ? `לא נמצאו שליחים לחיפוש "${searchQuery}"` : 'הפילטרים שבחרת לא מצאו שליחים תואמים'}
                      onClearAll={handleClearAll}
                    />
                  )}
                </div>
              ) : (
                <EntityTableShell
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
                          <th
                            key={column.id}
                            className={`${ENTITY_TABLE_ACTIONS_HEAD_CLASS} ${column.id === 'actions' ? '' : 'pr-2 pl-2'}`}
                          >
                            <span className="sr-only">{column.label}</span>
                          </th>
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
                  {filteredCouriers.map((courier) => {
                    const currentDelivery = getCurrentDelivery(courier.id);

                    return (
                      <tr
                        key={courier.id}
                        onClick={() => navigate(`/courier/${courier.id}`)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, courier });
                        }}
                        className={ENTITY_TABLE_ROW_CLASS}
                      >
                        <EntityTableRowCheckbox
                          checked={selectedCourierIds.has(courier.id)}
                          onChange={() => handleToggleSelectCourier(courier.id)}
                        />
                        {visibleCourierColumns.map((column) => renderCourierCell(column.id, courier, currentDelivery))}
                      </tr>
                    );
                  })}
                </EntityTableShell>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-6">
              {filteredCouriers.length === 0 ? (
                <div className="bg-white dark:bg-[#171717] rounded-2xl">
                  {state.couriers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-[#9fe870]/20 to-[#9fe870]/5 rounded-2xl flex items-center justify-center mb-6">
                          <User className="w-12 h-12 text-[#9fe870]" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[#9fe870] to-[#8ed960] rounded-full flex items-center justify-center shadow-lg">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">טרם נוספו שליחים</h3>
                      <p className="text-sm text-[#737373] dark:text-[#a3a3a3] text-center max-w-md mb-6">
                        כאשר יתווספו שליחים למערכת, הם יופיעו כאן עם כל הפרטים והאפשרויות לניהול מתקדם
                      </p>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#f5f5f5] dark:bg-[#0a0a0a] rounded-lg border border-[#e5e5e5] dark:border-[#262626]">
                        <div className="w-2 h-2 bg-[#9fe870] rounded-full animate-pulse" />
                        <span className="text-xs text-[#737373] dark:text-[#a3a3a3]">המערכת מוכנה לקבלת שליחים חדשים</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl flex items-center justify-center mb-6">
                          <Search className="w-12 h-12 text-amber-500" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">לא נמצאו תוצאות</h3>
                      <p className="text-sm text-[#737373] dark:text-[#a3a3a3] text-center max-w-md mb-4">
                        {searchQuery ? `לא נמצאו שליחים לחיפוש "${searchQuery}"` : 'הפילטרים שבחרת לא מצאו שליחים תואמים'}
                      </p>
                      <button
                        onClick={handleClearAll}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-[#9fe870] to-[#8ed960] text-[#0d0d12] rounded-xl text-sm font-medium hover:from-[#8ed960] hover:to-[#7dc850] transition-all shadow-lg shadow-[#9fe870]/30"
                      >
                        <Filter className="w-4 h-4" />
                        נקה את כל הפילטרים
                      </button>
                    </div>
                  )}
                </div>
              ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCouriers.map(courier => {
                  const currentDelivery = getCurrentDelivery(courier.id);

                  return (
                    <div
                      key={courier.id}
                      onClick={() => navigate(`/courier/${courier.id}`)}
                      className="cursor-pointer rounded-xl border border-[#e5e5e5] bg-white p-4 transition-shadow hover:shadow-lg dark:border-[#262626] dark:bg-[#171717]"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-[#16a34a] dark:text-[#22c55e]" />
                          <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{courier.name}</span>
                        </div>
                        <span className={`text-xs font-medium ${getStatusColor(courier.status)}`}>
                          {getStatusLabel(courier.status)}
                        </span>
                      </div>
                      <div className="mb-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-[#737373] dark:text-[#a3a3a3]" />
                          <span className="direction-ltr text-[#666d80] dark:text-[#a3a3a3]">{courier.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[#737373] dark:text-[#a3a3a3]">{TEXT.vehicleType}</span>
                          <span className="text-[#666d80] dark:text-[#a3a3a3]">{courier.vehicleType}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-[#0d0d12] dark:text-[#fafafa]">
                            {courier.rating.toFixed(1)} {'\u00b7'} {courier.totalDeliveries} {TEXT.deliveriesSuffix}
                          </span>
                        </div>
                        {currentDelivery && (
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-blue-600 dark:text-blue-400">
                              {TEXT.deliveryLabel} {currentDelivery.api_short_order_id || currentDelivery.id.slice(0, 6)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button
                          onClick={event => {
                            event.stopPropagation();
                            toggleCourierPower(courier.id, courier.status);
                          }}
                          className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all sm:flex-1 ${
                            courier.status !== 'offline'
                              ? 'bg-[#ecfae2] text-[#16a34a] hover:bg-[#dcf5d2] dark:bg-[#163300] dark:text-[#9fe870] dark:hover:bg-[#1f4500]'
                              : 'bg-[#f5f5f5] text-[#737373] hover:bg-[#e5e5e5] dark:bg-[#262626] dark:text-[#a3a3a3] dark:hover:bg-[#404040]'
                          }`}
                        >
                          <Power className="h-4 w-4" />
                          <span>{courier.status === 'offline' ? TEXT.activate : TEXT.disable}</span>
                        </button>
                        <div className="relative self-end sm:self-auto">
                          <EntityRowActionTrigger
                            onClick={event => openCourierActionsMenu(courier, event)}
                            title={TEXT.more}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleModalClose}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#e5e5e5] bg-white p-6 dark:border-[#262626] dark:bg-[#171717]"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">{TEXT.addNewCourier}</h2>
              <button
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
                  onChange={event => setNewCourier({ ...newCourier, name: event.target.value })}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa]"
                  placeholder={TEXT.enterFullName}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-[#a3a3a3]">{TEXT.phone}</label>
                <input
                  type="tel"
                  value={newCourier.phone}
                  onChange={event => setNewCourier({ ...newCourier, phone: event.target.value })}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa]"
                  placeholder={TEXT.enterPhone}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#666d80] dark:text-[#a3a3a3]">{TEXT.vehicleType}</label>
                <select
                  value={newCourier.vehicleType}
                  onChange={event => setNewCourier({ ...newCourier, vehicleType: event.target.value as Courier['vehicleType'] })}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 text-[#0d0d12] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa]"
                >
                  {VEHICLE_TYPES.map(vehicleType => (
                    <option key={vehicleType} value={vehicleType}>
                      {vehicleType}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={addCourier}
                disabled={!newCourier.name.trim() || !newCourier.phone.trim()}
                className="flex-1 rounded-lg bg-[#9fe870] px-4 py-2.5 font-medium text-[#0d0d12] transition-colors hover:bg-[#8fd65f] disabled:bg-[#e5e5e5] disabled:text-[#a3a3a3]"
              >
                {TEXT.addCourier}
              </button>
              <button
                onClick={handleModalClose}
                className="rounded-lg bg-[#f5f5f5] px-4 py-2.5 font-medium text-[#0d0d12] transition-colors hover:bg-[#e5e5e5] dark:bg-[#262626] dark:text-[#fafafa] dark:hover:bg-[#404040]"
              >
                {TEXT.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      <EntityActionMenuOverlay
        open={Boolean(contextMenu)}
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        onClose={closeCourierActionsMenu}
      >
        {contextMenu && (
          <EntityActionMenu
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <EntityActionMenuHeader
              title={contextMenu.courier.name}
              subtitle={
                <div className="flex items-center gap-1.5">
                {contextMenu.courier.status === 'offline' ? (
                  <span className="text-[11px] font-medium text-[#737373] dark:text-[#a3a3a3]">לא מחובר</span>
                ) : contextMenu.courier.status === 'busy' ? (
                  <span className="text-[11px] font-medium text-[#f97316] dark:text-[#ffa94d]">במשלוח</span>
                ) : (
                  <span className="text-[11px] font-medium text-[#16a34a] dark:text-[#9fe870]">זמין לקבלת משלוחים</span>
                )}
                <span className="text-[10px] text-[#525252] dark:text-[#737373]">·</span>
                <span className={`text-[11px] font-medium ${contextMenu.courier.isOnShift ? 'text-[#a78bfa] dark:text-[#c4b5fd]' : 'text-[#737373] dark:text-[#525252]'}`}>
                  {contextMenu.courier.isOnShift ? 'במשמרת' : 'לא במשמרת'}
                </span>
                </div>
              }
            />

            <EntityActionMenuItem
              onClick={() => { closeCourierActionsMenu(); navigate(`/courier/${contextMenu.courier.id}`); }}
              icon={<FileText className="w-3.5 h-3.5 text-[#737373] dark:text-[#a3a3a3]" />}
            >
              פרטים מלאים
            </EntityActionMenuItem>

            <EntityActionMenuItem
              onClick={() => {
                toggleCourierPower(contextMenu.courier.id, contextMenu.courier.status);
                closeCourierActionsMenu();
              }}
              icon={<Power className="w-3.5 h-3.5 text-[#16a34a] dark:text-[#9fe870]" />}
            >
              {contextMenu.courier.status === 'offline' ? TEXT.activateCourier : TEXT.disableCourier}
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
              {contextMenu.courier.isOnShift ? 'סיים משמרת' : 'התחל משמרת'}
            </EntityActionMenuItem>

            <EntityActionMenuDivider />

            <EntityActionMenuItem
              onClick={(e) => handleRemoveCourier(contextMenu.courier, e)}
              icon={<Trash2 className="w-3.5 h-3.5" />}
              danger
            >
              מחק שליח
            </EntityActionMenuItem>
          </EntityActionMenu>
        )}
      </EntityActionMenuOverlay>
    </>
  );
};
