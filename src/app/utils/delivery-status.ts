import type { Delivery } from '../types/delivery.types';

export const OPERATIONAL_DELIVERY_STATUSES = new Set<Delivery['status']>([
  'pending',
  'assigned',
  'delivering',
]);

export const isOperationalDelivery = (delivery: Pick<Delivery, 'status'>) =>
  OPERATIONAL_DELIVERY_STATUSES.has(delivery.status);
