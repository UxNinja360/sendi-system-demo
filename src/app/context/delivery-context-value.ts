import { createContext, useContext, type Dispatch } from 'react';
import type { Courier, Delivery, DeliveryAction, DeliveryState } from '../types/delivery.types';

export interface DeliveryContextType {
  state: DeliveryState;
  dispatch: Dispatch<DeliveryAction>;
  toggleSystem: () => void;
  assignCourier: (deliveryId: string, courierId: string, pickupBatchId?: string) => void;
  cancelDelivery: (deliveryId: string) => void;
  unassignCourier: (deliveryId: string) => void;
  updateDelivery: (deliveryId: string, updates: Partial<Delivery>) => void;
  resetSystem: () => void;
  addCourier: (courier: Courier) => void;
  removeCourier: (courierId: string) => void;
  addDeliveryBalance: (amount: number) => void;
}

export const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (context === undefined) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
};
