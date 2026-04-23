import L from 'leaflet';

export interface MapMarker {
  lat: number;
  lng: number;
  name?: string;
}

export interface Order {
  id: string;
  deliveryId: string;
  restaurantId?: string;
  lat: number;
  lng: number;
  pickupLat?: number;
  pickupLng?: number;
  courierId?: string | null;
  customerName: string;
  address?: string;
  restaurantName?: string;
  status: string;
  courierName?: string | null;
}

export interface Courier {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  isOnShift?: boolean;
}

export const getPickupGroupKey = (order: Order) => (
  order.restaurantId ||
  `${order.restaurantName ?? ''}:${order.pickupLat ?? ''}:${order.pickupLng ?? ''}`
);

// Groups orders that share the same pixel-space location and fans them out
// using a golden-angle spiral so each marker stays individually clickable.
export const computeOrderRenderPositions = (
  orders: Order[],
  map: L.Map,
  precisionDigits = 4,
  spiralBasePx = 18,
  spiralStepPx = 12,
) => {
  const groups = new Map<string, Order[]>();

  for (const order of orders) {
    const key = `${order.lat.toFixed(precisionDigits)},${order.lng.toFixed(precisionDigits)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(order);
  }

  const result = new Map<string, [number, number]>();
  const goldenAngle = 2.399963;

  for (const group of groups.values()) {
    if (group.length === 1) {
      result.set(group[0].id, [group[0].lat, group[0].lng]);
      continue;
    }

    const center = map.latLngToContainerPoint([group[0].lat, group[0].lng]);
    group.forEach((order, index) => {
      const angle = index * goldenAngle;
      const radius = spiralBasePx + spiralStepPx * Math.floor(index / 6);
      const px = center.x + radius * Math.cos(angle);
      const py = center.y + radius * Math.sin(angle);
      const latLng = map.containerPointToLatLng(L.point(px, py));
      result.set(order.id, [latLng.lat, latLng.lng]);
    });
  }

  return result;
};

export const computeCourierRenderPositions = (
  couriers: Courier[],
  restaurants: MapMarker[],
  map: L.Map,
  attachRadiusPx = 20,
  orbitRadiusPx = 18,
) => {
  const result = new Map<string, [number, number]>();
  const groups = new Map<string, { restaurant: MapMarker; couriers: Courier[] }>();

  for (const courier of couriers) {
    const courierPoint = map.latLngToContainerPoint([courier.lat, courier.lng]);
    let nearestRestaurant: MapMarker | null = null;
    let nearestDistance = Infinity;

    for (const restaurant of restaurants) {
      const restaurantPoint = map.latLngToContainerPoint([restaurant.lat, restaurant.lng]);
      const distance = courierPoint.distanceTo(restaurantPoint);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestRestaurant = restaurant;
      }
    }

    if (!nearestRestaurant || nearestDistance > attachRadiusPx) {
      result.set(courier.id, [courier.lat, courier.lng]);
      continue;
    }

    const key = `${nearestRestaurant.lat.toFixed(5)},${nearestRestaurant.lng.toFixed(5)}`;
    if (!groups.has(key)) {
      groups.set(key, { restaurant: nearestRestaurant, couriers: [] });
    }
    groups.get(key)!.couriers.push(courier);
  }

  for (const group of groups.values()) {
    const center = map.latLngToContainerPoint([group.restaurant.lat, group.restaurant.lng]);

    group.couriers.forEach((courier, index) => {
      const angle =
        group.couriers.length === 1
          ? -Math.PI / 4
          : -Math.PI / 2 + (index * (Math.PI / Math.max(group.couriers.length - 1, 1)));
      const point = L.point(
        center.x + orbitRadiusPx * Math.cos(angle),
        center.y + orbitRadiusPx * Math.sin(angle),
      );
      const latLng = map.containerPointToLatLng(point);
      result.set(courier.id, [latLng.lat, latLng.lng]);
    });
  }

  return result;
};

