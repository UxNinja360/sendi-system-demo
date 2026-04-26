import React from 'react';
import { Search } from 'lucide-react';

import {
  LiveManagerControlsProps,
} from './live-manager-desktop-controls';

const buttonClass =
  'h-11 rounded-xl border px-1.5 py-1.5 text-center transition-all';

const inactiveButtonClass =
  'border-[#e5e5e5] bg-[#f5f5f5] text-[#666d80] dark:border-app-border dark:bg-[#111] dark:text-[#737373]';

type MobileFilterButtonProps = {
  active: boolean;
  activeClassName: string;
  count: number;
  label: string;
  onClick: () => void;
};

const MobileFilterButton: React.FC<MobileFilterButtonProps> = ({
  active,
  activeClassName,
  count,
  label,
  onClick,
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`${buttonClass} ${active ? activeClassName : inactiveButtonClass}`}
  >
    <span className="block text-[10px] font-semibold leading-none">{label}</span>
    <span className="mt-1 block text-[15px] font-black leading-none tabular-nums">
      {count.toLocaleString('he-IL')}
    </span>
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
      label: 'משמרת',
      count: shiftCounts.onShift,
      active: shiftFilter === 'shift',
      activeClassName:
        'border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.16)] text-[#2563eb] dark:text-[#93c5fd]',
      onClick: () => onToggleShiftFilter('shift'),
    },
    {
      key: 'free',
      label: 'פנויים',
      count: freeCouriersCount,
      active: courierQuickFilter === 'free',
      activeClassName:
        'border-[rgba(14,165,233,0.42)] bg-[rgba(14,165,233,0.16)] text-[#0284c7] dark:text-[#7dd3fc]',
      onClick: () => onToggleCourierQuickFilter('free'),
    },
    {
      key: 'busy',
      label: 'עסוקים',
      count: busyCouriersCount,
      active: courierQuickFilter === 'busy',
      activeClassName:
        'border-[rgba(245,158,11,0.42)] bg-[rgba(245,158,11,0.16)] text-[#b45309] dark:text-[#fbbf24]',
      onClick: () => onToggleCourierQuickFilter('busy'),
    },
    {
      key: 'connected',
      label: 'מחוברים',
      count: shiftCounts.connected,
      active: shiftFilter === 'all',
      activeClassName:
        'border-[rgba(15,205,211,0.42)] bg-[rgba(15,205,211,0.16)] text-[#0e7490] dark:text-[#67e8f9]',
      onClick: () => onSetShiftFilter('all'),
    },
  ];

  const deliveryButtons = [
    {
      key: 'pending',
      label: 'ממתין',
      count: todayDeliveries.pending,
      active: statusFilters.includes('pending'),
      activeClassName:
        'border-[rgba(255,105,0,0.45)] bg-[rgba(255,105,0,0.16)] text-[#ea580c] dark:text-[#ffc068]',
    },
    {
      key: 'assigned',
      label: 'שובץ',
      count: todayDeliveries.assigned,
      active: statusFilters.includes('assigned'),
      activeClassName:
        'border-[rgba(240,177,0,0.45)] bg-[rgba(240,177,0,0.16)] text-[#a16207] dark:text-[#ffdf20]',
    },
    {
      key: 'delivering',
      label: 'נאסף',
      count: todayDeliveries.delivering,
      active: statusFilters.includes('delivering'),
      activeClassName:
        'border-[rgba(22,163,74,0.45)] bg-[rgba(22,163,74,0.16)] text-[#16a34a] dark:text-[#7bf1a8]',
    },
    {
      key: 'delivered',
      label: 'נמסר',
      count: todayDeliveries.delivered,
      active: statusFilters.includes('delivered'),
      activeClassName:
        'border-[rgba(37,99,235,0.45)] bg-[rgba(37,99,235,0.16)] text-[#2563eb] dark:text-[#93c5fd]',
    },
    {
      key: 'cancelled',
      label: 'בוטל',
      count: todayDeliveries.cancelled,
      active: statusFilters.includes('cancelled'),
      activeClassName:
        'border-[rgba(231,0,11,0.45)] bg-[rgba(231,0,11,0.14)] text-[#dc2626] dark:text-[#ffa2a2]',
    },
  ];

  return (
    <div className="flex-shrink-0 border-b border-[#e5e5e5] px-3 pb-3 pt-1 dark:border-app-border">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" />
        <input
          type="text"
          placeholder="חיפוש..."
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="h-9 w-full rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] pr-10 pl-3 text-sm text-[#0d0d12] placeholder:text-[#737373] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#16a34a] dark:border-app-border dark:bg-app-surface dark:text-app-text"
        />
      </div>

      <div className={`mt-2 grid gap-1.5 ${activeTab === 'couriers' ? 'grid-cols-4' : 'grid-cols-5'}`}>
        {activeTab === 'couriers' ? (
          courierButtons.map((button) => (
            <MobileFilterButton
              key={button.key}
              active={button.active}
              activeClassName={button.activeClassName}
              count={button.count}
              label={button.label}
              onClick={button.onClick}
            />
          ))
        ) : (
          deliveryButtons.map((button) => (
            <MobileFilterButton
              key={button.key}
              active={button.active}
              activeClassName={button.activeClassName}
              count={button.count}
              label={button.label}
              onClick={() => onToggleStatusFilter(button.key)}
            />
          ))
        )}
      </div>
    </div>
  );
};

