import type { Delivery, DeliveryState } from '../types/delivery.types';

const LIVE_DELIVERY_STATUSES = new Set<Delivery['status']>(['assigned', 'delivering']);

const areStringArraysEqual = (left: string[] = [], right: string[] = []) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export const reconcileCourierDeliveryInvariants = (state: DeliveryState): DeliveryState => {
  const activeDeliveryIdsByCourier = new Map<string, string[]>();

  state.deliveries.forEach((delivery) => {
    if (!delivery.courierId || !LIVE_DELIVERY_STATUSES.has(delivery.status)) return;

    const activeDeliveryIds = activeDeliveryIdsByCourier.get(delivery.courierId) ?? [];
    activeDeliveryIds.push(delivery.id);
    activeDeliveryIdsByCourier.set(delivery.courierId, activeDeliveryIds);
  });

  let couriersChanged = false;
  const couriers = state.couriers.map((courier) => {
    const activeDeliveryIds = activeDeliveryIdsByCourier.get(courier.id) ?? [];
    const status =
      courier.status === 'offline'
        ? 'offline'
        : activeDeliveryIds.length > 0
          ? 'busy'
          : 'available';

    if (
      courier.status === status &&
      areStringArraysEqual(courier.activeDeliveryIds, activeDeliveryIds)
    ) {
      return courier;
    }

    couriersChanged = true;
    return {
      ...courier,
      status,
      activeDeliveryIds,
    };
  });

  const courierIds = new Set(couriers.map((courier) => courier.id));
  const routePlanEntries = Object.entries(state.courierRoutePlans ?? {}).filter(([courierId]) =>
    courierIds.has(courierId)
  );
  const routePlansChanged =
    routePlanEntries.length !== Object.keys(state.courierRoutePlans ?? {}).length ||
    !state.courierRoutePlans;

  if (!couriersChanged && !routePlansChanged) {
    return state;
  }

  return {
    ...state,
    couriers,
    courierRoutePlans: routePlansChanged ? Object.fromEntries(routePlanEntries) : state.courierRoutePlans,
  };
};
