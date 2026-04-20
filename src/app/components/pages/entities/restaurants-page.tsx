import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Power, Download, GripVertical, Store as StoreIcon, Menu, Plus, MoreVertical, Trash2, X, Sparkles, Search, Filter, FileText } from 'lucide-react';
import { useDelivery } from '../../../context/delivery.context';
import { useNavigate } from 'react-router';
import { Delivery, Restaurant } from '../../../types/delivery.types';
import { STATUS_LABELS } from '../../deliveries/status-config';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { RestaurantsToolbar } from './restaurants-toolbar';
import { RestaurantsInlineFilters } from './restaurants-inline-filters';
import { getRestaurantChainId, isMcDonaldsRestaurant } from '../../../utils/restaurant-branding';

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
type RestaurantColId = typeof RESTAURANT_COLS[number]['id'];
const COL_ORDER_KEY = 'restaurants-column-order-v3';

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════
export const RestaurantsPage: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const navigate = useNavigate();

  // ── Basic state ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({ name: '', phone: '', address: '', type: 'מסעדה' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [openActionsRestaurantId, setOpenActionsRestaurantId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<Set<string>>(new Set());
  const exportRef = useRef<HTMLDivElement>(null);

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

  const orderedCols = useMemo(() => {
    const map = new Map(RESTAURANT_COLS.map(c => [c.id, c]));
    return columnOrder.map(id => map.get(id as RestaurantColId)!).filter(Boolean);
  }, [columnOrder]);

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

  const filteredRestaurants = useMemo(() => restaurants.filter(r => {
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
  }), [restaurants, searchQuery, statusFilter, cityFilter, typeFilter]);

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
    const wb = XLSX.utils.book_new();
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Views = [{ RTL: true }];

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
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    summaryWs['!cols'] = [{ wch: 20 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'סיכום');

    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
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
      let safeName = group.name.replace(/[\\\/\*\?\[\]:\\\"<>|]/g, '').trim() || 'ללא_שם';
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
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const safeName = restaurantName.replace(/[\\\/\*\?\[\]:\\\"<>|]/g, '').trim();
    saveAs(blob, `${safeName}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success(`דוח ${restaurantName} הורד`);
  };

  // ═══════════════════════════════════════
  // Render
  // ═══════════════════════════════════════
  return (
    <>
      <div className="flex flex-col h-full overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">

        {/* Header */}
        <div className="sticky top-0 z-20 shrink-0 h-16 flex items-center justify-between px-5 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => (window as any).toggleMobileSidebar?.()}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">מסעדות</span>
            <span className="text-[13px] text-[#737373] dark:text-[#a3a3a3]">{state.restaurants.length}</span>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9fe870] hover:bg-[#8dd960] text-[#0d0d12] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>הוסף מסעדה</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

            {/* Toolbar row */}
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
              <RestaurantsInlineFilters
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                cityFilter={cityFilter}
                onCityChange={setCityFilter}
                typeFilter={typeFilter}
                onTypeChange={setTypeFilter}
                cityOptions={uniqueCities}
                typeOptions={uniqueTypes}
                statusCounts={statusCounts}
              />
              <div className="flex-1" />
              <RestaurantsToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                stats={stats}
                onExport={() => setIsExportOpen(!isExportOpen)}
                onAddRestaurant={() => setIsAddModalOpen(true)}
                onClearAll={handleClearAll}
                hasActiveFilters={!!hasActiveFilters}
              />
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="h-9 flex items-center gap-1.5 px-3 rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] text-sm font-medium text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ייצוא</span>
              </button>
            </div>

            <div className="shrink-0 px-4 py-1 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
              <span className="text-xs text-[#a3a3a3] dark:text-[#737373]">
                {filteredRestaurants.length} מסעדות • {state.deliveries.length} משלוחים • {state.couriers.length} שליחים
              </span>
            </div>

            {/* Table / Empty state */}
            <div className="flex-1 min-h-0 flex flex-col">
              {filteredRestaurants.length === 0 ? (
                <div className="bg-white dark:bg-[#171717]">
                  {restaurants.length === 0 ? (
                    /* No restaurants at all */
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-[#9fe870]/20 to-[#9fe870]/5 rounded-2xl flex items-center justify-center mb-6">
                          <StoreIcon className="w-12 h-12 text-[#9fe870]" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[#9fe870] to-[#8ed960] rounded-full flex items-center justify-center shadow-lg">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">
                        טרם נוספו מסעדות
                      </h3>
                      <p className="text-sm text-[#737373] dark:text-[#a3a3a3] text-center max-w-md mb-6">
                        כאשר יתווספו מסעדות למערכת, הן יופיעו כאן עם כל הפרטים והאפשרויות לניהול מתקדם
                      </p>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#f5f5f5] dark:bg-[#0a0a0a] rounded-lg border border-[#e5e5e5] dark:border-[#262626]">
                        <div className="w-2 h-2 bg-[#9fe870] rounded-full animate-pulse" />
                        <span className="text-xs text-[#737373] dark:text-[#a3a3a3]">
                          המערכת מוכנה לקבלת מסעדות חדשות
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
                        {searchQuery ? `לא נמצאו מסעדות לחיפוש "${searchQuery}"` : 'הפילטרים שבחרת לא מצאו מסעדות תואמות'}
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
                  <table className="w-full">
                    {/* ── Header ── */}
                    <thead className="sticky top-0 z-10 border-b border-[#e5e5e5] bg-[#fafafa] dark:border-[#262626] dark:bg-[#0a0a0a]">
                      <tr>
                        <th className="pr-5 pl-0">
                          <label
                            className="flex min-h-[48px] cursor-pointer touch-manipulation items-center justify-start"
                            style={{ touchAction: 'manipulation' }}
                          >
                            <input
                              type="checkbox"
                              checked={allVisibleRestaurantsSelected}
                              ref={(el) => { if (el) el.indeterminate = someVisibleRestaurantsSelected && !allVisibleRestaurantsSelected; }}
                              onChange={handleToggleSelectAllRestaurants}
                              className="h-4 w-4 cursor-pointer rounded border-[#d4d4d4] text-[#16a34a] accent-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 dark:border-[#404040]"
                            />
                          </label>
                        </th>
                        {/* Draggable data columns */}
                        {orderedCols.map(col => (
                          <th
                            key={col.id}
                            draggable
                            onDragStart={e => { e.dataTransfer.setData('text/plain', col.id); setDraggingId(col.id); }}
                            onDragOver={e => { e.preventDefault(); setDragOverId(col.id); }}
                            onDragLeave={() => setDragOverId(null)}
                            onDrop={e => { e.preventDefault(); const from = e.dataTransfer.getData('text/plain'); handleColumnReorder(from, col.id); setDragOverId(null); setDraggingId(null); }}
                            onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                            className={`group/col pr-2 pl-2 py-3 text-right whitespace-nowrap select-none transition-all cursor-grab
                              ${draggingId === col.id ? 'opacity-40' : ''}
                              ${dragOverId === col.id && draggingId !== col.id ? 'bg-[#dbeafe] ring-2 ring-inset ring-[#3b82f6]/40 dark:bg-[#1e3a8a]/40' : ''}`}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-[#666d80] dark:text-[#a3a3a3]">{col.label}</span>
                              <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-[#d4d4d4] opacity-0 transition-opacity group-hover/col:opacity-100 active:cursor-grabbing dark:text-[#404040]" />
                            </div>
                          </th>
                        ))}

                        {/* Actions (fixed, not draggable) */}
                        <th className="px-4 py-2.5 text-center text-xs font-medium text-[#666d80] dark:text-[#a3a3a3] whitespace-nowrap">פעולות</th>
                      </tr>
                    </thead>

                    {/* ── Body ── */}
                    <tbody>
                      {filteredRestaurants.map((restaurant, idx) => (
                          <tr
                            key={restaurant.restaurantId}
                            onClick={() => navigate(`/restaurant/${restaurant.restaurantId}`)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenuPos({ x: e.clientX, y: e.clientY });
                              setOpenActionsRestaurantId(restaurant.restaurantId);
                            }}
                            className="border-b border-[#f5f5f5] dark:border-[#1f1f1f] transition-colors cursor-pointer bg-white dark:bg-[#171717] hover:bg-[#fafafa] dark:hover:bg-[#111111]"
                          >
                            <td className="pr-5 pl-0" onClick={e => e.stopPropagation()}>
                              <label
                                className="flex min-h-[40px] cursor-pointer items-center justify-start"
                                style={{ touchAction: 'manipulation' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedRestaurantIds.has(restaurant.restaurantId)}
                                  onChange={() => handleToggleSelectRestaurant(restaurant.restaurantId)}
                                  className="h-4 w-4 cursor-pointer rounded border-[#d4d4d4] text-[#16a34a] accent-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 dark:border-[#404040]"
                                />
                              </label>
                            </td>
                            {/* Data cells in column order */}
                            {orderedCols.map(col => (
                              <td key={col.id} className="px-4 py-2">
                                {col.id === 'name' && (
                                  <div className="flex items-center gap-2">
                                    {isMcDonaldsRestaurant(restaurant.name) ? (
                                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-[#da291c] text-[10px] font-black leading-none text-[#ffc72c] shadow-sm">
                                        M
                                      </div>
                                    ) : (
                                      <StoreIcon className="h-4 w-4 shrink-0 text-[#16a34a] dark:text-[#22c55e]" />
                                    )}
                                    <span className="font-medium text-xs text-[#0d0d12] dark:text-[#fafafa] whitespace-nowrap">{restaurant.name}</span>
                                  </div>
                                )}
                                {col.id === 'type' && (
                                  <span className="text-xs text-[#737373] dark:text-[#a3a3a3] whitespace-nowrap">{restaurant.type}</span>
                                )}
                                {col.id === 'chainId' && (
                                  <span className="text-xs text-[#666d80] dark:text-[#a3a3a3] whitespace-nowrap">{restaurant.chainId}</span>
                                )}
                                {col.id === 'status' && (
                                  <span className={`text-xs font-medium whitespace-nowrap ${restaurant.isActive ? 'text-[#16a34a] dark:text-[#9fe870]' : 'text-[#737373] dark:text-[#a3a3a3]'}`}>
                                    {restaurant.status}
                                  </span>
                                )}
                                {col.id === 'address' && (
                                  <span className="text-xs text-[#666d80] dark:text-[#a3a3a3] whitespace-nowrap">{restaurant.street}, {restaurant.city}</span>
                                )}
                                {col.id === 'phone' && (
                                  <span className="text-xs text-[#666d80] dark:text-[#a3a3a3] whitespace-nowrap">{restaurant.phone}</span>
                                )}
                                {col.id === 'contact' && (
                                  <span className="text-xs text-[#666d80] dark:text-[#a3a3a3] whitespace-nowrap">{restaurant.contactPerson}</span>
                                )}
                                {col.id === 'deliveries' && (
                                  <span className="text-xs text-[#0d0d12] dark:text-[#fafafa] font-medium whitespace-nowrap">{restaurant.totalDeliveries}</span>
                                )}
                              </td>
                            ))}

                            {/* Actions */}
                            <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                              <div className="flex justify-center gap-1">
                                <button
                                  data-onboarding={idx === 0 ? 'restaurant-toggle' : undefined}
                                  onClick={(e) => handleToggleRestaurant(restaurant.restaurantId, e)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all text-xs ${
                                    restaurant.isActive
                                      ? 'bg-[#ecfae2] dark:bg-[#163300] text-[#16a34a] dark:text-[#9fe870] hover:bg-[#dcf5d2] dark:hover:bg-[#1f4500]'
                                      : 'bg-[#f5f5f5] dark:bg-[#262626] hover:bg-[#e5e5e5] dark:hover:bg-[#404040] text-[#737373] dark:text-[#a3a3a3]'
                                  }`}
                                  title={restaurant.isActive ? 'השבת מסעדה' : 'הפעל מסעדה'}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                    setContextMenuPos({ x: rect.left, y: rect.bottom + 4 });
                                    setOpenActionsRestaurantId(restaurant.restaurantId);
                                  }}
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg text-[#737373] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
                                  title="עוד"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
      </div>

      {/* Context menu (right-click) */}
      {contextMenuPos && openActionsRestaurantId && (() => {
        const restaurant = state.restaurants.find(r => r.id === openActionsRestaurantId);
        if (!restaurant) return null;
        return (
          <div
            className="fixed inset-0 z-50"
            onClick={() => { setOpenActionsRestaurantId(null); setContextMenuPos(null); }}
            onContextMenu={(e) => { e.preventDefault(); setOpenActionsRestaurantId(null); setContextMenuPos(null); }}
          >
            <div
              className="absolute min-w-[180px] bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden py-1"
              style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* שם המסעדה */}
              <div className="px-3 py-2 border-b border-[#f5f5f5] dark:border-[#262626] mb-1">
                <p className="text-xs font-semibold text-[#0d0d12] dark:text-[#fafafa] truncate">{restaurant.name}</p>
                <p className={`text-[11px] font-medium mt-0.5 ${restaurant.isActive ? 'text-[#16a34a] dark:text-[#9fe870]' : 'text-[#737373] dark:text-[#a3a3a3]'}`}>
                  {restaurant.isActive ? 'פעיל' : 'לא פעיל'}
                </p>
              </div>

              {/* פרטים מלאים */}
              <button
                onClick={() => { setContextMenuPos(null); setOpenActionsRestaurantId(null); navigate(`/restaurant/${restaurant.id}`); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-[#737373] dark:text-[#a3a3a3]" />
                פרטים מלאים
              </button>

              <div className="border-t border-[#f5f5f5] dark:border-[#262626] my-1" />

              {/* מחק מסעדה */}
              <button
                onClick={(e) => {
                  handleRemoveRestaurant(restaurant.id, restaurant.name, e);
                  setContextMenuPos(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                מחק מסעדה
              </button>
            </div>
          </div>
        );
      })()}

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

      {/* Export modal */}
      {isExportOpen && (
        <div
          ref={exportRef}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsExportOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">בחר סוג ייצוא</h3>
            <div className="space-y-2">
              <button
                onClick={handleExportZipPerRestaurant}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#fafafa] dark:bg-[#0a0a0a] hover:bg-[#9fe870]/10 dark:hover:bg-[#9fe870]/5 rounded-xl text-right transition-all border border-transparent hover:border-[#9fe870]/40"
              >
                <Download className="w-5 h-5 text-[#16a34a] dark:text-[#22c55e]" />
                <div>
                  <div className="font-medium text-[#0d0d12] dark:text-[#fafafa]">ייצוא ZIP לכל המסעדות</div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">קובץ נפרד לכל מסעדה</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
