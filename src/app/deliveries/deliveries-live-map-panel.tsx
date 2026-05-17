import React, { useEffect, useMemo, useState } from 'react';
import { Bike, LocateFixed, Store } from 'lucide-react';

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
  Restaurant,
} from '../types/delivery.types';

type DeliveriesLiveMapPanelProps = {
  deliveries: Delivery[];
  couriers: AppCourier[];
  restaurants: Restaurant[];
  routeStopOrders?: Record<string, string[]>;
  selectedDeliveryIds?: Set<string>;
  focusedDeliveryId?: string | null;
  onFocusedDeliveryChange?: (deliveryId: string | null) => void;
  onOpenDelivery?: (deliveryId: string) => void;
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

const layerToggleClassName = (active: boolean) => [
  'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
  active
    ? 'border-app-border bg-app-surface text-app-text shadow-sm dark:border-app-nav-border'
    : 'border-transparent bg-transparent text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text',
].join(' ');

export const DeliveriesLiveMapPanel: React.FC<DeliveriesLiveMapPanelProps> = ({
  deliveries,
  couriers,
  restaurants,
  routeStopOrders,
  selectedDeliveryIds,
  focusedDeliveryId,
  onFocusedDeliveryChange,
  onOpenDelivery,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [hoveredCourierId, setHoveredCourierId] = useState<string | null>(null);
  const [hoveredRestaurantName, setHoveredRestaurantName] = useState<string | null>(null);
  const [showRestaurants, setShowRestaurants] = useState(true);
  const [showCouriers, setShowCouriers] = useState(true);

  const mapRestaurants = useMemo<MapMarker[]>(() => (
    restaurants
      .filter((restaurant) => hasValidPosition({ lat: restaurant.lat, lng: restaurant.lng }))
      .map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        lat: restaurant.lat,
        lng: restaurant.lng,
        isActive: restaurant.isActive,
      }))
  ), [restaurants]);

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
        };
      })
  ), [couriers, deliveries]);

  const visibleRestaurants = useMemo(
    () => (showRestaurants ? mapRestaurants : []),
    [mapRestaurants, showRestaurants],
  );
  const visibleCouriers = useMemo(
    () => (showCouriers ? mapCouriers : []),
    [mapCouriers, showCouriers],
  );

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

  return (
    <section className="relative h-full min-h-[320px] overflow-hidden bg-app-background">
      <LeafletMap
        orders={mapOrders}
        routeOrders={mapOrders}
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
        onMapClick={handleMapClick}
      />

      <div className="pointer-events-none absolute right-3 top-3 z-[450] flex items-center gap-2 rounded-lg border border-app-border bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur dark:border-app-nav-border dark:bg-[#090909]/90">
        <LocateFixed className="h-3.5 w-3.5 text-app-text-secondary" />
        <span className="font-medium text-app-text">מפת משלוחים</span>
        <span className="text-app-text-secondary">
          {deliveries.length.toLocaleString('he-IL')}
        </span>
      </div>

      <div className="absolute right-3 top-14 z-[450] flex items-center gap-1.5 rounded-lg border border-app-border bg-white/95 p-1 shadow-sm backdrop-blur dark:border-app-nav-border dark:bg-[#090909]/90">
        <button
          type="button"
          className={layerToggleClassName(showRestaurants)}
          aria-pressed={showRestaurants}
          onClick={() => {
            setShowRestaurants((current) => !current);
            setHoveredRestaurantName(null);
          }}
        >
          <Store className="h-3.5 w-3.5" />
          <span>מסעדות</span>
          <span className="text-app-text-secondary">
            {mapRestaurants.length.toLocaleString('he-IL')}
          </span>
        </button>
        <button
          type="button"
          className={layerToggleClassName(showCouriers)}
          aria-pressed={showCouriers}
          onClick={() => {
            setShowCouriers((current) => !current);
            setHoveredCourierId(null);
          }}
        >
          <Bike className="h-3.5 w-3.5" />
          <span>שליחים</span>
          <span className="text-app-text-secondary">
            {mapCouriers.length.toLocaleString('he-IL')}
          </span>
        </button>
      </div>
    </section>
  );
};
