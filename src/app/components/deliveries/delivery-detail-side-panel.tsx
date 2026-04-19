import React from 'react';
import { Delivery, Courier, DeliveryStatus } from '../../types/delivery.types';
import { SharedDeliverySidePanelShell } from './shared-delivery-side-panel-shell';

interface DeliveryDetailSidePanelProps {
  delivery: Delivery | null;
  courier: Courier | null;
  allCouriers: Courier[];
  onClose: () => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onAssignCourier: (deliveryId: string, courierId: string) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
  onEditDelivery: (deliveryId: string) => void;
  stats?: { total: number; delivered: number; cancelled: number; pending: number; revenue: number };
}

export const DeliveryDetailSidePanel: React.FC<DeliveryDetailSidePanelProps> = (props) => {
  return <SharedDeliverySidePanelShell {...props} />;
};
