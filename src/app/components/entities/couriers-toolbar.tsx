import React from 'react';

import { ListToolbarActions } from '../common/list-toolbar-actions';

interface CouriersToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleColumns: () => void;
  columnsOpen: boolean;
  onExport: () => void;
}

export const CouriersToolbar: React.FC<CouriersToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onToggleColumns,
  columnsOpen,
  onExport,
}) => (
  <ListToolbarActions
    searchQuery={searchQuery}
    onSearchQueryChange={onSearchChange}
    searchPlaceholder="חפש שליח או מספר טלפון..."
    searchWidthClass="w-48"
    columnsOpen={columnsOpen}
    onToggleColumns={onToggleColumns}
    onExport={onExport}
  />
);
