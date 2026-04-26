import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { LiveSortMenu } from './live-sort-menu';

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
  const sortButtonRef = React.useRef<HTMLButtonElement | null>(null);

  if (ordersCount <= 0) return null;

  return (
    <div className="sticky top-0 z-10 border-b border-[#e5e5e5] bg-[#fafafa] p-3 dark:border-app-border dark:bg-app-surface">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-right text-xs text-[#737373] dark:text-[#a3a3a3]">
          מציג {ordersCount} משלוחים
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              ref={sortButtonRef}
              onClick={onToggleSortMenu}
              className="flex-shrink-0 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white dark:hover:bg-[#171717]"
              title="בחר קטגוריית מיון"
            >
              <span className="text-[#737373] dark:text-[#a3a3a3]">
                לפי: <span className="font-bold text-[#22c55e]">{sortLabel}</span>
              </span>
            </button>

            <LiveSortMenu
              anchorRef={sortButtonRef}
              open={showSortMenu}
              options={SORT_OPTIONS}
              selectedId={sortBy}
              width={192}
              onClose={onCloseSortMenu}
              onSelect={(value) => onSelectSort(value as DeliverySortKey)}
            />
          </div>

          <button
            onClick={onToggleDirection}
            className="rounded-lg p-1.5 transition-colors hover:bg-white dark:hover:bg-[#171717]"
            title={sortDirection === 'asc' ? 'מיון עולה' : 'מיון יורד'}
          >
            {sortDirection === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5 text-[#737373]" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-[#737373]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

