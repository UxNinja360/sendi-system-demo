import React from 'react';
import { SelectionActionBar } from '../components/common/selection-action-bar';

interface LiveDeliveriesSelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onAssign: () => void;
}

export const LiveDeliveriesSelectionBar: React.FC<LiveDeliveriesSelectionBarProps> = ({
  selectedCount,
  onClear,
  onAssign,
}) => (
  <SelectionActionBar
    selectedCount={selectedCount}
    selectionLabel={`נבחרו ${selectedCount} ${selectedCount === 1 ? 'משלוח' : 'משלוחים'}`}
    onClear={onClear}
    clearLabel="ביטול"
    actions={
      <button
        type="button"
        onClick={onAssign}
        className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[#22c55e]/20 transition-colors hover:bg-[#16a34a]"
      >
        שבץ {selectedCount} {selectedCount === 1 ? 'משלוח' : 'משלוחים'} ←
      </button>
    }
  />
);

