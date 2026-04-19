import React from 'react';
import { X, Power, Package, Search as SearchIcon } from 'lucide-react';

interface CouriersFilterChipsProps {
  statusFilter: 'all' | 'available' | 'busy' | 'offline';
  onClearStatus: () => void;
  deliveryFilter: 'all' | 'with_delivery' | 'without_delivery';
  onClearDelivery: () => void;
  searchQuery: string;
  onClearSearch: () => void;
  onClearAll: () => void;
}

export const CouriersFilterChips: React.FC<CouriersFilterChipsProps> = ({
  statusFilter,
  onClearStatus,
  deliveryFilter,
  onClearDelivery,
  searchQuery,
  onClearSearch,
  onClearAll,
}) => {
  const hasFilters = statusFilter !== 'all' || deliveryFilter !== 'all' || searchQuery;

  if (!hasFilters) return null;

  const statusLabels = {
    available: 'זמין',
    busy: 'תפוס',
    offline: 'לא מחובר',
  };

  const deliveryLabels = {
    with_delivery: 'עם משלוח פעיל',
    without_delivery: 'ללא משלוח',
  };

  return (
    <div className="flex items-center gap-2 pb-1 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-2 flex-nowrap">
        {/* Search chip */}
        {searchQuery && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-400">
            <SearchIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] opacity-70">חיפוש:</span>
            <span className="font-semibold max-w-[120px] truncate">{searchQuery}</span>
            <button
              onClick={onClearSearch}
              className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Status chip */}
        {statusFilter !== 'all' && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400">
            <Power className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] opacity-70">סטטוס:</span>
            <span className="font-semibold max-w-[120px] truncate">
              {statusLabels[statusFilter as keyof typeof statusLabels]}
            </span>
            <button
              onClick={onClearStatus}
              className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Delivery chip */}
        {deliveryFilter !== 'all' && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400">
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] opacity-70">משלוח:</span>
            <span className="font-semibold max-w-[120px] truncate">
              {deliveryLabels[deliveryFilter as keyof typeof deliveryLabels]}
            </span>
            <button
              onClick={onClearDelivery}
              className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};