import type { Delivery, DeliveryState } from '../types/delivery.types';

export const DELIVERY_CREDITS_PER_ASSIGNMENT = 1;

export const getDeliveryCreditConsumedAt = (delivery: Delivery) => {
  const value = delivery.deliveryCreditConsumedAt;
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const hasDeliveryConsumedCredit = (delivery: Delivery) =>
  getDeliveryCreditConsumedAt(delivery) !== null;

export const getCreditCostForAssignment = (delivery: Delivery) =>
  hasDeliveryConsumedCredit(delivery) ? 0 : DELIVERY_CREDITS_PER_ASSIGNMENT;

export const canAssignDeliveryWithCredits = (
  state: Pick<DeliveryState, 'deliveryBalance'>,
  delivery: Delivery
) => state.deliveryBalance >= getCreditCostForAssignment(delivery);
