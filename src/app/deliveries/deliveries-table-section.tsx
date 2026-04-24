import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Delivery, DeliveryStatus, Courier } from '../types/delivery.types';
import { DeliveryTableRow, RowHeight } from './delivery-table-row';
import { EnhancedEmptyState } from './enhanced-empty-state';
import type { ColumnDef } from './column-defs';
import {
  EntityTableActionsHeader,
  EntityTableHeaderCheckbox,
} from '../components/common/entity-table-shell';
import { EntityTableHeaderCell } from '../components/common/entity-table-header-cell';
import { ENTITY_TABLE_WIDTHS } from '../components/common/entity-table-shared';
import { ListTableSection } from '../components/common/list-table-section';

type DeliveriesTableSectionProps = {
  filteredDeliveries: Delivery[];
  emptyStateMode: 'no-data' | 'no-results' | 'filtered-empty';
  onClearFilters: () => void;
  totalCount: number;
  tableScrollRef: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: () => void;
  orderedColumns: ColumnDef[];
  visibleColumns: Set<string>;
  getDeliveryColumnWidth: (columnId: string) => string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  selectedIds: Set<string>;
  onToggleSelectAll: () => void;
  onColumnReorder: (fromId: string, toId: string) => void;
  couriers: Courier[];
  calculateTimeRemaining: (delivery: Delivery) => number | null;
  formatTime: (seconds: number) => string;
  onToggleSelect: (id: string) => void;
  onOpenDrawer: (id: string) => void;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
  onUnassignCourier: (deliveryId: string) => void;
  onEditDelivery: (deliveryId: string) => void;
  drawerDeliveryId: string | null;
  rowHeight: RowHeight;
  selectionBar?: React.ReactNode;
};

export const DeliveriesTableSection: React.FC<DeliveriesTableSectionProps> = ({
  filteredDeliveries,
  emptyStateMode,
  onClearFilters,
  totalCount,
  tableScrollRef,
  isDragging,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  orderedColumns,
  visibleColumns,
  getDeliveryColumnWidth,
  sortColumn,
  sortDirection,
  onSort,
  selectedIds,
  onToggleSelectAll,
  onColumnReorder,
  couriers,
  calculateTimeRemaining,
  formatTime,
  onToggleSelect,
  onOpenDrawer,
  onStatusChange,
  onCancelDelivery,
  onCompleteDelivery,
  onUnassignCourier,
  onEditDelivery,
  drawerDeliveryId,
  rowHeight,
  selectionBar,
}) => {
  const navigate = useNavigate();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (event: React.DragEvent<HTMLTableCellElement>, columnId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnId);
    setDraggingId(columnId);
  };

  const handleDragOver = (event: React.DragEvent<HTMLTableCellElement>, columnId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (columnId !== draggingId) {
      setDragOverId(columnId);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLTableCellElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain');
    setDragOverId(null);
    setDraggingId(null);
    if (sourceId && sourceId !== targetId) {
      onColumnReorder(sourceId, targetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDragOverId(null);
    setDraggingId(null);
  };

  return (
    <ListTableSection
      isEmpty={filteredDeliveries.length === 0}
      emptyState={
        <EnhancedEmptyState
          mode={emptyStateMode}
          onClearFilters={onClearFilters}
          totalCount={totalCount}
        />
      }
      selectionBar={selectionBar}
      ariaLabel="טבלת משלוחים"
      scrollContainerRef={tableScrollRef}
      wrapperClassName={`scroll-smooth flex-1 min-h-0 ${
        isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
      }`}
      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      colgroup={
        <colgroup>
          <col style={{ width: ENTITY_TABLE_WIDTHS.checkbox }} />
          {orderedColumns
            .filter((column) => visibleColumns.has(column.id))
            .map((column) => (
              <col key={column.id} style={{ width: getDeliveryColumnWidth(column.id) }} />
            ))}
          <col style={{ width: '40px' }} />
        </colgroup>
      }
      headerRow={
        <tr>
          <EntityTableHeaderCheckbox
            checked={selectedIds.size === filteredDeliveries.length && filteredDeliveries.length > 0}
            indeterminate={selectedIds.size > 0 && selectedIds.size !== filteredDeliveries.length}
            onChange={onToggleSelectAll}
          />
          {orderedColumns
            .filter((column) => visibleColumns.has(column.id))
            .map((column) => (
              <EntityTableHeaderCell
                key={column.id}
                label={column.label}
                draggable
                onDragStart={(event) => handleDragStart(event, column.id)}
                onDragOver={(event) => handleDragOver(event, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(event) => handleDrop(event, column.id)}
                onDragEnd={handleDragEnd}
                isDragging={draggingId === column.id}
                isDragOver={dragOverId === column.id && draggingId !== column.id}
                onSort={column.sortable ? () => onSort(column.id) : undefined}
                sortDirection={sortColumn === column.id ? sortDirection : null}
              />
            ))}
          <EntityTableActionsHeader />
        </tr>
      }
    >
      {filteredDeliveries.map((delivery) => {
        const courier = delivery.courierId
          ? couriers.find((candidate) => candidate.id === delivery.courierId) || null
          : null;
        const timeRemaining = calculateTimeRemaining(delivery);

        return (
          <DeliveryTableRow
            key={delivery.id}
            delivery={delivery}
            courier={courier}
            timeRemaining={timeRemaining}
            formatTime={formatTime}
            visibleColumns={visibleColumns}
            onNavigate={() => navigate(`/delivery/${delivery.id}`)}
            isSelected={selectedIds.has(delivery.id)}
            onToggleSelect={onToggleSelect}
            onOpenDrawer={onOpenDrawer}
            onStatusChange={onStatusChange}
            onCancelDelivery={onCancelDelivery}
            onCompleteDelivery={onCompleteDelivery}
            onUnassignCourier={onUnassignCourier}
            onEditDelivery={onEditDelivery}
            isDrawerTarget={drawerDeliveryId === delivery.id}
            orderedColumns={orderedColumns}
            rowHeight={rowHeight}
          />
        );
      })}
    </ListTableSection>
  );
};

