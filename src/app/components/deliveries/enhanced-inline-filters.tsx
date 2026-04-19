import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  ChevronDown,
  X,
  Clock,
  User,
  UtensilsCrossed,
  Building2,
  Search,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { DeliveryStatus } from '../../types/delivery.types';
import { STATUS_CONFIG, ALL_STATUSES } from './status-config';

export interface EnhancedInlineFiltersProps {
  // סטטוס
  statusFilters: Set<DeliveryStatus>;
  onStatusChange: (statuses: Set<DeliveryStatus>) => void;
  statusCounts: Record<string, number>;

  // תאריכים
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  onDateRangeChange: (range: 'all' | 'today' | 'week' | 'month' | 'custom') => void;
  customStartDate: string;
  customEndDate: string;
  onCustomDateChange: (start: string, end: string) => void;
  dateRangeCounts: { all: number; today: number; week: number; month: number; custom: number };

  // שליח
  selectedCourier: string | null;
  onCourierChange: (courierId: string | null) => void;
  courierOptions: Array<{ id: string; label: string; subtitle: string }>;

  // מסעדה
  selectedRestaurant: string | null;
  onRestaurantChange: (restaurantId: string | null) => void;
  restaurantOptions: Array<{ id: string; label: string; subtitle: string }>;

  // סניף
  selectedBranch: string | null;
  onBranchChange: (branch: string | null) => void;
  branchOptions: Array<{ id: string; label: string; subtitle: string }>;
}

export const EnhancedInlineFilters: React.FC<EnhancedInlineFiltersProps> = ({
  statusFilters,
  onStatusChange,
  statusCounts,
  dateRange,
  onDateRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  dateRangeCounts,
  selectedCourier,
  onCourierChange,
  courierOptions,
  selectedRestaurant,
  onRestaurantChange,
  restaurantOptions,
  selectedBranch,
  onBranchChange,
  branchOptions,
}) => {
  // Dropdown states
  const [statusOpen, setStatusOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [courierOpen, setCourierOpen] = useState(false);
  const [restaurantOpen, setRestaurantOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);

  // Search states for dropdowns
  const [courierSearch, setCourierSearch] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');

  // Refs
  const statusRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const courierRef = useRef<HTMLDivElement>(null);
  const restaurantRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateOpen(false);
      }
      if (courierRef.current && !courierRef.current.contains(e.target as Node)) {
        setCourierOpen(false);
        setCourierSearch('');
      }
      if (restaurantRef.current && !restaurantRef.current.contains(e.target as Node)) {
        setRestaurantOpen(false);
        setRestaurantSearch('');
      }
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setBranchOpen(false);
        setBranchSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle status
  const toggleStatus = (status: DeliveryStatus) => {
    const next = new Set(statusFilters);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    onStatusChange(next);
  };

  // Filtered options
  const filteredCouriers = courierOptions.filter(c =>
    c.label.toLowerCase().includes(courierSearch.toLowerCase())
  );
  const filteredRestaurants = restaurantOptions.filter(r =>
    r.label.toLowerCase().includes(restaurantSearch.toLowerCase())
  );
  const filteredBranches = branchOptions.filter(b =>
    b.label.toLowerCase().includes(branchSearch.toLowerCase())
  );

  const dateRangeLabels = {
    all: 'כל התאריכים',
    today: 'היום',
    week: 'שבוע אחרון',
    month: 'חודש אחרון',
    custom: 'טווח מותאם',
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* סטטוס */}
      <div ref={statusRef} className="relative">
        <button
          onClick={() => setStatusOpen(!statusOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            statusFilters.size > 0
              ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/5 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/40 dark:border-[#9fe870]/30'
              : 'bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#9fe870] hover:shadow-md'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>סטטוס</span>
          {statusFilters.size > 0 && (
            <span className="px-1.5 py-0.5 bg-[#0d0d12] text-white rounded-full text-[10px] font-bold">
              {statusFilters.size}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
        </button>

        {statusOpen && (
          <div className="absolute top-full mt-1 right-0 z-50 w-[240px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 space-y-1">
              {ALL_STATUSES.map(({ key, label, icon: Icon, color }) => {
                const count = statusCounts[key] || 0;
                return (
                  <button
                    key={key}
                    onClick={() => toggleStatus(key)}
                    className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                      statusFilters.has(key)
                        ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                        : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${color} shrink-0`} />
                    <span className="flex-1">{label}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-[#f5f5f5] dark:bg-[#262626] rounded-full font-bold">
                      {count}
                    </span>
                    {statusFilters.has(key) && <CheckCircle2 className="w-3.5 h-3.5 text-[#9fe870]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* תאריכים */}
      <div ref={dateRef} className="relative">
        <button
          onClick={() => setDateOpen(!dateOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            dateRange !== 'all'
              ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/5 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/40 dark:border-[#9fe870]/30'
              : 'bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#9fe870] hover:shadow-md'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="max-w-[120px] truncate">{dateRangeLabels[dateRange]}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dateOpen ? 'rotate-180' : ''}`} />
        </button>

        {dateOpen && (
          <div className="absolute top-full mt-1 right-0 z-50 w-[260px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 space-y-1">
              {[
                { key: 'all' as const, label: 'כל התאריכים', count: dateRangeCounts.all },
                { key: 'today' as const, label: 'היום', count: dateRangeCounts.today },
                { key: 'week' as const, label: 'שבוע אחרון', count: dateRangeCounts.week },
                { key: 'month' as const, label: 'חודש אחרון', count: dateRangeCounts.month },
                { key: 'custom' as const, label: 'טווח מותאם...', count: dateRangeCounts.custom },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => {
                    onDateRangeChange(key);
                    if (key !== 'custom') setDateOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                    dateRange === key
                      ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                      : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-[#f5f5f5] dark:bg-[#262626] rounded-full font-bold">
                    {count}
                  </span>
                </button>
              ))}

              {dateRange === 'custom' && (
                <div className="p-3 space-y-2 border-t border-[#e5e5e5] dark:border-[#262626] mt-1">
                  <div>
                    <label className="block text-[10px] font-medium text-[#737373] dark:text-[#a3a3a3] mb-1">מתאריך</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => onCustomDateChange(e.target.value, customEndDate)}
                      className="w-full px-2 py-1.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#9fe870]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[#737373] dark:text-[#a3a3a3] mb-1">עד תאריך</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => onCustomDateChange(customStartDate, e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#9fe870]/30"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* סניף */}
      <div ref={branchRef} className="relative">
        <button
          onClick={() => setBranchOpen(!branchOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            selectedBranch
              ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/5 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/40 dark:border-[#9fe870]/30'
              : 'bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#9fe870] hover:shadow-md'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-[#f97316]" />
          <span className="max-w-[120px] truncate">
            {selectedBranch
              ? branchOptions.find(b => b.id === selectedBranch)?.label || 'סניף'
              : 'כל הסניפים'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${branchOpen ? 'rotate-180' : ''}`} />
        </button>

        {branchOpen && (
          <div className="absolute top-full mt-1 right-0 z-50 w-[300px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-[#e5e5e5] dark:border-[#262626]">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3]" />
                <input
                  type="text"
                  placeholder="חיפוש סניף..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  className="w-full pr-8 pl-2 py-1.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#9fe870]/30"
                />
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
              <button
                onClick={() => {
                  onBranchChange(null);
                  setBranchOpen(false);
                  setBranchSearch('');
                }}
                className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  !selectedBranch
                    ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                    : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                }`}
              >
                כל הסניפים
              </button>

              {filteredBranches.map(branch => (
                <button
                  key={branch.id}
                  onClick={() => {
                    onBranchChange(branch.id);
                    setBranchOpen(false);
                    setBranchSearch('');
                  }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs transition-all ${
                    selectedBranch === branch.id
                      ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 border border-[#9fe870]/50'
                      : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                  }`}
                >
                  <div className="font-medium text-[#0d0d12] dark:text-[#fafafa]">{branch.label}</div>
                  <div className="text-[10px] text-[#737373] dark:text-[#a3a3a3] mt-0.5">{branch.subtitle}</div>
                </button>
              ))}

              {filteredBranches.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-[#a3a3a3]">
                  לא נמצאו סניפים
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* מסעדה */}
      <div ref={restaurantRef} className="relative">
        <button
          onClick={() => setRestaurantOpen(!restaurantOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            selectedRestaurant
              ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/5 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/40 dark:border-[#9fe870]/30'
              : 'bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#9fe870] hover:shadow-md'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5 text-[#ec4899]" />
          <span className="max-w-[120px] truncate">
            {selectedRestaurant
              ? restaurantOptions.find(r => r.id === selectedRestaurant)?.label || 'מסעדה'
              : 'כל המסעדות'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${restaurantOpen ? 'rotate-180' : ''}`} />
        </button>

        {restaurantOpen && (
          <div className="absolute top-full mt-1 right-0 z-50 w-[300px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-[#e5e5e5] dark:border-[#262626]">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3]" />
                <input
                  type="text"
                  placeholder="חיפוש מסעדה..."
                  value={restaurantSearch}
                  onChange={(e) => setRestaurantSearch(e.target.value)}
                  className="w-full pr-8 pl-2 py-1.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#9fe870]/30"
                />
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
              <button
                onClick={() => {
                  onRestaurantChange(null);
                  setRestaurantOpen(false);
                  setRestaurantSearch('');
                }}
                className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  !selectedRestaurant
                    ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                    : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                }`}
              >
                כל המסעדות
              </button>

              {filteredRestaurants.map(restaurant => (
                <button
                  key={restaurant.id}
                  onClick={() => {
                    onRestaurantChange(restaurant.id);
                    setRestaurantOpen(false);
                    setRestaurantSearch('');
                  }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs transition-all ${
                    selectedRestaurant === restaurant.id
                      ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 border border-[#9fe870]/50'
                      : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                  }`}
                >
                  <div className="font-medium text-[#0d0d12] dark:text-[#fafafa]">{restaurant.label}</div>
                  <div className="text-[10px] text-[#737373] dark:text-[#a3a3a3] mt-0.5">{restaurant.subtitle}</div>
                </button>
              ))}

              {filteredRestaurants.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-[#a3a3a3]">
                  לא נמצאו מסעדות
                </div>
              )}</div>
          </div>
        )}
      </div>

      {/* שליח */}
      <div ref={courierRef} className="relative">
        <button
          onClick={() => setCourierOpen(!courierOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            selectedCourier
              ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/5 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/40 dark:border-[#9fe870]/30'
              : 'bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#9fe870] hover:shadow-md'
          }`}
        >
          <User className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span className="max-w-[120px] truncate">
            {selectedCourier
              ? courierOptions.find(c => c.id === selectedCourier)?.label || 'שליח'
              : 'כל השליחים'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${courierOpen ? 'rotate-180' : ''}`} />
        </button>

        {courierOpen && (
          <div className="absolute top-full mt-1 right-0 z-50 w-[300px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-[#e5e5e5] dark:border-[#262626]">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3]" />
                <input
                  type="text"
                  placeholder="חיפוש שליח..."
                  value={courierSearch}
                  onChange={(e) => setCourierSearch(e.target.value)}
                  className="w-full pr-8 pl-2 py-1.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#9fe870]/30"
                />
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
              <button
                onClick={() => {
                  onCourierChange(null);
                  setCourierOpen(false);
                  setCourierSearch('');
                }}
                className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  !selectedCourier
                    ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                    : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                }`}
              >
                כל השליחים
              </button>

              {filteredCouriers.map(courier => (
                <button
                  key={courier.id}
                  onClick={() => {
                    onCourierChange(courier.id);
                    setCourierOpen(false);
                    setCourierSearch('');
                  }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs transition-all ${
                    selectedCourier === courier.id
                      ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 border border-[#9fe870]/50'
                      : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                  }`}
                >
                  <div className="font-medium text-[#0d0d12] dark:text-[#fafafa]">{courier.label}</div>
                  <div className="text-[10px] text-[#737373] dark:text-[#a3a3a3] mt-0.5">{courier.subtitle}</div>
                </button>
              ))}

              {filteredCouriers.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-[#a3a3a3]">
                  לא נמצאו שליחים
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
