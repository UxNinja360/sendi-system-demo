import React from 'react';
import { Delivery, Courier, DeliveryStatus } from '../types/delivery.types';
import { DeliveryEditDialog } from './delivery-edit-dialog';
import { NewDeliveryDialog } from './new-delivery-dialog';
import { SharedDeliverySidePanelShell } from './shared-delivery-side-panel-shell';

type SidePanelStats = {
  total: number;
  delivered: number;
  cancelled: number;
  pending: number;
  expired?: number;
  revenue: number;
};

type DeliveriesOverlaysProps = {
  drawerDeliveryId: string | null;
  drawerDelivery: Delivery | null;
  drawerCourier: Courier | null;
  allCouriers: Courier[];
  deliveryBalance: number;
  onCloseDrawer: () => void;
  onDrawerPrev: () => void;
  onDrawerNext: () => void;
  hasDrawerPrev: boolean;
  hasDrawerNext: boolean;
  drawerIndex: number;
  filteredDeliveryCount: number;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onAssignCourier: (deliveryId: string, courierId: string) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
  onEditDelivery: (deliveryId: string) => void;
  sidePanelStats: SidePanelStats;
  newDeliveryOpen: boolean;
  onCloseNewDelivery: () => void;
  restaurantOptions: Array<{ id: string; label: string }>;
  courierOptions: Array<{ id: string; label: string }>;
  editDelivery: Delivery | null;
  editDeliveryOpen: boolean;
  onCloseEdit: () => void;
  onSaveDelivery: (deliveryId: string, updates: Partial<Delivery>) => void;
};

export const DeliveriesOverlays: React.FC<DeliveriesOverlaysProps> = ({
  drawerDeliveryId,
  drawerDelivery,
  drawerCourier,
  allCouriers,
  deliveryBalance,
  onCloseDrawer,
  onDrawerPrev,
  onDrawerNext,
  hasDrawerPrev,
  hasDrawerNext,
  drawerIndex,
  filteredDeliveryCount,
  onStatusChange,
  onAssignCourier,
  onCancelDelivery,
  onCompleteDelivery,
  onEditDelivery,
  sidePanelStats,
  newDeliveryOpen,
  onCloseNewDelivery,
  restaurantOptions,
  courierOptions,
  editDelivery,
  editDeliveryOpen,
  onCloseEdit,
  onSaveDelivery,
}) => {
  return (
    <>
      {drawerDeliveryId && (
        <>
          <div className="fixed inset-0 z-[200]" onClick={onCloseDrawer} />
          <div className="fixed md:left-4 md:top-4 md:bottom-4 md:w-[500px] bottom-0 left-0 right-0 md:right-auto max-h-[85vh] md:max-h-none z-[201] delivery-panel-enter">
            <div className="h-full bg-white dark:bg-app-surface md:rounded-2xl rounded-t-3xl shadow-2xl border-t md:border border-[#e5e5e5] dark:border-app-border overflow-hidden flex flex-col">
              <div className="md:hidden flex-shrink-0 py-2 flex justify-center">
                <div className="w-10 h-1 bg-[#d4d4d4] dark:bg-[#404040] rounded-full" />
              </div>
              <SharedDeliverySidePanelShell
                delivery={drawerDelivery}
                courier={drawerCourier}
                allCouriers={allCouriers}
                deliveryBalance={deliveryBalance}
                onClose={onCloseDrawer}
                onNavigatePrev={onDrawerPrev}
                onNavigateNext={onDrawerNext}
                hasPrev={hasDrawerPrev}
                hasNext={hasDrawerNext}
                currentIndex={drawerIndex}
                totalCount={filteredDeliveryCount}
                onStatusChange={onStatusChange}
                onAssignCourier={onAssignCourier}
                onCancelDelivery={onCancelDelivery}
                onCompleteDelivery={onCompleteDelivery}
                onEditDelivery={onEditDelivery}
                stats={sidePanelStats}
              />
            </div>
          </div>
        </>
      )}

      <NewDeliveryDialog
        isOpen={newDeliveryOpen}
        onClose={onCloseNewDelivery}
        restaurantOptions={restaurantOptions}
        courierOptions={courierOptions}
      />

      <DeliveryEditDialog
        delivery={editDelivery}
        isOpen={editDeliveryOpen}
        onClose={onCloseEdit}
        onSave={onSaveDelivery}
      />
    </>
  );
};

