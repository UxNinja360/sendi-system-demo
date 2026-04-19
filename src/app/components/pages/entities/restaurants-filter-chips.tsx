import React from 'react';
import { X, Power, MapPin, Search as SearchIcon } from 'lucide-react';

interface RestaurantsFilterChipsProps {
  statusFilter: 'all' | 'active' | 'inactive';
  onClearStatus: () => void;
  cityFilter: string;
  onClearCity: () => void;
  searchQuery: string;
  onClearSearch: () => void;
  onClearAll: () => void;
}

export const RestaurantsFilterChips: React.FC<RestaurantsFilterChipsProps> = ({
  statusFilter,
  onClearStatus,
  cityFilter,
  onClearCity,
  searchQuery,
  onClearSearch,
  onClearAll,
}) => {
  const hasFilters = statusFilter !== 'all' || cityFilter !== 'all' || searchQuery;

  if (!hasFilters) return null;

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
              {statusFilter === 'active' ? 'פעיל' : 'לא פעיל'}
            </span>
            <button
              onClick={onClearStatus}
              className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* City chip */}
        {cityFilter !== 'all' && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] opacity-70">עיר:</span>
            <span className="font-semibold max-w-[120px] truncate">{cityFilter}</span>
            <button
              onClick={onClearCity}
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