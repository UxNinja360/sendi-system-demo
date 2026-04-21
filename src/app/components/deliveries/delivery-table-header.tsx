import React, { useState } from 'react';
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import {
  TABLE_ACTIONS_HEAD_CLASS,
  TABLE_CHECKBOX_HEAD_CLASS,
  TABLE_CHECKBOX_LABEL_CLASS,
  TABLE_HEAD_SURFACE_CLASS,
  TABLE_HEADER_CELL_BASE_CLASS,
} from '../common/table-ui';
import type { ColumnDef } from './column-defs';

interface DeliveryTableHeaderProps {
  visibleColumns: Set<string>;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (column: string) => void;
  // Selection
  allSelected: boolean;
  someSelected: boolean;
  onToggleSelectAll: () => void;
  // Column ordering
  orderedColumns: ColumnDef[];
  onColumnReorder?: (fromId: string, toId: string) => void;
}

export const DeliveryTableHeader: React.FC<DeliveryTableHeaderProps> = ({
  visibleColumns,
  sortColumn,
  sortDirection,
  handleSort,
  allSelected,
  someSelected,
  onToggleSelectAll,
  orderedColumns,
  onColumnReorder,
}) => {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const SortIcon = ({ col }: { col: string }) => {
    if (sortColumn !== col) return null;
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);
    setDraggingId(colId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (colId !== draggingId) {
      setDragOverId(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, toId: string) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('text/plain');
    setDragOverId(null);
    setDraggingId(null);
    if (fromId && fromId !== toId && onColumnReorder) {
      onColumnReorder(fromId, toId);
    }
  };

  const handleDragEnd = () => {
    setDragOverId(null);
    setDraggingId(null);
  };

  return (
    <thead className={TABLE_HEAD_SURFACE_CLASS}>
      <tr>
        {/* Checkbox column */}
        <th className={TABLE_CHECKBOX_HEAD_CLASS}>
          <label
            className={TABLE_CHECKBOX_LABEL_CLASS}
            style={{ touchAction: 'manipulation' }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
              onChange={onToggleSelectAll}
              className="w-4 h-4 rounded border-[#d4d4d4] dark:border-[#404040] text-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 cursor-pointer accent-[#16a34a]"
            />
          </label>
        </th>

        {/* Data columns - driven by orderedColumns */}
        {orderedColumns.map(col => {
          if (!visibleColumns.has(col.id)) return null;

          const isDragOver = dragOverId === col.id;
          const isDragging = draggingId === col.id;
          const dragClasses = isDragOver
            ? 'bg-[#dbeafe] dark:bg-[#1e3a8a]/40 ring-2 ring-inset ring-[#3b82f6]/40'
            : isDragging
              ? 'opacity-40'
              : '';

          if (col.sortable) {
            return (
              <th
                key={col.id}
                className={`${TABLE_HEADER_CELL_BASE_CLASS} pr-2 pl-2 ${dragClasses}`}
                draggable
                onDragStart={e => handleDragStart(e, col.id)}
                onDragOver={e => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, col.id)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSort(col.id)}
                    className="flex items-center gap-1 text-xs font-medium text-[#666d80] dark:text-[#a3a3a3] hover:text-[#16a34a] dark:hover:text-[#22c55e] transition-colors whitespace-nowrap"
                  >
                    <span>{col.label}</span>
                    <SortIcon col={col.id} />
                  </button>
                  <GripVertical className="w-3 h-3 text-[#d4d4d4] dark:text-[#404040] shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover/col:opacity-100 transition-opacity" />
                </div>
              </th>
            );
          }

          return (
            <th
              key={col.id}
                className={`${TABLE_HEADER_CELL_BASE_CLASS} pr-2 pl-2 ${dragClasses}`}
              draggable
              onDragStart={e => handleDragStart(e, col.id)}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.id)}
              onDragEnd={handleDragEnd}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-[#666d80] dark:text-[#a3a3a3] whitespace-nowrap">
                  {col.label}
                </span>
                <GripVertical className="w-3 h-3 text-[#d4d4d4] dark:text-[#404040] shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover/col:opacity-100 transition-opacity" />
              </div>
            </th>
          );
        })}

        {/* Actions column */}
        <th className={TABLE_ACTIONS_HEAD_CLASS}>
          <span className="sr-only">פעולות</span>
        </th>
      </tr>
    </thead>
  );
};
