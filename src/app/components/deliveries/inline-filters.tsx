import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  ChevronDown,
  X,
  Clock,
  User,
  UtensilsCrossed,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { DeliveryStatus } from '../../types/delivery.types';
import { STATUS_CONFIG, ALL_STATUSES } from './status-config';

export interface InlineFiltersProps {
  // סטטוס
  statusFilters: Set<DeliveryStatus>;
  onStatusChange: (statuses: Set<DeliveryStatus>) => void;
  
  // תאריכים
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  onDateRangeChange: (range: 'all' | 'today' | 'week' | 'month' | 'custom') => void;
  customStartDate: string;
  customEndDate: string;
  onCustomDateChange: (start: string, end: string) => void;
  
  // שליח
  selectedCourier: string | null;
  onCourierChange: (courierId: string | null) => void;
  courierOptions: Array<{ id: string; label: string; subtitle: string }>;
  
  // מסעדה
  selectedRestaurant: string | null;
  onRestaurantChange: (restaurantId: string | null) => void;
  restaurantOptions: Array<{ id: string; label: string; subtitle: string }>;
}

export const InlineFilters: React.FC<InlineFiltersProps> = ({
  statusFilters,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  selectedCourier,
  onCourierChange,
  courierOptions,
  selectedRestaurant,
  onRestaurantChange,
  restaurantOptions,
}) => {
  // Dropdown states
  const [statusOpen, setStatusOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [courierOpen, setCourierOpen] = useState(false);
  const [restaurantOpen, setRestaurantOpen] = useState(false);

  // Search states for dropdowns
  const [courierSearch, setCourierSearch] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');

  // Refs
  const statusRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const courierRef = useRef<HTMLDivElement>(null);
  const restaurantRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* סטטוס */}
      <div ref={statusRef} className="relative">
        <button
          onClick={() => setStatusOpen(!statusOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            statusFilters.size > 0
              ? 'bg-[#eff6ff] dark:bg-[#172554] text-[#2563eb] dark:text-[#93c5fd] border-2 border-[#3b82f6] dark:border-[#2563eb]'
              : 'bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#d4d4d4] dark:hover:border-[#404040]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>סטטוס</span>
          {statusFilters.size > 0 && (
            <span className="px-1.5 py-0.5 bg-[#2563eb] text-white rounded-full text-[10px] font-bold">
              {statusFilters.size}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
        </button>

        {statusOpen && (
          <div className="absolute top-full mt-1 right-0 z-50 w-[220px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 space-y-1">
              {ALL_STATUSES.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => toggleStatus(key)}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                    statusFilters.has(key)
                      ? 'bg-[#eff6ff] dark:bg-[#172554] text-[#2563eb] dark:text-[#93c5fd]'
                      : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                  <span className="flex-1">{label}</span>
                  {statusFilters.has(key) && <CheckCircle2 className="w-3.5 h-3.5 text-[#2563eb] dark:text-[#93c5fd]" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* תאריכים */}
      <div ref={dateRef} className="relative">
        <button
          onClick={() => setDateOpen(!dateOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            dateRange !== 'all'
              ? 'bg-[#eff6ff] dark:bg-[#172554] text-[#2563eb] dark:text-[#93c5fd] border-2 border-[#3b82f6] dark:border-[#2563eb]'
              : 'bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#d4d4d4] dark:hover:border-[#404040]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {dateRange === 'all' ? 'כל התאריכים' :
             dateRange === 'today' ? 'היום' :
             dateRange === 'week' ? 'שבוע אחרון' :
             dateRange === 'month' ? 'חודש אחרון' : 'טווח מותאם'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dateOpen ? 'rotate-180' : ''}`} />
        </button>

        {dateOpen && (
          <div className="absolute top-full mt-1 right-0 z-50 w-[220px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 space-y-1">
              {[
                { key: 'all', label: 'כל התאריכים' },
                { key: 'today', label: 'היום' },
                { key: 'week', label: 'שבוע אחרון' },
                { key: 'month', label: 'חודש אחרון' },
                { key: 'custom', label: 'טווח מותאם...' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    onDateRangeChange(key as any);
                    if (key !== 'custom') setDateOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    dateRange === key
                      ? 'bg-[#eff6ff] dark:bg-[#172554] text-[#2563eb] dark:text-[#93c5fd]'
                      : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                  }`}
                >
                  {label}
                </button>
              ))}

              {dateRange === 'custom' && (
                <div className="p-2 space-y-2 border-t border-[#e5e5e5] dark:border-[#262626]">
                  <div>
                    <label className="block text-[10px] text-[#737373] dark:text-[#a3a3a3] mb-1">מתאריך</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => onCustomDateChange(e.target.value, customEndDate)}
                      className="w-full px-2 py-1.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#737373] dark:text-[#a3a3a3] mb-1">עד תאריך</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => onCustomDateChange(customStartDate, e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* שליח */}
      <div ref={courierRef} className="relative">
        <button
          onClick={() => setCourierOpen(!courierOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            selectedCourier
              ? 'bg-[#eff6ff] dark:bg-[#172554] text-[#2563eb] dark:text-[#93c5fd] border-2 border-[#3b82f6] dark:border-[#2563eb]'
              : 'bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#d4d4d4] dark:hover:border-[#404040]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span className="max-w-[100px] truncate">
            {selectedCourier
              ? courierOptions.find(c => c.id === selectedCourier)?.label || 'שליח'
              : 'כל השליחים'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${courierOpen ? 'rotate-180' : ''}`} />
        </button>

        {courierOpen && (
          <div className="absolute top-full mt-1 right-0 z-50 w-[280px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
            {/* חיפוש */}
            <div className="p-2 border-b border-[#e5e5e5] dark:border-[#262626]">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3]" />
                <input
                  type="text"
                  placeholder="חיפוש שליח..."
                  value={courierSearch}
                  onChange={(e) => setCourierSearch(e.target.value)}
                  className="w-full pr-8 pl-2 py-1.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#a3a3a3]"
                />
              </div>
            </div>

            {/* רשימה */}
            <div className="max-h-[280px] overflow-y-auto p-2 space-y-1">
              {/* אפשרות "הכל" */}
              <button
                onClick={() => {
                  onCourierChange(null);
                  setCourierOpen(false);
                  setCourierSearch('');
                }}
                className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  !selectedCourier
                    ? 'bg-[#eff6ff] dark:bg-[#172554] text-[#2563eb] dark:text-[#93c5fd]'
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
                      ? 'bg-[#eff6ff] dark:bg-[#172554]'
                      : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                  }`}
                >
                  <div className="font-medium text-[#0d0d12] dark:text-[#fafafa]">{courier.label}</div>
                  <div className="text-[10px] text-[#737373] dark:text-[#a3a3a3] mt-0.5">{courier.subtitle}</div>
                </button>
              ))}

              {filteredCouriers.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-[#a3a3a3]">
                  לא נמצאו שליחים
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            selectedRestaurant
              ? 'bg-[#eff6ff] dark:bg-[#172554] text-[#2563eb] dark:text-[#93c5fd] border-2 border-[#3b82f6] dark:border-[#2563eb]'
              : 'bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#d4d4d4] dark:hover:border-[#404040]'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span className="max-w-[100px] truncate">
            {selectedRestaurant
              ? restaurantOptions.find(r => r.id === selectedRestaurant)?.label || 'מסעדה'
              : 'כל המסעדות'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${restaurantOpen ? 'rotate-180' : ''}`} />
        </button>

        {restaurantOpen && (
          <div className="absolute top-full mt-1 right-0 z-50 w-[280px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
            {/* חיפוש */}
            <div className="p-2 border-b border-[#e5e5e5] dark:border-[#262626]">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3]" />
                <input
                  type="text"
                  placeholder="חיפוש מסעדה..."
                  value={restaurantSearch}
                  onChange={(e) => setRestaurantSearch(e.target.value)}
                  className="w-full pr-8 pl-2 py-1.5 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#a3a3a3]"
                />
              </div>
            </div>

            {/* רשימה */}
            <div className="max-h-[280px] overflow-y-auto p-2 space-y-1">
              {/* אפשרות "הכל" */}
              <button
                onClick={() => {
                  onRestaurantChange(null);
                  setRestaurantOpen(false);
                  setRestaurantSearch('');
                }}
                className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  !selectedRestaurant
                    ? 'bg-[#eff6ff] dark:bg-[#172554] text-[#2563eb] dark:text-[#93c5fd]'
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
                      ? 'bg-[#eff6ff] dark:bg-[#172554]'
                      : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                  }`}
                >
                  <div className="font-medium text-[#0d0d12] dark:text-[#fafafa]">{restaurant.label}</div>
                  <div className="text-[10px] text-[#737373] dark:text-[#a3a3a3] mt-0.5">{restaurant.subtitle}</div>
                </button>
              ))}

              {filteredRestaurants.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-[#a3a3a3]">
                  לא נמצאו מסעדות
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};