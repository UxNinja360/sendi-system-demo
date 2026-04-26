import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { FileText, Power } from 'lucide-react';
import { useTheme } from '../context/theme.context';
import {
  createRestaurantIcon,
  getOrderIcon,
  getSelectedOrderIcon,
  makeCourierIcon,
} from './leaflet-map-icons';
import {
  computeCourierRenderPositions,
  computeOrderRenderPositions,
  Courier,
  getPickupGroupKey,
  MapMarker,
  Order,
} from './leaflet-map-utils';
import { buildSimulatedGpsRoutePath } from './route-geometry';
import 'leaflet/dist/leaflet.css';

type RoutePoint = [number, number];

const ACTIVE_COURIER_ROUTE_STYLE: L.PolylineOptions = {
  color: '#22c55e',
  weight: 3,
  opacity: 0.92,
  dashArray: '8 7',
  lineCap: 'round',
  lineJoin: 'round',
};

const SELECTED_PENDING_ROUTE_STYLE: L.PolylineOptions = {
  color: '#6366f1',
  weight: 3,
  opacity: 0.9,
  lineCap: 'round',
  lineJoin: 'round',
};

const isValidRoutePoint = (point: RoutePoint | null | undefined): point is RoutePoint =>
  Array.isArray(point) &&
  point.length === 2 &&
  point.every((value) => Number.isFinite(value));

interface LeafletMapProps {
  orders: Order[];
  routeOrders?: Order[];
  selectedId: string | null;
  couriers: Courier[];
  restaurants: MapMarker[];
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
  onRestaurantShowDetails?: (restaurantId: string) => void;
  onRestaurantToggleActive?: (restaurantId: string) => void;
  onCourierClick?: (courierId: string) => void;
  onMapClick?: () => void;
}


export const LeafletMap: React.FC<LeafletMapProps> = ({
  orders,
  routeOrders,
  selectedId,
  couriers,
  restaurants,
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
  onRestaurantShowDetails,
  onRestaurantToggleActive,
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
    item:
      | { type: 'order'; order: Order }
      | { type: 'restaurant'; restaurant: MapMarker };
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
  const selectedRouteOrder = selectedId
    ? routeDataOrders.find((order) => order.id === selectedId || order.deliveryId === selectedId)
    : null;
  const selectedRouteCourierId =
    selectedRouteOrder?.courierId &&
    selectedRouteOrder.status !== 'delivered' &&
    selectedRouteOrder.status !== 'cancelled' &&
    selectedRouteOrder.status !== 'expired'
      ? selectedRouteOrder.courierId
      : null;
  const routeCourierId = highlightedCourierId ?? selectedRouteCourierId;

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

  // Clear focus when clicking empty map space, not markers.
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

    const drawRouteLine = (points: RoutePoint[], options: L.PolylineOptions) => {
      if (!mapRef.current) return;

      const validPoints = points.filter(isValidRoutePoint);
      if (validPoints.length < 2) return;

      const routePath = buildSimulatedGpsRoutePath(
        validPoints.map(([lat, lng]) => ({ lat, lng }))
      ).map((point) => [point.lat, point.lng] as RoutePoint);
      const line = L.polyline(
        routePath,
        options
      ).addTo(mapRef.current);
      routeLinesRef.current.push(line);
    };

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    orderMarkersRef.current.clear();
    courierMarkersRef.current.clear();

    // Clear existing route lines
    routeLinesRef.current.forEach(line => line.remove());
    routeLinesRef.current = [];

    // Draw route for the highlighted courier, or for the courier of the selected active delivery.
    if (routeCourierId) {
      const courier = couriers.find(c => c.id === routeCourierId);
      if (courier) {
        const courierOrders = routeDataOrders.filter(o =>
          o.courierId === routeCourierId &&
          o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'expired'
        );
        const orderById = Object.fromEntries(courierOrders.map(o => [o.deliveryId, o]));

        // Build one planned route line using the saved stop order.
        const routePoints: [number, number][] = [[courier.lat, courier.lng]];
        const stopIds: string[] = routeStopOrders?.[routeCourierId] ?? [];

        // If no custom stop order exists, fall back to pickup-then-dropoff.
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
            if (order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'expired') {
              routePoints.push([order.lat, order.lng]);
            }
          }
        }

        if (routePoints.length > 1) {
          drawRouteLine(routePoints, ACTIVE_COURIER_ROUTE_STYLE);
        }
      }
    }

    // Draw restaurant-to-customer route for a selected unassigned delivery.
    if (selectedId && !routeCourierId) {
      const sel = orders.find(o => o.id === selectedId || o.deliveryId === selectedId);
      if (sel && sel.pickupLat && sel.pickupLng && !sel.courierId && sel.status === 'pending') {
        drawRouteLine(
          [[sel.pickupLat, sel.pickupLng], [sel.lat, sel.lng]],
          SELECTED_PENDING_ROUTE_STYLE,
        );
      }
    }

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

      const markerEl = marker.getElement();
      if (markerEl) {
        markerEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = mapContainerRef.current?.getBoundingClientRect();
          if (!rect) return;
          setContextMenu({
            x: (e as MouseEvent).clientX - rect.left,
            y: (e as MouseEvent).clientY - rect.top,
            item: { type: 'restaurant', restaurant },
          });
        });
      }

      markersRef.current.push(marker);
    });

    const activeCourierIds = new Set<string>(
      routeDataOrders
        .filter((order) =>
          !!order.courierId &&
          order.status !== 'delivered' &&
          order.status !== 'cancelled' &&
          order.status !== 'expired',
        )
        .map((order) => order.courierId as string),
    );
    const courierRenderPositions = computeCourierRenderPositions(
      couriers.filter((courier) => !activeCourierIds.has(courier.id)),
      restaurants,
      mapRef.current,
    );

    // Add courier markers
    couriers.forEach((courier) => {
      const hasActiveDelivery = activeCourierIds.has(courier.id);
      const [courierLat, courierLng] = hasActiveDelivery
        ? [courier.lat, courier.lng]
        : courierRenderPositions.get(courier.id) ?? [courier.lat, courier.lng];
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
        if (courier.id === routeCourierId) el.classList.add('marker-route-active');
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

      // Use the native DOM context menu handler instead of Leaflet's event layer.
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
            item: { type: 'order', order: captured },
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

    return undefined;
  }, [orders, routeDataOrders, couriers, restaurants, onOrderHover, onCourierHover, onRestaurantHover, onOrderClick, onCourierClick, themeClasses, routeCourierId, hoveredOrderId, hoveredCourierId, routeStopOrders, selectedDeliveryIds, zoomVersion, selectedId]);

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
    if (routeCourierId) {
      const marker = courierMarkersRef.current.get(routeCourierId);
      const el = marker?.getElement();
      if (el) el.classList.add('marker-route-active');
    }
    return () => {
      if (routeCourierId) {
        const marker = courierMarkersRef.current.get(routeCourierId);
        const el = marker?.getElement();
        if (el) el.classList.remove('marker-route-active');
      }
    };
  }, [routeCourierId]);


  return (
    <div className="w-full h-full relative" onContextMenu={(e) => e.preventDefault()}>
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="absolute z-[9999] min-w-[170px] bg-white dark:bg-app-surface border border-[#e5e5e5] dark:border-app-border rounded-xl shadow-xl overflow-hidden"
          style={{
            left: Math.min(contextMenu.x, (mapContainerRef.current?.clientWidth ?? 9999) - 180),
            top: Math.min(contextMenu.y, (mapContainerRef.current?.clientHeight ?? 9999) - 100),
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 pt-2.5 pb-1.5 border-b border-[#f0f0f0] dark:border-app-border">
            <p className="text-[11px] font-semibold text-[#737373] dark:text-[#737373] leading-none truncate" dir="rtl">
              {contextMenu.item.type === 'order'
                ? (contextMenu.item.order.customerName || contextMenu.item.order.address || `#${contextMenu.item.order.deliveryId}`)
                : (contextMenu.item.restaurant.name || 'מסעדה')}
            </p>
          </div>
          {/* Actions */}
          <div className="py-1">
            {contextMenu.item.type === 'order' ? (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#171717] dark:text-app-text-secondary hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors text-right"
                dir="rtl"
                onClick={() => {
                  onOrderShowDetails?.(contextMenu.item.order.deliveryId);
                  closeContextMenu();
                }}
              >
                <FileText className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                <span>פרטים מלאים</span>
              </button>
            ) : (
              <>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#171717] dark:text-app-text-secondary hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors text-right"
                  dir="rtl"
                  onClick={() => {
                    if (contextMenu.item.restaurant.id) {
                      onRestaurantShowDetails?.(contextMenu.item.restaurant.id);
                    }
                    closeContextMenu();
                  }}
                >
                  <FileText className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                  <span>פרטי מסעדה</span>
                </button>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#171717] dark:text-app-text-secondary hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors text-right"
                  dir="rtl"
                  onClick={() => {
                    if (contextMenu.item.restaurant.id) {
                      onRestaurantToggleActive?.(contextMenu.item.restaurant.id);
                    }
                    closeContextMenu();
                  }}
                >
                  <Power className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                  <span>{contextMenu.item.restaurant.isActive ? 'השבת מסעדה' : 'הפעל מסעדה'}</span>
                </button>
              </>
            )}
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

