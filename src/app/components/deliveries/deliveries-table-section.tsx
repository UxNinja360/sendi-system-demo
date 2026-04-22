import React from 'react';
import { useNavigate } from 'react-router';
import { Delivery, DeliveryStatus, Courier } from '../../types/delivery.types';
import { DeliveryTableHeader } from './delivery-table-header';
import { DeliveryTableRow, RowHeight } from './delivery-table-row';
import { EnhancedEmptyState } from './enhanced-empty-state';
import type { ColumnDef } from './column-defs';

type DeliveriesTableSectionProps = {
  filteredDeliveries: Delivery[];
  emptyStateMode: 'no-data' | 'no-results' | 'filtered-empty';
  onClearFilters: () => void;
  totalCount: number;
  canScrollLeft: boolean;
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
};

export const DeliveriesTableSection: React.FC<DeliveriesTableSectionProps> = ({
  filteredDeliveries,
  emptyStateMode,
  onClearFilters,
  totalCount,
  canScrollLeft,
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
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {filteredDeliveries.length === 0 ? (
        <div className="bg-white dark:bg-[#171717]">
          <EnhancedEmptyState mode={emptyStateMode} onClearFilters={onClearFilters} totalCount={totalCount} />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#171717] overflow-hidden relative flex flex-col min-h-0">
          {canScrollLeft && (
            <div className="absolute top-0 left-[48px] bottom-0 w-8 bg-gradient-to-r from-white/80 dark:from-[#171717]/80 to-transparent z-10 pointer-events-none" />
          )}

          <div
            ref={tableScrollRef}
            className={`overflow-auto scroll-smooth flex-1 min-h-0 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <table className="w-full" role="grid" aria-label="טבלת משלוחים">
              <colgroup>
                <col style={{ width: '44px' }} />
                {orderedColumns
                  .filter((column) => visibleColumns.has(column.id))
                  .map((column) => (
                    <col key={column.id} style={{ width: getDeliveryColumnWidth(column.id) }} />
                  ))}
                <col style={{ width: '40px' }} />
              </colgroup>
              <DeliveryTableHeader
                visibleColumns={visibleColumns}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                handleSort={onSort}
                allSelected={selectedIds.size === filteredDeliveries.length && filteredDeliveries.length > 0}
                someSelected={selectedIds.size > 0}
                onToggleSelectAll={onToggleSelectAll}
                orderedColumns={orderedColumns}
                onColumnReorder={onColumnReorder}
              />
              <tbody>
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
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
