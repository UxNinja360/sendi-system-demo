import React from 'react';
import { EntityToolbarControls } from './entity-toolbar-controls';

interface RestaurantsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stats: { total: number; filtered: number; active: number; inactive: number };
  onExport: () => void;
  onAddRestaurant: () => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  onToggleColumns: () => void;
  columnsOpen: boolean;
}

export const RestaurantsToolbar: React.FC<RestaurantsToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onToggleColumns,
  columnsOpen,
}) => (
  <EntityToolbarControls
    searchQuery={searchQuery}
    onSearchChange={onSearchChange}
    searchPlaceholder={
      '\u05d7\u05e4\u05e9 \u05de\u05e1\u05e2\u05d3\u05d4, \u05e2\u05d9\u05e8 \u05d0\u05d5 \u05d0\u05d9\u05e9 \u05e7\u05e9\u05e8...'
    }
    searchWidthClass="w-52"
    onToggleColumns={onToggleColumns}
    columnsOpen={columnsOpen}
  />
);
