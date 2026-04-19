import React from 'react';
import { X, Calendar, User, UtensilsCrossed, Building2, Clock, RotateCcw } from 'lucide-react';
import { DeliveryStatus } from '../../types/delivery.types';
import { STATUS_CONFIG } from './status-config';

export interface ActiveFilterChipsProps {
  // תאריכים
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  customStartDate: string;
  customEndDate: string;
  onClearDate: () => void;
  
  // סטטוס
  statusFilters: Set<DeliveryStatus>;
  onClearStatus: (status?: DeliveryStatus) => void;
  
  // שליח
  selectedCourier: string | null;
  courierName: string | null;
  onClearCourier: () => void;
  
  // מסעדה
  selectedRestaurant: string | null;
  restaurantName: string | null;
  onClearRestaurant: () => void;
  
  // סניף
  selectedBranch: string | null;
  branchName: string | null;
  onClearBranch: () => void;
  
  // חיפוש
  searchQuery: string;
  onClearSearch: () => void;
  
  // נקה הכל
  onClearAll?: () => void;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  dateRange,
  customStartDate,
  customEndDate,
  onClearDate,
  statusFilters,
  onClearStatus,
  selectedCourier,
  courierName,
  onClearCourier,
  selectedRestaurant,
  restaurantName,
  onClearRestaurant,
  selectedBranch,
  branchName,
  onClearBranch,
  searchQuery,
  onClearSearch,
  onClearAll,
}) => {
  const hasAnyFilter =
    dateRange !== 'all' ||
    statusFilters.size > 0 ||
    selectedCourier ||
    selectedRestaurant ||
    selectedBranch ||
    searchQuery;

  if (!hasAnyFilter) return null;

  const dateRangeLabels = {
    today: 'היום',
    week: 'שבוע אחרון',
    month: 'חודש אחרון',
    custom: customStartDate && customEndDate
      ? `${customStartDate} - ${customEndDate}`
      : customStartDate
      ? `מ-${customStartDate}`
      : 'טווח מותאם',
  };

  const ChipButton: React.FC<{
    icon: React.ElementType;
    label: string;
    value: string;
    onRemove: () => void;
    color?: 'default' | 'blue' | 'purple' | 'green' | 'amber' | 'red';
  }> = ({ icon: Icon, label, value, onRemove, color = 'default' }) => {
    const colorClasses = {
      default: 'bg-[#f5f5f5] dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#0d0d12] dark:text-[#fafafa]',
      blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400',
      purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-400',
      green: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400',
      amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400',
      red: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400',
    };

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap ${colorClasses[color]}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[10px] opacity-70">{label}:</span>
        <span className="font-semibold max-w-[120px] truncate">{value}</span>
        <button
          onClick={onRemove}
          className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2 pb-1 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-2 flex-nowrap">
        {/* חיפוש */}
        {searchQuery && (
          <ChipButton
            icon={Clock}
            label="חיפוש"
            value={searchQuery}
            onRemove={onClearSearch}
            color="purple"
          />
        )}

        {/* תאריך */}
        {dateRange !== 'all' && (
          <ChipButton
            icon={Calendar}
            label="תאריך"
            value={dateRangeLabels[dateRange as keyof typeof dateRangeLabels] || dateRange}
            onRemove={onClearDate}
            color="blue"
          />
        )}

        {/* סטטוסים */}
        {Array.from(statusFilters).map((status) => {
          const config = STATUS_CONFIG[status];
          const colorMap: Record<DeliveryStatus, 'amber' | 'blue' | 'purple' | 'green' | 'red'> = {
            pending: 'amber',
            assigned: 'blue',
            delivering: 'indigo',
            delivered: 'green',
            cancelled: 'red',
          };
          
          return (
            <ChipButton
              key={status}
              icon={config.icon}
              label="סטטוס"
              value={config.label}
              onRemove={() => onClearStatus(status)}
              color={colorMap[status]}
            />
          );
        })}

        {/* שליח */}
        {selectedCourier && courierName && (
          <ChipButton
            icon={User}
            label="שליח"
            value={courierName}
            onRemove={onClearCourier}
          />
        )}

        {/* מסעדה */}
        {selectedRestaurant && restaurantName && (
          <ChipButton
            icon={UtensilsCrossed}
            label="מסעדה"
            value={restaurantName}
            onRemove={onClearRestaurant}
          />
        )}

        {/* סניף */}
        {selectedBranch && branchName && (
          <ChipButton
            icon={Building2}
            label="סניף"
            value={branchName}
            onRemove={onClearBranch}
          />
        )}

        {/* נקה הכל */}
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#0a0a0a] text-[#737373] dark:text-[#a3a3a3] text-xs font-medium hover:border-[#9fe870] hover:text-[#0d0d12] dark:hover:text-[#fafafa] transition-all whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            <span>נקה הכל</span>
          </button>
        )}
      </div>
    </div>
  );
};