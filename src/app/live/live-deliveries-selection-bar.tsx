import React from 'react';
import {
  SelectionActionBar,
  SelectionActionButton,
} from '../components/common/selection-action-bar';

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
    entitySingular={'\u05de\u05e9\u05dc\u05d5\u05d7'}
    entityPlural={'\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd'}
    onClear={onClear}
    clearLabel={'\u05d1\u05d9\u05d8\u05d5\u05dc'}
    actions={
      <SelectionActionButton
        onClick={onAssign}
      >
        {'\u05e9\u05d1\u05e5'} {selectedCount}{' '}
        {selectedCount === 1
          ? '\u05de\u05e9\u05dc\u05d5\u05d7'
          : '\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd'}{' '}
        &larr;
      </SelectionActionButton>
    }
  />
);

