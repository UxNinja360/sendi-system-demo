import React from 'react';
import { Bike, Package, PanelRightOpen } from 'lucide-react';

interface LiveManagerMinimizedWidgetProps {
  totalDeliveries: number;
  pendingCount: number;
  inProgressCount: number;
  deliveredCount: number;
  cancelledCount: number;
  availableCouriersCount: number;
  onExpand: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const StatusDot: React.FC<{ color: string; count: number }> = ({ color, count }) => (
  <div className="flex items-center gap-1">
    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
    <span className="text-xs font-bold text-[#737373] dark:text-[#a3a3a3]">{count}</span>
  </div>
);

export const LiveManagerMinimizedWidget: React.FC<LiveManagerMinimizedWidgetProps> = ({
  totalDeliveries,
  pendingCount,
  inProgressCount,
  deliveredCount,
  cancelledCount,
  availableCouriersCount,
  onExpand,
}) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="flex items-center gap-1.5">
      <Package className="h-4 w-4 text-[#22c55e]" />
      <span className="text-sm font-bold text-[#0d0d12] dark:text-white">{totalDeliveries}</span>
    </div>

    <div className="h-5 w-px bg-[#e5e5e5] dark:bg-[#404040]" />

    <div className="flex items-center gap-2">
      {pendingCount > 0 && <StatusDot color="rgb(255,105,0)" count={pendingCount} />}
      {inProgressCount > 0 && <StatusDot color="rgb(240,177,0)" count={inProgressCount} />}
      {deliveredCount > 0 && <StatusDot color="rgb(0,166,62)" count={deliveredCount} />}
      {cancelledCount > 0 && <StatusDot color="rgb(231,0,11)" count={cancelledCount} />}
    </div>

    <div className="h-5 w-px bg-[#e5e5e5] dark:bg-[#404040]" />

    <div className="flex items-center gap-1.5">
      <Bike className="h-4 w-4 text-[#22c55e]" />
      <span className="text-xs font-bold text-[#737373] dark:text-[#a3a3a3]">
        {availableCouriersCount}
      </span>
    </div>

    <div className="h-5 w-px bg-[#e5e5e5] dark:bg-[#404040]" />

    <button
      onClick={onExpand}
      className="group flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
      title="פתח פאנל"
    >
      <PanelRightOpen className="h-3.5 w-3.5 text-[#737373] transition-colors group-hover:text-[#22c55e]" />
      <span className="text-xs font-medium text-[#737373] transition-colors group-hover:text-[#22c55e]">
        פתח
      </span>
    </button>
  </div>
);

