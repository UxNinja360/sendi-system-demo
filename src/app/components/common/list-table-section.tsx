import React from 'react';

import {
  EntityTableShell,
  type EntityTableShellProps,
} from './entity-table-shell';

type ListTableSectionProps = Partial<EntityTableShellProps> & {
  isEmpty: boolean;
  emptyState: React.ReactNode;
  selectionBar?: React.ReactNode;
  leftOverlay?: React.ReactNode;
  tableContainerClassName?: string;
  children?: React.ReactNode;
};

export const ListTableSection: React.FC<ListTableSectionProps> = ({
  isEmpty,
  emptyState,
  selectionBar,
  leftOverlay,
  tableContainerClassName = '',
  children,
  ...tableProps
}) => {
  if (isEmpty) {
    return (
      <div className="flex min-h-0 flex-1 max-w-full flex-col">
        <div className="bg-white dark:bg-[#171717]">{emptyState}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 max-w-full flex-col">
      <div
        className={[
          'relative flex min-h-0 flex-1 max-w-full flex-col overflow-hidden bg-white dark:bg-[#171717]',
          tableContainerClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {leftOverlay}
        {tableProps.ariaLabel && tableProps.colgroup && tableProps.headerRow ? (
          <EntityTableShell {...(tableProps as EntityTableShellProps)}>
            {children}
          </EntityTableShell>
        ) : (
          children
        )}
      </div>
      {selectionBar}
    </div>
  );
};
