import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Bike,
  Store,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  Package,
  XCircle,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DEFAULT_VISIBLE_COLUMNS } from './status-config';

export type ExportType = 'excel-selected' | 'excel-full' | 'pdf-summary' | 'pdf-detailed' | 'csv' | 'excel-by-courier' | 'excel-by-restaurant' | 'pdf-by-courier' | 'pdf-by-restaurant';

interface FilteredStats {
  total: number;
  pending: number;
  assigned: number;
  delivered: number;
  cancelled: number;
}

interface AdvancedFilterPanelProps {
  isFiltersOpen: boolean;
  statusFilter: string;
  setStatusFilter: (value: any) => void;
  dateRange: string;
  setDateRange: (value: any) => void;
  customStartDate: string;
  setCustomStartDate: (value: string) => void;
  customEndDate: string;
  setCustomEndDate: (value: string) => void;
  selectedCourier: string | null;
  setSelectedCourier: (value: string | null) => void;
  selectedRestaurant: string | null;
  setSelectedRestaurant: (value: string | null) => void;
  visibleColumns: Set<string>;
  setVisibleColumns: (value: Set<string>) => void;
  courierOptions: Array<{ id: string; label: string; subtitle: string }>;
  restaurantOptions: Array<{ id: string; label: string; subtitle: string }>;
  filteredStats: FilteredStats;
  setSearchQuery: (value: string) => void;
}

// Mini dropdown for courier/restaurant selection
const ChipDropdown: React.FC<{
  options: Array<{ id: string; label: string; subtitle: string }>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placeholder: string;
  icon: React.ReactNode;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
}> = ({ options, selectedId, onSelect, placeholder, icon, activeColor, activeBg, activeBorder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = selectedId ? options.find(o => o.id === selectedId)?.label : null;
  const filtered = options.filter(o => o.label.includes(search) || o.subtitle.includes(search));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
          selectedId
            ? `${activeBg} ${activeColor} ${activeBorder} border`
            : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#737373] dark:text-[#a3a3a3] hover:bg-[#e5e5e5] dark:hover:bg-[#404040]'
        }`}
      >
        {icon}
        <span className="max-w-[100px] truncate">{selectedLabel || placeholder}</span>
        {selectedId ? (
          <X
            className="w-3 h-3 hover:opacity-70 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelect(null); setIsOpen(false); }}
          />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 z-50 w-[240px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-[#e5e5e5] dark:border-[#262626]">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש..."
                className="w-full pr-7 pl-2 py-1.5 bg-[#f5f5f5] dark:bg-[#0a0a0a] rounded text-xs text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#a3a3a3] focus:outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <button
              onClick={() => { onSelect(null); setIsOpen(false); setSearch(''); }}
              className={`w-full text-right px-3 py-2 text-xs hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors ${
                !selectedId ? 'bg-[#f5f5f5] dark:bg-[#262626] font-medium' : ''
              }`}
            >
              <span className="text-[#737373] dark:text-[#a3a3a3]">{placeholder}</span>
            </button>
            {filtered.map(option => (
              <button
                key={option.id}
                onClick={() => { onSelect(option.id); setIsOpen(false); setSearch(''); }}
                className={`w-full text-right px-3 py-2 text-xs hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors ${
                  selectedId === option.id ? 'bg-[#f5f5f5] dark:bg-[#262626]' : ''
                }`}
              >
                <div className="font-medium text-[#0d0d12] dark:text-[#fafafa]">{option.label}</div>
                <div className="text-[10px] text-[#a3a3a3]">{option.subtitle}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Status dropdown similar to ChipDropdown
const StatusChipDropdown: React.FC<{
  statusFilter: string;
  setStatusFilter: (value: any) => void;
  filteredStats: { total: number; pending: number; assigned: number; delivered: number; cancelled: number };
}> = ({ statusFilter, setStatusFilter, filteredStats }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusOptions: { key: string; label: string; icon: any; color: string; dotColor: string; count: number }[] = [
    { key: 'pending', label: 'ממתין', icon: AlertCircle, color: 'text-orange-500', dotColor: 'bg-orange-500', count: filteredStats.pending },
    { key: 'assigned', label: 'שובץ', icon: Bike, color: 'text-yellow-500', dotColor: 'bg-yellow-500', count: filteredStats.assigned },
    { key: 'delivered', label: 'נמסר', icon: CheckCircle2, color: 'text-green-600', dotColor: 'bg-green-600', count: filteredStats.delivered },
    { key: 'cancelled', label: 'בוטל', icon: XCircle, color: 'text-red-500', dotColor: 'bg-red-500', count: filteredStats.cancelled },
  ];

  const selectedOption = statusOptions.find(o => o.key === statusFilter);
  const isFiltered = statusFilter !== 'all';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
          isFiltered
            ? 'bg-[#dcfce7] dark:bg-[#14532d] text-[#166534] dark:text-[#86efac] border border-[#86efac] dark:border-[#166534]'
            : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#737373] dark:text-[#a3a3a3] hover:bg-[#e5e5e5] dark:hover:bg-[#404040]'
        }`}
      >
        {selectedOption ? (
          <selectedOption.icon className={`w-3 h-3 ${selectedOption.color}`} />
        ) : (
          <AlertCircle className="w-3 h-3" />
        )}
        <span className="max-w-[100px] truncate text-[14px]">{selectedOption?.label || 'כל הסטטוסים'}</span>
        {isFiltered ? (
          <X
            className="w-3 h-3 hover:opacity-70 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setStatusFilter('all'); setIsOpen(false); }}
          />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 z-50 w-[220px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg shadow-xl overflow-hidden">
          <button
            onClick={() => { setStatusFilter('all'); setIsOpen(false); }}
            className={`w-full text-right px-3 py-2 text-xs hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors flex items-center gap-2 ${
              !isFiltered ? 'bg-[#f5f5f5] dark:bg-[#262626]' : ''
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#a3a3a3] shrink-0" />
            <span className="flex-1 text-[#737373] dark:text-[#a3a3a3] font-medium">כל הסטטוסים</span>
            <span className="text-[10px] text-[#a3a3a3] font-bold">{filteredStats.total}</span>
          </button>
          <div className="h-px bg-[#e5e5e5] dark:bg-[#262626]" />
          {statusOptions.map(({ key, label, icon: Icon, color, dotColor, count }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); setIsOpen(false); }}
              className={`w-full text-right px-3 py-2 text-xs hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors flex items-center gap-2 ${
                statusFilter === key ? 'bg-[#f5f5f5] dark:bg-[#262626]' : ''
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
              <span className="flex-1 font-medium text-[#0d0d12] dark:text-[#fafafa]">{label}</span>
              <span className={`text-[10px] font-bold ${color}`}>{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  isFiltersOpen,
  statusFilter,
  setStatusFilter,
  dateRange,
  setDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  selectedCourier,
  setSelectedCourier,
  selectedRestaurant,
  setSelectedRestaurant,
  visibleColumns,
  setVisibleColumns,
  courierOptions,
  restaurantOptions,
  filteredStats,
  setSearchQuery,
}) => {
  const handleResetAll = () => {
    setStatusFilter('all');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedCourier(null);
    setSelectedRestaurant(null);
    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS));
    setSearchQuery('');
    toast.success('כל הסינונים אופסו לברירת מחדל');
  };

  const activeFiltersCount = [
    statusFilter !== 'all',
    selectedCourier,
    selectedRestaurant
  ].filter(Boolean).length;

  return (
    <>
      {isFiltersOpen && (
        <div className="space-y-2 mb-2 p-3 bg-[#fafafa] dark:bg-[#0a0a0a]/50 border border-[#e5e5e5] dark:border-[#262626] rounded-xl animate-in slide-in-from-top-2 duration-200">
          {/* ═══ שורה 1: סינון ═══ */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Status chips */}
            <StatusChipDropdown
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              filteredStats={filteredStats}
            />

            <div className="h-5 w-px bg-[#e5e5e5] dark:bg-[#262626] mx-0.5" />

            {/* Entity dropdowns */}
            <ChipDropdown
              options={restaurantOptions}
              selectedId={selectedRestaurant}
              onSelect={setSelectedRestaurant}
              placeholder="כל המסעדות"
              icon={<Store className="w-3 h-3" />}
              activeColor="text-[#991b1b] dark:text-[#fca5a5]"
              activeBg="bg-[#fee2e2] dark:bg-[#450a0a]"
              activeBorder="border-[#fca5a5] dark:border-[#7f1d1d]"
            />
            <ChipDropdown
              options={courierOptions}
              selectedId={selectedCourier}
              onSelect={setSelectedCourier}
              placeholder="כל השליחים"
              icon={<Bike className="w-3 h-3" />}
              activeColor="text-[#92400e] dark:text-[#fcd34d]"
              activeBg="bg-[#fef3c7] dark:bg-[#422006]"
              activeBorder="border-[#fcd34d] dark:border-[#78350f]"
            />

            {/* Reset */}
            {activeFiltersCount > 0 && (
              <>
                <div className="h-5 w-px bg-[#e5e5e5] dark:bg-[#262626] mx-0.5" />
                <button
                  onClick={handleResetAll}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-[#dc2626] dark:text-[#fca5a5] bg-[#fee2e2]/50 dark:bg-[#450a0a]/50 hover:bg-[#fee2e2] dark:hover:bg-[#450a0a] transition-all"
                >
                  <X className="w-3 h-3" />
                  איפוס ({activeFiltersCount})
                </button>
              </>
            )}
          </div>

          {/* Custom date inputs — shown when custom tab is active */}
          {dateRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 pr-1">
              <span className="text-xs text-[#737373] dark:text-[#a3a3a3]">מ:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-full text-xs focus:outline-none focus:border-[#16a34a]"
              />
              <span className="text-xs text-[#737373] dark:text-[#a3a3a3]">עד:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                disabled={!customStartDate}
                className="px-2 py-1 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-full text-xs focus:outline-none focus:border-[#16a34a] disabled:opacity-50"
              />
              {customStartDate && (
                <span className="text-[10px] text-[#16a34a] dark:text-[#22c55e] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {customEndDate
                    ? `${format(new Date(customStartDate), 'dd/MM/yyyy')} - ${format(new Date(customEndDate), 'dd/MM/yyyy')}`
                    : `מ-${format(new Date(customStartDate), 'dd/MM/yyyy')} עד היום`
                  }
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};