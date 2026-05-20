import React, { useEffect, useMemo, useState } from 'react';
import {
  Bike,
  ChevronDown,
  ChevronUp,
  Clock3,
  PackageCheck,
  PackageSearch,
  Power,
  RefreshCcw,
  Route,
  Store,
  Timer,
  UserCheck,
  UserX,
  XCircle,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
import { SENDI_PLUS_LABEL, isSendiPlusRestaurant } from '../utils/sendi-plus';

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
  statusCounts?: Partial<Record<DeliveryStatus, number>>;
  onStatusFilterToggle?: (status: DeliveryStatus) => void;
};

type MapFilterKey =
  | 'pendingOrders'
  | 'assignedOrders'
  | 'deliveringOrders'
  | 'deliveredOrders'
  | 'cancelledOrders'
  | 'expiredOrders'
  | 'activeRestaurants'
  | 'inactiveRestaurants'
  | 'sendiPlusRestaurants'
  | 'availableCouriers'
  | 'busyCouriers'
  | 'offShiftCouriers'
  | 'offlineCouriers';

type MapFilters = Record<MapFilterKey, boolean>;

const defaultMapFilters: MapFilters = {
  pendingOrders: true,
  assignedOrders: true,
  deliveringOrders: true,
  deliveredOrders: true,
  cancelledOrders: true,
  expiredOrders: false,
  activeRestaurants: true,
  inactiveRestaurants: false,
  sendiPlusRestaurants: true,
  availableCouriers: true,
  busyCouriers: true,
  offShiftCouriers: false,
  offlineCouriers: false,
};

type OrderStatusFilterConfig = {
  filterKey: MapFilterKey;
  status: DeliveryStatus;
  label: string;
  icon: LucideIcon;
};

const orderStatusFilters: OrderStatusFilterConfig[] = [
  { filterKey: 'pendingOrders', status: 'pending', label: 'ממתינים', icon: Clock3 },
  { filterKey: 'assignedOrders', status: 'assigned', label: 'משובצים', icon: PackageSearch },
  { filterKey: 'deliveringOrders', status: 'delivering', label: 'בדרך', icon: Route },
  { filterKey: 'deliveredOrders', status: 'delivered', label: 'נמסרו', icon: PackageCheck },
  { filterKey: 'cancelledOrders', status: 'cancelled', label: 'בוטלו', icon: XCircle },
  { filterKey: 'expiredOrders', status: 'expired', label: 'פג תוקף', icon: Timer },
];

const orderFilterKeys: MapFilterKey[] = orderStatusFilters.map((item) => item.filterKey);

const restaurantFilterKeys: MapFilterKey[] = [
  'activeRestaurants',
  'inactiveRestaurants',
  'sendiPlusRestaurants',
];

const courierFilterKeys: MapFilterKey[] = [
  'availableCouriers',
  'busyCouriers',
  'offShiftCouriers',
  'offlineCouriers',
];

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
  'inline-flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border px-2 text-[11px] font-medium transition-colors',
  active
    ? 'border-app-brand/45 bg-app-brand/10 text-app-text shadow-sm dark:border-[#38bdf8]/35 dark:bg-[#0a84ff]/10'
    : 'border-app-border/70 bg-app-surface/45 text-app-text-secondary opacity-70 hover:bg-app-surface-raised hover:text-app-text hover:opacity-100 dark:border-app-nav-border/70',
].join(' ');

const resetButtonClassName = (enabled: boolean) => [
  'inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors',
  enabled
    ? 'border-app-border bg-app-surface text-app-text hover:bg-app-surface-raised dark:border-app-nav-border'
    : 'cursor-default border-transparent bg-transparent text-app-text-muted',
].join(' ');

const getOrderFilterKey = (status: string): MapFilterKey => {
  if (status === 'pending') return 'pendingOrders';
  if (status === 'assigned') return 'assignedOrders';
  if (status === 'delivering') return 'deliveringOrders';
  if (status === 'delivered') return 'deliveredOrders';
  if (status === 'cancelled') return 'cancelledOrders';
  return 'expiredOrders';
};

const getCourierFilterKey = (courier: MapCourier): MapFilterKey => {
  if (courier.status === 'offline') return 'offlineCouriers';
  if (courier.status === 'busy') return 'busyCouriers';
  if (courier.isOnShift === false) return 'offShiftCouriers';
  return 'availableCouriers';
};

type MapFilterButtonProps = {
  active: boolean;
  count: number;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

const MapFilterButton: React.FC<MapFilterButtonProps> = ({
  active,
  count,
  icon: Icon,
  label,
  onClick,
}) => (
  <button
    type="button"
    className={layerToggleClassName(active)}
    aria-pressed={active}
    data-haptic="selection"
    data-map-filter={label}
    onClick={onClick}
  >
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none ${
        active
          ? 'bg-app-brand/15 text-app-text'
          : 'bg-app-surface-raised text-app-text-muted'
      }`}
    >
      {count.toLocaleString('he-IL')}
    </span>
  </button>
);

type MapFilterGroupProps = {
  title: string;
  icon: LucideIcon;
  visibleCount: number;
  totalCount: number;
  children: React.ReactNode;
  gridClassName?: string;
};

const MapFilterGroup: React.FC<MapFilterGroupProps> = ({
  title,
  icon: Icon,
  visibleCount,
  totalCount,
  children,
  gridClassName = 'grid grid-cols-2 gap-1.5 min-[460px]:grid-cols-3',
}) => (
  <section className="space-y-1.5 border-t border-app-border/70 pt-2 first:border-t-0 first:pt-0 dark:border-app-nav-border">
    <div className="flex min-w-0 items-center justify-between gap-2 px-0.5">
      <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-app-text">
        <Icon className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
        <span className="truncate">{title}</span>
      </div>
      <span className="shrink-0 rounded bg-app-surface-raised px-2 py-0.5 text-[10px] font-semibold text-app-text-secondary">
        {visibleCount.toLocaleString('he-IL')}
        {' / '}
        {totalCount.toLocaleString('he-IL')}
      </span>
    </div>
    <div className={gridClassName}>
      {children}
    </div>
  </section>
);

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
  statusCounts,
  onStatusFilterToggle,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [hoveredCourierId, setHoveredCourierId] = useState<string | null>(null);
  const [hoveredRestaurantName, setHoveredRestaurantName] = useState<string | null>(null);
  const [mapFilters, setMapFilters] = useState<MapFilters>(defaultMapFilters);
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(true);

  const mapRestaurants = useMemo<MapMarker[]>(() => (
    restaurants
      .filter((restaurant) => hasValidPosition({ lat: restaurant.lat, lng: restaurant.lng }))
      .map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        lat: restaurant.lat,
        lng: restaurant.lng,
        isActive: restaurant.isActive,
        isSendiPlus: isSendiPlusRestaurant(restaurant.name, restaurant.chainId),
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

  const filterCounts = useMemo(() => ({
    pendingOrders: statusCounts?.pending ?? mapOrders.filter((order) => order.status === 'pending').length,
    assignedOrders: statusCounts?.assigned ?? mapOrders.filter((order) => order.status === 'assigned').length,
    deliveringOrders: statusCounts?.delivering ?? mapOrders.filter((order) => order.status === 'delivering').length,
    deliveredOrders: statusCounts?.delivered ?? mapOrders.filter((order) => order.status === 'delivered').length,
    cancelledOrders: statusCounts?.cancelled ?? mapOrders.filter((order) => order.status === 'cancelled').length,
    expiredOrders: statusCounts?.expired ?? mapOrders.filter((order) => order.status === 'expired').length,
    activeRestaurants: mapRestaurants.filter((restaurant) => restaurant.isActive !== false).length,
    inactiveRestaurants: mapRestaurants.filter((restaurant) => restaurant.isActive === false).length,
    sendiPlusRestaurants: mapRestaurants.filter((restaurant) => restaurant.isSendiPlus).length,
    availableCouriers: mapCouriers.filter((courier) => getCourierFilterKey(courier) === 'availableCouriers').length,
    busyCouriers: mapCouriers.filter((courier) => getCourierFilterKey(courier) === 'busyCouriers').length,
    offShiftCouriers: mapCouriers.filter((courier) => getCourierFilterKey(courier) === 'offShiftCouriers').length,
    offlineCouriers: mapCouriers.filter((courier) => getCourierFilterKey(courier) === 'offlineCouriers').length,
  }), [mapCouriers, mapOrders, mapRestaurants, statusCounts]);

  const isOrderStatusVisible = (status: DeliveryStatus) => (
    selectedStatusFilters
      ? selectedStatusFilters.has(status)
      : mapFilters[getOrderFilterKey(status)]
  );

  const visibleOrders = useMemo(
    () => mapOrders.filter((order) => isOrderStatusVisible(order.status as DeliveryStatus)),
    [mapFilters, mapOrders, selectedStatusFilters],
  );

  const visibleRestaurants = useMemo(
    () => mapRestaurants.filter((restaurant) => {
      const activityFilter = restaurant.isActive === false
        ? mapFilters.inactiveRestaurants
        : mapFilters.activeRestaurants;

      return activityFilter && (!restaurant.isSendiPlus || mapFilters.sendiPlusRestaurants);
    }),
    [mapFilters, mapRestaurants],
  );

  const visibleCouriers = useMemo(
    () => mapCouriers.filter((courier) => mapFilters[getCourierFilterKey(courier)]),
    [mapCouriers, mapFilters],
  );

  const activeFilterCount = useMemo(
    () => Object.entries(mapFilters).filter(([key, value]) =>
      value !== defaultMapFilters[key as MapFilterKey]
    ).length,
    [mapFilters],
  );

  const orderStatusTotalCount = useMemo(
    () => orderStatusFilters.reduce(
      (total, item) => total + filterCounts[item.filterKey],
      0,
    ),
    [filterCounts],
  );

  const visibleOrderStatusCount = useMemo(
    () => orderStatusFilters.reduce(
      (total, item) => total + (isOrderStatusVisible(item.status) ? filterCounts[item.filterKey] : 0),
      0,
    ),
    [filterCounts, mapFilters, selectedStatusFilters],
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

  const toggleMapFilter = (filterKey: MapFilterKey) => {
    setMapFilters((current) => ({
      ...current,
      [filterKey]: !current[filterKey],
    }));

    if (orderFilterKeys.includes(filterKey)) {
      setHoveredOrderId(null);
    }
    if (restaurantFilterKeys.includes(filterKey)) {
      setHoveredRestaurantName(null);
    }
    if (courierFilterKeys.includes(filterKey)) {
      setHoveredCourierId(null);
    }
  };

  const handleOrderStatusFilterToggle = (status: DeliveryStatus) => {
    if (onStatusFilterToggle) {
      onStatusFilterToggle(status);
    } else {
      toggleMapFilter(getOrderFilterKey(status));
    }
    setHoveredOrderId(null);
  };

  const resetMapFilters = () => {
    if (activeFilterCount === 0) return;

    setMapFilters(defaultMapFilters);
    setHoveredOrderId(null);
    setHoveredRestaurantName(null);
    setHoveredCourierId(null);
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
        onMapClick={handleMapClick}
      />

      <div
        className={`absolute left-3 top-3 z-[650] flex max-h-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col overflow-y-auto rounded-lg border border-app-border bg-white/95 text-xs shadow-sm backdrop-blur transition-[width] duration-150 dark:border-app-nav-border dark:bg-[#090909]/90 ${
          isFilterPanelCollapsed ? 'w-[240px] gap-0 p-2' : 'w-[440px] gap-2 p-2.5'
        }`}
        dir="rtl"
        aria-label="פילטרים למפה"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-right transition-colors hover:bg-app-surface-raised"
            data-haptic="selection"
            aria-expanded={!isFilterPanelCollapsed}
            aria-label={isFilterPanelCollapsed ? 'פתח פילטרים למפה' : 'קפל פילטרים למפה'}
            onClick={() => setIsFilterPanelCollapsed((current) => !current)}
          >
            {isFilterPanelCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-app-text">
                <Route className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
                <span className="truncate">שכבות מפה</span>
              </div>
              <div className="mt-0.5 truncate text-[10px] font-medium text-app-text-secondary">
                {activeFilterCount === 0
                  ? 'ברירת מחדל'
                  : `${activeFilterCount.toLocaleString('he-IL')} שינויים`}
              </div>
            </div>
          </button>

          {!isFilterPanelCollapsed ? (
            <button
              type="button"
              className={resetButtonClassName(activeFilterCount > 0)}
              disabled={activeFilterCount === 0}
              data-haptic={activeFilterCount > 0 ? 'selection' : undefined}
              onClick={resetMapFilters}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span>איפוס</span>
            </button>
          ) : null}
        </div>

        {!isFilterPanelCollapsed ? (
          <>
            <MapFilterGroup
              title="משלוחים"
              icon={PackageSearch}
              visibleCount={visibleOrderStatusCount}
              totalCount={orderStatusTotalCount}
            >
              {orderStatusFilters.map((item) => (
                <MapFilterButton
                  key={item.filterKey}
                  active={isOrderStatusVisible(item.status)}
                  count={filterCounts[item.filterKey]}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => handleOrderStatusFilterToggle(item.status)}
                />
              ))}
            </MapFilterGroup>

            <MapFilterGroup
              title="מסעדות"
              icon={Store}
              visibleCount={visibleRestaurants.length}
              totalCount={mapRestaurants.length}
            >
              <MapFilterButton
                active={mapFilters.activeRestaurants}
                count={filterCounts.activeRestaurants}
                icon={Store}
                label="מסעדות פעילות"
                onClick={() => toggleMapFilter('activeRestaurants')}
              />
              <MapFilterButton
                active={mapFilters.inactiveRestaurants}
                count={filterCounts.inactiveRestaurants}
                icon={Power}
                label="מסעדות כבויות"
                onClick={() => toggleMapFilter('inactiveRestaurants')}
              />
              <MapFilterButton
                active={mapFilters.sendiPlusRestaurants}
                count={filterCounts.sendiPlusRestaurants}
                icon={Zap}
                label={SENDI_PLUS_LABEL}
                onClick={() => toggleMapFilter('sendiPlusRestaurants')}
              />
            </MapFilterGroup>

            <MapFilterGroup
              title="שליחים"
              icon={Bike}
              visibleCount={visibleCouriers.length}
              totalCount={mapCouriers.length}
              gridClassName="grid grid-cols-2 gap-1.5"
            >
              <MapFilterButton
                active={mapFilters.availableCouriers}
                count={filterCounts.availableCouriers}
                icon={UserCheck}
                label="שליחים פנויים"
                onClick={() => toggleMapFilter('availableCouriers')}
              />
              <MapFilterButton
                active={mapFilters.busyCouriers}
                count={filterCounts.busyCouriers}
                icon={Bike}
                label="במשלוח"
                onClick={() => toggleMapFilter('busyCouriers')}
              />
              <MapFilterButton
                active={mapFilters.offShiftCouriers}
                count={filterCounts.offShiftCouriers}
                icon={Timer}
                label="לא במשמרת"
                onClick={() => toggleMapFilter('offShiftCouriers')}
              />
              <MapFilterButton
                active={mapFilters.offlineCouriers}
                count={filterCounts.offlineCouriers}
                icon={UserX}
                label="מנותקים"
                onClick={() => toggleMapFilter('offlineCouriers')}
              />
            </MapFilterGroup>
          </>
        ) : null}
      </div>
    </section>
  );
};
