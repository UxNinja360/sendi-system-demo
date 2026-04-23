import React from 'react';
import { ArrowUpDown } from 'lucide-react';

type LiveCouriersSortBy = 'status' | 'name' | 'active' | 'total' | 'rating' | 'available';

type LiveCouriersToolbarProps = {
  displayedCouriersCount: number;
  sortedCouriersCount: number;
  sortBy: LiveCouriersSortBy;
  sortDirection: 'asc' | 'desc';
  showSortMenu: boolean;
  onToggleSortMenu: () => void;
  onCloseSortMenu: () => void;
  onSelectSort: (sortBy: LiveCouriersSortBy) => void;
  onToggleSortDirection: () => void;
};

const sortOptionLabels: Record<LiveCouriersSortBy, string> = {
  status: 'לפי סטטוס',
  available: 'לפי זמינות',
  active: 'לפי משלוחים פעילים',
  total: 'לפי סך משלוחים',
  rating: 'לפי דירוג',
  name: 'לפי שם (א״ב)',
};

const activeSortLabel: Record<LiveCouriersSortBy, string> = {
  status: 'סטטוס',
  available: 'זמינות',
  active: 'משלוחים פעילים',
  total: 'סך משלוחים',
  rating: 'דירוג',
  name: 'שם (א״ב)',
};

export const LiveCouriersToolbar: React.FC<LiveCouriersToolbarProps> = ({
  displayedCouriersCount,
  sortedCouriersCount,
  sortBy,
  sortDirection,
  showSortMenu,
  onToggleSortMenu,
  onCloseSortMenu,
  onSelectSort,
  onToggleSortDirection,
}) => {
  return (
    <div className="sticky top-0 z-10 border-b border-[#e5e5e5] bg-[#fafafa] p-3 dark:border-[#262626] dark:bg-[#0a0a0a]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-right text-xs text-[#737373] dark:text-[#a3a3a3]">
          <span>מציג {displayedCouriersCount} / {sortedCouriersCount} שליחים</span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="relative">
            <button
              onClick={onToggleSortMenu}
              className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white dark:hover:bg-[#171717]"
              title="בחר קטגוריית מיון"
            >
              <span className="text-[#737373] dark:text-[#a3a3a3]">
                לפי: <span className="font-bold text-[#22c55e]">{activeSortLabel[sortBy]}</span>
              </span>
            </button>

            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={onCloseSortMenu} />
                <div className="absolute left-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-2xl dark:border-[#262626] dark:bg-[#171717]">
                  {(Object.keys(sortOptionLabels) as LiveCouriersSortBy[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => onSelectSort(option)}
                      className={`w-full px-4 py-2.5 text-right text-sm transition-colors ${
                        sortBy === option
                          ? 'bg-[#f0fdf4] font-bold text-[#22c55e] dark:bg-[#0a2f1a]'
                          : 'text-[#0d0d12] hover:bg-[#fafafa] dark:text-[#fafafa] dark:hover:bg-[#262626]'
                      }`}
                    >
                      {sortOptionLabels[option]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={onToggleSortDirection}
            className="rounded-lg p-2 transition-colors hover:bg-white dark:hover:bg-[#171717]"
            title={sortDirection === 'asc' ? 'מיון עולה' : 'מיון יורד'}
          >
            <ArrowUpDown className="h-4 w-4 text-[#22c55e]" />
          </button>
        </div>
      </div>
    </div>
  );
};
