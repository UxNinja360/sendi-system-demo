import { Delivery } from '../types/delivery.types';
import {
  getDeliveryPickupBatchKey,
  getPickupGroupStopId,
} from '../utils/pickup-batches';

export type MapPosition = {
  lat: number;
  lng: number;
};

const padDatePart = (value: number) => value.toString().padStart(2, '0');

export const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const isOvernightShift = (startTime: string, endTime: string) => timeToMinutes(endTime) <= timeToMinutes(startTime);

export const compareShiftDateTime = (
  left: { date: string; startTime: string },
  right: { date: string; startTime: string }
) => {
  if (left.date !== right.date) return left.date.localeCompare(right.date);
  return left.startTime.localeCompare(right.startTime);
};

export const buildShiftBounds = (dateKey: string, startTime: string, endTime: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const start = new Date(year, (month || 1) - 1, day || 1, startHours || 0, startMinutes || 0, 0, 0);
  const end = new Date(year, (month || 1) - 1, day || 1, endHours || 0, endMinutes || 0, 0, 0);

  if (isOvernightShift(startTime, endTime) || end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
};

export const hasValidPosition = (value: Partial<MapPosition> | null | undefined): value is MapPosition =>
  typeof value?.lat === 'number' &&
  Number.isFinite(value.lat) &&
  typeof value?.lng === 'number' &&
  Number.isFinite(value.lng);

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (from: MapPosition, to: MapPosition) => {
  const earthRadiusKm = 6371;
  const latDiff = toRadians(to.lat - from.lat);
  const lngDiff = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDiff / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const estimateTravelMinutes = (from: MapPosition | null, to: MapPosition | null) => {
  if (!from || !to) return 8;
  const distanceKm = getDistanceKm(from, to);
  const minutes = (distanceKm / 18) * 60;
  return Math.max(4, Math.round(minutes) + 2);
};

export interface RouteStop {
  id: string;
  deliveryId: string;
  deliveryIds?: string[];
  type: 'pickup' | 'dropoff';
  order: Delivery;
  orders?: Delivery[];
  isPreview?: boolean;
}

export const getStopLocation = (stop: RouteStop): MapPosition | null => {
  if (stop.type === 'pickup') {
    const pickupLat = stop.order.pickup_latitude;
    const pickupLng = stop.order.pickup_longitude;
    return hasValidPosition({ lat: pickupLat, lng: pickupLng })
      ? { lat: pickupLat, lng: pickupLng }
      : null;
  }

  return hasValidPosition({ lat: stop.order.dropoff_latitude, lng: stop.order.dropoff_longitude })
    ? { lat: stop.order.dropoff_latitude as number, lng: stop.order.dropoff_longitude as number }
    : null;
};

export const getPickupReadyAt = (orders: Delivery[]) => {
  const readyTimes = orders
    .map((delivery) => {
      if (delivery.pickedUpAt) return null;
      if (delivery.orderReadyTime) return new Date(delivery.orderReadyTime);
      if (typeof delivery.preparationTime === 'number') {
        return new Date(new Date(delivery.createdAt).getTime() + delivery.preparationTime * 60000);
      }
      return null;
    })
    .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()));

  if (readyTimes.length === 0) return null;
  return new Date(Math.max(...readyTimes.map((value) => value.getTime())));
};

export const deliveriesToRouteStops = (
  deliveries: Delivery[],
  isPreview: boolean = false
): RouteStop[] => {
  const stops: RouteStop[] = [];
  const pickupGroups = new Map<string, Delivery[]>();

  deliveries.forEach((order) => {
    const pickupStillNeeded = order.status !== 'delivering' && !order.pickedUpAt;

    if (pickupStillNeeded) {
      const pickupGroupKey = getDeliveryPickupBatchKey(order);
      const groupedOrders = pickupGroups.get(pickupGroupKey);

      if (groupedOrders) {
        groupedOrders.push(order);
      } else {
        pickupGroups.set(pickupGroupKey, [order]);
        stops.push({
          id: getPickupGroupStopId(pickupGroupKey),
          deliveryId: order.id,
          deliveryIds: [order.id],
          type: 'pickup',
          order,
          orders: [order],
          isPreview,
        });
      }
    }

    stops.push({
      id: `${order.id}-dropoff`,
      deliveryId: order.id,
      deliveryIds: [order.id],
      type: 'dropoff',
      order,
      orders: [order],
      isPreview,
    });
  });

  return stops.map((stop) => {
    if (stop.type !== 'pickup') return stop;

    const groupedOrders = pickupGroups.get(getDeliveryPickupBatchKey(stop.order)) ?? [stop.order];
    return {
      ...stop,
      deliveryIds: groupedOrders.map((groupedOrder) => groupedOrder.id),
      orders: groupedOrders,
    };
  });
};

