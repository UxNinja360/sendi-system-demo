import type { Courier, Delivery, DeliveryState } from '../types/delivery.types';
import { buildDefaultRouteStopIds, getDeliveryPickupBatchKey } from '../utils/pickup-batches';
import {
  advanceAlongRoutePath,
  buildSimulatedGpsRoutePath,
  getRoutePathDistanceKm,
} from './route-geometry';

export type MapPosition = {
  lat: number;
  lng: number;
};

export type LiveSimulationStatusUpdate = {
  type: 'delivering' | 'complete' | 'arrived_pickup';
  deliveryIds: string[];
};

export type LiveSimulationTickResult = {
  courierPositions: Map<string, MapPosition>;
  courierPositionTimestamps: Map<string, number>;
  positionChanged: boolean;
  phaseUpdates: Map<string, Partial<Delivery>>;
  statusUpdates: LiveSimulationStatusUpdate[];
};

export const COURIER_TRAVEL_SPEED_KMH = 18;
export const COURIER_ARRIVAL_DISTANCE_KM = 0.03;
const SIMULATION_MIN_STEP_MS = 250;
const SIMULATION_FALLBACK_STEP_MS = 1000;
const SIMULATION_BACKGROUND_CATCHUP_MS = 30 * 60 * 1000;

export const COURIER_FALLBACK_POSITIONS: MapPosition[] = [
  { lat: 32.0700, lng: 34.7735 }, { lat: 32.0752, lng: 34.7731 },
  { lat: 32.0800, lng: 34.7728 }, { lat: 32.0626, lng: 34.7738 },
  { lat: 32.0643, lng: 34.7769 }, { lat: 32.0718, lng: 34.7669 },
  { lat: 32.0765, lng: 34.7662 }, { lat: 32.0653, lng: 34.7755 },
  { lat: 32.0760, lng: 34.7643 }, { lat: 32.0820, lng: 34.7836 },
  { lat: 32.0646, lng: 34.7742 }, { lat: 32.0649, lng: 34.7698 },
  { lat: 32.0864, lng: 34.7781 }, { lat: 32.0562, lng: 34.7718 },
  { lat: 32.0830, lng: 34.7900 }, { lat: 32.0899, lng: 34.7793 },
  { lat: 32.0834, lng: 34.8096 }, { lat: 32.0783, lng: 34.8088 },
  { lat: 32.0808, lng: 34.8050 }, { lat: 32.0700, lng: 34.8135 },
  { lat: 32.0533, lng: 34.7583 }, { lat: 32.0175, lng: 34.7783 },
  { lat: 32.0230, lng: 34.7535 }, { lat: 32.0968, lng: 34.7730 },
];

export const hasValidPosition = (value: Partial<MapPosition> | null | undefined): value is MapPosition =>
  typeof value?.lat === 'number' &&
  Number.isFinite(value.lat) &&
  typeof value?.lng === 'number' &&
  Number.isFinite(value.lng);

const toRadians = (value: number) => (value * Math.PI) / 180;

export const getDistanceKm = (from: MapPosition, to: MapPosition) => {
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

export const getPickupReadyAt = (deliveries: Delivery[]) => {
  const readyTimes = deliveries
    .map((delivery) => {
      if (delivery.pickedUpAt) return null;
      if (delivery.orderReadyTime) return new Date(delivery.orderReadyTime);
      if (typeof delivery.preparationTime === 'number') {
        const prepAnchor = delivery.assignedAt ?? delivery.coupled_time ?? delivery.createdAt;
        return new Date(new Date(prepAnchor).getTime() + delivery.preparationTime * 60000);
      }
      return null;
    })
    .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()));

  if (readyTimes.length === 0) return null;
  return new Date(Math.max(...readyTimes.map((value) => value.getTime())));
};

export const normalizeRouteStopOrder = (savedOrder: string[] | undefined, defaultStops: string[]) => {
  if (!savedOrder || savedOrder.length === 0) {
    return defaultStops;
  }

  const validStopIds = new Set(defaultStops);
  const normalizedSavedStops = savedOrder.filter((stopId, index) => (
    validStopIds.has(stopId) && savedOrder.indexOf(stopId) === index
  ));
  const missingStops = defaultStops.filter((stopId) => !normalizedSavedStops.includes(stopId));

  return [...normalizedSavedStops, ...missingStops];
};

const getDateTime = (value: Date | string | number | null | undefined) => {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

export const getInitialCourierPosition = (
  courier: Courier,
  deliveries: Delivery[],
  index: number,
  now: Date = new Date()
): MapPosition => {
  const activeDeliveries = deliveries.filter((delivery) =>
    delivery.courierId === courier.id &&
    (delivery.status === 'assigned' || delivery.status === 'delivering')
  );

  const pickupDelivery = activeDeliveries.find((delivery) =>
    delivery.status === 'assigned' && delivery.arrivedAtRestaurantAt && !delivery.pickedUpAt
  );
  if (pickupDelivery && hasValidPosition({ lat: pickupDelivery.pickup_latitude, lng: pickupDelivery.pickup_longitude })) {
    return {
      lat: pickupDelivery.pickup_latitude as number,
      lng: pickupDelivery.pickup_longitude as number,
    };
  }

  const dropoffDelivery = activeDeliveries.find((delivery) => delivery.status === 'delivering');
  if (dropoffDelivery) {
    const pickupPosition = hasValidPosition({
      lat: dropoffDelivery.pickup_latitude,
      lng: dropoffDelivery.pickup_longitude,
    })
      ? {
          lat: dropoffDelivery.pickup_latitude as number,
          lng: dropoffDelivery.pickup_longitude as number,
        }
      : null;
    const dropoffPosition = hasValidPosition({
      lat: dropoffDelivery.dropoff_latitude,
      lng: dropoffDelivery.dropoff_longitude,
    })
      ? {
          lat: dropoffDelivery.dropoff_latitude as number,
          lng: dropoffDelivery.dropoff_longitude as number,
        }
      : null;

    if (pickupPosition && dropoffPosition) {
      const startedAtMs =
        getDateTime(dropoffDelivery.started_dropoff) ??
        getDateTime(dropoffDelivery.pickedUpAt) ??
        getDateTime(dropoffDelivery.took_it_time);

      if (startedAtMs) {
        const expectedMs = Math.max(1, estimateTravelMinutes(pickupPosition, dropoffPosition) * 60000);
        const progress = Math.max(0, Math.min(0.95, (now.getTime() - startedAtMs) / expectedMs));

        return {
          lat: pickupPosition.lat + (dropoffPosition.lat - pickupPosition.lat) * progress,
          lng: pickupPosition.lng + (dropoffPosition.lng - pickupPosition.lng) * progress,
        };
      }

      return pickupPosition;
    }

    if (pickupPosition) {
      return pickupPosition;
    }

    const assigningPosition = hasValidPosition({
      lat: dropoffDelivery.runner_at_assigning_latitude,
      lng: dropoffDelivery.runner_at_assigning_longitude,
    })
      ? {
          lat: dropoffDelivery.runner_at_assigning_latitude as number,
          lng: dropoffDelivery.runner_at_assigning_longitude as number,
        }
      : null;

    if (assigningPosition) {
      return assigningPosition;
    }
  }

  const assignedFromPosition = activeDeliveries.find((delivery) =>
    delivery.status === 'assigned' &&
    hasValidPosition({
      lat: delivery.runner_at_assigning_latitude,
      lng: delivery.runner_at_assigning_longitude,
    })
  );
  if (assignedFromPosition) {
    return {
      lat: assignedFromPosition.runner_at_assigning_latitude as number,
      lng: assignedFromPosition.runner_at_assigning_longitude as number,
    };
  }

  return { ...COURIER_FALLBACK_POSITIONS[index % COURIER_FALLBACK_POSITIONS.length] };
};

const mergePhaseUpdate = (
  phaseUpdates: Map<string, Partial<Delivery>>,
  deliveryId: string,
  updates: Partial<Delivery>
) => {
  phaseUpdates.set(deliveryId, {
    ...(phaseUpdates.get(deliveryId) ?? {}),
    ...updates,
  });
};

const isDeliveryReadyForPickup = (
  delivery: Delivery,
  nowMs: number,
  timeMultiplier: number
) => {
  if (delivery.order_ready || delivery.reported_order_is_ready || delivery.reportedOrderIsReady) {
    return true;
  }

  const orderReadyMs = getDateTime(delivery.orderReadyTime);
  if (orderReadyMs && orderReadyMs <= nowMs) {
    return true;
  }

  const prepAnchorMs = getDateTime(delivery.assignedAt ?? delivery.coupled_time);
  if (!prepAnchorMs) {
    return false;
  }

  const prepMinutes = delivery.preparationTime || delivery.cook_time || 5;
  return nowMs - prepAnchorMs >= (prepMinutes * 60000) / (timeMultiplier || 1);
};

export const advanceLiveSimulation = ({
  state,
  currentPositions,
  currentTimestamps,
  routeStopOrders,
  now = new Date(),
  speedKmh = COURIER_TRAVEL_SPEED_KMH,
  arrivalDistanceKm = COURIER_ARRIVAL_DISTANCE_KM,
}: {
  state: DeliveryState;
  currentPositions: Map<string, MapPosition>;
  currentTimestamps: Map<string, number>;
  routeStopOrders: Record<string, string[]>;
  now?: Date;
  speedKmh?: number;
  arrivalDistanceKm?: number;
}): LiveSimulationTickResult => {
  const nowMs = now.getTime();
  const nextPositions = new Map(currentPositions);
  const nextTimestamps = new Map(currentTimestamps);
  const statusUpdates: LiveSimulationStatusUpdate[] = [];
  const phaseUpdates = new Map<string, Partial<Delivery>>();
  let positionChanged = false;

  state.couriers.forEach((courier, index) => {
    const activeDeliveries = state.deliveries.filter((delivery) =>
      delivery.courierId === courier.id &&
      (delivery.status === 'assigned' || delivery.status === 'delivering')
    );
    if (activeDeliveries.length === 0) return;

    const currentPosition =
      nextPositions.get(courier.id) ??
      getInitialCourierPosition(courier, state.deliveries, index, now);
    const previousTimestamp = nextTimestamps.get(courier.id);

    if (!nextPositions.has(courier.id)) {
      nextPositions.set(courier.id, currentPosition);
      nextTimestamps.set(courier.id, nowMs - 1000);
      positionChanged = true;
    }

    const defaultStops = buildDefaultRouteStopIds(activeDeliveries);
    const stopIds = normalizeRouteStopOrder(routeStopOrders[courier.id], defaultStops);

    let nextStopType: 'pickup' | 'dropoff' | undefined;
    let nextStopDeliveries: Delivery[] = [];
    let nextStopPosition: MapPosition | null = null;

    for (const stopId of stopIds) {
      if (stopId.startsWith('pickup-group:')) {
        const pickupBatchKey = stopId.replace('pickup-group:', '');
        const pickupGroupDeliveries = activeDeliveries.filter((delivery) =>
          getDeliveryPickupBatchKey(delivery) === pickupBatchKey &&
          delivery.status === 'assigned'
        );

        if (pickupGroupDeliveries.length > 0) {
          nextStopType = 'pickup';
          nextStopDeliveries = pickupGroupDeliveries;
          nextStopPosition = hasValidPosition({
            lat: pickupGroupDeliveries[0].pickup_latitude,
            lng: pickupGroupDeliveries[0].pickup_longitude,
          })
            ? {
                lat: pickupGroupDeliveries[0].pickup_latitude as number,
                lng: pickupGroupDeliveries[0].pickup_longitude as number,
              }
            : null;
          break;
        }
      } else {
        const deliveryId = stopId.replace(/-dropoff$/, '');
        const delivery = activeDeliveries.find((item) => item.id === deliveryId && item.status === 'delivering');

        if (delivery) {
          nextStopType = 'dropoff';
          nextStopDeliveries = [delivery];
          nextStopPosition = hasValidPosition({
            lat: delivery.dropoff_latitude,
            lng: delivery.dropoff_longitude,
          })
            ? {
                lat: delivery.dropoff_latitude as number,
                lng: delivery.dropoff_longitude as number,
              }
            : null;
          break;
        }
      }
    }

    if (!nextStopType || nextStopDeliveries.length === 0 || !nextStopPosition) return;

    if (nextStopType === 'pickup') {
      const activePickupIds = new Set(nextStopDeliveries.map((delivery) => delivery.id));

      nextStopDeliveries.forEach((delivery) => {
        if (!delivery.started_pickup) {
          mergePhaseUpdate(phaseUpdates, delivery.id, { started_pickup: now });
        }
      });

      activeDeliveries
        .filter(
          (delivery) =>
            delivery.status === 'assigned' &&
            !activePickupIds.has(delivery.id) &&
            !!delivery.started_pickup
        )
        .forEach((delivery) => {
          mergePhaseUpdate(phaseUpdates, delivery.id, { started_pickup: null });
        });
    } else {
      const activeDropoffIds = new Set(nextStopDeliveries.map((delivery) => delivery.id));

      nextStopDeliveries.forEach((delivery) => {
        if (!delivery.started_dropoff) {
          mergePhaseUpdate(phaseUpdates, delivery.id, { started_dropoff: now });
        }
      });

      activeDeliveries
        .filter(
          (delivery) =>
            delivery.status === 'delivering' &&
            !activeDropoffIds.has(delivery.id) &&
            !!delivery.started_dropoff
        )
        .forEach((delivery) => {
          mergePhaseUpdate(phaseUpdates, delivery.id, { started_dropoff: null });
        });
    }

    const routePath = buildSimulatedGpsRoutePath([currentPosition, nextStopPosition]);
    const routeDistanceKm = getRoutePathDistanceKm(routePath);
    const distanceKm = routeDistanceKm || getDistanceKm(currentPosition, nextStopPosition);
    const routeStartedAtMs = nextStopDeliveries.reduce((latest, delivery) => {
      const candidate = nextStopType === 'pickup'
        ? getDateTime(delivery.started_pickup) ??
          getDateTime(delivery.assignedAt) ??
          getDateTime(delivery.coupled_time)
        : getDateTime(delivery.started_dropoff) ??
          getDateTime(delivery.pickedUpAt) ??
          getDateTime(delivery.took_it_time);

      return candidate ? Math.max(latest, candidate) : latest;
    }, 0);

    const queueArrivalUpdates = () => {
      if (nextStopType === 'pickup') {
        const areAllOrdersReady = nextStopDeliveries.every((delivery) =>
          isDeliveryReadyForPickup(delivery, nowMs, state.timeMultiplier)
        );

        if (areAllOrdersReady) {
          statusUpdates.push({
            type: 'delivering',
            deliveryIds: nextStopDeliveries.map((delivery) => delivery.id),
          });
        } else {
          const notArrivedDeliveryIds = nextStopDeliveries
            .filter((delivery) => !delivery.arrivedAtRestaurantAt)
            .map((delivery) => delivery.id);

          if (notArrivedDeliveryIds.length > 0) {
            statusUpdates.push({ type: 'arrived_pickup', deliveryIds: notArrivedDeliveryIds });
          }
        }
      } else {
        statusUpdates.push({
          type: 'complete',
          deliveryIds: nextStopDeliveries.map((delivery) => delivery.id),
        });
      }
    };

    if (distanceKm < arrivalDistanceKm) {
      nextPositions.set(courier.id, nextStopPosition);
      nextTimestamps.set(courier.id, nowMs);
      positionChanged = true;
      queueArrivalUpdates();
    } else {
      const elapsedFromMs = previousTimestamp
        ? Math.max(previousTimestamp, routeStartedAtMs || previousTimestamp)
        : routeStartedAtMs || nowMs - SIMULATION_FALLBACK_STEP_MS;
      const elapsedMs = nowMs - elapsedFromMs;
      const boundedElapsedMs = Math.min(
        Math.max(elapsedMs, SIMULATION_MIN_STEP_MS),
        SIMULATION_BACKGROUND_CATCHUP_MS
      );
      const simulationSpeedKmh = speedKmh * Math.max(state.timeMultiplier || 1, 0.1);
      const stepKm = (simulationSpeedKmh * boundedElapsedMs) / 3600000;
      const reachedStop = stepKm >= Math.max(0, distanceKm - arrivalDistanceKm);

      if (reachedStop) {
        nextPositions.set(courier.id, nextStopPosition);
        queueArrivalUpdates();
      } else {
        const nextPosition = advanceAlongRoutePath(routePath, stepKm);
        nextPositions.set(courier.id, nextPosition ?? currentPosition);
      }

      nextTimestamps.set(courier.id, nowMs);
      positionChanged = true;
    }
  });

  return {
    courierPositions: nextPositions,
    courierPositionTimestamps: nextTimestamps,
    positionChanged,
    phaseUpdates,
    statusUpdates,
  };
};
