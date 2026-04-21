import React from 'react';
import { EntityToolbarControls } from './entity-toolbar-controls';

interface CouriersToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stats: {
    total: number;
    filtered: number;
    available: number;
    busy: number;
  };
  onAddCourier: () => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onToggleColumns: () => void;
  columnsOpen: boolean;
}

export const CouriersToolbar: React.FC<CouriersToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onToggleColumns,
  columnsOpen,
}) => (
  <EntityToolbarControls
    searchQuery={searchQuery}
    onSearchChange={onSearchChange}
    searchPlaceholder={
      '\u05d7\u05e4\u05e9 \u05e9\u05dc\u05d9\u05d7 \u05d0\u05d5 \u05de\u05e1\u05e4\u05e8 \u05d8\u05dc\u05e4\u05d5\u05df...'
    }
    searchWidthClass="w-48"
    onToggleColumns={onToggleColumns}
    columnsOpen={columnsOpen}
  />
);
