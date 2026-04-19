import React from 'react';
import {
  Search,
  Download,
  AlignVerticalSpaceAround,
  RotateCcw,
  X,
  SlidersHorizontal,
} from 'lucide-react';

interface EnhancedToolbarProps {
  // חיפוש
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // סטטיסטיקות
  stats: {
    total: number;
    filtered: number;
    pending: number;
    assigned: number;
    delivered: number;
    cancelled: number;
  };

  // פעולות
  onExport: () => void;
  onColumns?: () => void;
  onRowHeight: () => void;
  onClearAll: () => void;
  onFilters?: () => void;

  // מצב
  hasActiveFilters: boolean;
  currentRowHeight: 'compact' | 'normal' | 'comfortable';
  activeFiltersCount?: number;
  isPanelOpen?: boolean;
}

export const EnhancedToolbar: React.FC<EnhancedToolbarProps> = ({
  searchQuery,
  onSearchChange,
  stats,
  onExport,
  onColumns,
  onRowHeight,
  onClearAll,
  onFilters,
  hasActiveFilters,
  currentRowHeight,
  activeFiltersCount = 0,
  isPanelOpen = false,
}) => {
  const rowHeightLabels = {
    compact: 'קומפקטי',
    normal: 'רגיל',
    comfortable: 'נוח',
  };

  return (
    <div className="space-y-3">
      {/* שורה עליונה: חיפוש + פעולות */}
      <div className="flex items-center gap-3">
        {/* חיפוש */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3a3a3] dark:text-[#737373]" />
          <input
            type="text"
            placeholder="חפש לפי מספר הזמנה, לקוח, מסעדה, כתובת, שליח..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-xl text-sm text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#a3a3a3] dark:placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#9fe870]/30 focus:border-[#9fe870] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#171717] rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#737373] dark:text-[#a3a3a3]" />
            </button>
          )}
        </div>

        {/* פעולות */}
        <div className="flex items-center gap-2">
          {/* כפתור פילטרים - רק במובייל */}
          {onFilters && (
            <button
              onClick={onFilters}
              className="md:hidden relative flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-xl text-sm font-medium text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#171717] hover:border-[#9fe870] transition-all"
              title="פילטרים"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 bg-gradient-to-l from-[#9fe870] to-[#8ed960] text-[#0d0d12] rounded-full text-[10px] font-bold flex items-center justify-center shadow-lg">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}

          {/* פאנל עמודות + ייצוא */}
          {onColumns && (
            <button
              onClick={onColumns}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                isPanelOpen
                  ? 'bg-[#9fe870] border-[#9fe870] text-[#0d0d12]'
                  : 'bg-white dark:bg-[#0a0a0a] border-[#e5e5e5] dark:border-[#262626] text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#171717] hover:border-[#9fe870]'
              }`}
              title={isPanelOpen ? 'סגור פאנל' : 'הגדרות תצוגה וייצוא'}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* שורת סטטיסטיקות */}

    </div>
  );
};
