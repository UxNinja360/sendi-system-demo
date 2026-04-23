import React from 'react';

type SelectionActionBarProps = {
  selectedCount: number;
  selectionLabel: React.ReactNode;
  onClear: () => void;
  clearLabel?: string;
  actions?: React.ReactNode;
};

export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  selectedCount,
  selectionLabel,
  onClear,
  clearLabel = 'נקה בחירה',
  actions,
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div className="sticky bottom-0 inset-x-0 z-20 border-t border-[#e5e5e5] bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:border-[#262626] dark:bg-[#171717]">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="inline-flex items-center rounded-full border border-[#d7efc8] bg-[#ecfae2] px-3 py-1.5 text-sm font-semibold text-[#166534] dark:border-[#365314] dark:bg-[#163300] dark:text-[#b5f27d]">
          {selectionLabel}
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {actions}
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm font-semibold text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:text-[#a3a3a3] dark:hover:bg-[#262626]"
          >
            {clearLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
