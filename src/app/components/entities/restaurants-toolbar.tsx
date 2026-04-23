import React from 'react';

import { ListToolbarActions } from '../common/list-toolbar-actions';

interface RestaurantsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExport: () => void;
  onToggleColumns: () => void;
  columnsOpen: boolean;
}

export const RestaurantsToolbar: React.FC<RestaurantsToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onToggleColumns,
  columnsOpen,
  onExport,
}) => (
  <ListToolbarActions
    searchQuery={searchQuery}
    onSearchQueryChange={onSearchChange}
    searchPlaceholder="חפש מסעדה, עיר או איש קשר..."
    searchWidthClass="w-52"
    columnsOpen={columnsOpen}
    onToggleColumns={onToggleColumns}
    onExport={onExport}
  />
);
