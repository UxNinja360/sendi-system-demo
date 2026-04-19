import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  X,
  Calendar,
  Bike,
  Store,
  Building2,
  Package,
  RotateCcw,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { DeliveryStatus } from '../../types/delivery.types';
import { ALL_STATUSES, STATUS_CONFIG } from './status-config';

export interface FilterState {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  customStartDate: string;
  customEndDate: string;
  selectedCourier: string | null;
  selectedRestaurant: string | null;
  selectedBranch: string | null;
  statusFilters: Set<DeliveryStatus>;
}

export interface DropdownOption {
  id: string;
  label: string;
  subtitle?: string;
}

interface FiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filterState: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  courierOptions: DropdownOption[];
  restaurantOptions: DropdownOption[];
  branchOptions: DropdownOption[];
  statusCounts?: Record<string, number>;
  onApply: () => void;
  onClearAll: () => void;
}

export const FiltersDrawer: React.FC<FiltersDrawerProps> = ({
  isOpen,
  onClose,
  filterState,
  onFilterChange,
  courierOptions,
  restaurantOptions,
  branchOptions,
  statusCounts = {},
  onApply,
  onClearAll,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Trigger animation on mount
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  // Close handlers
  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleClose]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    if (isOpen && !isAnimating) {
      setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen, isAnimating, handleClose]);

  // Toggle status
  const toggleStatus = (status: DeliveryStatus) => {
    const next = new Set(filterState.statusFilters);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    onFilterChange({ statusFilters: next });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - removed to allow background scrolling */}
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-[64px] left-0 h-[calc(100vh-64px)] w-full sm:w-[420px] bg-white dark:bg-[#0a0a0a] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ direction: 'rtl' }}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#141414] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#0d0d12] dark:text-[#fafafa]" />
              <h3 className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                פילטרים
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-[#737373] dark:text-[#a3a3a3]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* תאריכים */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[#2563eb]" />
              <h4 className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">תאריכים</h4>
            </div>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'כל התאריכים' },
                { value: 'today', label: 'היום' },
                { value: 'week', label: 'שבוע אחרון' },
                { value: 'month', label: 'חודש אחרון' },
                { value: 'custom', label: 'טווח מותאם אישית' },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  onClick={() => onFilterChange({ dateRange: value as any })}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all ${
                    filterState.dateRange === value
                      ? 'bg-[#f5f5f5] dark:bg-[#262626] border-2 border-[#16a34a] dark:border-[#22c55e]'
                      : 'bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] hover:border-[#d4d4d4] dark:hover:border-[#404040]'
                  }`}
                >
                  <input
                    type="radio"
                    name="dateRange"
                    value={value}
                    checked={filterState.dateRange === value}
                    onChange={(e) => onFilterChange({ dateRange: e.target.value as any })}
                    className="sr-only"
                  />
                  <span className="text-sm text-[#0d0d12] dark:text-[#fafafa]">{label}</span>
                  {filterState.dateRange === value && (
                    <CheckCircle2 className="w-4 h-4 text-[#16a34a] dark:text-[#22c55e] mr-auto" />
                  )}
                </label>
              ))}
            </div>

            {/* Custom date inputs */}
            {filterState.dateRange === 'custom' && (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-xs text-[#737373] dark:text-[#a3a3a3] mb-1">
                    מתאריך
                  </label>
                  <input
                    type="date"
                    value={filterState.customStartDate}
                    onChange={(e) => onFilterChange({ customStartDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-sm text-[#0d0d12] dark:text-[#fafafa]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#737373] dark:text-[#a3a3a3] mb-1">
                    עד תאריך
                  </label>
                  <input
                    type="date"
                    value={filterState.customEndDate}
                    onChange={(e) => onFilterChange({ customEndDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-sm text-[#0d0d12] dark:text-[#fafafa]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* שליח */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bike className="w-4 h-4 text-[#16a34a]" />
              <h4 className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">שליח</h4>
            </div>
            <select
              value={filterState.selectedCourier || ''}
              onChange={(e) => onFilterChange({ selectedCourier: e.target.value || null })}
              className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-sm text-[#0d0d12] dark:text-[#fafafa]"
            >
              <option value="">כל השליחים</option>
              {courierOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* מסעדה */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-4 h-4 text-[#f97316]" />
              <h4 className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">מסעדה</h4>
            </div>
            <select
              value={filterState.selectedRestaurant || ''}
              onChange={(e) => onFilterChange({ selectedRestaurant: e.target.value || null })}
              className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-sm text-[#0d0d12] dark:text-[#fafafa]"
            >
              <option value="">כל המסעדות</option>
              {restaurantOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* סניף */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-[#8b5cf6]" />
              <h4 className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">סניף</h4>
            </div>
            <select
              value={filterState.selectedBranch || ''}
              onChange={(e) => onFilterChange({ selectedBranch: e.target.value || null })}
              className="w-full px-3 py-2.5 bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-sm text-[#0d0d12] dark:text-[#fafafa]"
            >
              <option value="">כל הסניפים</option>
              {branchOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* סטטוס */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-[#6366f1]" />
              <h4 className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">סטטוס</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_STATUSES.map(({ key, label, icon: Icon }) => {
                const isActive = filterState.statusFilters.has(key);
                const config = STATUS_CONFIG[key];
                const count = statusCounts[key] || 0;
                return (
                  <button
                    key={key}
                    onClick={() => toggleStatus(key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#f5f5f5] dark:bg-[#262626] text-[#16a34a] dark:text-[#22c55e] border-2 border-[#16a34a] dark:border-[#22c55e]'
                        : 'bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#d4d4d4] dark:hover:border-[#404040]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#16a34a] dark:text-[#22c55e]' : config.iconColor}`} />
                    <span className="flex-1 text-right">{label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#f5f5f5] dark:bg-[#262626] rounded-full font-bold">
                      {count}
                    </span>
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a] dark:text-[#22c55e]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#e5e5e5] dark:border-[#262626] p-4">
          <div className="flex gap-3">
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] rounded-xl text-xs font-medium text-[#525252] dark:text-[#d4d4d4] hover:border-[#d4d4d4] dark:hover:border-[#404040] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>נקה הכל</span>
            </button>
            <button
              onClick={() => {
                onApply();
                onClose();
              }}
              className="flex-1 px-5 py-2.5 rounded-xl text-sm font-medium text-[#0d0d12] bg-[#9fe870] hover:bg-[#b2ed8d] shadow-sm transition-all"
            >
              החל פילטרים
            </button>
          </div>
        </div>
      </div>
    </>
  );
};