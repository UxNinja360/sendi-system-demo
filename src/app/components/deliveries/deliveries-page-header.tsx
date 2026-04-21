import React from 'react';
import { Menu, Plus } from 'lucide-react';

type DeliveriesPageHeaderProps = {
  totalCount: number;
  onOpenNewDelivery: () => void;
  onToggleMobileSidebar: () => void;
};

export const DeliveriesPageHeader: React.FC<DeliveriesPageHeaderProps> = ({
  totalCount,
  onOpenNewDelivery,
  onToggleMobileSidebar,
}) => {
  return (
    <div className="sticky top-0 z-20 shrink-0 h-16 flex items-center justify-between px-5 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-[#737373] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">
          משלוחים
        </span>

        {totalCount > 0 && (
          <span className="text-sm text-[#a3a3a3] tabular-nums">
            {totalCount.toLocaleString()}
          </span>
        )}
      </div>

      <button
        onClick={onOpenNewDelivery}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#9fe870] hover:bg-[#8dd960] text-[#0d0d12] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        משלוח חדש
      </button>
    </div>
  );
};
