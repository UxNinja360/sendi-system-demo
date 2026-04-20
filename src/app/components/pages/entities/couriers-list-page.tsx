import React, { useMemo, useState, useEffect, useRef } from 'react';
import { FileText, Filter, GripVertical, Menu, MoreVertical, Package, Phone, Plus, Power, Search, Sparkles, Star, Trash2, User, X, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useDelivery } from '../../../context/delivery.context';
import { Courier } from '../../../types/delivery.types';
import { CouriersInlineFilters } from './couriers-inline-filters';
import { CouriersToolbar } from './couriers-toolbar';

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
  phone: '\u05d8\u05dc\u05e4\u05d5\u05df',
  enterPhone: '\u05d4\u05d6\u05df \u05de\u05e1\u05e4\u05e8 \u05d8\u05dc\u05e4\u05d5\u05df',
  cancel: '\u05d1\u05d9\u05d8\u05d5\u05dc',
} as const;

const VEHICLE_TYPES: Courier['vehicleType'][] = ['אופנוע', 'רכב', 'קורקינט'];

export const CouriersListPage: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [openActionsCourierId, setOpenActionsCourierId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'busy' | 'offline'>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'with_delivery' | 'without_delivery'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'deliveries' | 'status'>('name');
  const [newCourier, setNewCourier] = useState<{ name: string; phone: string; vehicleType: Courier['vehicleType'] }>({
    name: '',
    phone: '',
    vehicleType: 'אופנוע',
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; courier: Courier } | null>(null);
  const [selectedCourierIds, setSelectedCourierIds] = useState<Set<string>>(new Set());
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenu(null);
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('pointerdown', handleClick);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('pointerdown', handleClick); };
  }, [contextMenu]);

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

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'he');
      }
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      if (sortBy === 'deliveries') {
        return b.totalDeliveries - a.totalDeliveries;
      }
      if (sortBy === 'status') {
        const statusOrder = { available: 0, busy: 1, offline: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return 0;
    });
  }, [deliveryFilter, searchQuery, sortBy, state.couriers, state.deliveries, statusFilter]);

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
    setSortBy('name');
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
    setContextMenu(null);
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
    setOpenActionsCourierId(null);

    if (courier.activeDeliveryIds.length > 0) {
      toast.error(TEXT.cannotDelete);
      return;
    }

    dispatch({ type: 'REMOVE_COURIER', payload: courier.id });
    toast.success(`${TEXT.deleted} ${courier.name} ${TEXT.deletedSuffix}`);
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
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
              sortBy={sortBy}
              onSortChange={setSortBy}
              statusCounts={statusCounts}
            />
            <div className="flex-1" />
            <CouriersToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              stats={stats}
              onAddCourier={() => setIsModalOpen(true)}
              onClearAll={handleClearAll}
              hasActiveFilters={hasActiveFilters}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>

          <div className="shrink-0 px-4 py-1 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
            <span className="text-xs text-[#a3a3a3] dark:text-[#737373]">
              {filteredCouriers.length} שליחים • {state.deliveries.length} משלוחים • {state.restaurants.length} מסעדות
            </span>
          </div>

          {viewMode === 'list' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              {filteredCouriers.length === 0 ? (
                <div className="bg-white dark:bg-[#171717]">
                  {state.couriers.length === 0 ? (
                    /* No couriers at all */
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-[#9fe870]/20 to-[#9fe870]/5 rounded-2xl flex items-center justify-center mb-6">
                          <User className="w-12 h-12 text-[#9fe870]" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[#9fe870] to-[#8ed960] rounded-full flex items-center justify-center shadow-lg">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">
                        טרם נוספו שליחים
                      </h3>
                      <p className="text-sm text-[#737373] dark:text-[#a3a3a3] text-center max-w-md mb-6">
                        כאשר יתווספו שליחים למערכת, הם יופיעו כאן עם כל הפרטים והאפשרויות לניהול מתקדם
                      </p>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#f5f5f5] dark:bg-[#0a0a0a] rounded-lg border border-[#e5e5e5] dark:border-[#262626]">
                        <div className="w-2 h-2 bg-[#9fe870] rounded-full animate-pulse" />
                        <span className="text-xs text-[#737373] dark:text-[#a3a3a3]">
                          המערכת מוכנה לקבלת שליחים חדשים
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Filters/search returned nothing */
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl flex items-center justify-center mb-6">
                          <Search className="w-12 h-12 text-amber-500" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">
                        לא נמצאו תוצאות
                      </h3>
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
                <div className="overflow-auto relative flex-1">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 border-b border-[#e5e5e5] bg-[#fafafa] dark:border-[#262626] dark:bg-[#0a0a0a]">
                      <tr>
                        <th className="pr-5 pl-0">
                          <label
                            className="flex min-h-[48px] cursor-pointer touch-manipulation items-center justify-start"
                            style={{ touchAction: 'manipulation' }}
                          >
                            <input
                              type="checkbox"
                              checked={allVisibleCouriersSelected}
                              ref={(el) => { if (el) el.indeterminate = someVisibleCouriersSelected && !allVisibleCouriersSelected; }}
                              onChange={handleToggleSelectAllCouriers}
                              className="h-4 w-4 cursor-pointer rounded border-[#d4d4d4] text-[#16a34a] accent-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 dark:border-[#404040]"
                            />
                          </label>
                        </th>
                        {TEXT.headers.map(header => (
                          <th
                            key={header}
                            className={`group/col py-3 text-right transition-all ${header === TEXT.headers[TEXT.headers.length - 1] ? 'px-1 w-10 text-center' : 'pr-2 pl-2'}`}
                          >
                            <div className={`flex items-center gap-1 ${header === TEXT.headers[TEXT.headers.length - 1] ? 'justify-center' : ''}`}>
                              <span className="whitespace-nowrap text-xs font-medium text-[#666d80] dark:text-[#a3a3a3]">
                                {header}
                              </span>
                              {header !== TEXT.headers[TEXT.headers.length - 1] && (
                                <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-[#d4d4d4] opacity-0 transition-opacity group-hover/col:opacity-100 active:cursor-grabbing dark:text-[#404040]" />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCouriers.map(courier => {
                        const currentDelivery = getCurrentDelivery(courier.id);

                        return (
                          <tr
                            key={courier.id}
                            onClick={() => navigate(`/courier/${courier.id}`)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.clientX, y: e.clientY, courier });
                            }}
                            className="cursor-pointer border-b border-[#f5f5f5] bg-white transition-colors hover:bg-[#fafafa] dark:border-[#1f1f1f] dark:bg-[#171717] dark:hover:bg-[#111111]"
                          >
                            <td className="pr-5 pl-0" onClick={event => event.stopPropagation()}>
                              <label
                                className="flex min-h-[40px] cursor-pointer items-center justify-start"
                                style={{ touchAction: 'manipulation' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCourierIds.has(courier.id)}
                                  onChange={() => handleToggleSelectCourier(courier.id)}
                                  className="h-4 w-4 cursor-pointer rounded border-[#d4d4d4] text-[#16a34a] accent-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 dark:border-[#404040]"
                                />
                              </label>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 shrink-0 text-[#16a34a] dark:text-[#22c55e]" />
                                <span className="whitespace-nowrap text-xs font-medium text-[#0d0d12] dark:text-[#fafafa]">
                                  {courier.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`whitespace-nowrap text-xs font-medium ${courier.status === 'offline' ? 'text-[#737373] dark:text-[#a3a3a3]' : 'text-[#16a34a] dark:text-[#9fe870]'}`}>
                                {courier.status === 'offline' ? 'לא מחובר' : 'מחובר'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`whitespace-nowrap text-xs font-medium ${courier.isOnShift ? 'text-[#a78bfa] dark:text-[#c4b5fd]' : 'text-[#737373] dark:text-[#525252]'}`}>
                                {courier.isOnShift ? 'במשמרת' : 'לא במשמרת'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
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
                            <td className="px-4 py-2.5">
                              <span className="whitespace-nowrap text-xs text-[#666d80] dark:text-[#a3a3a3]">
                                {courier.vehicleType}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="direction-ltr whitespace-nowrap text-xs text-[#666d80] dark:text-[#a3a3a3]">
                                {courier.phone}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                                <span className="whitespace-nowrap text-xs font-medium text-[#0d0d12] dark:text-[#fafafa]">
                                  {courier.rating.toFixed(1)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="whitespace-nowrap text-xs font-medium text-[#0d0d12] dark:text-[#fafafa]">
                                {courier.totalDeliveries}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {currentDelivery ? (
                                <div className="flex items-center gap-1.5">
                                  <Package className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                  <span className="whitespace-nowrap text-xs text-blue-600 dark:text-blue-400">
                                    {currentDelivery.api_short_order_id || currentDelivery.id.slice(0, 6)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-[#a3a3a3]">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex justify-center gap-1">
                                <button
                                  onClick={event => {
                                    event.stopPropagation();
                                    toggleCourierPower(courier.id, courier.status);
                                  }}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                                    courier.status !== 'offline'
                                      ? 'bg-[#ecfae2] text-[#16a34a] hover:bg-[#dcf5d2] dark:bg-[#163300] dark:text-[#9fe870] dark:hover:bg-[#1f4500]'
                                      : 'bg-[#f5f5f5] text-[#737373] hover:bg-[#e5e5e5] dark:bg-[#262626] dark:text-[#a3a3a3] dark:hover:bg-[#404040]'
                                  }`}
                                  title={courier.status === 'offline' ? TEXT.activateCourier : TEXT.disableCourier}
                                >
                                  <Power className="h-3.5 w-3.5" />
                                </button>
                                <div className="relative">
                                  <button
                                    onClick={event => {
                                      event.stopPropagation();
                                      setOpenActionsCourierId(prev => (prev === courier.id ? null : courier.id));
                                    }}
                                    className="inline-flex items-center justify-center rounded-lg p-1.5 text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#262626]"
                                    title={TEXT.more}
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>
                                  {openActionsCourierId === courier.id && (
                                    <div className="absolute left-0 mt-1 z-20 min-w-[140px] overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-xl dark:border-[#262626] dark:bg-[#171717]">
                                      <button
                                        onClick={event => handleRemoveCourier(courier, event)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>{TEXT.deleteCourier}</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                          <button
                            onClick={event => {
                              event.stopPropagation();
                              setOpenActionsCourierId(prev => (prev === courier.id ? null : courier.id));
                            }}
                            className="inline-flex items-center justify-center rounded-lg p-2 text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#262626]"
                            title={TEXT.more}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openActionsCourierId === courier.id && (
                            <div className="absolute bottom-full left-0 mb-2 z-20 min-w-[140px] overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-xl dark:border-[#262626] dark:bg-[#171717]">
                              <button
                                onClick={event => handleRemoveCourier(courier, event)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>{TEXT.deleteCourier}</span>
                              </button>
                            </div>
                          )}
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
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[180px] bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* שם השליח */}
          <div className="px-3 py-2 border-b border-[#f5f5f5] dark:border-[#262626] mb-1">
            <p className="text-xs font-semibold text-[#0d0d12] dark:text-[#fafafa] truncate">{contextMenu.courier.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
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
          </div>

          {/* פרטים מלאים */}
          <button
            onClick={() => { setContextMenu(null); navigate(`/courier/${contextMenu.courier.id}`); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#737373] dark:text-[#a3a3a3]" />
            פרטים מלאים
          </button>

          {/* התחל / סיים משמרת */}
          <button
            onClick={() => handleToggleShift(contextMenu.courier)}
            disabled={!contextMenu.courier.isOnShift && contextMenu.courier.status === 'offline'}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {contextMenu.courier.isOnShift ? (
              <>
                <LogOut className="w-3.5 h-3.5 text-[#f97316]" />
                סיים משמרת
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-[#16a34a] dark:text-[#9fe870]" />
                התחל משמרת
              </>
            )}
          </button>

          <div className="border-t border-[#f5f5f5] dark:border-[#262626] my-1" />

          {/* מחק שליח */}
          <button
            onClick={(e) => { handleRemoveCourier(contextMenu.courier, e); setContextMenu(null); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            מחק שליח
          </button>
        </div>
      )}
    </>
  );
};
