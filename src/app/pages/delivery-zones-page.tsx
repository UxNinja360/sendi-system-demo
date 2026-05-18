import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router';
import { Plus, Trash2, Pencil, Check, X, MapPin, ChevronDown } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PageToolbar } from '../components/common/page-toolbar';
import { Toggle } from '../components/common/toggle';
import { ToolbarIconButton } from '../components/common/toolbar-icon-button';
import { useDelivery } from '../context/delivery-context-value';
import { createRestaurantIcon } from '../live/leaflet-map-icons';
import {
  DEFAULT_SENDI_PLUS_SERVICE_AREAS,
  isDeliveryZoneActive,
  isPointInDeliveryZone,
  loadStoredDeliveryZones,
  saveStoredDeliveryZones,
  type StoredDeliveryZone,
} from '../utils/delivery-zones';
import { isSendiPlusRestaurant } from '../utils/sendi-plus';

interface Zone extends StoredDeliveryZone {
  polygon?: L.Polygon;
  label?: L.Marker;
}

type StoredZone = StoredDeliveryZone;
const SENDI_PLUS_SOURCE = 'sendi-plus';
type SidePanelMode = 'permissions' | 'zones';

function loadStoredZones(): StoredZone[] {
  return loadStoredDeliveryZones();
}

function saveZones(zones: Zone[]) {
  const data: StoredZone[] = zones.map(({ id, name, color, latlngs, isActive }) => ({
    id,
    name,
    color,
    latlngs,
    isActive,
  }));
  saveStoredDeliveryZones(data);
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char] ?? char;
  });

const getZoneCenter = (latlngs: [number, number][]): [number, number] => {
  const total = latlngs.reduce(
    (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 },
  );

  return [total.lat / latlngs.length, total.lng / latlngs.length];
};

const createZoneLabelIcon = (name: string, color: string) =>
  L.divIcon({
    className: 'delivery-zone-label',
    html: `<span style="--zone-color:${color}">${escapeHtml(name)}</span>`,
  });

const getZoneDisplayStyle = (zone: StoredZone, isDisabled: boolean): L.PathOptions => ({
  color: isDisabled ? 'var(--app-text-secondary)' : zone.color,
  dashArray: isDisabled ? '4 6' : '',
  fillColor: isDisabled ? 'var(--app-surface-raised)' : zone.color,
  fillOpacity: isDisabled ? 0.04 : 0.18,
  opacity: isDisabled ? 0.42 : 0.95,
  weight: isDisabled ? 1.5 : 2,
});

const setZoneLabelDisabled = (zone: Zone, isDisabled: boolean) => {
  zone.label?.getElement()?.classList.toggle('delivery-zone-label--disabled', isDisabled);
};

const setZoneLabelHidden = (zone: Zone, isHidden: boolean) => {
  zone.label?.getElement()?.classList.toggle('delivery-zone-label--hidden', isHidden);
};

const getZoneCoordinateSpan = (zone: Pick<StoredZone, 'latlngs'>) => {
  const latitudes = zone.latlngs.map(([lat]) => lat);
  const longitudes = zone.latlngs.map(([, lng]) => lng);

  return Math.max(
    Math.max(...latitudes) - Math.min(...latitudes),
    Math.max(...longitudes) - Math.min(...longitudes),
  );
};

const getZoneLabelMinZoom = (zone: Pick<StoredZone, 'latlngs'>) => {
  const span = getZoneCoordinateSpan(zone);
  if (span < 0.055) return 12;
  if (span < 0.1) return 11;
  if (span < 0.18) return 10;
  if (span < 0.35) return 9;
  if (span < 0.7) return 8;
  return 6;
};

function addZoneToMap(map: L.Map, stored: StoredZone): Zone {
  const polygon = L.polygon(stored.latlngs, getZoneDisplayStyle(stored, false)).addTo(map);
  const label = L.marker(getZoneCenter(stored.latlngs), {
    icon: createZoneLabelIcon(stored.name, stored.color),
    interactive: false,
    keyboard: false,
  }).addTo(map);

  return { ...stored, polygon, label };
}

const ZONE_COLORS = [
  '#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6366f1',
];

const TEL_AVIV_CENTER: [number, number] = [32.0853, 34.7818];

const PRESET_DELIVERY_ZONES: StoredZone[] = DEFAULT_SENDI_PLUS_SERVICE_AREAS;

const fitMapToZones = (map: L.Map, zones: Array<Pick<Zone, 'latlngs'>>) => {
  const latlngs = zones.flatMap((zone) => zone.latlngs);
  if (latlngs.length === 0) return;

  map.fitBounds(L.latLngBounds(latlngs), {
    maxZoom: 13,
    padding: [28, 28],
  });
};

const shouldSeedSendiPlusZones = () => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('source') === SENDI_PLUS_SOURCE;
};

const getInitialSidePanelMode = (): SidePanelMode => {
  if (typeof window === 'undefined') return 'zones';
  return new URLSearchParams(window.location.search).get('tab') === 'permissions'
    ? 'permissions'
    : 'zones';
};

const hasValidLatLng = (value: { lat?: number | null; lng?: number | null } | null | undefined) =>
  typeof value?.lat === 'number' &&
  typeof value.lng === 'number' &&
  Number.isFinite(value.lat) &&
  Number.isFinite(value.lng);

export const DeliveryZonesPage: React.FC = () => {
  const { state } = useDelivery();
  const location = useLocation();
  const isSendiPlusMode = React.useMemo(
    () => new URLSearchParams(location.search).get('source') === SENDI_PLUS_SOURCE,
    [location.search],
  );
  const requestedSidePanelMode = React.useMemo<SidePanelMode>(
    () =>
      new URLSearchParams(location.search).get('tab') === 'permissions'
        ? 'permissions'
        : 'zones',
    [location.search],
  );
  const mapRef = useRef<L.Map | null>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const restaurantMarkerRef = useRef<L.Marker | null>(null);
  const drawingLayerRef = useRef<L.Polyline | null>(null);
  const tempMarkersRef = useRef<L.CircleMarker[]>([]);
  const zonesLoadedRef = useRef(false);
  const [mapZoom, setMapZoom] = useState(7);

  const [zones, setZones] = useState<Zone[]>(() => loadStoredZones() as Zone[]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const drawPointsRef = useRef<[number, number][]>([]);

  // modal state for naming new zone
  const [pendingLatlngs, setPendingLatlngs] = useState<[number, number][] | null>(null);
  const [newName, setNewName] = useState('אזור חלוקה חדש');

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const restaurantMenuRef = useRef<HTMLDivElement | null>(null);
  const [restaurantMenuOpen, setRestaurantMenuOpen] = useState(false);
  const [sidePanelMode, setSidePanelMode] = useState<SidePanelMode>(() => getInitialSidePanelMode());

  useEffect(() => {
    if (!isSendiPlusMode) return;
    setSidePanelMode(requestedSidePanelMode);
  }, [isSendiPlusMode, requestedSidePanelMode]);

  const sendiPlusRestaurants = React.useMemo(
    () =>
      state.restaurants.filter((restaurant) =>
        isSendiPlusRestaurant(restaurant.name, restaurant.chainId),
      ),
    [state.restaurants],
  );
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const selectedRestaurant = React.useMemo(
    () => sendiPlusRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null,
    [selectedRestaurantId, sendiPlusRestaurants],
  );
  const selectedRestaurantPoint = React.useMemo(
    () =>
      selectedRestaurant && hasValidLatLng(selectedRestaurant)
        ? { lat: selectedRestaurant.lat, lng: selectedRestaurant.lng }
        : null,
    [selectedRestaurant],
  );
  const selectedCoveredZoneIds = React.useMemo(
    () =>
      selectedRestaurantPoint
        ? zones
            .filter((zone) => isDeliveryZoneActive(zone) && isPointInDeliveryZone(selectedRestaurantPoint, zone))
            .map((zone) => zone.id)
        : [],
    [selectedRestaurantPoint, zones],
  );
  const selectedCoveredZoneIdSet = React.useMemo(
    () => new Set(selectedCoveredZoneIds),
    [selectedCoveredZoneIds],
  );
  const activeZonesCount = React.useMemo(
    () => zones.filter(isDeliveryZoneActive).length,
    [zones],
  );
  const selectedRestaurantIsInsideServiceArea =
    Boolean(selectedRestaurant) && (activeZonesCount === 0 || selectedCoveredZoneIds.length > 0);
  const activeSidePanelMode: SidePanelMode = isSendiPlusMode ? sidePanelMode : 'zones';
  const shouldShowRestaurantCoverageOnMap =
    isSendiPlusMode && activeSidePanelMode === 'permissions' && selectedRestaurant !== null;

  useEffect(() => {
    zones.forEach((zone) => {
      const isGloballyDisabled = !isDeliveryZoneActive(zone);
      const isCoverageDisabled =
        shouldShowRestaurantCoverageOnMap &&
        activeZonesCount > 0 &&
        !selectedCoveredZoneIdSet.has(zone.id);
      const isDisabled =
        isGloballyDisabled || isCoverageDisabled;

      zone.polygon?.setStyle(getZoneDisplayStyle(zone, isDisabled));
      setZoneLabelDisabled(zone, isDisabled);
      setZoneLabelHidden(zone, mapZoom < getZoneLabelMinZoom(zone));
    });
  }, [activeZonesCount, mapZoom, selectedCoveredZoneIdSet, shouldShowRestaurantCoverageOnMap, zones]);

  useEffect(() => {
    if (!isSendiPlusMode || selectedRestaurantId || sendiPlusRestaurants.length === 0) return;
    setSelectedRestaurantId(sendiPlusRestaurants[0].id);
  }, [isSendiPlusMode, selectedRestaurantId, sendiPlusRestaurants]);

  useEffect(() => {
    const map = mapRef.current;

    restaurantMarkerRef.current?.remove();
    restaurantMarkerRef.current = null;

    if (
      !map ||
      !shouldShowRestaurantCoverageOnMap ||
      !hasValidLatLng(selectedRestaurant)
    ) {
      return;
    }

    const position: [number, number] = [selectedRestaurant.lat, selectedRestaurant.lng];
    const marker = L.marker(position, {
      icon: createRestaurantIcon(30, selectedRestaurant.name),
      zIndexOffset: 1200,
      title: selectedRestaurant.name,
    })
      .bindTooltip(escapeHtml(selectedRestaurant.name), {
        className: 'delivery-zone-restaurant-tooltip',
        direction: 'top',
        offset: [0, -16],
        opacity: 1,
        permanent: true,
      })
      .addTo(map);

    restaurantMarkerRef.current = marker;

    return () => {
      marker.remove();
      if (restaurantMarkerRef.current === marker) {
        restaurantMarkerRef.current = null;
      }
    };
  }, [selectedRestaurant, shouldShowRestaurantCoverageOnMap]);

  useEffect(() => {
    if (!restaurantMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (restaurantMenuRef.current?.contains(target)) return;
      setRestaurantMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRestaurantMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [restaurantMenuOpen]);

  // keep ref in sync
  useEffect(() => {
    drawPointsRef.current = drawPoints;
  }, [drawPoints]);

  // persist zones — skip initial empty render before map loads stored zones
  useEffect(() => {
    if (!zonesLoadedRef.current) return;
    saveZones(zones);
  }, [zones]);

  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const getTileUrl = () =>
    document.documentElement.classList.contains('dark')
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  // init map
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, {
      center: TEL_AVIV_CENTER,
      zoom: 13,
      zoomControl: true,
    });
    const syncZoom = () => setMapZoom(map.getZoom());
    syncZoom();
    map.on('zoomend', syncZoom);
    const tileLayer = L.tileLayer(getTileUrl(), {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;
    mapRef.current = map;

    const storedZones = loadStoredZones();
    const zonesToDraw =
      storedZones.length > 0
        ? storedZones
        : shouldSeedSendiPlusZones()
          ? PRESET_DELIVERY_ZONES
          : [];

    if (zonesToDraw.length > 0) {
      const mappedZones = zonesToDraw.map(z => addZoneToMap(map, z));
      setZones(mappedZones);
      window.requestAnimationFrame(() => fitMapToZones(map, mappedZones));
    }
    zonesLoadedRef.current = true;

    // watch dark mode toggling
    const observer = new MutationObserver(() => {
      tileLayerRef.current?.setUrl(getTileUrl());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      map.off('zoomend', syncZoom);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // drawing click handler
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    const map = mapRef.current;
    if (!map) return;
    const pt: [number, number] = [e.latlng.lat, e.latlng.lng];
    const newPoints = [...drawPointsRef.current, pt];
    drawPointsRef.current = newPoints;
    setDrawPoints([...newPoints]);

    // temp circle marker
    const circle = L.circleMarker(pt, {
      radius: 5, color: '#fff', fillColor: '#16a34a', fillOpacity: 1, weight: 2,
    }).addTo(map);
    tempMarkersRef.current.push(circle);

    // update polyline preview
    if (drawingLayerRef.current) {
      drawingLayerRef.current.setLatLngs(newPoints);
    } else {
      drawingLayerRef.current = L.polyline(newPoints, {
        color: '#16a34a', weight: 2, dashArray: '6,4',
      }).addTo(map);
    }
  }, []);

  const handleMapDblClick = useCallback((e: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(e);
    finishDrawing();
  }, []);

  const finishDrawing = useCallback(() => {
    const pts = drawPointsRef.current;
    if (pts.length < 3) return;
    stopDrawingMode();
    setPendingLatlngs(pts);
    setNewName(`אזור חלוקה ${zones.length + 1}`);
  }, [zones.length]);

  const startDrawingMode = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setIsDrawing(true);
    setDrawPoints([]);
    drawPointsRef.current = [];
    map.getContainer().style.cursor = 'crosshair';
    map.on('click', handleMapClick);
    map.on('dblclick', handleMapDblClick);
    map.doubleClickZoom.disable();
  }, [handleMapClick, handleMapDblClick]);

  const stopDrawingMode = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setIsDrawing(false);
    map.getContainer().style.cursor = '';
    map.off('click', handleMapClick);
    map.off('dblclick', handleMapDblClick);
    map.doubleClickZoom.enable();

    // clean temp visuals
    tempMarkersRef.current.forEach(m => m.remove());
    tempMarkersRef.current = [];
    if (drawingLayerRef.current) {
      drawingLayerRef.current.remove();
      drawingLayerRef.current = null;
    }
    setDrawPoints([]);
    drawPointsRef.current = [];
  }, [handleMapClick, handleMapDblClick]);

  const cancelDrawing = useCallback(() => {
    stopDrawingMode();
    setPendingLatlngs(null);
  }, [stopDrawingMode]);

  const confirmZone = useCallback(() => {
    if (!pendingLatlngs || !newName.trim()) return;
    const map = mapRef.current;
    if (!map) return;

    const colorIndex = zones.length % ZONE_COLORS.length;
    const color = ZONE_COLORS[colorIndex];
    const id = Date.now().toString();

    const zone: Zone = {
      id,
      name: newName.trim(),
      color,
      latlngs: pendingLatlngs,
      isActive: true,
    };

    setZones(prev => [...prev, addZoneToMap(map, zone)]);
    setPendingLatlngs(null);
  }, [pendingLatlngs, newName, zones.length]);

  const deleteZone = useCallback((id: string) => {
    setZones(prev => {
      const zone = prev.find(z => z.id === id);
      if (zone) {
        zone.polygon?.remove();
        zone.label?.remove();
      }
      return prev.filter(z => z.id !== id);
    });
  }, []);

  const toggleZoneActive = useCallback((id: string) => {
    setZones(prev =>
      prev.map(zone =>
        zone.id === id ? { ...zone, isActive: !isDeliveryZoneActive(zone) } : zone,
      ),
    );
  }, []);

  const startEdit = useCallback((zone: Zone) => {
    setEditingId(zone.id);
    setEditName(zone.name);
  }, []);

  const confirmEdit = useCallback(() => {
    if (!editingId) return;
    const nextName = editName.trim();
    if (!nextName) return;

    setZones(prev => prev.map(z => {
      if (z.id !== editingId) return z;
      z.label?.setIcon(createZoneLabelIcon(nextName, z.color));
      return { ...z, name: nextName };
    }));
    setEditingId(null);
  }, [editingId, editName]);

  const addPresetZones = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(zones.map(zone => zone.id));
    const missingZones = PRESET_DELIVERY_ZONES.filter(zone => !existingIds.has(zone.id));

    if (missingZones.length === 0) {
      fitMapToZones(map, zones);
      return;
    }

    const addedZones = missingZones.map(zone => addZoneToMap(map, zone));
    const nextZones = [...zones, ...addedZones];
    setZones(nextZones);
    fitMapToZones(map, nextZones);
  }, [zones]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-app-background" dir="rtl">
      <style>{`
        .dark .leaflet-container { background: #171717; }
        .dark .leaflet-control-zoom a { background: #262626 !important; color: #fafafa !important; border-color: #404040 !important; }
        .dark .leaflet-control-zoom a:hover { background: #404040 !important; }
        .dark .leaflet-bar { border-color: #404040 !important; }
        .dark .leaflet-control-attribution { background: rgba(23,23,23,0.8) !important; color: #a3a3a3 !important; }
        .dark .leaflet-control-attribution a { color: #9fe870 !important; }
        .delivery-zone-label {
          background: transparent !important;
          border: 0 !important;
          pointer-events: none;
        }
        .delivery-zone-label span {
          align-items: center;
          background: color-mix(in srgb, var(--zone-color) 22%, rgba(8, 8, 8, 0.88));
          border: 1px solid color-mix(in srgb, var(--zone-color) 72%, white 16%);
          border-radius: 999px;
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
          color: #fff;
          display: inline-flex;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          max-width: 128px;
          padding: 6px 9px;
          position: absolute;
          right: 0;
          top: 0;
          transform: translate(50%, -50%);
          white-space: nowrap;
        }
        .delivery-zone-label--disabled span {
          background: color-mix(in srgb, var(--app-surface) 88%, var(--app-text-secondary) 8%);
          border-color: color-mix(in srgb, var(--app-text-secondary) 26%, transparent);
          box-shadow: none;
          color: color-mix(in srgb, var(--app-text-secondary) 76%, transparent);
          opacity: 0.62;
        }
        .delivery-zone-label--hidden {
          display: none;
        }
        .dark .delivery-zone-label--disabled span {
          background: rgba(18, 18, 18, 0.78);
          border-color: rgba(237, 237, 237, 0.14);
          color: rgba(237, 237, 237, 0.46);
        }
        .delivery-zone-restaurant-tooltip {
          background: color-mix(in srgb, var(--app-surface) 94%, white 4%);
          border: 1px solid var(--app-border);
          border-radius: 999px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
          color: var(--app-text);
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          padding: 6px 9px;
        }
        .delivery-zone-restaurant-tooltip::before {
          display: none;
        }
        .dark .delivery-zone-restaurant-tooltip {
          background: rgba(10, 10, 10, 0.94);
          border-color: var(--app-nav-border);
          color: #ededed;
        }
      `}</style>
      <PageToolbar
        showPeriodControl={false}
        headerControls={
          <>
            <ToolbarIconButton onClick={addPresetZones} label="פרוס אזורי חלוקה">
              <MapPin className="h-4 w-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              active={isDrawing}
              onClick={isDrawing ? cancelDrawing : startDrawingMode}
              label={isDrawing ? 'ביטול ציור' : 'צייר אזור חלוקה'}
            >
              {isDrawing ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </ToolbarIconButton>
          </>
        }
      />

      {/* body */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3 md:p-4">
        {/* sidebar */}
        <aside className="flex w-80 shrink-0 flex-col overflow-hidden rounded-[8px] border border-app-border bg-app-surface dark:border-app-nav-border dark:bg-[#080808]">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isSendiPlusMode ? (
              <div className="border-b border-app-border p-3 dark:border-app-nav-border">
                <div className="grid grid-cols-2 gap-1 rounded-[7px] bg-app-background p-1 dark:bg-[#050505]">
                  <button
                    type="button"
                    onClick={() => setSidePanelMode('zones')}
                    className={`h-9 rounded-[6px] px-2 text-xs font-semibold transition-colors ${
                      activeSidePanelMode === 'zones'
                        ? 'bg-app-surface text-app-text shadow-[0_0_0_1px_var(--app-border)] dark:bg-[#111111] dark:shadow-[0_0_0_1px_var(--app-nav-border)]'
                        : 'text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    אזורי חלוקה
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidePanelMode('permissions')}
                    className={`h-9 rounded-[6px] px-2 text-xs font-semibold transition-colors ${
                      activeSidePanelMode === 'permissions'
                        ? 'bg-app-surface text-app-text shadow-[0_0_0_1px_var(--app-border)] dark:bg-[#111111] dark:shadow-[0_0_0_1px_var(--app-nav-border)]'
                        : 'text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    מסעדות בתחום
                  </button>
                </div>
              </div>
            ) : null}

            {isSendiPlusMode && activeSidePanelMode === 'permissions' && (
              <section className="p-4">
                <div className="space-y-1.5">
                  <div className="text-sm font-semibold text-app-text">
                    מסעדות בתחום הפעילות
                  </div>
                  <div className="text-xs leading-5 text-app-text-secondary">
                    משלוח סנדי פלוס ייכנס רק אם המסעדה והלקוח בתוך אחד מאזורי החלוקה, ואז המרחק נבדק מול הסליידר.
                  </div>
                </div>

                <div ref={restaurantMenuRef} className="mt-5">
                  <button
                    type="button"
                    onClick={() => setRestaurantMenuOpen((value) => !value)}
                    disabled={sendiPlusRestaurants.length === 0}
                    className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[7px] border border-app-border bg-app-background px-3 text-sm text-app-text transition-colors hover:bg-app-surface-raised disabled:cursor-not-allowed disabled:opacity-50 dark:border-app-nav-border dark:bg-[#050505]"
                    aria-haspopup="menu"
                    aria-expanded={restaurantMenuOpen}
                  >
                    <span className="min-w-0 truncate font-medium">
                      {selectedRestaurant?.name ?? 'אין מסעדות סנדי פלוס'}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-app-text-secondary transition-transform ${restaurantMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {restaurantMenuOpen ? (
                    <div
                      role="menu"
                      className="mt-2 max-h-56 overflow-y-auto rounded-[7px] border border-app-border bg-app-surface py-1 text-right shadow-[var(--app-shadow-panel)] dark:border-app-nav-border dark:bg-[#0A0A0A]"
                    >
                      {sendiPlusRestaurants.map((restaurant) => {
                        const isSelected = restaurant.id === selectedRestaurantId;

                        return (
                          <button
                            key={restaurant.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setSelectedRestaurantId(restaurant.id);
                              setRestaurantMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition-colors ${
                              isSelected
                                ? 'bg-app-surface-raised text-app-text'
                                : 'text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text'
                            }`}
                          >
                            <span className="truncate">{restaurant.name}</span>
                            {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-app-brand" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex items-center justify-between gap-2">
                  <span className="text-xs text-app-text-secondary">
                    {!selectedRestaurant
                      ? 'בחר מסעדה'
                      : activeZonesCount === 0
                        ? 'לא הוגדרו אזורי חלוקה'
                        : selectedRestaurantIsInsideServiceArea
                          ? `${selectedCoveredZoneIds.length.toLocaleString('he-IL')} מתוך ${activeZonesCount.toLocaleString('he-IL')} אזורים מכילים את המסעדה`
                          : 'המסעדה מחוץ לאזורי החלוקה'}
                  </span>
                  <span
                    className={`rounded-[5px] px-2.5 py-1.5 text-xs font-semibold ${
                      activeZonesCount > 0 && selectedRestaurantIsInsideServiceArea
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-app-surface-raised text-app-text-secondary'
                    }`}
                  >
                    {!selectedRestaurant
                      ? 'בחר מסעדה'
                      : activeZonesCount === 0
                        ? 'לא מוגדר'
                        : selectedRestaurantIsInsideServiceArea
                          ? 'בתחום'
                          : 'מחוץ לתחום'}
                  </span>
                </div>

                <div className="mt-4 max-h-[calc(100vh-360px)] min-h-48 overflow-hidden overflow-y-auto rounded-[7px] border border-app-border dark:border-app-nav-border">
                  {zones.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-app-text-secondary">
                      קודם פורסים או מציירים אזורי חלוקה.
                    </div>
                  ) : (
                    zones.map((zone) => {
                      const zoneIsActive = isDeliveryZoneActive(zone);
                      const isCovered = zoneIsActive && selectedCoveredZoneIdSet.has(zone.id);
                      const statusLabel = !zoneIsActive
                        ? 'כבוי'
                        : !selectedRestaurant
                          ? '-'
                          : isCovered
                            ? 'המסעדה בפנים'
                            : 'לא בתחום';

                      return (
                        <div
                          key={zone.id}
                          className={`flex w-full items-center justify-between gap-2 border-b border-app-border px-3.5 py-3 text-right text-xs last:border-b-0 dark:border-app-nav-border ${
                            isCovered
                              ? 'text-app-text'
                              : 'text-app-text-secondary'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: zoneIsActive ? zone.color : 'var(--app-text-secondary)' }}
                            />
                            <span className="truncate">{zone.name}</span>
                          </span>
                          <span className={`text-[11px] font-semibold ${isCovered ? 'text-app-text' : 'text-app-text-secondary'}`}>
                            {statusLabel}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            )}

            {activeSidePanelMode === 'zones' ? (
              <>
                <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-app-border bg-app-surface px-4 text-xs font-semibold text-app-text-secondary dark:border-app-nav-border dark:bg-[#080808]">
                  <span>אזורי חלוקה</span>
                  <span>
                    {activeZonesCount.toLocaleString('he-IL')} / {zones.length.toLocaleString('he-IL')}
                  </span>
                </div>

                {zones.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-app-text-secondary">
                    צייר אזור חלוקה על המפה כדי להתחיל
                  </div>
                )}
                {zones.map(zone => {
                  const zoneIsActive = isDeliveryZoneActive(zone);

                  return (
                  <div
                    key={zone.id}
                    className={`border-b border-app-border px-4 py-3.5 last:border-b-0 dark:border-app-nav-border ${
                      zoneIsActive ? '' : 'bg-app-background/45'
                    }`}
                  >
                    {editingId === zone.id ? (
                      <div className="space-y-2">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full rounded-[6px] border border-app-border bg-app-background px-3 py-1.5 text-sm text-app-text outline-none focus:border-app-brand dark:border-app-nav-border dark:bg-[#050505]"
                          placeholder="שם אזור החלוקה"
                        />
                        <div className="flex gap-2">
                          <button onClick={confirmEdit} className="flex flex-1 items-center justify-center gap-1 rounded-[6px] border border-app-border bg-app-surface-raised px-3 py-1.5 text-xs font-medium text-app-text transition-colors hover:bg-app-surface dark:border-app-nav-border">
                            <Check className="h-3 w-3" />שמור
                          </button>
                          <button onClick={() => setEditingId(null)} className="flex flex-1 items-center justify-center gap-1 rounded-[6px] border border-app-border bg-app-background px-3 py-1.5 text-xs font-medium text-app-text-secondary transition-colors hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#050505]">
                            <X className="h-3 w-3" />ביטול
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ background: zoneIsActive ? zone.color : 'var(--app-text-secondary)' }}
                          />
                          <div>
                            <div className={`text-sm font-medium ${zoneIsActive ? 'text-app-text' : 'text-app-text-secondary'}`}>
                              {zone.name}
                            </div>
                            <div className="mt-0.5 text-[11px] text-app-text-secondary">
                              {zoneIsActive ? 'פעיל' : 'כבוי'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(zone)}
                            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteZone(zone.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-app-text-secondary transition-colors hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <Toggle
                            checked={zoneIsActive}
                            onChange={() => toggleZoneActive(zone.id)}
                            ariaLabel={`${zoneIsActive ? 'כבה' : 'הפעל'} ${zone.name}`}
                            className="scale-90"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </>
            ) : null}
          </div>
        </aside>

        {/* map */}
        <section className="relative min-w-0 flex-1 overflow-hidden rounded-[8px] border border-app-border bg-app-surface dark:border-app-nav-border">
          <div ref={mapElRef} className="h-full w-full" />
          {isDrawing && (
            <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-xl bg-[#0d0d12]/80 px-4 py-2 text-sm text-white backdrop-blur-sm">
              {drawPoints.length < 3
                ? `לחץ על המפה להוספת נקודות (${drawPoints.length}/3 מינימום)`
                : `${drawPoints.length} נקודות — לחץ פעמיים לסיום`}
            </div>
          )}
        </section>
      </div>

      {/* modal: confirm new zone */}
      {pendingLatlngs && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-[8px] border border-app-border bg-app-surface p-5 shadow-[var(--app-shadow-panel)] dark:border-app-nav-border" dir="rtl">
            <h3 className="mb-4 text-base font-bold text-app-text">הגדרת אזור חלוקה חדש</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-app-text-secondary">שם אזור החלוקה</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full rounded-[6px] border border-app-border bg-app-background px-3 py-2 text-sm text-app-text outline-none focus:border-app-brand dark:border-app-nav-border dark:bg-[#050505]"
                  placeholder="לדוגמה: תל אביב מרכז"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={confirmZone}
                disabled={!newName.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-[6px] border border-app-border bg-app-surface-raised px-4 py-2 text-sm font-medium text-app-text transition-colors hover:bg-app-surface disabled:opacity-40 dark:border-app-nav-border"
              >
                <Check className="h-4 w-4" />שמור אזור
              </button>
              <button
                onClick={() => setPendingLatlngs(null)}
                className="flex flex-1 items-center justify-center gap-2 rounded-[6px] border border-app-border bg-app-background px-4 py-2 text-sm font-medium text-app-text-secondary transition-colors hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#050505]"
              >
                <X className="h-4 w-4" />ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
