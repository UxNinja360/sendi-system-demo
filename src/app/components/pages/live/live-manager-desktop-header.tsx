import React from 'react';
import { Bike, ChevronLeft, ChevronRight, ChevronsUp, Package } from 'lucide-react';

type LiveManagerDesktopHeaderProps = {
  activeTab: 'deliveries' | 'couriers';
  deliveriesCount: number;
  couriersCount: number;
  panelSize: 'normal' | 'medium' | 'large' | 'minimized';
  onSelectDeliveries: () => void;
  onSelectCouriers: () => void;
  onCyclePanelSize: () => void;
  onMinimize: () => void;
};

export const LiveManagerDesktopHeader: React.FC<LiveManagerDesktopHeaderProps> = ({
  activeTab,
  deliveriesCount,
  couriersCount,
  panelSize,
  onSelectDeliveries,
  onSelectCouriers,
  onCyclePanelSize,
  onMinimize,
}) => (
  <div className="border-b border-[#e5e5e5] px-4 pt-3 pb-0 dark:border-[#262626]">
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-0">
        <button
          onClick={onSelectDeliveries}
          className={`flex flex-1 items-center justify-center gap-2 border-b px-4 py-2.5 transition-all ${
            activeTab === 'deliveries'
              ? 'border-[#22c55e] text-[#22c55e]'
              : 'border-transparent text-[#525252] hover:border-[#22c55e]/30 hover:text-[#22c55e] dark:text-[#737373]'
          }`}
        >
          <Package className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">משלוחים</span>
          <span
            className={`text-xs font-medium tabular-nums ${
              activeTab === 'deliveries'
                ? 'text-[#22c55e]/70'
                : 'text-[#a3a3a3] dark:text-[#525252]'
            }`}
          >
            {deliveriesCount}
          </span>
        </button>

        <button
          onClick={onSelectCouriers}
          className={`flex flex-1 items-center justify-center gap-2 border-b px-4 py-2.5 transition-all ${
            activeTab === 'couriers'
              ? 'border-[#22c55e] text-[#22c55e]'
              : 'border-transparent text-[#525252] hover:border-[#22c55e]/30 hover:text-[#22c55e] dark:text-[#737373]'
          }`}
        >
          <Bike className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">שליחים</span>
          <span
            className={`text-xs font-medium tabular-nums ${
              activeTab === 'couriers'
                ? 'text-[#22c55e]/70'
                : 'text-[#a3a3a3] dark:text-[#525252]'
            }`}
          >
            {couriersCount}
          </span>
        </button>
      </div>

      <button
        onClick={onCyclePanelSize}
        className="group flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
        title={panelSize === 'large' ? 'הקטן' : 'הגדל'}
      >
        {panelSize === 'large' ? (
          <ChevronRight className="h-4 w-4 text-[#737373] transition-colors group-hover:text-[#22c55e]" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-[#737373] transition-colors group-hover:text-[#22c55e]" />
        )}
      </button>

      <button
        onClick={onMinimize}
        className="group flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
        title="מזער לסרגל"
      >
        <ChevronsUp className="h-4 w-4 text-[#737373] transition-colors group-hover:text-[#22c55e]" />
      </button>
    </div>
  </div>
);
