import React, { useState, useRef, useEffect } from 'react';
import { X, SlidersHorizontal, Columns, ChevronDown, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import { he } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
import { DeliveryStatus } from '../../types/delivery.types';
import { STATUS_CONFIG, ALL_STATUSES } from './status-config';
import { ColumnSelector } from './column-selector';

interface Option { id: string; label: string; }

const DATE_OPTS = [
  { id: 'all' as const,   label: 'הכל' },
  { id: 'today' as const, label: 'היום' },
  { id: 'week' as const,  label: 'שבוע' },
  { id: 'month' as const, label: 'חודש' },
];

export interface TableControlPanelProps {
  isOpen: boolean;
  activeTab: 'filter' | 'columns';
  onTabChange: (tab: 'filter' | 'columns') => void;
  // Search
  searchQuery: string;
  onSearchChange: (q: string) => void;
  // Status
  statusFilters: Set<DeliveryStatus>;
  onStatusToggle: (status: DeliveryStatus) => void;
  onStatusClearAll: () => void;
  statusCounts: Record<string, number>;
  // Date
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  onDateRangeChange: (d: 'all' | 'today' | 'week' | 'month' | 'custom') => void;
  customStartDate: string;
  customEndDate: string;
  onCustomDateChange: (start: string, end: string) => void;
  // Dropdowns
  selectedCourier: string | null;
  onCourierChange: (id: string | null) => void;
  courierOptions: Option[];
  selectedRestaurant: string | null;
  onRestaurantChange: (id: string | null) => void;
  restaurantOptions: Option[];
  selectedBranch: string | null;
  onBranchChange: (id: string | null) => void;
  branchOptions: Option[];
  // Columns
  visibleColumns: Set<string>;
  setVisibleColumns: (cols: Set<string>) => void;
  // Misc
  hasActiveFilters: boolean;
  onClearAll: () => void;
  onToggle: () => void;
}

const SectionLabel: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-[11px] font-semibold text-[#737373] dark:text-[#a3a3a3]">{children}</span>
    {action}
  </div>
);

const SearchableSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  isActive?: boolean;
}> = ({ value, onChange, options, placeholder, isActive }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.id === value);
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setQuery(''); }}
        className={`w-full flex items-center justify-between pr-3 pl-2.5 py-2.5 rounded-xl text-xs transition-all text-right ${
          isActive
            ? 'bg-[#fef3c7] dark:bg-[#1c1500] text-[#d97706] dark:text-[#fbbf24] border border-[#fcd34d]/40 dark:border-[#d97706]/30'
            : 'bg-[#f5f5f5] dark:bg-[#141414] text-[#0d0d12] dark:text-[#fafafa] border border-transparent hover:border-[#9fe870]/40'
        }`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-[#a3a3a3] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 right-0 left-0 mt-1 bg-white dark:bg-[#141414] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-[#f0f0f0] dark:border-[#1f1f1f]">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3] pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="חיפוש..."
                className="w-full pr-8 pl-2 py-1.5 bg-[#f5f5f5] dark:bg-[#1f1f1f] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa] placeholder-[#a3a3a3] outline-none"
                style={{ direction: 'rtl' }}
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-44 overflow-y-auto overscroll-contain">
            <button
              onClick={() => { onChange(''); setOpen(false); }}
              className={`w-full text-right px-3 py-2 text-xs transition-colors ${
                !value ? 'text-[#9fe870] font-medium' : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f1f] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }`}
            >
              {placeholder}
            </button>
            {filtered.map(o => (
              <button
                key={o.id}
                onClick={() => { onChange(o.id); setOpen(false); }}
                className={`w-full text-right px-3 py-2 text-xs transition-colors ${
                  value === o.id ? 'text-[#9fe870] font-medium bg-[#f0fdf4] dark:bg-[#052e16]' : 'text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f1f]'
                }`}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-[#a3a3a3] py-3">לא נמצאו תוצאות</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const TableControlPanel: React.FC<TableControlPanelProps> = ({
  isOpen, activeTab, onTabChange,
  searchQuery, onSearchChange,
  statusFilters, onStatusToggle, onStatusClearAll, statusCounts,
  dateRange, onDateRangeChange, customStartDate, customEndDate, onCustomDateChange,
  selectedCourier, onCourierChange, courierOptions,
  selectedRestaurant, onRestaurantChange, restaurantOptions,
  selectedBranch, onBranchChange, branchOptions,
  visibleColumns, setVisibleColumns,
  hasActiveFilters, onClearAll, onToggle,
}) => {
  const activeFilterCount = [
    !!searchQuery,
    statusFilters.size > 0,
    dateRange !== 'all',
    !!selectedCourier,
    !!selectedRestaurant,
    !!selectedBranch,
  ].filter(Boolean).length;

  const handleRailIconClick = (tab: 'filter' | 'columns') => {
    if (!isOpen) {
      onTabChange(tab);
      onToggle();
    } else if (activeTab === tab) {
      onToggle();
    } else {
      onTabChange(tab);
    }
  };

  return (
    <div
      dir="rtl"
      className={`flex flex-row shrink-0 h-full border-l border-[#e5e5e5] dark:border-[#1f1f1f] transition-[width] duration-300 ease-out overflow-hidden ${
        isOpen ? 'w-[260px]' : 'w-10'
      }`}
    >
      {/* Rail — visible only when closed */}
      {!isOpen && (
        <div
          onClick={() => handleRailIconClick('filter')}
          className="w-10 shrink-0 flex flex-col items-center pt-3 gap-2 bg-white dark:bg-[#0f0f0f] cursor-pointer"
        >
          <button
            onClick={e => { e.stopPropagation(); handleRailIconClick('filter'); }}
            title={activeFilterCount > 0 ? `${activeFilterCount} פילטרים פעילים` : 'פתח סינון'}
            className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${
              activeFilterCount > 0
                ? 'bg-[#fef3c7] dark:bg-[#1c1500] text-[#d97706] dark:text-[#fbbf24] hover:bg-[#fde68a] dark:hover:bg-[#241a00]'
                : 'text-[#a3a3a3] hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-black rounded-full flex items-center justify-center leading-none bg-[#d97706] dark:bg-[#fbbf24] text-white dark:text-[#0d0d12]">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={e => { e.stopPropagation(); handleRailIconClick('columns'); }}
            title={`${visibleColumns.size} עמודות פעילות`}
            className="relative flex flex-col items-center justify-center w-8 h-8 rounded-xl transition-colors text-[#a3a3a3] hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f] hover:text-[#0d0d12] dark:hover:text-[#fafafa] gap-0.5"
          >
            <Columns className="w-4 h-4" />
            <span className="text-[9px] font-bold leading-none tabular-nums">{visibleColumns.size}</span>
          </button>
        </div>
      )}

      {/* Full panel content */}
      <div className="flex-1 min-w-[260px] flex flex-col h-full bg-white dark:bg-[#0f0f0f]" style={{ direction: 'rtl' }}>

        {/* Tab bar */}
        <div className="shrink-0 flex items-stretch border-b border-[#e5e5e5] dark:border-[#1f1f1f]">
          {([
            { id: 'filter' as const,  icon: <SlidersHorizontal className="w-4 h-4" />, label: 'סינון',  badge: activeFilterCount > 0 ? activeFilterCount : null },
            { id: 'columns' as const, icon: <Columns className="w-4 h-4" />,           label: 'עמודות', badge: visibleColumns.size },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-2 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#9fe870] text-[#0d0d12] dark:text-[#fafafa]'
                  : 'border-transparent text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge != null && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  tab.id === 'filter' && activeFilterCount > 0
                    ? 'bg-[#fef3c7] dark:bg-[#1c1500] text-[#d97706] dark:text-[#fbbf24]'
                    : 'bg-[#f0f0f0] dark:bg-[#1f1f1f] text-[#737373] dark:text-[#a3a3a3]'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
          {/* Close button — left side of tab bar */}
          <button
            onClick={onToggle}
            title="סגור פאנל"
            className="self-center shrink-0 ms-auto flex items-center justify-center w-7 h-7 mx-2 rounded-lg transition-colors text-[#a3a3a3] hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f] hover:text-[#0d0d12] dark:hover:text-[#fafafa]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Filter tab ── */}
        {activeTab === 'filter' && (
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-4 space-y-5">

              {/* Status */}
              <div>
                <SectionLabel action={
                  statusFilters.size > 0 && (
                    <button onClick={onStatusClearAll} className="text-[11px] text-[#a3a3a3] hover:text-[#737373] transition-colors">נקה</button>
                  )
                }>
                  סטטוס
                </SectionLabel>
                <div className="space-y-1">
                  {ALL_STATUSES.map(({ key, label }) => {
                    const cfg = STATUS_CONFIG[key];
                    const count = statusCounts[key] || 0;
                    const isActive = statusFilters.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => onStatusToggle(key)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
                          isActive
                            ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/8 text-[#0d0d12] dark:text-[#fafafa]'
                            : 'hover:bg-[#f5f5f5] dark:hover:bg-[#141414] text-[#525252] dark:text-[#a3a3a3]'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isActive ? 'bg-[#9fe870] border-[#9fe870]' : 'border-[#d4d4d4] dark:border-[#333]'
                        }`}>
                          {isActive && <span className="text-[#1a1a1a] text-[9px] font-black leading-none">✓</span>}
                        </div>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dotColor}`} />
                        <span className="flex-1 text-right font-medium">{label}</span>
                        <span className={`text-[11px] tabular-nums font-medium ${isActive ? 'text-[#4a8a20] dark:text-[#9fe870]' : 'text-[#a3a3a3]'}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#f0f0f0] dark:bg-[#1f1f1f]" />

              {/* Date range */}
              <div>
                <SectionLabel>תקופה</SectionLabel>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {DATE_OPTS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => onDateRangeChange(opt.id)}
                      className={`py-2 rounded-xl text-xs font-medium transition-all ${
                        dateRange === opt.id
                          ? 'bg-[#0d0d12] dark:bg-[#fafafa] text-white dark:text-[#0d0d12]'
                          : 'bg-[#f5f5f5] dark:bg-[#141414] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#e8e8e8] dark:hover:bg-[#1f1f1f]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {dateRange === 'custom' ? (
                  <div className="mt-1">
                    {(customStartDate || customEndDate) && (
                      <div className="text-[11px] text-[#737373] mb-2 text-center">
                        {customStartDate ? format(parseISO(customStartDate), 'd MMM', { locale: he }) : '—'}
                        {' → '}
                        {customEndDate ? format(parseISO(customEndDate), 'd MMM yyyy', { locale: he }) : '...'}
                      </div>
                    )}
                    <DayPicker
                      mode="range"
                      locale={he}
                      dir="rtl"
                      selected={{
                        from: customStartDate ? parseISO(customStartDate) : undefined,
                        to: customEndDate ? parseISO(customEndDate) : undefined,
                      }}
                      onSelect={(range: DateRange | undefined) => {
                        const start = range?.from ? format(range.from, 'yyyy-MM-dd') : '';
                        const end = range?.to ? format(range.to, 'yyyy-MM-dd') : '';
                        onCustomDateChange(start, end);
                      }}
                      classNames={{
                        months: 'flex flex-col',
                        month: 'flex flex-col gap-2',
                        caption: 'flex justify-center items-center relative mb-1',
                        caption_label: 'text-xs font-semibold text-[#0d0d12] dark:text-[#fafafa]',
                        nav: 'flex items-center gap-1',
                        nav_button: 'flex items-center justify-center w-6 h-6 rounded-lg hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f] transition-colors text-[#737373]',
                        nav_button_previous: 'absolute left-0',
                        nav_button_next: 'absolute right-0',
                        table: 'w-full border-collapse',
                        head_row: 'flex',
                        head_cell: 'flex-1 text-center text-[10px] text-[#a3a3a3] font-medium py-1',
                        row: 'flex w-full',
                        cell: 'flex-1 text-center p-0',
                        day: 'w-full aspect-square flex items-center justify-center text-[11px] rounded-lg transition-colors hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f] text-[#0d0d12] dark:text-[#fafafa] cursor-pointer',
                        day_selected: 'bg-[#9fe870] text-[#0d0d12] hover:bg-[#9fe870] font-bold',
                        day_range_start: 'bg-[#9fe870] text-[#0d0d12] font-bold rounded-lg',
                        day_range_end: 'bg-[#9fe870] text-[#0d0d12] font-bold rounded-lg',
                        day_range_middle: 'bg-[#9fe870]/15 dark:bg-[#9fe870]/10 rounded-none text-[#0d0d12] dark:text-[#fafafa]',
                        day_today: 'font-bold text-[#9fe870]',
                        day_outside: 'text-[#d4d4d4] dark:text-[#404040]',
                        day_disabled: 'text-[#d4d4d4] dark:text-[#404040] cursor-not-allowed',
                      }}
                      components={{
                        IconLeft: () => <ChevronRight className="w-3.5 h-3.5" />,
                        IconRight: () => <ChevronLeft className="w-3.5 h-3.5" />,
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => onDateRangeChange('custom')}
                    className="text-xs text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#737373] transition-colors"
                  >
                    + טווח מותאם אישית
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-[#f0f0f0] dark:bg-[#1f1f1f]" />

              {/* Courier */}
              <div>
                <SectionLabel>שליח</SectionLabel>
                <SearchableSelect
                  value={selectedCourier || ''}
                  onChange={v => onCourierChange(v || null)}
                  options={courierOptions}
                  placeholder="כל השליחים"
                  isActive={!!selectedCourier}
                />
              </div>

              {/* Restaurant */}
              <div>
                <SectionLabel>מסעדה</SectionLabel>
                <SearchableSelect
                  value={selectedRestaurant || ''}
                  onChange={v => onRestaurantChange(v || null)}
                  options={restaurantOptions}
                  placeholder="כל המסעדות"
                  isActive={!!selectedRestaurant}
                />
              </div>

              {/* Branch */}
              {branchOptions.length > 0 && (
                <div>
                  <SectionLabel>סניף</SectionLabel>
                  <SearchableSelect
                    value={selectedBranch || ''}
                    onChange={v => onBranchChange(v || null)}
                    options={branchOptions}
                    placeholder="כל הסניפים"
                    isActive={!!selectedBranch}
                  />
                </div>
              )}

              {/* Clear all */}
              {hasActiveFilters && (
                <>
                  <div className="h-px bg-[#f0f0f0] dark:bg-[#1f1f1f]" />
                  <button
                    onClick={onClearAll}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-[#ef4444] hover:bg-[#fef2f2] dark:hover:bg-[#1f0a0a] border border-[#fecaca] dark:border-[#7f1d1d]/40 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    נקה את כל הפילטרים
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Columns tab ── */}
        {activeTab === 'columns' && (
          <ColumnSelector
            isEmbedded
            isOpen={true}
            setIsOpen={() => {}}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
          />
        )}

      </div>
    </div>
  );
};
