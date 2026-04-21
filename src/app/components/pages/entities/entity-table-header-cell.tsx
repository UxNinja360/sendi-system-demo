import React from 'react';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { ENTITY_TABLE_HEADER_CELL_BASE_CLASS } from './entity-table-shared';

type SortDirection = 'asc' | 'desc' | null;

type EntityTableHeaderCellProps = {
  label: React.ReactNode;
  className?: string;
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLTableCellElement>;
  onDragOver?: React.DragEventHandler<HTMLTableCellElement>;
  onDragLeave?: React.DragEventHandler<HTMLTableCellElement>;
  onDrop?: React.DragEventHandler<HTMLTableCellElement>;
  onDragEnd?: React.DragEventHandler<HTMLTableCellElement>;
  isDragging?: boolean;
  isDragOver?: boolean;
  onSort?: () => void;
  sortDirection?: SortDirection;
  showGrip?: boolean;
};

export const EntityTableHeaderCell: React.FC<EntityTableHeaderCellProps> = ({
  label,
  className = '',
  draggable = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragging = false,
  isDragOver = false,
  onSort,
  sortDirection = null,
  showGrip = true,
}) => {
  return (
    <th
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={[
        ENTITY_TABLE_HEADER_CELL_BASE_CLASS,
        'pr-2 pl-2 whitespace-nowrap select-none',
        draggable ? 'cursor-grab' : '',
        isDragging ? 'opacity-40' : '',
        isDragOver ? 'bg-[#dbeafe] ring-2 ring-inset ring-[#3b82f6]/40 dark:bg-[#1e3a8a]/40' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center gap-1">
        {onSort ? (
          <button
            type="button"
            onClick={onSort}
            className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-[#666d80] transition-colors hover:text-[#16a34a] dark:text-[#a3a3a3] dark:hover:text-[#22c55e]"
          >
            <span>{label}</span>
            {sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : null}
            {sortDirection === 'desc' ? <ChevronDown className="h-3 w-3" /> : null}
          </button>
        ) : (
          <span className="text-xs font-medium text-[#666d80] dark:text-[#a3a3a3]">{label}</span>
        )}
        {showGrip ? (
          <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-[#d4d4d4] opacity-0 transition-opacity group-hover/col:opacity-100 active:cursor-grabbing dark:text-[#404040]" />
        ) : null}
      </div>
    </th>
  );
};
