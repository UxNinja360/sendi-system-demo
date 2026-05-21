import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDelivery } from '../context/delivery-context-value';
import { LeafletMap } from '../live/leaflet-map';
import type {
  Courier as MapCourier,
  MapMarker,
  Order as MapOrder,
} from '../live/leaflet-map-utils';
import {
  getInitialCourierPosition,
  hasValidPosition,
} from '../live/live-simulation-engine';
import type {
  Courier as AppCourier,
  Delivery,
  DeliveryStatus,
  Restaurant,
} from '../types/delivery.types';
import {
  SENDI_PLUS_TERMS_ACCEPTED_CHANGE_EVENT,
  SENDI_PLUS_TERMS_ACCEPTED_STORAGE_KEY,
  isSendiPlusRestaurant,
  readStoredSendiPlusTermsAccepted,
} from '../utils/sendi-plus';

type DeliveriesLiveMapPanelProps = {
  deliveries: Delivery[];
  couriers: AppCourier[];
  restaurants: Restaurant[];
  routeStopOrders?: Record<string, string[]>;
  selectedDeliveryIds?: Set<string>;
  focusedDeliveryId?: string | null;
  onFocusedDeliveryChange?: (deliveryId: string | null) => void;
  onOpenDelivery?: (deliveryId: string) => void;
  selectedStatusFilters?: Set<DeliveryStatus>;
};

const getStableHash = (value: string) =>
  value.split('').reduce((total, char) => total + char.charCodeAt(0), 0);

const getRestaurantForDelivery = (
  delivery: Delivery,
  restaurants: Restaurant[],
) => {
  const restaurantId = delivery.restaurantId || delivery.rest_id;
  const restaurantName = delivery.restaurantName || delivery.rest_name;

  return restaurants.find((restaurant) =>
    (restaurantId && restaurant.id === restaurantId) ||
    (restaurantName && restaurant.name === restaurantName)
  ) ?? null;
};

const getFallbackDropoff = (delivery: Delivery) => {
  const hash = getStableHash(delivery.orderNumber || delivery.id);

  return {
    lat: 32.0853 + ((hash % 100) - 50) * 0.0004,
    lng: 34.7818 + ((hash % 100) - 50) * 0.0006,
  };
};

export const DeliveriesLiveMapPanel: React.FC<DeliveriesLiveMapPanelProps> = ({
  deliveries,
  couriers,
  restaurants,
  routeStopOrders,
  selectedDeliveryIds,
  focusedDeliveryId,
  onFocusedDeliveryChange,
  onOpenDelivery,
  selectedStatusFilters,
}) => {
  const { state, dispatch } = useDelivery();
  const navigate = useNavigate();
  const [sendiPlusTermsAccepted, setSendiPlusTermsAccepted] = useState(readStoredSendiPlusTermsAccepted);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [hoveredCourierId, setHoveredCourierId] = useState<string | null>(null);
  const [hoveredRestaurantName, setHoveredRestaurantName] = useState<string | null>(null);
  const isSendiPlusActive = state.isSystemOpen && sendiPlusTermsAccepted;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncSendiPlusTermsAccepted = () => {
      setSendiPlusTermsAccepted(readStoredSendiPlusTermsAccepted());
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SENDI_PLUS_TERMS_ACCEPTED_STORAGE_KEY) {
        syncSendiPlusTermsAccepted();
      }
    };

    window.addEventListener(SENDI_PLUS_TERMS_ACCEPTED_CHANGE_EVENT, syncSendiPlusTermsAccepted);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(SENDI_PLUS_TERMS_ACCEPTED_CHANGE_EVENT, syncSendiPlusTermsAccepted);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const mapRestaurants = useMemo<MapMarker[]>(() => (
    restaurants
      .filter((restaurant) => {
        if (!hasValidPosition({ lat: restaurant.lat, lng: restaurant.lng })) return false;

        const isSendiPlus = isSendiPlusRestaurant(restaurant.name, restaurant.chainId);
        return !isSendiPlus || isSendiPlusActive;
      })
      .map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        lat: restaurant.lat,
        lng: restaurant.lng,
        isActive: restaurant.isActive,
        isSendiPlus: isSendiPlusRestaurant(restaurant.name, restaurant.chainId),
      }))
  ), [isSendiPlusActive, restaurants]);

  const mapOrders = useMemo<MapOrder[]>(() => (
    deliveries.map((delivery) => {
      const restaurant = getRestaurantForDelivery(delivery, restaurants);
      const fallbackDropoff = getFallbackDropoff(delivery);
      const dropoff = hasValidPosition({
        lat: delivery.dropoff_latitude,
        lng: delivery.dropoff_longitude,
      })
        ? {
            lat: delivery.dropoff_latitude as number,
            lng: delivery.dropoff_longitude as number,
          }
        : fallbackDropoff;
      const pickup = hasValidPosition({
        lat: delivery.pickup_latitude,
        lng: delivery.pickup_longitude,
      })
        ? {
            lat: delivery.pickup_latitude as number,
            lng: delivery.pickup_longitude as number,
          }
        : hasValidPosition({ lat: restaurant?.lat, lng: restaurant?.lng })
          ? {
              lat: restaurant?.lat as number,
              lng: restaurant?.lng as number,
            }
          : null;
      const courierId = delivery.courierId ?? delivery.runner_id ?? null;
      const courier = courierId ? couriers.find((item) => item.id === courierId) : null;

      return {
        id: delivery.orderNumber || delivery.id,
        deliveryId: delivery.id,
        restaurantId: delivery.restaurantId || delivery.rest_id || restaurant?.id,
        pickupBatchId: delivery.pickupBatchId ?? null,
        lat: dropoff.lat,
        lng: dropoff.lng,
        pickupLat: pickup?.lat,
        pickupLng: pickup?.lng,
        courierId,
        customerName: delivery.client_name || delivery.customerName || '-',
        address: delivery.client_full_address || delivery.address,
        restaurantName: delivery.rest_name || delivery.restaurantName || restaurant?.name,
        status: delivery.status,
        courierName: delivery.courierName || courier?.name || null,
      };
    })
  ), [couriers, deliveries, restaurants]);

  const mapCouriers = useMemo<MapCourier[]>(() => (
    couriers
      .filter((courier) => courier.status !== 'offline')
      .map((courier, index) => {
        const position = getInitialCourierPosition(courier, deliveries, index);

        return {
          id: courier.id,
          name: courier.name,
          lat: position.lat,
          lng: position.lng,
          status: courier.status,
          isOnShift: courier.isOnShift,
          employmentType: courier.employmentType,
        };
      })
  ), [couriers, deliveries]);

  const visibleOrders = useMemo(
    () => (
      selectedStatusFilters
        ? mapOrders.filter((order) => selectedStatusFilters.has(order.status as DeliveryStatus))
        : mapOrders
    ),
    [mapOrders, selectedStatusFilters],
  );

  const visibleRestaurants = mapRestaurants;
  const visibleCouriers = mapCouriers;

  useEffect(() => {
    if (!focusedDeliveryId) {
      setSelectedOrderId(null);
    }
  }, [focusedDeliveryId]);

  const handleOrderClick = (deliveryId: string) => {
    const order = mapOrders.find((item) => item.deliveryId === deliveryId);
    setSelectedOrderId(order?.id ?? deliveryId);
    onFocusedDeliveryChange?.(deliveryId);
  };

  const focusedOrderId = useMemo(() => {
    if (!focusedDeliveryId) return selectedOrderId;
    return mapOrders.find((item) => item.deliveryId === focusedDeliveryId)?.id ?? focusedDeliveryId;
  }, [focusedDeliveryId, mapOrders, selectedOrderId]);

  const handleMapClick = () => {
    setSelectedOrderId(null);
    onFocusedDeliveryChange?.(null);
  };

  const handleRestaurantShowDetails = (restaurantId: string) => {
    navigate(`/restaurant/${restaurantId}`);
  };

  const handleRestaurantToggleActive = (restaurantId: string) => {
    dispatch({ type: 'TOGGLE_RESTAURANT', payload: restaurantId });
  };

  return (
    <section className="relative h-full min-h-[320px] overflow-hidden bg-app-background">
      <LeafletMap
        orders={visibleOrders}
        routeOrders={visibleOrders}
        couriers={visibleCouriers}
        restaurants={visibleRestaurants}
        routeStopOrders={routeStopOrders}
        selectedDeliveryIds={selectedDeliveryIds}
        selectedId={focusedOrderId}
        hoveredOrderId={hoveredOrderId}
        hoveredCourierId={hoveredCourierId}
        hoveredRestaurantName={hoveredRestaurantName}
        onOrderHover={setHoveredOrderId}
        onCourierHover={setHoveredCourierId}
        onRestaurantHover={setHoveredRestaurantName}
        onOrderClick={handleOrderClick}
        onOrderShowDetails={onOpenDelivery}
        onRestaurantShowDetails={handleRestaurantShowDetails}
        onRestaurantToggleActive={handleRestaurantToggleActive}
        onMapClick={handleMapClick}
      />
    </section>
  );
};
