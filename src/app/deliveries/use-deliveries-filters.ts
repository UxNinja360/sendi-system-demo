import { useState, useMemo, useCallback, useEffect } from 'react';
import { DeliveryStatus, DeliveryState } from '../types/delivery.types';
import { COLUMN_MAP } from './column-defs';
import { useDebounce } from '../hooks/useDebounce';
import { isVisibleInDefaultDeliveriesView } from '../utils/delivery-status';

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500] as const;

export function useDeliveriesFilters(state: DeliveryState) {
  // Basic filters
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const [statusFilters, setStatusFilters] = useState<Set<DeliveryStatus>>(new Set());

  // Table sorting
  const [sortColumn, setSortColumn] = useState<string>('creation_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Advanced filters
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCouriers, setSelectedCouriers] = useState<Set<string>>(new Set());
  const [selectedRestaurants, setSelectedRestaurants] = useState<Set<string>>(new Set());
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());

  // Toggle status in multi-select
  const toggleStatusFilter = useCallback((status: DeliveryStatus) => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  const toggleCourier = useCallback((id: string) => {
    setSelectedCouriers(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const toggleRestaurant = useCallback((id: string) => {
    setSelectedRestaurants(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const toggleBranch = useCallback((id: string) => {
    setSelectedBranches(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const toggleArea = useCallback((id: string) => {
    setSelectedAreas(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  // Handle column sorting.
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  }, [sortColumn]);

  // קבלת רשימת שליחים עם מספר משלוחים
  const courierOptions = useMemo(() => {
    return state.couriers.map(courier => {
      const deliveryCount = state.deliveries.filter(d => d.courierId === courier.id).length;
      return {
        id: courier.id,
        label: courier.name,
        subtitle: `${deliveryCount} משלוחים | ${courier.phone}`,
      };
    }).sort((a, b) => a.label.localeCompare(b.label, 'he'));
  }, [state.couriers, state.deliveries]);

  // קבלת רשימת מסעדות עם מספר משלוחים
  const restaurantOptions = useMemo(() => {
    const deliveryCountMap = new Map<string, number>();
    state.deliveries.forEach(d => {
      if (d.restaurantName) {
        deliveryCountMap.set(d.restaurantName, (deliveryCountMap.get(d.restaurantName) || 0) + 1);
      }
    });
    return state.restaurants
      .map(r => ({
        id: r.id,
        label: r.name,
        subtitle: `${deliveryCountMap.get(r.name) || 0} משלוחים`
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'he'));
  }, [state.deliveries, state.restaurants]);

  // קבלת רשימת סניפים ייחודיים
  const branchOptions = useMemo(() => {
    const branchMap = new Map<string, number>();
    state.deliveries.forEach(d => {
      const branch = d.branchName?.trim();
      if (branch) branchMap.set(branch, (branchMap.get(branch) || 0) + 1);
    });
    return Array.from(branchMap.entries())
      .map(([branch, count]) => ({ id: branch, label: branch, subtitle: `${count} משלוחים` }))
      .sort((a, b) => a.label.localeCompare(b.label, 'he'));
  }, [state.deliveries]);

  // קבלת רשימת אזורים ייחודיים
  const areaOptions = useMemo(() => {
    const areaMap = new Map<string, number>();
    state.deliveries.forEach(d => {
      const area = d.area?.trim();
      if (area) areaMap.set(area, (areaMap.get(area) || 0) + 1);
    });
    return Array.from(areaMap.entries())
      .map(([area, count]) => ({ id: area, label: area, subtitle: `${count} משלוחים` }))
      .sort((a, b) => a.label.localeCompare(b.label, 'he'));
  }, [state.deliveries]);

  // סינון משלוחים
  const filteredDeliveries = useMemo(() => {
    let filtered = state.deliveries;

    if (dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (dateRange === 'today') {
        filtered = filtered.filter(d => new Date(d.createdAt) >= today);
      } else if (dateRange === 'week') {
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(d => new Date(d.createdAt) >= weekAgo);
      } else if (dateRange === 'month') {
        const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(d => new Date(d.createdAt) >= monthAgo);
      } else if (dateRange === 'custom' && customStartDate) {
        const startDate = new Date(customStartDate);
        const endDate = customEndDate ? new Date(customEndDate) : new Date();
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(d => {
          const dd = new Date(d.createdAt);
          return dd >= startDate && dd <= endDate;
        });
      }
    }
    if (selectedCouriers.size > 0) filtered = filtered.filter(d => d.courierId != null && selectedCouriers.has(d.courierId));
    if (selectedRestaurants.size > 0) filtered = filtered.filter(d => d.restaurantId != null && selectedRestaurants.has(d.restaurantId));
    if (selectedBranches.size > 0) filtered = filtered.filter(d => d.branchName != null && selectedBranches.has(d.branchName.trim()));
    if (selectedAreas.size > 0) filtered = filtered.filter(d => d.area != null && selectedAreas.has(d.area.trim()));
    if (statusFilters.size > 0) filtered = filtered.filter(d => statusFilters.has(d.status));
    else filtered = filtered.filter(isVisibleInDefaultDeliveriesView);
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(d => {
        const courierName = d.courierId ? state.couriers.find(c => c.id === d.courierId)?.name || '' : '';
        return d.orderNumber.toLowerCase().includes(query) ||
          d.customerName.toLowerCase().includes(query) ||
          d.restaurantName.toLowerCase().includes(query) ||
          d.address.toLowerCase().includes(query) ||
          (d.branchName || '').toLowerCase().includes(query) ||
          courierName.toLowerCase().includes(query);
      });
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      const colDef = COLUMN_MAP.get(sortColumn);

      if (!colDef) {
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
      } else if (sortColumn === 'status') {
        const so: Record<string, number> = { pending: 0, assigned: 1, delivering: 2, delivered: 3, cancelled: 4 };
        comparison = (so[a.status] ?? 99) - (so[b.status] ?? 99);
      } else if (sortColumn === 'courier') {
        const cA = a.courierId ? state.couriers.find(c => c.id === a.courierId)?.name || '' : '';
        const cB = b.courierId ? state.couriers.find(c => c.id === b.courierId)?.name || '' : '';
        comparison = cA.localeCompare(cB, 'he');
      } else {
        const valA = colDef.getValue(a, { courier: a.courierId ? state.couriers.find(c => c.id === a.courierId) : null });
        const valB = colDef.getValue(b, { courier: b.courierId ? state.couriers.find(c => c.id === b.courierId) : null });

        if (colDef.type === 'number' || colDef.type === 'money' || colDef.type === 'coord') {
          const numA = parseFloat(valA.replace(/[^\d.\-]/g, '')) || 0;
          const numB = parseFloat(valB.replace(/[^\d.\-]/g, '')) || 0;
          comparison = numA - numB;
        } else if (colDef.type === 'date') {
          const rawA = (a as any)[sortColumn] || (sortColumn === 'creation_time' ? a.createdAt : null);
          const rawB = (b as any)[sortColumn] || (sortColumn === 'creation_time' ? b.createdAt : null);
          const tA = rawA instanceof Date ? rawA.getTime() : (rawA ? new Date(rawA).getTime() : 0);
          const tB = rawB instanceof Date ? rawB.getTime() : (rawB ? new Date(rawB).getTime() : 0);
          comparison = tA - tB;
        } else if (colDef.type === 'boolean') {
          const boolVal = (v: string) => v === '✅' ? 2 : v === '❌' ? 1 : 0;
          comparison = boolVal(valA) - boolVal(valB);
        } else {
          const sA = valA === '-' ? '' : valA;
          const sB = valB === '-' ? '' : valB;
          comparison = sA.localeCompare(sB, 'he');
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [state.deliveries, state.couriers, debouncedSearchQuery, statusFilters, sortColumn, sortDirection, dateRange, customStartDate, customEndDate, selectedCouriers, selectedRestaurants, selectedBranches, selectedAreas]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [debouncedSearchQuery, statusFilters, dateRange, selectedCouriers, selectedRestaurants, selectedBranches, selectedAreas, itemsPerPage]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredDeliveries.length / itemsPerPage));
  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDeliveries.slice(start, start + itemsPerPage);
  }, [filteredDeliveries, currentPage, itemsPerPage]);

  // Status counts — from all filters EXCEPT status (so chip counts are always meaningful)
  const statusCounts = useMemo(() => {
    let filtered = state.deliveries;
    if (dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (dateRange === 'today') filtered = filtered.filter(d => new Date(d.createdAt) >= today);
      else if (dateRange === 'week') { const w = new Date(today); w.setDate(w.getDate() - 7); filtered = filtered.filter(d => new Date(d.createdAt) >= w); }
      else if (dateRange === 'month') { const m = new Date(today); m.setMonth(m.getMonth() - 1); filtered = filtered.filter(d => new Date(d.createdAt) >= m); }
      else if (dateRange === 'custom' && customStartDate) { const s = new Date(customStartDate); const e = customEndDate ? new Date(customEndDate) : new Date(); e.setHours(23,59,59,999); filtered = filtered.filter(d => { const dd = new Date(d.createdAt); return dd >= s && dd <= e; }); }
    }
    if (selectedCouriers.size > 0) filtered = filtered.filter(d => d.courierId != null && selectedCouriers.has(d.courierId));
    if (selectedRestaurants.size > 0) filtered = filtered.filter(d => d.restaurantId != null && selectedRestaurants.has(d.restaurantId));
    if (selectedBranches.size > 0) filtered = filtered.filter(d => d.branchName != null && selectedBranches.has(d.branchName.trim()));
    if (selectedAreas.size > 0) filtered = filtered.filter(d => d.area != null && selectedAreas.has(d.area.trim()));
    if (debouncedSearchQuery) { const q = debouncedSearchQuery.toLowerCase(); filtered = filtered.filter(d => { const cn = d.courierId ? state.couriers.find(c => c.id === d.courierId)?.name || '' : ''; return d.orderNumber.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q) || d.restaurantName.toLowerCase().includes(q) || d.address.toLowerCase().includes(q) || (d.branchName || '').toLowerCase().includes(q) || cn.toLowerCase().includes(q); }); }
    const counts: Record<string, number> = {};
    filtered.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return counts;
  }, [state.deliveries, state.couriers, dateRange, customStartDate, customEndDate, selectedCouriers, selectedRestaurants, selectedBranches, selectedAreas, debouncedSearchQuery]);

  // סטטיסטיקות לפי טווחי זמן
  const dateRangeStats = useMemo(() => {
    let filtered = state.deliveries;
    if (statusFilters.size > 0) filtered = filtered.filter(d => statusFilters.has(d.status));
    else filtered = filtered.filter(isVisibleInDefaultDeliveriesView);
    if (selectedCouriers.size > 0) filtered = filtered.filter(d => d.courierId != null && selectedCouriers.has(d.courierId));
    if (selectedRestaurants.size > 0) filtered = filtered.filter(d => d.restaurantId != null && selectedRestaurants.has(d.restaurantId));
    if (selectedBranches.size > 0) filtered = filtered.filter(d => d.branchName != null && selectedBranches.has(d.branchName.trim()));
    if (selectedAreas.size > 0) filtered = filtered.filter(d => d.area != null && selectedAreas.has(d.area.trim()));
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(d => { const cn = d.courierId ? state.couriers.find(c => c.id === d.courierId)?.name || '' : ''; return d.orderNumber.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q) || d.restaurantName.toLowerCase().includes(q) || d.address.toLowerCase().includes(q) || (d.branchName || '').toLowerCase().includes(q) || cn.toLowerCase().includes(q); });
    }
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart); monthStart.setMonth(monthStart.getMonth() - 1);
    return {
      all: filtered.length,
      today: filtered.filter(d => new Date(d.createdAt) >= todayStart).length,
      week: filtered.filter(d => new Date(d.createdAt) >= weekStart).length,
      month: filtered.filter(d => new Date(d.createdAt) >= monthStart).length,
      custom: (customStartDate) ? (() => {
        const s = new Date(customStartDate); const e = customEndDate ? new Date(customEndDate) : new Date(); e.setHours(23,59,59,999);
        return filtered.filter(d => { const dd = new Date(d.createdAt); return dd >= s && dd <= e; }).length;
      })() : 0,
    };
  }, [state.deliveries, state.couriers, statusFilters, selectedCouriers, selectedRestaurants, selectedBranches, selectedAreas, debouncedSearchQuery, customStartDate, customEndDate]);

  // Check if has active filters
  const hasActiveFilters = useMemo(() =>
    !!(searchQuery || statusFilters.size > 0 || dateRange !== 'all' || selectedCouriers.size > 0 || selectedRestaurants.size > 0 || selectedBranches.size > 0 || selectedAreas.size > 0)
  , [searchQuery, statusFilters, dateRange, selectedCouriers, selectedRestaurants, selectedBranches, selectedAreas]);

  const activeFilterCount = useMemo(() => [
    !!searchQuery,
    statusFilters.size > 0,
    dateRange !== 'all',
    selectedCouriers.size > 0,
    selectedRestaurants.size > 0,
    selectedBranches.size > 0,
    selectedAreas.size > 0,
  ].filter(Boolean).length, [searchQuery, statusFilters, dateRange, selectedCouriers, selectedRestaurants, selectedBranches, selectedAreas]);

  // Clear all filters
  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedCouriers(new Set());
    setSelectedRestaurants(new Set());
    setSelectedBranches(new Set());
    setSelectedAreas(new Set());
    setStatusFilters(new Set());
  }, []);

  return {
    // Search
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    // Status
    statusFilters,
    setStatusFilters,
    toggleStatusFilter,
    // Sort
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    handleSort,
    // Date range
    dateRange,
    setDateRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    // Entity filters
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
    // Options
    courierOptions,
    restaurantOptions,
    branchOptions,
    areaOptions,
    // Results
    filteredDeliveries,
    // Stats
    statusCounts,
    dateRangeStats,
    // Filter state
    hasActiveFilters,
    activeFilterCount,
    handleClearAllFilters,
    // Pagination
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedDeliveries,
    PAGE_SIZE_OPTIONS,
  };
}

