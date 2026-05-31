import type { Delivery, DeliveryState, Restaurant } from '../types/delivery.types';
import { isSendiPlusDelivery } from './delivery-finance';

export const DELIVERY_CREDITS_PER_ASSIGNMENT = 1;

export const getDeliveryCreditConsumedAt = (delivery: Delivery) => {
  const value = delivery.deliveryCreditConsumedAt;
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const hasDeliveryConsumedCredit = (delivery: Delivery) =>
  getDeliveryCreditConsumedAt(delivery) !== null;

export const shouldConsumeDeliveryCreditOnIntake = (
  delivery: Delivery,
  restaurant?: Pick<Restaurant, 'chainId' | 'name'> | null,
) => !isSendiPlusDelivery(delivery, restaurant);

export const getCreditCostForDeliveryIntake = (
  delivery: Delivery,
  restaurant?: Pick<Restaurant, 'chainId' | 'name'> | null,
) =>
  hasDeliveryConsumedCredit(delivery) || !shouldConsumeDeliveryCreditOnIntake(delivery, restaurant)
    ? 0
    : DELIVERY_CREDITS_PER_ASSIGNMENT;

export const getCreditCostForAssignment = (delivery: Delivery) =>
  hasDeliveryConsumedCredit(delivery) ? 0 : DELIVERY_CREDITS_PER_ASSIGNMENT;

export const canAssignDeliveryWithCredits = (
  state: Pick<DeliveryState, 'deliveryBalance'>,
  delivery: Delivery
) => state.deliveryBalance >= getCreditCostForAssignment(delivery);
