import type { Courier } from '../types/delivery.types';

export const MAX_ACTIVE_DELIVERIES_PER_COURIER = 2;

export const getCourierActiveDeliveryCount = (
  courier: Courier,
  ignoredDeliveryId?: string
) => {
  const activeIds = ignoredDeliveryId
    ? courier.activeDeliveryIds.filter((deliveryId) => deliveryId !== ignoredDeliveryId)
    : courier.activeDeliveryIds;

  return new Set(activeIds).size;
};

export const canCourierAcceptDelivery = (
  courier: Courier,
  ignoredDeliveryId?: string,
  maxActiveDeliveries: number = MAX_ACTIVE_DELIVERIES_PER_COURIER
) =>
  courier.status !== 'offline' &&
  courier.isOnShift &&
  getCourierActiveDeliveryCount(courier, ignoredDeliveryId) < maxActiveDeliveries;

export const getAutoAssignableCourier = (couriers: Courier[]) =>
  couriers.find((courier) => canCourierAcceptDelivery(courier));
