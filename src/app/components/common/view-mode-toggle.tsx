import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

import { ToolbarIconButton } from './toolbar-icon-button';

export type EntityViewMode = 'list' | 'cards';

type ViewModeToggleProps = {
  value: EntityViewMode;
  onChange: (value: EntityViewMode) => void;
};

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ value, onChange }) => (
  <div className="flex shrink-0 items-center gap-1">
    <ToolbarIconButton
      data-view-option="list"
      active={value === 'list'}
      label="תצוגת רשימה"
      onClick={() => onChange('list')}
    >
      <List className="h-3.5 w-3.5" />
    </ToolbarIconButton>
    <ToolbarIconButton
      data-view-option="cards"
      active={value === 'cards'}
      label="תצוגת כרטיסיות"
      onClick={() => onChange('cards')}
    >
      <LayoutGrid className="h-3.5 w-3.5" />
    </ToolbarIconButton>
  </div>
);
