import React from 'react';
import { Search } from 'lucide-react';

import {
  LiveManagerControlsProps,
} from './live-manager-desktop-controls';

const buttonClass =
  'px-3 py-1.5 rounded-lg font-bold transition-all flex-shrink-0 text-[12px] whitespace-nowrap';

const inactiveButtonClass =
  'bg-[#e5e5e5] dark:bg-[#262626] text-[#666d80] dark:text-[#737373] border border-[#d4d4d4] dark:border-[#404040] hover:bg-[#d4d4d4] dark:hover:bg-[#1a1a1a]';

type MobileFilterButtonProps = {
  active: boolean;
  activeClassName: string;
  children: React.ReactNode;
  onClick: () => void;
};

const MobileFilterButton: React.FC<MobileFilterButtonProps> = ({
  active,
  activeClassName,
  children,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`${buttonClass} ${active ? activeClassName : inactiveButtonClass}`}
  >
    {children}
  </button>
);

export const LiveManagerMobileControls: React.FC<LiveManagerControlsProps> = ({
  activeTab,
  searchQuery,
  onSearchQueryChange,
  shiftFilter,
  courierQuickFilter,
  shiftCounts,
  freeCouriersCount,
  busyCouriersCount,
  onToggleShiftFilter,
  onToggleCourierQuickFilter,
  onSetShiftFilter,
  statusFilters,
  todayDeliveries,
  onToggleStatusFilter,
}) => {
  const courierButtons = [
    {
      key: 'shift',
      label: `במשמרת (${shiftCounts.onShift})`,
      active: shiftFilter === 'shift',
      activeClassName:
        'bg-[rgba(59,130,246,0.18)] text-[#2563eb] dark:text-[#93c5fd] border border-[rgba(59,130,246,0.4)]',
      onClick: () => onToggleShiftFilter('shift'),
    },
    {
      key: 'free',
      label: `פנויים (${freeCouriersCount})`,
      active: courierQuickFilter === 'free',
      activeClassName:
        'bg-[rgba(14,165,233,0.18)] text-[#0284c7] dark:text-[#7dd3fc] border border-[rgba(14,165,233,0.38)]',
      onClick: () => onToggleCourierQuickFilter('free'),
    },
    {
      key: 'busy',
      label: `במשלוח (${busyCouriersCount})`,
      active: courierQuickFilter === 'busy',
      activeClassName:
        'bg-[rgba(99,102,241,0.22)] text-[#4f46e5] dark:text-[#c7d2fe] border border-[rgba(99,102,241,0.45)]',
      onClick: () => onToggleCourierQuickFilter('busy'),
    },
    {
      key: 'connected',
      label: `מחוברים (${shiftCounts.connected})`,
      active: shiftFilter === 'all',
      activeClassName:
        'bg-[rgba(15,205,211,0.18)] text-[#0fcdd3] dark:text-[#67e8f9] border border-[rgba(15,205,211,0.4)]',
      onClick: () => onSetShiftFilter('all'),
    },
  ];

  const deliveryButtons = [
    {
      key: 'pending',
      label: `ממתין ${todayDeliveries.pending}`,
      active: statusFilters.includes('pending'),
      activeClassName:
        'bg-[rgba(255,105,0,0.3)] text-[#ff6900] dark:text-[#ffc068] border border-[rgba(255,105,0,0.5)]',
    },
    {
      key: 'assigned',
      label: `שובץ ${todayDeliveries.assigned}`,
      active: statusFilters.includes('assigned'),
      activeClassName:
        'bg-[rgba(240,177,0,0.3)] text-[#d4a000] dark:text-[#ffdf20] border border-[rgba(240,177,0,0.5)]',
    },
    {
      key: 'delivering',
      label: `נאסף ${todayDeliveries.delivering}`,
      active: statusFilters.includes('delivering'),
      activeClassName:
        'bg-[rgba(99,102,241,0.3)] text-[#6366f1] dark:text-[#a5b4fc] border border-[rgba(99,102,241,0.5)]',
    },
    {
      key: 'delivered',
      label: `נמסר ${todayDeliveries.delivered}`,
      active: statusFilters.includes('delivered'),
      activeClassName:
        'bg-[rgba(0,166,62,0.3)] text-[#00a63e] dark:text-[#7bf1a8] border border-[rgba(0,166,62,0.5)]',
    },
    {
      key: 'cancelled',
      label: `בוטל ${todayDeliveries.cancelled}`,
      active: statusFilters.includes('cancelled'),
      activeClassName:
        'bg-[rgba(231,0,11,0.3)] text-[#e7000b] dark:text-[#ffa2a2] border border-[rgba(231,0,11,0.5)]',
    },
  ];

  return (
    <div className="flex-shrink-0 border-b border-[#e5e5e5] p-4 dark:border-[#262626]">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" />
        <input
          type="text"
          placeholder="חיפוש..."
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="w-full rounded-lg border border-[#e5e5e5] bg-[#f5f5f5] py-2 pr-10 pl-3 text-sm text-[#0d0d12] placeholder:text-[#737373] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#16a34a] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-white"
        />
      </div>

      <div
        className="mt-2 flex items-center justify-start gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {activeTab === 'couriers' ? (
          <div className="flex gap-2 flex-shrink-0">
            {courierButtons.map((button) => (
              <MobileFilterButton
                key={button.key}
                active={button.active}
                activeClassName={button.activeClassName}
                onClick={button.onClick}
              >
                {button.label}
              </MobileFilterButton>
            ))}
          </div>
        ) : (
          <>
            {deliveryButtons.map((button) => (
              <MobileFilterButton
                key={button.key}
                active={button.active}
                activeClassName={button.activeClassName}
                onClick={() => onToggleStatusFilter(button.key)}
              >
                {button.label}
              </MobileFilterButton>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
