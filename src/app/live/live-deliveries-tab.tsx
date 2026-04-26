import React from 'react';
import { MapPin } from 'lucide-react';
import { LiveDeliveriesListToolbar } from './live-deliveries-list-toolbar';
import { LiveDeliveriesSelectionBar } from './live-deliveries-selection-bar';
import { UltraCompactStrip, UltraCompactStripOrder } from './ultra-compact-strip';

type DeliverySortKey = 'time' | 'status' | 'restaurant' | 'address' | 'ready';

interface LiveDeliveriesTabProps {
  orders: UltraCompactStripOrder[];
  routeEtaLabelByDeliveryId?: Record<string, string | null>;
  sortBy: DeliverySortKey;
  sortDirection: 'asc' | 'desc';
  showSortMenu: boolean;
  sortLabel: string;
  selectedOrderId: string | null;
  selectedDeliveryIds: Set<string>;
  hoveredOrderId: string | null;
  isDeliverySelectable: (deliveryId: string) => boolean;
  onToggleSortMenu: () => void;
  onCloseSortMenu: () => void;
  onSelectSort: (value: DeliverySortKey) => void;
  onToggleDirection: () => void;
  onOrderClick: (order: UltraCompactStripOrder) => void;
  onCancel: (deliveryId: string) => void;
  onUnassign: (deliveryId: string) => void;
  onAssignCourier: (deliveryId: string) => void;
  onToggleSelection: (deliveryId: string) => void;
  onHover: (orderId: string | null) => void;
  onShowDetails: (order: UltraCompactStripOrder) => void;
  onClearSelection: () => void;
  onAssignSelected: () => void;
}

export const LiveDeliveriesTab: React.FC<LiveDeliveriesTabProps> = ({
  orders,
  routeEtaLabelByDeliveryId,
  sortBy,
  sortDirection,
  showSortMenu,
  sortLabel,
  selectedOrderId,
  selectedDeliveryIds,
  hoveredOrderId,
  isDeliverySelectable,
  onToggleSortMenu,
  onCloseSortMenu,
  onSelectSort,
  onToggleDirection,
  onOrderClick,
  onCancel,
  onUnassign,
  onAssignCourier,
  onToggleSelection,
  onHover,
  onShowDetails,
  onClearSelection,
  onAssignSelected,
}) => {
  return (
    <>
      <LiveDeliveriesListToolbar
        ordersCount={orders.length}
        sortBy={sortBy}
        sortDirection={sortDirection}
        showSortMenu={showSortMenu}
        sortLabel={sortLabel}
        onToggleSortMenu={onToggleSortMenu}
        onCloseSortMenu={onCloseSortMenu}
        onSelectSort={onSelectSort}
        onToggleDirection={onToggleDirection}
      />

      {orders.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center bg-white px-4 py-12 dark:bg-app-surface">
          <MapPin className="mb-2 h-10 w-10 text-[#404040]" />
          <p className="text-xs text-[#737373]">אין משלוחים להצגה</p>
        </div>
      ) : (
        orders.map((order) => (
          <UltraCompactStrip
            key={order.deliveryId}
            order={order}
            routeEtaLabel={routeEtaLabelByDeliveryId?.[order.deliveryId] ?? null}
            isSelected={selectedOrderId === order.id || selectedOrderId === order.deliveryId}
            isChecked={selectedDeliveryIds.has(order.deliveryId)}
            onClick={() => onOrderClick(order)}
            onCancel={onCancel}
            onUnassign={onUnassign}
            onAssignCourier={onAssignCourier}
            onToggleCheck={(deliveryId) => {
              if (!isDeliverySelectable(deliveryId)) return;
              onToggleSelection(deliveryId);
            }}
            onHover={onHover}
            isHovered={hoveredOrderId === order.id}
            onShowDetails={onShowDetails}
          />
        ))
      )}

      <LiveDeliveriesSelectionBar
        selectedCount={selectedDeliveryIds.size}
        onClear={onClearSelection}
        onAssign={onAssignSelected}
      />
    </>
  );
};

