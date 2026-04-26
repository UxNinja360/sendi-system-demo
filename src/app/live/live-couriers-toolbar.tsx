import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { LiveSortMenu } from './live-sort-menu';

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

const sortOptions = (Object.keys(sortOptionLabels) as LiveCouriersSortBy[]).map((id) => ({
  id,
  label: sortOptionLabels[id],
}));

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
  const sortButtonRef = React.useRef<HTMLButtonElement | null>(null);

  return (
    <div className="sticky top-0 z-10 border-b border-[#e5e5e5] bg-[#fafafa] p-3 dark:border-app-border dark:bg-app-surface">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-right text-xs text-[#737373] dark:text-[#a3a3a3]">
          <span>מציג {displayedCouriersCount} / {sortedCouriersCount} שליחים</span>
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
                לפי: <span className="font-bold text-[#22c55e]">{activeSortLabel[sortBy]}</span>
              </span>
            </button>

            <LiveSortMenu
              anchorRef={sortButtonRef}
              open={showSortMenu}
              options={sortOptions}
              selectedId={sortBy}
              width={208}
              onClose={onCloseSortMenu}
              onSelect={(value) => onSelectSort(value as LiveCouriersSortBy)}
            />
          </div>

          <button
            onClick={onToggleSortDirection}
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

