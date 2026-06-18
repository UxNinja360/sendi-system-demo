import { useState, useMemo, useCallback, useEffect } from 'react';
import { Delivery, DeliveryStatus, DeliveryState } from '../types/delivery.types';
import { COLUMN_MAP } from './column-defs';
import { useDebounce } from '../hooks/useDebounce';
import { getRestaurantChainId } from '../utils/restaurant-branding';

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500] as const;
const DEFAULT_DELIVERY_STATUS_FILTERS: DeliveryStatus[] = [
  'pending',
  'assigned',
  'delivering',
  'delivered',
  'cancelled',
];
const DELIVERY_STATUS_SORT_PRIORITY: Record<DeliveryStatus, number> = {
  pending: 0,
  assigned: 1,
  delivering: 2,
  delivered: 3,
  cancelled: 4,
  expired: 5,
};

const createDefaultStatusFilters = () => new Set(DEFAULT_DELIVERY_STATUS_FILTERS);
const getDefaultSortDirection = (column: string): 'asc' | 'desc' =>
  column === 'creation_time' ? 'asc' : 'desc';
const getDeliveryStatusSortPriority = (status: DeliveryStatus) =>
  DELIVERY_STATUS_SORT_PRIORITY[status] ?? 99;

type DeliveryDateRange = 'all' | 'today' | 'week' | 'month' | 'custom';
const DEFAULT_CUSTOM_START_TIME = '00:00';
const DEFAULT_CUSTOM_END_TIME = '23:59';

const padDatePart = (value: number) => value.toString().padStart(2, '0');

const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const parseLocalDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const parseTimeValue = (value: string, fallback: string) => {
  const source = value || fallback;
  const [rawHours, rawMinutes] = source.split(':').map(Number);
  const hours = Number.isFinite(rawHours) ? Math.min(23, Math.max(0, rawHours)) : 0;
  const minutes = Number.isFinite(rawMinutes) ? Math.min(59, Math.max(0, rawMinutes)) : 0;

  return { hours, minutes };
};

const applyTimeToDate = (
  date: Date,
  timeValue: string,
  fallback: string,
  endOfMinute = false,
) => {
  const next = new Date(date);
  const { hours, minutes } = parseTimeValue(timeValue, fallback);
  next.setHours(hours, minutes, endOfMinute ? 59 : 0, endOfMinute ? 999 : 0);
  return next;
};

const getDeliveryDate = (delivery: Delivery) => {
  const value = delivery.createdAt ?? delivery.creation_time;
  const date = value instanceof Date ? value : value ? new Date(value) : null;

  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getDateRangeBounds = (
  dateRange: DeliveryDateRange,
  customStartDate: string,
  customEndDate: string,
  customStartTime = DEFAULT_CUSTOM_START_TIME,
  customEndTime = DEFAULT_CUSTOM_END_TIME,
) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (dateRange === 'all') return null;

  if (dateRange === 'today') {
    return { start: todayStart, end: todayEnd };
  }

  if (dateRange === 'week') {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - 7);
    return { start, end: todayEnd };
  }

  if (dateRange === 'month') {
    const start = new Date(todayStart);
    start.setMonth(start.getMonth() - 1);
    return { start, end: todayEnd };
  }

  if (dateRange === 'custom' && customStartDate) {
    const parsedStart = parseLocalDateKey(customStartDate);
    const parsedEnd = customEndDate ? parseLocalDateKey(customEndDate) : parsedStart;
    if (!parsedStart || !parsedEnd) return null;

    const start = applyTimeToDate(parsedStart, customStartTime, DEFAULT_CUSTOM_START_TIME);
    const end = applyTimeToDate(parsedEnd, customEndTime, DEFAULT_CUSTOM_END_TIME, true);

    return start <= end
      ? { start, end }
      : { start: end, end: start };
  }

  return null;
};

const isDeliveryInDateRange = (
  delivery: Delivery,
  dateRange: DeliveryDateRange,
  customStartDate: string,
  customEndDate: string,
  customStartTime = DEFAULT_CUSTOM_START_TIME,
  customEndTime = DEFAULT_CUSTOM_END_TIME,
) => {
  const bounds = getDateRangeBounds(
    dateRange,
    customStartDate,
    customEndDate,
    customStartTime,
    customEndTime,
  );
  if (!bounds) return true;

  const deliveryDate = getDeliveryDate(delivery);
  return Boolean(deliveryDate && deliveryDate >= bounds.start && deliveryDate <= bounds.end);
};

export function useDeliveriesFilters(state: DeliveryState) {
  // Basic filters
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const [statusFilters, setStatusFilters] = useState<Set<DeliveryStatus>>(
    createDefaultStatusFilters,
  );

  // Table sorting
  const [sortColumn, setSortColumn] = useState<string>('creation_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    () => getDefaultSortDirection('creation_time'),
  );

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Advanced filters
  const [dateRange, setDateRange] = useState<DeliveryDateRange>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customStartTime, setCustomStartTime] = useState(DEFAULT_CUSTOM_START_TIME);
  const [customEndTime, setCustomEndTime] = useState(DEFAULT_CUSTOM_END_TIME);
  const [selectedCouriers, setSelectedCouriers] = useState<Set<string>>(new Set());
  const [selectedRestaurants, setSelectedRestaurants] = useState<Set<string>>(new Set());
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
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
  const toggleChain = useCallback((id: string) => {
    setSelectedChains(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
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
      setSortDirection(getDefaultSortDirection(column));
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

  const selectedRestaurantNames = useMemo(() => {
    if (selectedRestaurants.size === 0) return new Set<string>();

    const names = new Set<string>();
    state.restaurants.forEach((restaurant) => {
      if (selectedRestaurants.has(restaurant.id)) names.add(restaurant.name);
    });
    return names;
  }, [selectedRestaurants, state.restaurants]);

  const matchesSelectedRestaurant = useCallback(
    (delivery: { restaurantId?: string | null; restaurantName: string }) => {
      if (selectedRestaurants.size === 0) return true;

      return (
        (delivery.restaurantId != null && selectedRestaurants.has(delivery.restaurantId)) ||
        selectedRestaurantNames.has(delivery.restaurantName)
      );
    },
    [selectedRestaurants, selectedRestaurantNames],
  );

  const restaurantChainById = useMemo(() => {
    const chainMap = new Map<string, string>();
    state.restaurants.forEach((restaurant) => {
      const chainId =
        restaurant.chainId && restaurant.chainId !== '-'
          ? restaurant.chainId
          : getRestaurantChainId(restaurant.name);
      if (chainId && chainId !== '-') chainMap.set(restaurant.id, chainId);
    });
    return chainMap;
  }, [state.restaurants]);

  const getDeliveryChainId = useCallback(
    (delivery: { restaurantId?: string; restaurantName: string }) =>
      (delivery.restaurantId ? restaurantChainById.get(delivery.restaurantId) : undefined) ||
      getRestaurantChainId(delivery.restaurantName),
    [restaurantChainById],
  );

  // קבלת רשימת מסעדות עם מספר משלוחים בהתאם לפילטרים הפעילים.
  const restaurantOptions = useMemo(() => {
    const deliveryCountMap = new Map<string, number>();
    const query = debouncedSearchQuery.toLowerCase();

    state.deliveries.forEach(d => {
      if (!d.restaurantName || !statusFilters.has(d.status)) return;
      if (!isDeliveryInDateRange(d, dateRange, customStartDate, customEndDate, customStartTime, customEndTime)) return;

      if (selectedCouriers.size > 0 && (d.courierId == null || !selectedCouriers.has(d.courierId))) return;
      if (selectedChains.size > 0 && !selectedChains.has(getDeliveryChainId(d))) return;
      if (selectedBranches.size > 0 && (d.branchName == null || !selectedBranches.has(d.branchName.trim()))) return;
      if (selectedAreas.size > 0 && (d.area == null || !selectedAreas.has(d.area.trim()))) return;

      if (query) {
        const courierName = d.courierId ? state.couriers.find(c => c.id === d.courierId)?.name || '' : '';
        const matchesQuery =
          d.orderNumber.toLowerCase().includes(query) ||
          d.customerName.toLowerCase().includes(query) ||
          d.restaurantName.toLowerCase().includes(query) ||
          d.address.toLowerCase().includes(query) ||
          (d.branchName || '').toLowerCase().includes(query) ||
          courierName.toLowerCase().includes(query);
        if (!matchesQuery) return;
      }

      deliveryCountMap.set(d.restaurantName, (deliveryCountMap.get(d.restaurantName) || 0) + 1);
    });

    return state.restaurants
      .map(r => ({
        id: r.id,
        label: r.name,
        subtitle: `${deliveryCountMap.get(r.name) || 0} משלוחים`
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'he'));
  }, [
    customEndDate,
    customEndTime,
    customStartDate,
    customStartTime,
    dateRange,
    debouncedSearchQuery,
    getDeliveryChainId,
    selectedAreas,
    selectedBranches,
    selectedChains,
    selectedCouriers,
    state.couriers,
    state.deliveries,
    state.restaurants,
    statusFilters,
  ]);

  const chainOptions = useMemo(() => {
    const chainMap = new Map<string, { restaurantCount: number; deliveryCount: number }>();

    state.restaurants.forEach((restaurant) => {
      const chainId =
        restaurant.chainId && restaurant.chainId !== '-'
          ? restaurant.chainId
          : getRestaurantChainId(restaurant.name);
      if (!chainId || chainId === '-') return;

      const current = chainMap.get(chainId) ?? { restaurantCount: 0, deliveryCount: 0 };
      current.restaurantCount += 1;
      chainMap.set(chainId, current);
    });

    state.deliveries.forEach((delivery) => {
      const chainId = getDeliveryChainId(delivery);
      if (!chainId || chainId === '-') return;

      const current = chainMap.get(chainId) ?? { restaurantCount: 0, deliveryCount: 0 };
      current.deliveryCount += 1;
      chainMap.set(chainId, current);
    });

    return Array.from(chainMap.entries())
      .map(([chainId, counts]) => ({
        id: chainId,
        label: chainId,
        subtitle: `${counts.deliveryCount} משלוחים | ${counts.restaurantCount} מסעדות`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'he'));
  }, [getDeliveryChainId, state.deliveries, state.restaurants]);

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

    filtered = filtered.filter(d => isDeliveryInDateRange(d, dateRange, customStartDate, customEndDate, customStartTime, customEndTime));
    if (selectedCouriers.size > 0) filtered = filtered.filter(d => d.courierId != null && selectedCouriers.has(d.courierId));
    if (selectedRestaurants.size > 0) filtered = filtered.filter(matchesSelectedRestaurant);
    if (selectedChains.size > 0) filtered = filtered.filter(d => selectedChains.has(getDeliveryChainId(d)));
    if (selectedBranches.size > 0) filtered = filtered.filter(d => d.branchName != null && selectedBranches.has(d.branchName.trim()));
    if (selectedAreas.size > 0) filtered = filtered.filter(d => d.area != null && selectedAreas.has(d.area.trim()));
    filtered = filtered.filter(d => statusFilters.has(d.status));
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
      const statusComparison =
        getDeliveryStatusSortPriority(a.status) - getDeliveryStatusSortPriority(b.status);
      if (statusComparison !== 0) return statusComparison;

      let comparison = 0;
      const colDef = COLUMN_MAP.get(sortColumn);

      if (!colDef) {
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
      } else if (sortColumn === 'status') {
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
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
  }, [state.deliveries, state.couriers, debouncedSearchQuery, statusFilters, sortColumn, sortDirection, dateRange, customStartDate, customEndDate, customStartTime, customEndTime, selectedCouriers, selectedRestaurants, matchesSelectedRestaurant, selectedChains, selectedBranches, selectedAreas, getDeliveryChainId]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [debouncedSearchQuery, statusFilters, dateRange, customStartDate, customEndDate, customStartTime, customEndTime, selectedCouriers, selectedRestaurants, selectedChains, selectedBranches, selectedAreas, itemsPerPage]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredDeliveries.length / itemsPerPage));
  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDeliveries.slice(start, start + itemsPerPage);
  }, [filteredDeliveries, currentPage, itemsPerPage]);

  // Status counts — from all filters EXCEPT status (so chip counts are always meaningful)
  const statusCounts = useMemo(() => {
    let filtered = state.deliveries;
    filtered = filtered.filter(d => isDeliveryInDateRange(d, dateRange, customStartDate, customEndDate, customStartTime, customEndTime));
    if (selectedCouriers.size > 0) filtered = filtered.filter(d => d.courierId != null && selectedCouriers.has(d.courierId));
    if (selectedRestaurants.size > 0) filtered = filtered.filter(matchesSelectedRestaurant);
    if (selectedChains.size > 0) filtered = filtered.filter(d => selectedChains.has(getDeliveryChainId(d)));
    if (selectedBranches.size > 0) filtered = filtered.filter(d => d.branchName != null && selectedBranches.has(d.branchName.trim()));
    if (selectedAreas.size > 0) filtered = filtered.filter(d => d.area != null && selectedAreas.has(d.area.trim()));
    if (debouncedSearchQuery) { const q = debouncedSearchQuery.toLowerCase(); filtered = filtered.filter(d => { const cn = d.courierId ? state.couriers.find(c => c.id === d.courierId)?.name || '' : ''; return d.orderNumber.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q) || d.restaurantName.toLowerCase().includes(q) || d.address.toLowerCase().includes(q) || (d.branchName || '').toLowerCase().includes(q) || cn.toLowerCase().includes(q); }); }
    const counts: Record<string, number> = {};
    filtered.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return counts;
  }, [state.deliveries, state.couriers, dateRange, customStartDate, customEndDate, customStartTime, customEndTime, selectedCouriers, selectedRestaurants, matchesSelectedRestaurant, selectedChains, selectedBranches, selectedAreas, debouncedSearchQuery, getDeliveryChainId]);

  // סטטיסטיקות לפי טווחי זמן
  const dateRangeStats = useMemo(() => {
    let filtered = state.deliveries;
    filtered = filtered.filter(d => statusFilters.has(d.status));
    if (selectedCouriers.size > 0) filtered = filtered.filter(d => d.courierId != null && selectedCouriers.has(d.courierId));
    if (selectedRestaurants.size > 0) filtered = filtered.filter(matchesSelectedRestaurant);
    if (selectedChains.size > 0) filtered = filtered.filter(d => selectedChains.has(getDeliveryChainId(d)));
    if (selectedBranches.size > 0) filtered = filtered.filter(d => d.branchName != null && selectedBranches.has(d.branchName.trim()));
    if (selectedAreas.size > 0) filtered = filtered.filter(d => d.area != null && selectedAreas.has(d.area.trim()));
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(d => { const cn = d.courierId ? state.couriers.find(c => c.id === d.courierId)?.name || '' : ''; return d.orderNumber.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q) || d.restaurantName.toLowerCase().includes(q) || d.address.toLowerCase().includes(q) || (d.branchName || '').toLowerCase().includes(q) || cn.toLowerCase().includes(q); });
    }
    return {
      all: filtered.length,
      today: filtered.filter(d => isDeliveryInDateRange(d, 'today', '', '')).length,
      week: filtered.filter(d => isDeliveryInDateRange(d, 'week', '', '')).length,
      month: filtered.filter(d => isDeliveryInDateRange(d, 'month', '', '')).length,
      custom: customStartDate
        ? filtered.filter(d => isDeliveryInDateRange(d, 'custom', customStartDate, customEndDate, customStartTime, customEndTime)).length
        : 0,
    };
  }, [state.deliveries, state.couriers, statusFilters, selectedCouriers, selectedRestaurants, matchesSelectedRestaurant, selectedChains, selectedBranches, selectedAreas, debouncedSearchQuery, customStartDate, customEndDate, customStartTime, customEndTime, getDeliveryChainId]);

  const deliveryCountsByDay = useMemo(() => {
    let filtered = state.deliveries;

    filtered = filtered.filter(d => statusFilters.has(d.status));
    if (selectedCouriers.size > 0) filtered = filtered.filter(d => d.courierId != null && selectedCouriers.has(d.courierId));
    if (selectedRestaurants.size > 0) filtered = filtered.filter(matchesSelectedRestaurant);
    if (selectedChains.size > 0) filtered = filtered.filter(d => selectedChains.has(getDeliveryChainId(d)));
    if (selectedBranches.size > 0) filtered = filtered.filter(d => d.branchName != null && selectedBranches.has(d.branchName.trim()));
    if (selectedAreas.size > 0) filtered = filtered.filter(d => d.area != null && selectedAreas.has(d.area.trim()));
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(d => {
        const courierName = d.courierId ? state.couriers.find(c => c.id === d.courierId)?.name || '' : '';
        return d.orderNumber.toLowerCase().includes(q) ||
          d.customerName.toLowerCase().includes(q) ||
          d.restaurantName.toLowerCase().includes(q) ||
          d.address.toLowerCase().includes(q) ||
          (d.branchName || '').toLowerCase().includes(q) ||
          courierName.toLowerCase().includes(q);
      });
    }

    const counts: Record<string, number> = {};
    filtered.forEach((delivery) => {
      const deliveryDate = getDeliveryDate(delivery);
      if (!deliveryDate) return;

      const dayKey = toLocalDateKey(deliveryDate);
      counts[dayKey] = (counts[dayKey] || 0) + 1;
    });

    return counts;
  }, [
    state.deliveries,
    state.couriers,
    statusFilters,
    selectedCouriers,
    selectedRestaurants,
    matchesSelectedRestaurant,
    selectedChains,
    selectedBranches,
    selectedAreas,
    debouncedSearchQuery,
    getDeliveryChainId,
  ]);

  // Check if has active filters
  const hasActiveFilters = useMemo(() =>
    !!(searchQuery || statusFilters.size > 0 || dateRange !== 'all' || selectedCouriers.size > 0 || selectedRestaurants.size > 0 || selectedChains.size > 0 || selectedBranches.size > 0 || selectedAreas.size > 0)
  , [searchQuery, statusFilters, dateRange, selectedCouriers, selectedRestaurants, selectedChains, selectedBranches, selectedAreas]);

  const activeFilterCount = useMemo(() => [
    !!searchQuery,
    statusFilters.size > 0,
    dateRange !== 'all',
    selectedCouriers.size > 0,
    selectedRestaurants.size > 0,
    selectedChains.size > 0,
    selectedBranches.size > 0,
    selectedAreas.size > 0,
  ].filter(Boolean).length, [searchQuery, statusFilters, dateRange, selectedCouriers, selectedRestaurants, selectedChains, selectedBranches, selectedAreas]);

  // Clear all filters
  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setCustomStartTime(DEFAULT_CUSTOM_START_TIME);
    setCustomEndTime(DEFAULT_CUSTOM_END_TIME);
    setSelectedCouriers(new Set());
    setSelectedRestaurants(new Set());
    setSelectedChains(new Set());
    setSelectedBranches(new Set());
    setSelectedAreas(new Set());
    setStatusFilters(createDefaultStatusFilters());
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
    customStartTime,
    setCustomStartTime,
    customEndTime,
    setCustomEndTime,
    // Entity filters
    selectedCouriers,
    setSelectedCouriers,
    toggleCourier,
    selectedRestaurants,
    setSelectedRestaurants,
    toggleRestaurant,
    selectedChains,
    setSelectedChains,
    toggleChain,
    selectedBranches,
    setSelectedBranches,
    toggleBranch,
    selectedAreas,
    setSelectedAreas,
    toggleArea,
    // Options
    courierOptions,
    restaurantOptions,
    chainOptions,
    branchOptions,
    areaOptions,
    // Results
    filteredDeliveries,
    // Stats
    statusCounts,
    dateRangeStats,
    deliveryCountsByDay,
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

