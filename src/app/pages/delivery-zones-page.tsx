import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, Trash2, Pencil, Check, X, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DELIVERY_STORAGE_KEYS } from '../context/delivery-storage';

interface Zone {
  id: string;
  name: string;
  color: string;
  latlngs: [number, number][];
  polygon?: L.Polygon;
  label?: L.Marker;
}

type StoredZone = Omit<Zone, 'polygon' | 'label'>;

const STORAGE_KEY = DELIVERY_STORAGE_KEYS.deliveryZones;
const SENDI_PLUS_SOURCE = 'sendi-plus';

function loadStoredZones(): StoredZone[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveZones(zones: Zone[]) {
  const data: StoredZone[] = zones.map(({ id, name, color, latlngs }) => ({ id, name, color, latlngs }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

function addZoneToMap(map: L.Map, stored: StoredZone): Zone {
  const polygon = L.polygon(stored.latlngs, {
    color: stored.color, weight: 2, fillColor: stored.color, fillOpacity: 0.18,
  }).addTo(map);
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

const PRESET_DELIVERY_ZONES: StoredZone[] = [
  {
    id: 'preset-central-tel-aviv',
    name: 'מרכז תל אביב',
    color: '#0a84ff',
    latlngs: [
      [32.058, 34.762],
      [32.058, 34.79],
      [32.081, 34.79],
      [32.083, 34.764],
    ],
  },
  {
    id: 'preset-tel-aviv-beach',
    name: 'חוף תל אביב',
    color: '#06b6d4',
    latlngs: [
      [32.067, 34.753],
      [32.067, 34.766],
      [32.083, 34.766],
      [32.083, 34.756],
    ],
  },
  {
    id: 'preset-florentin',
    name: 'פלורנטין',
    color: '#f97316',
    latlngs: [
      [32.052, 34.759],
      [32.052, 34.781],
      [32.066, 34.781],
      [32.066, 34.759],
    ],
  },
  {
    id: 'preset-nahalat-binyamin',
    name: 'נחלת בנימין',
    color: '#a855f7',
    latlngs: [
      [32.059, 34.763],
      [32.059, 34.773],
      [32.069, 34.773],
      [32.069, 34.763],
    ],
  },
  {
    id: 'preset-tel-aviv-port',
    name: 'נמל תל אביב',
    color: '#14b8a6',
    latlngs: [
      [32.087, 34.763],
      [32.087, 34.789],
      [32.099, 34.789],
      [32.099, 34.763],
    ],
  },
  {
    id: 'preset-ramat-gan',
    name: 'מרכז רמת גן',
    color: '#22c55e',
    latlngs: [
      [32.072, 34.785],
      [32.072, 34.815],
      [32.091, 34.815],
      [32.091, 34.785],
    ],
  },
  {
    id: 'preset-givatayim',
    name: 'מרכז גבעתיים',
    color: '#84cc16',
    latlngs: [
      [32.064, 34.803],
      [32.064, 34.826],
      [32.078, 34.826],
      [32.078, 34.803],
    ],
  },
  {
    id: 'preset-bnei-brak',
    name: 'מרכז בני ברק',
    color: '#eab308',
    latlngs: [
      [32.075, 34.821],
      [32.075, 34.846],
      [32.092, 34.846],
      [32.092, 34.821],
    ],
  },
  {
    id: 'preset-jaffa',
    name: 'יפו',
    color: '#ef4444',
    latlngs: [
      [32.002, 34.753],
      [32.002, 34.788],
      [32.033, 34.788],
      [32.033, 34.753],
    ],
  },
  {
    id: 'preset-bat-yam',
    name: 'בת ים',
    color: '#ec4899',
    latlngs: [
      [32.011, 34.733],
      [32.011, 34.768],
      [32.039, 34.768],
      [32.039, 34.733],
    ],
  },
];

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

export const DeliveryZonesPage: React.FC = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const drawingLayerRef = useRef<L.Polyline | null>(null);
  const tempMarkersRef = useRef<L.CircleMarker[]>([]);
  const zonesLoadedRef = useRef(false);

  const [zones, setZones] = useState<Zone[]>(() => loadStoredZones() as Zone[]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const drawPointsRef = useRef<[number, number][]>([]);

  // modal state for naming new zone
  const [pendingLatlngs, setPendingLatlngs] = useState<[number, number][] | null>(null);
  const [newName, setNewName] = useState('אזור חדש');

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
    setNewName(`אזור ${zones.length + 1}`);
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
    <div className="flex min-h-screen flex-col bg-app-background" dir="rtl">
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
      `}</style>
      {/* header */}
      <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-white px-5 dark:border-app-border dark:bg-app-surface">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-app-text">אזורי משלוח</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addPresetZones}
            className="flex items-center gap-2 rounded-xl border border-[#d8d8d8] bg-white px-4 py-2 text-sm font-medium text-[#0d0d12] transition-colors hover:bg-[#f5f5f5] dark:border-app-border dark:bg-app-surface dark:text-app-text dark:hover:bg-[#262626]"
          >
            <MapPin className="h-4 w-4" />
            פרוס אזורי חלוקה
          </button>
          <button
            onClick={isDrawing ? cancelDrawing : startDrawingMode}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              isDrawing
                ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-[#9fe870] text-[#0d0d12] hover:bg-[#8ed75f]'
            }`}
          >
            {isDrawing ? <><X className="h-4 w-4" />ביטול ציור</> : <><Plus className="h-4 w-4" />צייר אזור</>}
          </button>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 overflow-hidden">
        {/* sidebar */}
        <div className="flex w-72 shrink-0 flex-col border-l border-[#e5e5e5] bg-white dark:border-app-border dark:bg-app-surface">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {zones.length === 0 && (
              <div className="py-10 text-center text-sm text-[#737373] dark:text-app-text-secondary">
                צייר אזור על המפה כדי להתחיל
              </div>
            )}
            {zones.map(zone => (
              <div
                key={zone.id}
                className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3 dark:border-app-border dark:bg-app-surface"
              >
                {editingId === zone.id ? (
                  <div className="space-y-2">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-1.5 text-sm dark:border-app-border dark:bg-app-surface dark:text-app-text"
                      placeholder="שם האזור"
                    />
                    <div className="flex gap-2">
                      <button onClick={confirmEdit} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#9fe870] px-3 py-1.5 text-xs font-medium text-[#0d0d12]">
                        <Check className="h-3 w-3" />שמור
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#f5f5f5] px-3 py-1.5 text-xs font-medium text-[#737373] dark:bg-[#262626]">
                        <X className="h-3 w-3" />ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: zone.color }} />
                      <div>
                        <div className="text-sm font-medium text-[#0d0d12] dark:text-app-text">{zone.name}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(zone)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#737373] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteZone(zone.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#737373] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* map */}
        <div className="relative flex-1">
          <div ref={mapElRef} className="h-full w-full" />
          {isDrawing && (
            <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-xl bg-[#0d0d12]/80 px-4 py-2 text-sm text-white backdrop-blur-sm">
              {drawPoints.length < 3
                ? `לחץ על המפה להוספת נקודות (${drawPoints.length}/3 מינימום)`
                : `${drawPoints.length} נקודות — לחץ פעמיים לסיום`}
            </div>
          )}
        </div>
      </div>

      {/* modal: confirm new zone */}
      {pendingLatlngs && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl bg-white p-6 shadow-xl dark:bg-app-surface" dir="rtl">
            <h3 className="mb-4 text-base font-bold text-[#0d0d12] dark:text-app-text">הגדרת אזור חדש</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#737373]">שם האזור</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-sm dark:border-app-border dark:bg-app-surface dark:text-app-text"
                  placeholder="לדוגמה: תל אביב מרכז"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={confirmZone}
                disabled={!newName.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#9fe870] px-4 py-2 text-sm font-medium text-[#0d0d12] disabled:opacity-40"
              >
                <Check className="h-4 w-4" />שמור אזור
              </button>
              <button
                onClick={() => setPendingLatlngs(null)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f5f5f5] px-4 py-2 text-sm font-medium text-[#737373] dark:bg-[#262626]"
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
