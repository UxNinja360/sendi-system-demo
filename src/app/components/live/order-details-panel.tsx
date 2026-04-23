import React from 'react';
import { useNavigate } from 'react-router';
import { useDelivery } from '../../context/delivery.context';
import { SharedDeliverySidePanelShell } from '../deliveries/shared-delivery-side-panel-shell';
import type { Delivery } from '../../types/delivery.types';

interface Order {
  id: string;
  deliveryId: string;
  status: string;
  fullDelivery?: Delivery;
}

interface OrderDetailsPanelProps {
  order: Order | null;
  onClose: () => void;
  onEditDelivery?: (deliveryId: string) => void;
}

export const OrderDetailsPanel: React.FC<OrderDetailsPanelProps> = ({ order, onClose, onEditDelivery }) => {
  const navigate = useNavigate();
  const { state, dispatch, assignCourier, cancelDelivery } = useDelivery();

  if (!order?.fullDelivery) return null;

  const delivery = order.fullDelivery;
  const courier = delivery.courierId
    ? state.couriers.find((item) => item.id === delivery.courierId) ?? null
    : null;

  return (
    <>
      <div className="fixed md:left-4 md:top-4 md:bottom-4 md:w-[500px] bottom-0 left-0 right-0 md:right-auto max-h-[85vh] md:max-h-none z-[201] delivery-panel-enter">
        <div className="h-full bg-white dark:bg-[#171717] md:rounded-2xl rounded-t-3xl shadow-2xl border-t md:border border-[#e5e5e5] dark:border-[#262626] overflow-hidden flex flex-col">
          <div className="md:hidden flex-shrink-0 py-2 flex justify-center">
            <div className="w-10 h-1 bg-[#d4d4d4] dark:bg-[#404040] rounded-full" />
          </div>

          <SharedDeliverySidePanelShell
            delivery={delivery}
            courier={courier}
            allCouriers={state.couriers}
            onClose={onClose}
            onNavigatePrev={() => {}}
            onNavigateNext={() => {}}
            hasPrev={false}
            hasNext={false}
            currentIndex={0}
            totalCount={1}
            onStatusChange={(deliveryId, status) => dispatch({ type: 'UPDATE_STATUS', payload: { deliveryId, status } })}
            onAssignCourier={assignCourier}
            onCancelDelivery={cancelDelivery}
            onCompleteDelivery={(deliveryId) => dispatch({ type: 'COMPLETE_DELIVERY', payload: deliveryId })}
            onEditDelivery={(deliveryId) => onEditDelivery ? onEditDelivery(deliveryId) : navigate(`/delivery/${deliveryId}`)}
          />
        </div>
      </div>
    </>
  );
};
