import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

type DeliverySortKey = 'time' | 'status' | 'restaurant' | 'address' | 'ready';

interface LiveDeliveriesListToolbarProps {
  ordersCount: number;
  sortBy: DeliverySortKey;
  sortDirection: 'asc' | 'desc';
  showSortMenu: boolean;
  sortLabel: string;
  onToggleSortMenu: () => void;
  onCloseSortMenu: () => void;
  onSelectSort: (value: DeliverySortKey) => void;
  onToggleDirection: () => void;
}

const SORT_OPTIONS: Array<{ id: DeliverySortKey; label: string }> = [
  { id: 'time', label: 'לפי זמן' },
  { id: 'status', label: 'לפי סטטוס' },
  { id: 'restaurant', label: 'לפי מסעדה' },
  { id: 'address', label: 'לפי כתובת' },
  { id: 'ready', label: 'לפי מוכן' },
];

export const LiveDeliveriesListToolbar: React.FC<LiveDeliveriesListToolbarProps> = ({
  ordersCount,
  sortBy,
  sortDirection,
  showSortMenu,
  sortLabel,
  onToggleSortMenu,
  onCloseSortMenu,
  onSelectSort,
  onToggleDirection,
}) => {
  if (ordersCount <= 0) return null;

  return (
    <div className="sticky top-0 z-10 border-b border-[#e5e5e5] bg-[#fafafa] p-3 dark:border-[#262626] dark:bg-[#0a0a0a]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-right text-xs text-[#737373] dark:text-[#a3a3a3]">
          מציג {ordersCount} משלוחים
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={onToggleSortMenu}
              className="flex-shrink-0 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white dark:hover:bg-[#171717]"
              title="בחר קטגוריית מיון"
            >
              <span className="text-[#737373] dark:text-[#a3a3a3]">
                לפי: <span className="font-bold text-[#22c55e]">{sortLabel}</span>
              </span>
            </button>

            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={onCloseSortMenu} />

                <div className="absolute left-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-2xl dark:border-[#262626] dark:bg-[#171717]">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onSelectSort(option.id)}
                      className={`w-full px-4 py-2.5 text-right text-sm transition-colors ${
                        sortBy === option.id
                          ? 'bg-[#f0fdf4] font-bold text-[#22c55e] dark:bg-[#0a2f1a]'
                          : 'text-[#0d0d12] hover:bg-[#fafafa] dark:text-[#fafafa] dark:hover:bg-[#262626]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={onToggleDirection}
            className="rounded-lg p-1.5 transition-colors hover:bg-white dark:hover:bg-[#171717]"
            title={sortDirection === 'asc' ? 'עבור למיון מהחדש לישן' : 'עבור למיון מהישן לחדש'}
          >
            {sortDirection === 'asc' ? (
              <ArrowDown className="h-3.5 w-3.5 text-[#737373]" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5 text-[#737373]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
