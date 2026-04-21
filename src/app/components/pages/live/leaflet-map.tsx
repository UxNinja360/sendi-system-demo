import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { MapPin, FileText, X } from 'lucide-react';
import { useTheme } from '../../../context/theme.context';
import { getRestaurantBrandMarker } from '../../../utils/restaurant-branding';
import 'leaflet/dist/leaflet.css';

interface MapMarker {
  lat: number;
  lng: number;
  name?: string;
}

interface Order {
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

interface Courier {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  isOnShift?: boolean;
}

interface LeafletMapProps {
  orders: Order[];
  routeOrders?: Order[];
  selectedId: string | null;
  couriers: Courier[];
  restaurants: MapMarker[];
  customers?: MapMarker[];
  onOrderHover?: (orderId: string | null) => void;
  onCourierHover?: (courierId: string | null) => void;
  onRestaurantHover?: (restaurantName: string | null) => void;
  hoveredOrderId?: string | null;
  hoveredCourierId?: string | null;
  hoveredRestaurantName?: string | null;
  highlightedCourierId?: string | null;
  routeStopOrders?: Record<string, string[]>;
  selectedDeliveryIds?: Set<string>;
  onOrderClick?: (deliveryId: string) => void;
  onOrderShowDetails?: (deliveryId: string) => void;
  onCourierClick?: (courierId: string) => void;
  onMapClick?: () => void;
}

const getPickupGroupKey = (order: Order) => (
  order.restaurantId ||
  `${order.restaurantName ?? ''}:${order.pickupLat ?? ''}:${order.pickupLng ?? ''}`
);

// Groups orders that share the same pixel-space location and fans them out
// using a golden-angle spiral so each marker stays individually clickable.
function computeOrderRenderPositions(
  orders: Order[],
  map: L.Map,
  precisionDigits = 4,   // ~11m grouping radius
  spiralBasePx = 18,
  spiralStepPx = 12,
): Map<string, [number, number]> {
  const groups = new Map<string, Order[]>();
  for (const order of orders) {
    const key = `${order.lat.toFixed(precisionDigits)},${order.lng.toFixed(precisionDigits)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(order);
  }

  const result = new Map<string, [number, number]>();
  const GOLDEN_ANGLE = 2.399963; // â‰ˆ 137.5Â° in radians

  for (const group of groups.values()) {
    if (group.length === 1) {
      result.set(group[0].id, [group[0].lat, group[0].lng]);
    } else {
      const center = map.latLngToContainerPoint([group[0].lat, group[0].lng]);
      group.forEach((order, i) => {
        const angle = i * GOLDEN_ANGLE;
        const radius = spiralBasePx + spiralStepPx * Math.floor(i / 6);
        const px = center.x + radius * Math.cos(angle);
        const py = center.y + radius * Math.sin(angle);
        const latlng = map.containerPointToLatLng(L.point(px, py));
        result.set(order.id, [latlng.lat, latlng.lng]);
      });
    }
  }

  return result;
}

function computeCourierRenderPositions(
  couriers: Courier[],
  restaurants: MapMarker[],
  map: L.Map,
  attachRadiusPx = 20,
  orbitRadiusPx = 18,
): Map<string, [number, number]> {
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
      const latlng = map.containerPointToLatLng(point);
      result.set(courier.id, [latlng.lat, latlng.lng]);
    });
  }

  return result;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  orders,
  routeOrders,
  selectedId,
  couriers,
  restaurants,
  customers,
  onOrderHover,
  onCourierHover,
  onRestaurantHover,
  hoveredOrderId,
  hoveredCourierId,
  hoveredRestaurantName,
  highlightedCourierId,
  routeStopOrders,
  selectedDeliveryIds,
  onOrderClick,
  onOrderShowDetails,
  onCourierClick,
  onMapClick,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const orderMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const courierMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const lastFocusedOrderIdRef = useRef<string | null>(null);
  const { themeColor, getThemeClasses } = useTheme();
  const themeClasses = getThemeClasses();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    order: Order;
  } | null>(null);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeContextMenu(); };
    // Close on any left-click anywhere (pointerdown so it fires before React onClick)
    const onPointer = (e: PointerEvent) => { if (e.button === 0) closeContextMenu(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [contextMenu, closeContextMenu]);
  const [zoomVersion, setZoomVersion] = useState(0);

  // Map tile URLs based on theme
  const getTileUrl = () => {
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
      // Dark mode - use dark tiles
      return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else {
      // Light mode - use light tiles
      return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    }
  };

  const routeDataOrders = routeOrders ?? orders;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [32.0853, 34.7818], // Tel Aviv
      zoom: 13,
      zoomControl: false,
      closePopupOnClick: false,
    });

    mapRef.current = map;

    // Recompute spiral offsets after each zoom level change
    map.on('zoomend', () => setZoomVersion(v => v + 1));

    // Add tile layer
    const tileLayer = L.tileLayer(getTileUrl(), {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Update tile layer when theme changes
  useEffect(() => {
    if (tileLayerRef.current && mapRef.current) {
      tileLayerRef.current.setUrl(getTileUrl());
    }
  }, [themeColor]);

  // Map click â†’ clear focus (only when clicking empty map, not markers)
  useEffect(() => {
    if (!mapRef.current || !onMapClick) return;
    const handler = () => onMapClick();
    mapRef.current.on('click', handler);
    return () => {
      mapRef.current?.off('click', handler);
    };
  }, [onMapClick]);

  // Observer for dark mode changes
  useEffect(() => {
    if (!tileLayerRef.current || !mapRef.current) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (tileLayerRef.current) {
            tileLayerRef.current.setUrl(getTileUrl());
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    orderMarkersRef.current.clear();
    courierMarkersRef.current.clear();

    // Clear existing route lines
    routeLinesRef.current.forEach(line => line.remove());
    routeLinesRef.current = [];

    // Draw route for highlighted courier
    if (highlightedCourierId) {
      const courier = couriers.find(c => c.id === highlightedCourierId);
      if (courier) {
        const courierOrders = routeDataOrders.filter(o =>
          o.courierId === highlightedCourierId &&
          o.status !== 'delivered' && o.status !== 'cancelled'
        );
        const orderById = Object.fromEntries(courierOrders.map(o => [o.deliveryId, o]));

        // ×‘× ×” ××ª ×”×§×• ×œ×¤×™ ×¡×“×¨ ×”×¢×¦×™×¨×•×ª ×©× ×§×‘×¢
        const routePoints: [number, number][] = [[courier.lat, courier.lng]];
        const stopIds: string[] = routeStopOrders?.[highlightedCourierId] ?? [];

        // ×× ××™×Ÿ ×¡×“×¨ ×ž×•×ª×× â€” ×‘×¨×™×¨×ª ×ž×—×“×œ: ××™×¡×•×£â†’×”×•×¨×“×” ×œ×›×œ ×ž×©×œ×•×—
        const defaultStops = courierOrders.flatMap((order, index, orders) => {
          const pickupGroupKey = getPickupGroupKey(order);
          const firstPickupIndex = orders.findIndex((candidate) => getPickupGroupKey(candidate) === pickupGroupKey);
          return [
            ...(firstPickupIndex === index ? [`pickup-group:${pickupGroupKey}`] : []),
            `${order.deliveryId}-dropoff`,
          ];
        });
        const validStopIds = new Set(defaultStops);
        const effectiveStops = stopIds.length > 0
          ? [
              ...stopIds.filter((stopId) => validStopIds.has(stopId)),
              ...defaultStops.filter((stopId) => !stopIds.includes(stopId)),
            ]
          : defaultStops;

        for (const stopId of effectiveStops) {
          if (stopId.startsWith('pickup-group:')) {
            const pickupGroupKey = stopId.replace('pickup-group:', '');
            const pickupGroupOrders = courierOrders.filter((order) =>
              getPickupGroupKey(order) === pickupGroupKey &&
              (order.status === 'pending' || order.status === 'assigned' || order.status === 'delivering')
            );

            // Skip restaurant point if ALL orders in this group are already picked up (delivering)
            const allAlreadyPickedUp = pickupGroupOrders.length > 0 &&
              pickupGroupOrders.every(o => o.status === 'delivering');

            if (!allAlreadyPickedUp && pickupGroupOrders.length > 0 && pickupGroupOrders[0].pickupLat && pickupGroupOrders[0].pickupLng) {
              routePoints.push([pickupGroupOrders[0].pickupLat!, pickupGroupOrders[0].pickupLng!]);
            }
          } else {
            const deliveryId = stopId.replace(/-dropoff$/, '');
            const order = orderById[deliveryId];
            if (!order) continue;
            // ×”×•×¡×£ ×× ×¢×“×™×™×Ÿ ×œ× × ×ž×¡×¨
            if (order.status !== 'delivered') {
              routePoints.push([order.lat, order.lng]);
            }
          }
        }

        if (routePoints.length > 1) {
          const line = L.polyline(routePoints, {
            color: '#22c55e',
            weight: 2.5,
            opacity: 0.8,
            dashArray: '6 5',
          }).addTo(mapRef.current!);
          routeLinesRef.current.push(line);
        }
      }
    }

    // Draw restaurant → customer route for selected delivery (only when unassigned/pending)
    if (selectedId && !highlightedCourierId) {
      const sel = orders.find(o => o.id === selectedId || o.deliveryId === selectedId);
      if (sel && sel.pickupLat && sel.pickupLng && !sel.courierId && sel.status === 'pending') {
        const line = L.polyline(
          [[sel.pickupLat, sel.pickupLng], [sel.lat, sel.lng]],
          { color: '#6366f1', weight: 3, opacity: 0.85, dashArray: '8 5' }
        ).addTo(mapRef.current!);
        routeLinesRef.current.push(line);
      }
    }

    // Create custom icons with theme colors
    const createIcon = (color: string, size: number = 36) => {
      return L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0px 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          ">
            <div style="width: 20px; height: 20px; background: white; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    };

    // Restaurant icon â€” subtle small square pin
    const createRestaurantIcon = (size: number = 22, restaurantName?: string) => {
      const brandMarker = getRestaurantBrandMarker(restaurantName);
      if (brandMarker) {
        return L.divIcon({
          className: 'custom-marker restaurant-marker',
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              background-color: ${brandMarker.fill};
              border-radius: 5px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              opacity: 0.95;
              color: ${brandMarker.text};
              font-size: 13px;
              font-weight: 900;
              font-family: Arial, sans-serif;
              line-height: 1;
            ">${brandMarker.label}</div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      }
      return L.divIcon({
        className: 'custom-marker restaurant-marker',
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background-color: #7c3aed;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0.85;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
              <path d="M7 2v20"/>
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
            </svg>
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    };

    const makeCourierIcon = (name: string, hasActiveDelivery: boolean, isOnShift: boolean = true) => {
      const firstName = name.split(' ')[0];
      const isDark = document.documentElement.classList.contains('dark');
      const labelTextColor = isDark ? '#fafafa' : '#1f2937';
      const labelBackground = isDark ? 'rgba(23,23,23,0.82)' : 'rgba(255,255,255,0.78)';
      const labelBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)';
      const labelShadow = isDark ? '0 1px 3px rgba(0,0,0,0.35)' : '0 1px 2px rgba(0,0,0,0.1)';
      const courierColor = !isOnShift ? '#64748b' : hasActiveDelivery ? '#f59e0b' : '#22c55e';
      const courierShadow = !isOnShift ? 'rgba(100,116,139,0.35)' : hasActiveDelivery ? 'rgba(245,158,11,0.5)' : 'rgba(34,197,94,0.45)';
      const labelOpacity = isOnShift ? '1' : '0.78';
      return L.divIcon({
        className: 'custom-marker courier-dot',
        html: `
          <div class="courier-marker-shell" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
            <div class="courier-marker-core" style="
              width:14px;height:14px;
              background:${courierColor};
              border:2px solid white;
              border-radius:50%;
              box-shadow:0 1px 4px ${courierShadow};
            "></div>
            <div class="courier-marker-label" style="
              margin-top:3px;
              font-size:11px;
              font-family:'Rubik',sans-serif;
              font-weight:600;
              color:${labelTextColor};
              background:${labelBackground};
              border:${labelBorder};
              padding:2px 6px;
              border-radius:999px;
              white-space:nowrap;
              line-height:1.4;
              box-shadow:${labelShadow};
              backdrop-filter:blur(6px);
              opacity:${labelOpacity};
            ">${firstName}</div>
          </div>
        `,
        iconSize: [70, 32],
        iconAnchor: [35, 9],
      });
    };
    // selected variant - teal ring + check badge
    const makeSelectedOrderPin = (color: string, shadowColor: string, svgPath: string) => L.divIcon({
      className: 'custom-marker order-pin selected-pin',
      html: `
        <div style="position:relative;width:26px;height:33px;display:flex;align-items:flex-start;justify-content:center;">
          <div style="
            width:22px;height:22px;
            background:radial-gradient(circle at center, transparent 0 6px, ${color} 6.5px 100%);
            border-radius:999px 999px 999px 6px;
            transform:rotate(-45deg);
            box-shadow:0 3px 8px ${shadowColor}, 0 0 0 2px rgba(15,205,211,0.16);
            opacity:0.9;
          "></div>
          <div style="
            position:absolute;
            top:-4px;right:-4px;
            width:13px;height:13px;
            background:#0fcdd3;
            border:1.5px solid white;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 1px 3px rgba(0,0,0,0.3);
            z-index:1;
          ">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>`,
      iconSize: [26, 33],
      iconAnchor: [13, 29],
    });

    const makeOrderPin = (color: string, shadowColor: string, svgPath: string) => L.divIcon({
      className: 'custom-marker order-pin',
      html: `
        <div style="position:relative;width:24px;height:30px;display:flex;align-items:flex-start;justify-content:center;">
          <div style="
            width:18px;height:18px;
            background:radial-gradient(circle at center, transparent 0 5px, ${color} 5.5px 100%);
            border-radius:999px 999px 999px 6px;
            transform:rotate(-45deg);
            box-shadow:0 2px 5px ${shadowColor};
            opacity:0.72;
          "></div>
        </div>`,
      iconSize: [24, 30],
      iconAnchor: [12, 25],
    });

    const pendingOrderIcon = makeOrderPin(
      '#f97316', 'rgba(249,115,22,0.42)',
      '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="7"/>'
    );
    const assignedOrderIcon = makeOrderPin(
      '#eab308', 'rgba(234,179,8,0.42)',
      '<circle cx="12" cy="9" r="3"/><path d="M7 17c1.4-2 8.6-2 10 0"/>'
    );
    const pickingUpOrderIcon = makeOrderPin(
      '#eab308', 'rgba(234,179,8,0.42)',
      '<path d="M7 10h10l-1 7H8l-1-7Z"/><path d="M9 10a3 3 0 0 1 6 0"/>'
    );
    const deliveringOrderIcon = makeOrderPin(
      '#6366f1', 'rgba(99,102,241,0.42)',
      '<path d="M7 12h8"/><path d="m12 7 5 5-5 5"/>'
    );
    const deliveredOrderIcon = makeOrderPin(
      '#16a34a', 'rgba(22,163,74,0.42)',
      '<polyline points="5 12 10 17 19 8"/>'
    );
    const cancelledOrderIcon = makeOrderPin(
      '#ef4444', 'rgba(239,68,68,0.42)',
      '<line x1="8" y1="8" x2="16" y2="16"/><line x1="16" y1="8" x2="8" y2="16"/>'
    );

    const getOrderIcon = (status: string) => {
      if (status === 'pending') return pendingOrderIcon;
      if (status === 'assigned') return assignedOrderIcon;

      if (status === 'delivered') return deliveredOrderIcon;
      if (status === 'cancelled') return cancelledOrderIcon;
      return deliveringOrderIcon;
    };

    const getSelectedOrderIcon = (status: string) => {
      if (status === 'pending') return makeSelectedOrderPin('#f97316', 'rgba(249,115,22,0.42)', '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="7"/>');
      if (status === 'assigned') return makeSelectedOrderPin('#eab308', 'rgba(234,179,8,0.42)', '<circle cx="12" cy="9" r="3"/><path d="M7 17c1.4-2 8.6-2 10 0"/>');
      if (status === 'delivering') return makeSelectedOrderPin('#eab308', 'rgba(234,179,8,0.42)', '<path d="M7 10h10l-1 7H8l-1-7Z"/><path d="M9 10a3 3 0 0 1 6 0"/>');
      if (status === 'delivered') return makeSelectedOrderPin('#16a34a', 'rgba(22,163,74,0.42)', '<polyline points="5 12 10 17 19 8"/>');
      if (status === 'cancelled') return makeSelectedOrderPin('#ef4444', 'rgba(239,68,68,0.42)', '<line x1="8" y1="8" x2="16" y2="16"/><line x1="16" y1="8" x2="8" y2="16"/>');
      return makeSelectedOrderPin('#6366f1', 'rgba(99,102,241,0.42)', '<path d="M7 12h8"/><path d="m12 7 5 5-5 5"/>');
    };

    // Add restaurant markers
    restaurants.forEach((restaurant) => {
      const marker = L.marker([restaurant.lat, restaurant.lng], {
        icon: createRestaurantIcon(22, restaurant.name),
        zIndexOffset: 500,
        title: restaurant.name || '',
      })
        .addTo(mapRef.current!);
      
      marker.on('mouseover', () => {
        onRestaurantHover?.(restaurant.name);
      });
      marker.on('mouseout', () => {
        onRestaurantHover?.(null);
      });
      
      markersRef.current.push(marker);
    });

    const courierRenderPositions = computeCourierRenderPositions(couriers, restaurants, mapRef.current);

    // Add courier markers
    couriers.forEach((courier) => {
      const hasActiveDelivery = routeDataOrders.some(
        order =>
          order.courierId === courier.id &&
          order.status !== 'delivered' &&
          order.status !== 'cancelled',
      );
      const [courierLat, courierLng] = courierRenderPositions.get(courier.id) ?? [courier.lat, courier.lng];
      const marker = L.marker([courierLat, courierLng], {
        icon: makeCourierIcon(courier.name, hasActiveDelivery, courier.isOnShift !== false),
        zIndexOffset: 900,
        title: courier.name || '',
      })
        .addTo(mapRef.current!);

      marker.on('mouseover', () => {
        onCourierHover?.(courier.id);
      });
      marker.on('mouseout', () => {
        onCourierHover?.(null);
      });
      marker.on('click', () => onCourierClick?.(courier.id));

      courierMarkersRef.current.set(courier.id, marker);
      markersRef.current.push(marker);

      // reapply classes after (re)creation
      const el = marker.getElement();
      if (el) {
        if (courier.id === highlightedCourierId) el.classList.add('marker-route-active');
        if (courier.id === hoveredCourierId) el.classList.add('marker-hover-persist');
      }
    });

    // Compute spread positions for overlapping markers (spiral fan-out)
    const visibleOrders = orders;
    const renderPositions = computeOrderRenderPositions(visibleOrders, mapRef.current);

    // Add order markers
    visibleOrders.forEach((order) => {
      const isSelected = (selectedDeliveryIds?.has(order.deliveryId) ?? false) || selectedId === order.id;
      const icon = isSelected ? getSelectedOrderIcon(order.status) : getOrderIcon(order.status);
      const zIndex = isSelected ? 400 : (order.status === 'pending' ? 120 : 80);
      const [lat, lng] = renderPositions.get(order.id) ?? [order.lat, order.lng];

      const marker = L.marker([lat, lng], {
        icon,
        zIndexOffset: zIndex,
        title: order.customerName || '',
      }).addTo(mapRef.current!);

      marker.on('mouseover', () => onOrderHover?.(order.id));
      marker.on('mouseout', () => onOrderHover?.(null));
      marker.on('click', () => onOrderClick?.(order.deliveryId));

      // Native DOM contextmenu (right-click) — bypass Leaflet's event system entirely
      const markerEl = marker.getElement();
      if (markerEl) {
        markerEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = mapContainerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const captured = order; // close over current order
          setContextMenu({
            x: (e as MouseEvent).clientX - rect.left,
            y: (e as MouseEvent).clientY - rect.top,
            order: captured,
          });
        });
      }

      orderMarkersRef.current.set(order.id, marker);
      markersRef.current.push(marker);

      // reapply hover class after (re)creation
      if (order.id === hoveredOrderId) {
        const el = marker.getElement();
        if (el) el.classList.add('marker-hover-persist');
        marker.setZIndexOffset(1000);
      }
    });

  }, [orders, routeDataOrders, couriers, restaurants, onOrderHover, onCourierHover, onRestaurantHover, onOrderClick, onCourierClick, themeClasses, highlightedCourierId, hoveredOrderId, hoveredCourierId, routeStopOrders, selectedDeliveryIds, zoomVersion, selectedId]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) {
      lastFocusedOrderIdRef.current = null;
      return;
    }

    if (lastFocusedOrderIdRef.current === selectedId) return;

    const marker = orderMarkersRef.current.get(selectedId);
    const selectedOrder = orders.find((order) => order.id === selectedId);
    const targetLatLng = marker?.getLatLng() ?? (selectedOrder ? L.latLng(selectedOrder.lat, selectedOrder.lng) : null);

    if (!targetLatLng) return;

    if (!mapRef.current.getBounds().pad(-0.15).contains(targetLatLng)) {
      mapRef.current.flyTo(targetLatLng, Math.max(mapRef.current.getZoom(), 14), {
        animate: true,
        duration: 0.35,
      });
    }

    lastFocusedOrderIdRef.current = selectedId;
  }, [orders, selectedId]);

  // Highlight marker while externally hovered (e.g. from a card)
  useEffect(() => {
    if (hoveredOrderId) {
      const marker = orderMarkersRef.current.get(hoveredOrderId);
      const el = marker?.getElement();
      if (el) {
        el.classList.add('marker-hover-persist');
        marker!.setZIndexOffset(1000);
      }
    }
    return () => {
      if (hoveredOrderId) {
        const marker = orderMarkersRef.current.get(hoveredOrderId);
        const el = marker?.getElement();
        if (el) el.classList.remove('marker-hover-persist');
      }
    };
  }, [hoveredOrderId]);

  useEffect(() => {
    if (hoveredCourierId) {
      const marker = courierMarkersRef.current.get(hoveredCourierId);
      const el = marker?.getElement();
      if (el) el.classList.add('marker-hover-persist');
    }
    return () => {
      if (hoveredCourierId) {
        const marker = courierMarkersRef.current.get(hoveredCourierId);
        const el = marker?.getElement();
        if (el) el.classList.remove('marker-hover-persist');
      }
    };
  }, [hoveredCourierId]);

  // Visual highlight for the courier whose route is shown
  useEffect(() => {
    if (highlightedCourierId) {
      const marker = courierMarkersRef.current.get(highlightedCourierId);
      const el = marker?.getElement();
      if (el) el.classList.add('marker-route-active');
    }
    return () => {
      if (highlightedCourierId) {
        const marker = courierMarkersRef.current.get(highlightedCourierId);
        const el = marker?.getElement();
        if (el) el.classList.remove('marker-route-active');
      }
    };
  }, [highlightedCourierId]);


  return (
    <div className="w-full h-full relative" onContextMenu={(e) => e.preventDefault()}>
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="absolute z-[9999] min-w-[170px] bg-white dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-xl shadow-xl overflow-hidden"
          style={{
            left: Math.min(contextMenu.x, (mapContainerRef.current?.clientWidth ?? 9999) - 180),
            top: Math.min(contextMenu.y, (mapContainerRef.current?.clientHeight ?? 9999) - 100),
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 pt-2.5 pb-1.5 border-b border-[#f0f0f0] dark:border-[#2a2a2a]">
            <p className="text-[11px] font-semibold text-[#737373] dark:text-[#737373] leading-none truncate" dir="rtl">
              {contextMenu.order.customerName || contextMenu.order.address || `#${contextMenu.order.deliveryId}`}
            </p>
          </div>
          {/* Actions */}
          <div className="py-1">
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#171717] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors text-right"
              dir="rtl"
              onClick={() => {
                onOrderShowDetails?.(contextMenu.order.deliveryId);
                closeContextMenu();
              }}
            >
              <FileText className="w-3.5 h-3.5 text-[#737373] shrink-0" />
              <span>פרטים מלאים</span>
            </button>
          </div>
        </div>
      )}


      <style>{`
        .leaflet-container {
          background: #ddd;
          font-family: 'Rubik', sans-serif;
        }
        .dark .leaflet-container {
          background: #171717;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          font-family: 'Rubik', sans-serif;
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
          outline: none !important;
        }
        .leaflet-interactive:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        @keyframes marker-ring-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(15,205,211,0.7); }
          70%  { box-shadow: 0 0 0 14px rgba(15,205,211,0); }
          100% { box-shadow: 0 0 0 0 rgba(15,205,211,0); }
        }
        .custom-marker > div {
          transition: transform 0.22s ease, filter 0.22s ease, opacity 0.22s ease;
          transform-origin: center bottom;
        }
        .marker-hover-persist {
          z-index: 1000 !important;
        }
        .courier-dot.marker-hover-persist > div {
          transform: translateY(-2px);
          filter: drop-shadow(0 8px 18px rgba(15,23,42,0.18));
        }
        .courier-dot.marker-hover-persist .courier-marker-core {
          box-shadow:
            0 0 0 4px rgba(37,99,235,0.18),
            0 6px 16px rgba(37,99,235,0.28) !important;
          transform: scale(1.08);
        }
        .courier-dot.marker-hover-persist .courier-marker-label {
          transform: translateY(1px);
          box-shadow: 0 6px 18px rgba(15,23,42,0.16) !important;
          background: rgba(255,255,255,0.92) !important;
        }
        .dark .courier-dot.marker-hover-persist .courier-marker-label {
          background: rgba(23,23,23,0.94) !important;
        }
        @keyframes order-pin-bounce {
          0%, 100% { transform: translateY(0px); }
          40%       { transform: translateY(-6px); }
          70%       { transform: translateY(-3px); }
        }
        .order-pin.marker-hover-persist > div {
          animation: order-pin-bounce 0.5s ease forwards;
          filter: drop-shadow(0 10px 18px rgba(15,23,42,0.22));
        }
        .order-pin.marker-hover-persist > div > div:first-child {
          box-shadow: 0 8px 18px rgba(15,23,42,0.18) !important;
        }
        .marker-route-active {
          z-index: 900 !important;
        }
        .marker-route-active > div > div:first-child {
          border-color: #22c55e !important;
          border-width: 3px !important;
          box-shadow: 0 0 0 0 rgba(34,197,94,0.7) !important;
          animation: marker-ring-pulse 1.6s ease-out infinite;
        }
        .restaurant-marker:hover > div {
          transform: scale(1.2);
          box-shadow: 0px 4px 16px rgba(147,51,234,0.6) !important;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 0 10px rgba(0,0,0,0.2) !important;
        }
        .leaflet-control-zoom a {
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 20px !important;
          border: none !important;
        }
        .leaflet-control-zoom a:first-child {
          border-radius: 8px 8px 0 0 !important;
        }
        .leaflet-control-zoom a:last-child {
          border-radius: 0 0 8px 8px !important;
        }
        .dark .leaflet-control-zoom a {
          background: #262626 !important;
          color: white !important;
        }
        .dark .leaflet-control-zoom a:hover {
          background: #404040 !important;
        }
        .leaflet-bar {
          border: 2px solid rgba(0,0,0,0.2) !important;
          border-radius: 8px !important;
        }
        .dark .leaflet-bar {
          border-color: #404040 !important;
        }
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.8) !important;
          color: #333 !important;
          font-size: 10px !important;
          padding: 2px 4px !important;
        }
        .dark .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.8) !important;
        }
      `}</style>
    </div>
  );
};
