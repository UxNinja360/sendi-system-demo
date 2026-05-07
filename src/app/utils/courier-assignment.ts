import type { Courier } from '../types/delivery.types';

export const MAX_ACTIVE_DELIVERIES_PER_COURIER = 2;

type CourierAssignmentShiftFields = Pick<Courier, 'employmentType' | 'isOnShift'>;

export const doesCourierRequireShiftForDeliveryAssignment = (
  courier: CourierAssignmentShiftFields
) => courier.employmentType === 'שעתי';

export const isCourierShiftEligibleForDeliveryAssignment = (
  courier: CourierAssignmentShiftFields
) => !doesCourierRequireShiftForDeliveryAssignment(courier) || courier.isOnShift;

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
  isCourierShiftEligibleForDeliveryAssignment(courier) &&
  getCourierActiveDeliveryCount(courier, ignoredDeliveryId) < maxActiveDeliveries;

export const getAutoAssignableCourier = (couriers: Courier[]) =>
  couriers.find((courier) => canCourierAcceptDelivery(courier));
