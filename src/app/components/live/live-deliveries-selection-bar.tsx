import React from 'react';

interface LiveDeliveriesSelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onAssign: () => void;
}

export const LiveDeliveriesSelectionBar: React.FC<LiveDeliveriesSelectionBarProps> = ({
  selectedCount,
  onClear,
  onAssign,
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div className="sticky bottom-0 inset-x-0 border-t border-[#e5e5e5] bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:border-[#262626] dark:bg-[#171717]">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onClear}
          className="flex-shrink-0 rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm font-semibold text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:hover:bg-[#262626]"
        >
          ביטול
        </button>
        <button
          onClick={onAssign}
          className="flex-1 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[#22c55e]/20 transition-colors hover:bg-[#16a34a]"
        >
          שבץ {selectedCount} {selectedCount === 1 ? 'משלוח' : 'משלוחים'} ←
        </button>
      </div>
    </div>
  );
};
