import React from 'react';

import { ListToolbarActions } from '../common/list-toolbar-actions';

type DeliveriesToolbarActionsProps = {
  searchQuery: string;
  columnsOpen: boolean;
  onSearchQueryChange: (value: string) => void;
  onToggleColumns: () => void;
  onOpenExport: () => void;
};

export const DeliveriesToolbarActions: React.FC<DeliveriesToolbarActionsProps> = ({
  searchQuery,
  columnsOpen,
  onSearchQueryChange,
  onToggleColumns,
  onOpenExport,
}) => (
  <ListToolbarActions
    searchQuery={searchQuery}
    onSearchQueryChange={onSearchQueryChange}
    searchPlaceholder="חפש משלוח..."
    searchWidthClass="w-48"
    columnsOpen={columnsOpen}
    onToggleColumns={onToggleColumns}
    onExport={onOpenExport}
  />
);
