import { Delivery } from '../types/delivery.types';

const toBatchBucket = (value: Date | null | undefined) => {
  if (!value) return 'legacy';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'legacy';
  return Math.floor(timestamp / 1000).toString();
};

export const getRestaurantPickupBaseKey = (
  delivery: Pick<Delivery, 'restaurantId' | 'restaurantName' | 'pickup_latitude' | 'pickup_longitude'>
) =>
  delivery.restaurantId ||
  `${delivery.restaurantName}:${delivery.pickup_latitude ?? ''}:${delivery.pickup_longitude ?? ''}`;

export const getDeliveryPickupBatchKey = (delivery: Delivery) => {
  if (delivery.pickupBatchId) return delivery.pickupBatchId;

  const baseKey = getRestaurantPickupBaseKey(delivery);
  const isPickedBatch =
    Boolean(delivery.pickedUpAt) ||
    delivery.status === 'delivering' ||
    delivery.status === 'delivered';
  const anchor = isPickedBatch
    ? delivery.pickedUpAt ?? delivery.assignedAt ?? delivery.createdAt
    : delivery.assignedAt ?? delivery.createdAt;

  return `legacy:${baseKey}:${isPickedBatch ? 'picked' : 'assigned'}:${toBatchBucket(anchor)}`;
};

export const getPickupGroupStopId = (pickupBatchKey: string) => `pickup-group:${pickupBatchKey}`;

export const buildDefaultRouteStopIds = (deliveries: Delivery[]) => {
  const seenPickupGroups = new Set<string>();
  const stopIds: string[] = [];

  deliveries.forEach((delivery) => {
    const pickupStopId = getPickupGroupStopId(getDeliveryPickupBatchKey(delivery));
    if (!seenPickupGroups.has(pickupStopId)) {
      seenPickupGroups.add(pickupStopId);
      stopIds.push(pickupStopId);
    }

    stopIds.push(`${delivery.id}-dropoff`);
  });

  return stopIds;
};

export const createPickupBatchId = (restaurantKey: string, seed: number = Date.now()) =>
  `batch:${restaurantKey}:${seed}:${Math.random().toString(36).slice(2, 8)}`;
