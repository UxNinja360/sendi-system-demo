import { useMemo } from 'react';
import { Delivery, DeliveryState } from '../types/delivery.types';
import { getDeliveryCashAmount, getDeliveryCustomerCharge } from '../utils/delivery-finance';
import { getDeliveryPickupBatchKey } from '../utils/pickup-batches';
import {
  estimateTravelMinutes,
  getPickupReadyAt,
  hasValidPosition,
  type MapPosition,
} from './live-simulation-engine';

type LiveManagerSortBy = 'time' | 'status' | 'restaurant' | 'address' | 'ready';
type LiveManagerSortDirection = 'asc' | 'desc';
type ShiftFilter = 'all' | 'shift' | 'no_shift';

type UseLiveManagerDataParams = {
  buildDefaultStopIds: (deliveries: Delivery[]) => string[];
  courierFallbackPositions: MapPosition[];
  courierPositions: Map<string, MapPosition>;
  normalizeRouteStopOrder: (savedOrder: string[] | undefined, defaultStops: string[]) => string[];
  routeStopOrders: Record<string, string[]>;
  searchQuery: string;
  shiftFilter: ShiftFilter;
  simPositions: Map<string, MapPosition>;
  sortBy: LiveManagerSortBy;
  sortDirection: LiveManagerSortDirection;
  state: DeliveryState;
  statusFilters: string[];
};

export const useLiveManagerData = ({
  buildDefaultStopIds,
  courierFallbackPositions,
  courierPositions,
  normalizeRouteStopOrder,
  routeStopOrders,
  searchQuery,
  shiftFilter,
  simPositions,
  sortBy,
  sortDirection,
  state,
  statusFilters,
}: UseLiveManagerDataParams) => {
  const allOrders = useMemo(() => {
    return state.deliveries.map((delivery) => {
      const courier = state.couriers.find((item) => item.id === delivery.courierId);
      const restaurant = state.restaurants.find(
        (item) => item.id === delivery.restaurantId || item.name === delivery.restaurantName
      );
      const hash = delivery.orderNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const lat = delivery.dropoff_latitude ?? (32.0853 + ((hash % 100) - 50) * 0.0004);
      const lng = delivery.dropoff_longitude ?? (34.7818 + ((hash % 100) - 50) * 0.0006);
      const prepTime =
        delivery.preparationTime ??
        delivery.cook_time ??
        restaurant?.defaultPreparationTime ??
        5;
      const travelTime = 10 + (hash % 6);
      const estimatedDeliveryTime = new Date(
        new Date(delivery.createdAt).getTime() + (prepTime + travelTime) * 60000
      );
      const phone = `05${(hash % 9) + 1}-${Math.floor((hash % 900) + 1000000).toString().substring(0, 7)}`;
      const paymentMethod = (hash % 2 === 0) ? 'cash' : 'credit';
      const cashToCollect = paymentMethod === 'cash' ? getDeliveryCashAmount(delivery) : 0;

      return {
        id: delivery.orderNumber,
        deliveryId: delivery.id,
        restaurantId: delivery.restaurantId,
        pickupBatchId: delivery.pickupBatchId,
        restaurantName: delivery.restaurantName,
        pickup: delivery.restaurantName,
        customerName: delivery.customerName,
        address: delivery.address,
        status: delivery.status,
        createdAt: new Date(delivery.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        createdAtTimestamp: new Date(delivery.createdAt).getTime(),
        readyBy: `${delivery.estimatedTime} דק׳`,
        amountToCollect: getDeliveryCustomerCharge(delivery),
        courierId: delivery.courierId ?? null,
        courierName: courier?.name || null,
        phone,
        prepTime,
        estimatedDelivery: estimatedDeliveryTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        lat,
        lng,
        pickupLat: delivery.pickup_latitude,
        pickupLng: delivery.pickup_longitude,
        orderNotes: delivery.orderNotes,
        paymentMethod,
        cashToCollect,
        pickedUpAt: delivery.pickedUpAt,
        deliveredAt: delivery.deliveredAt,
        fullDelivery: delivery,
      };
    });
  }, [state.couriers, state.deliveries, state.restaurants]);

  const uniqueRestaurants = useMemo(() => {
    return state.restaurants
      .filter((restaurant) => restaurant.isActive)
      .map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        lat: restaurant.lat,
        lng: restaurant.lng,
        isActive: restaurant.isActive,
      }));
  }, [state.restaurants]);

  const couriersWithLocations = useMemo(() => {
    return state.couriers
      .filter((courier) => courier.status !== 'offline')
      .map((courier, index) => {
        const hasActiveDelivery = state.deliveries.some((delivery) =>
          delivery.courierId === courier.id &&
          (delivery.status === 'assigned' || delivery.status === 'delivering')
        );
        const enginePos = courierPositions.get(courier.id);

        if (hasActiveDelivery && enginePos) {
          return { ...courier, lat: enginePos.lat, lng: enginePos.lng };
        }

        const simPos = simPositions.get(courier.name) ?? simPositions.get(`sim_${index}`);
        if (simPos) {
          return { ...courier, lat: simPos.lat, lng: simPos.lng };
        }

        if (enginePos) {
          return { ...courier, lat: enginePos.lat, lng: enginePos.lng };
        }

        const fallbackPosition = courierFallbackPositions[index % courierFallbackPositions.length];
        return { ...courier, lat: fallbackPosition.lat, lng: fallbackPosition.lng };
      });
  }, [courierFallbackPositions, courierPositions, simPositions, state.couriers, state.deliveries]);

  const mapCouriers = useMemo(() => (
    shiftFilter === 'shift'
      ? couriersWithLocations.filter((courier) => courier.isOnShift)
      : shiftFilter === 'no_shift'
      ? couriersWithLocations.filter((courier) => !courier.isOnShift)
      : couriersWithLocations
  ), [couriersWithLocations, shiftFilter]);

  const routeEtaLabelByDeliveryId = useMemo(() => {
    const labels: Record<string, string> = {};
    const courierLocationById = new Map(
      couriersWithLocations
        .filter((courier) => hasValidPosition({ lat: courier.lat, lng: courier.lng }))
        .map((courier) => [courier.id, { lat: courier.lat as number, lng: courier.lng as number }])
    );

    state.couriers.forEach((courier, index) => {
      const activeDeliveries = state.deliveries.filter((delivery) =>
        delivery.courierId === courier.id &&
        (delivery.status === 'assigned' || delivery.status === 'delivering')
      );

      if (activeDeliveries.length === 0) return;

      let currentPosition: MapPosition | null =
        courierLocationById.get(courier.id) ??
        courierFallbackPositions[index % courierFallbackPositions.length] ??
        null;
      let cursor = new Date();

      const defaultStops = buildDefaultStopIds(activeDeliveries);
      const stopIds = normalizeRouteStopOrder(routeStopOrders[courier.id], defaultStops);

      stopIds.forEach((stopId) => {
        if (stopId.startsWith('pickup-group:')) {
          const pickupGroupKey = stopId.replace('pickup-group:', '');
          const pickupGroupDeliveries = activeDeliveries.filter((delivery) =>
            getDeliveryPickupBatchKey(delivery) === pickupGroupKey &&
            delivery.status === 'assigned'
          );

          if (pickupGroupDeliveries.length === 0) return;

          const nextLocation = hasValidPosition({
            lat: pickupGroupDeliveries[0].pickup_latitude,
            lng: pickupGroupDeliveries[0].pickup_longitude,
          })
            ? {
                lat: pickupGroupDeliveries[0].pickup_latitude as number,
                lng: pickupGroupDeliveries[0].pickup_longitude as number,
              }
            : null;

          cursor = new Date(cursor.getTime() + estimateTravelMinutes(currentPosition, nextLocation) * 60000);

          const readyAt = getPickupReadyAt(pickupGroupDeliveries);
          if (readyAt && cursor < readyAt) {
            cursor = new Date(readyAt);
          }

          pickupGroupDeliveries.forEach((delivery) => {
            if (!delivery.arrivedAtRestaurantAt && !delivery.pickedUpAt) {
              labels[delivery.id] =
                `מגיע למסעדה ב־${cursor.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
            }
          });

          currentPosition = nextLocation ?? currentPosition;
          const serviceMinutes = Math.min(6, 2 + Math.max(0, pickupGroupDeliveries.length - 1));
          cursor = new Date(cursor.getTime() + serviceMinutes * 60000);
          return;
        }

        const deliveryId = stopId.replace(/-dropoff$/, '');
        const delivery = activeDeliveries.find((item) => item.id === deliveryId && item.status === 'delivering');
        if (!delivery) return;

        const nextLocation = hasValidPosition({
          lat: delivery.dropoff_latitude,
          lng: delivery.dropoff_longitude,
        })
          ? {
              lat: delivery.dropoff_latitude as number,
              lng: delivery.dropoff_longitude as number,
            }
          : null;

        cursor = new Date(cursor.getTime() + estimateTravelMinutes(currentPosition, nextLocation) * 60000);
        labels[delivery.id] =
          `מגיע ללקוח ב־${cursor.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
        currentPosition = nextLocation ?? currentPosition;
        cursor = new Date(cursor.getTime() + 3 * 60000);
      });
    });

    return labels;
  }, [
    buildDefaultStopIds,
    courierFallbackPositions,
    couriersWithLocations,
    normalizeRouteStopOrder,
    routeStopOrders,
    state.couriers,
    state.deliveries,
  ]);

  const courierLocationMap = useMemo(
    () =>
      Object.fromEntries(
        couriersWithLocations.map((courier) => [
          courier.id,
          { lat: courier.lat, lng: courier.lng },
        ])
      ),
    [couriersWithLocations]
  );

  const shiftCounts = useMemo(() => {
    const connected = state.couriers.filter((courier) => courier.status !== 'offline');
    const onShift = connected.filter((courier) => courier.isOnShift);
    return {
      connected: connected.length,
      onShift: onShift.length,
      noShift: connected.length - onShift.length,
    };
  }, [state.couriers]);

  const freeCouriersCount = useMemo(
    () => state.couriers.filter(
      (courier) => courier.isOnShift && !state.deliveries.some(
        (delivery) => delivery.courierId === courier.id && ['assigned', 'delivering'].includes(delivery.status)
      )
    ).length,
    [state.couriers, state.deliveries]
  );

  const busyCouriersCount = useMemo(
    () => state.couriers.filter(
      (courier) => state.deliveries.some(
        (delivery) => delivery.courierId === courier.id && ['assigned', 'delivering'].includes(delivery.status)
      )
    ).length,
    [state.couriers, state.deliveries]
  );

  const availableCouriers = useMemo(
    () => state.couriers.filter((courier) => courier.status !== 'offline' && courier.isOnShift),
    [state.couriers]
  );

  const todayDeliveries = useMemo(() => {
    const pending = state.deliveries.filter((delivery) => delivery.status === 'pending').length;
    const assigned = state.deliveries.filter((delivery) => delivery.status === 'assigned').length;
    const delivering = state.deliveries.filter((delivery) => delivery.status === 'delivering').length;
    const delivered = state.deliveries.filter((delivery) => delivery.status === 'delivered').length;
    const cancelled = state.deliveries.filter((delivery) => delivery.status === 'cancelled').length;
    const expired = state.deliveries.filter((delivery) => delivery.status === 'expired').length;
    const total = state.deliveries.length;

    return { pending, assigned, delivering, delivered, cancelled, expired, total };
  }, [state.deliveries]);

  const filteredOrders = useMemo(
    () => (statusFilters.length === 0
      ? allOrders
      : allOrders.filter((order) => statusFilters.includes(order.status))),
    [allOrders, statusFilters]
  );

  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return filteredOrders;

    const query = searchQuery.toLowerCase();
    return filteredOrders.filter((order) =>
      order.id.toLowerCase().includes(query) ||
      order.address.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.pickup.toLowerCase().includes(query) ||
      (order.courierName && order.courierName.toLowerCase().includes(query))
    );
  }, [filteredOrders, searchQuery]);

  const orders = useMemo(() => {
    return [...searchFiltered].sort((left, right) => {
      let comparison = 0;

      if (sortBy === 'status') {
        const statusOrder = { pending: 1, assigned: 2, delivering: 3, delivered: 4, cancelled: 5 };
        const leftOrder = statusOrder[left.status as keyof typeof statusOrder] || 999;
        const rightOrder = statusOrder[right.status as keyof typeof statusOrder] || 999;
        comparison = leftOrder - rightOrder;
      } else if (sortBy === 'time') {
        comparison = left.createdAtTimestamp - right.createdAtTimestamp;
      } else if (sortBy === 'restaurant') {
        comparison = left.restaurantName.localeCompare(right.restaurantName, 'he');
      } else if (sortBy === 'address') {
        comparison = left.address.localeCompare(right.address, 'he');
      } else if (sortBy === 'ready') {
        comparison = left.prepTime - right.prepTime;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [searchFiltered, sortBy, sortDirection]);

  return {
    allOrders,
    availableCouriers,
    courierLocationMap,
    couriersWithLocations,
    filteredOrders,
    freeCouriersCount,
    busyCouriersCount,
    mapCouriers,
    orders,
    routeEtaLabelByDeliveryId,
    shiftCounts,
    todayDeliveries,
    uniqueRestaurants,
  };
};

