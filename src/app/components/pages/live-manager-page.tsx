import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../context/theme.context';
import {
  Wifi,
  WifiOff,
  Terminal,
  Bike,
  Package,
  MapPin,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

// ── Fix Leaflet default icon issue with bundlers ─────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Types ────────────────────────────────────────────────────────────────────

interface DeliveryInfo {
  restaurant: string;
  customer: string;
  progress: number;
}

interface CourierData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'delivering' | 'available';
  heading: number;
  delivery: DeliveryInfo;
}

interface SimulatorMessage {
  type: 'update';
  couriers: CourierData[];
  timestamp?: number;
}

// ── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  available: '#22c55e',
  delivering: '#3b82f6',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'פנוי',
  delivering: 'במשלוח',
};

const STATUS_BG: Record<string, string> = {
  available: 'bg-green-500/10 text-green-600 dark:text-green-400',
  delivering: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

// ── Map tile helpers ──────────────────────────────────────────────────────────

function getTileUrl(isDark: boolean) {
  return isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
}

// ── Courier marker icon ───────────────────────────────────────────────────────

function buildCourierIcon(status: string, name: string): L.DivIcon {
  const color = STATUS_COLORS[status] ?? '#94a3b8';
  return L.divIcon({
    className: 'live-courier-marker',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:none;">
        <div style="
          width:36px;height:36px;
          background:${color};
          border:3px solid #fff;
          border-radius:50%;
          box-shadow:0 2px 10px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          transition:background 0.3s ease;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4l3 3"/>
          </svg>
        </div>
        <div style="
          margin-top:3px;
          background:rgba(0,0,0,0.72);
          color:#fff;
          font-size:10px;
          font-weight:600;
          padding:1px 6px;
          border-radius:6px;
          white-space:nowrap;
          font-family:system-ui,sans-serif;
          letter-spacing:0.02em;
        ">${name}</div>
      </div>
    `,
    iconSize: [80, 56],
    iconAnchor: [40, 18],
    popupAnchor: [0, -24],
  });
}

// ── Main Component ────────────────────────────────────────────────────────────

export const LiveManagerPage: React.FC = () => {
  const { isDark } = useTheme();

  // WebSocket state
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const [couriers, setCouriers] = useState<CourierData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // ── Map initialisation ────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [32.0853, 34.7818],
      zoom: 13,
      zoomControl: true,
    });

    mapRef.current = map;

    const tile = L.tileLayer(getTileUrl(isDark), {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tile;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update tiles on dark mode change ─────────────────────────────────────

  useEffect(() => {
    tileLayerRef.current?.setUrl(getTileUrl(isDark));
  }, [isDark]);

  // ── Update courier markers on map ─────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const existingIds = new Set(markersRef.current.keys());

    couriers.forEach((courier) => {
      const latlng: L.LatLngTuple = [courier.lat, courier.lng];

      if (markersRef.current.has(courier.id)) {
        // Update existing marker position and icon
        const marker = markersRef.current.get(courier.id)!;
        marker.setLatLng(latlng);
        marker.setIcon(buildCourierIcon(courier.status, courier.name));
        existingIds.delete(courier.id);
      } else {
        // Create new marker
        const marker = L.marker(latlng, {
          icon: buildCourierIcon(courier.status, courier.name),
          zIndexOffset: 1000,
        })
          .bindPopup(buildPopupContent(courier), { direction: 'top', offset: [0, -20] })
          .addTo(map);

        marker.on('click', () => {
          setSelectedCourierId((prev) =>
            prev === courier.id ? null : courier.id
          );
        });

        markersRef.current.set(courier.id, marker);
      }

      // Update popup content
      const marker = markersRef.current.get(courier.id)!;
      if (marker.getPopup()) {
        marker.getPopup()!.setContent(buildPopupContent(courier));
      }
    });

    // Remove stale markers
    existingIds.forEach((id) => {
      markersRef.current.get(id)?.remove();
      markersRef.current.delete(id);
    });
  }, [couriers]);

  // ── Fly to selected courier ───────────────────────────────────────────────

  useEffect(() => {
    if (!selectedCourierId || !mapRef.current) return;
    const courier = couriers.find((c) => c.id === selectedCourierId);
    if (courier) {
      mapRef.current.flyTo([courier.lat, courier.lng], 15, { duration: 0.8 });
    }
  }, [selectedCourierId, couriers]);

  // ── WebSocket connection ──────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket('ws://localhost:8765');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: SimulatorMessage = JSON.parse(event.data);
        if (msg.type === 'update') {
          setCouriers(msg.couriers);
          setLastUpdate(new Date());
        }
      } catch {
        // malformed message – ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Auto-reconnect after 3 s
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      reconnectTimerRef.current && clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function buildPopupContent(courier: CourierData) {
    const statusLabel = STATUS_LABELS[courier.status] ?? courier.status;
    const progressPct = Math.round(courier.delivery.progress * 100);
    return `
      <div dir="rtl" style="font-family:system-ui,sans-serif;min-width:180px;padding:4px 2px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${courier.name}</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">סטטוס: <strong style="color:#111">${statusLabel}</strong></div>
        <div style="font-size:12px;margin-bottom:2px;">🍴 ${courier.delivery.restaurant}</div>
        <div style="font-size:12px;margin-bottom:8px;">📍 ${courier.delivery.customer}</div>
        <div style="background:#e5e7eb;border-radius:4px;height:6px;overflow:hidden;">
          <div style="background:#3b82f6;height:100%;width:${progressPct}%;transition:width 0.5s;"></div>
        </div>
        <div style="font-size:11px;color:#6b7280;margin-top:3px;text-align:left;">${progressPct}%</div>
      </div>
    `;
  }

  const selectedCourier = couriers.find((c) => c.id === selectedCourierId) ?? null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      dir="rtl"
      className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] overflow-hidden"
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#262626] bg-white dark:bg-[#111111] shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Connection dot */}
          <span className="relative flex h-3 w-3">
            {connected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            )}
          </span>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
            מנג'ר לייב
          </h1>
          {connected && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              מחובר
            </span>
          )}
          {!connected && (
            <span className="text-xs text-red-500 font-medium animate-pulse">
              מנסה להתחבר…
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
              עדכון אחרון: {lastUpdate.toLocaleTimeString('he-IL')}
            </span>
          )}
          <button
            onClick={connect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1a1a] dark:hover:bg-[#262626]
              text-gray-700 dark:text-gray-300 transition-colors"
            title="התחבר מחדש"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">התחבר</span>
          </button>
        </div>
      </div>

      {/* ── Body: map + sidebar ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Map area */}
        <div className="flex-1 relative min-w-0">
          {/* Map container */}
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />

          {/* Not-connected overlay */}
          {!connected && couriers.length === 0 && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center
              bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-sm">
              <WifiOff size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">
                הסימולטור לא פועל
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center max-w-xs">
                כדי לראות שליחים חיים על המפה, הפעל את הסימולטור בטרמינל
              </p>

              {/* Instructions card */}
              <div className="bg-gray-900 dark:bg-[#0f0f0f] text-gray-100 rounded-xl p-5
                shadow-2xl border border-gray-700 dark:border-[#2a2a2a] max-w-sm w-full mx-4">
                <div className="flex items-center gap-2 mb-3 text-green-400 font-mono text-sm font-bold">
                  <Terminal size={14} />
                  <span>הפעל סימולציה</span>
                </div>
                <div className="font-mono text-sm space-y-1 text-gray-300">
                  <div className="text-gray-500 text-xs mb-2"># התקן תלויות (פעם אחת)</div>
                  <div className="bg-black/40 rounded px-3 py-1.5 text-green-300 select-all">
                    pip install -r requirements_simulator.txt
                  </div>
                  <div className="text-gray-500 text-xs mt-3 mb-2"># הפעל את השרת</div>
                  <div className="bg-black/40 rounded px-3 py-1.5 text-green-300 select-all">
                    python simulator.py
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 border-t border-gray-700 pt-3">
                  השרת יפעל על{' '}
                  <span className="text-yellow-400 font-mono">ws://localhost:8765</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 animate-pulse">
                <RefreshCw size={12} />
                <span>מנסה להתחבר אוטומטית כל 3 שניות…</span>
              </div>
            </div>
          )}

          {/* Live badge */}
          {connected && (
            <div className="absolute top-3 right-3 z-[400]
              flex items-center gap-1.5 px-3 py-1.5 rounded-full
              bg-black/60 backdrop-blur-sm text-white text-xs font-bold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </div>
          )}
        </div>

        {/* ── Right sidebar (RTL so it appears on the right) ── */}
        <div className="w-72 xl:w-80 shrink-0 flex flex-col border-r border-gray-200 dark:border-[#262626]
          bg-white dark:bg-[#111111] overflow-hidden">
          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-[#262626] shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                שליחים פעילים
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full
                bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {couriers.length}
              </span>
            </div>
          </div>

          {/* Connection status banner */}
          <div className={`flex items-center gap-2 px-4 py-2 text-xs font-medium shrink-0
            ${connected
              ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 animate-pulse'
            }`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? 'מחובר לסימולטור' : 'לא מחובר — ממתין לחיבור…'}
          </div>

          {/* Courier list */}
          <div className="flex-1 overflow-y-auto">
            {couriers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
                <Bike size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  אין שליחים — הפעל את הסימולטור
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-[#1a1a1a]">
                {couriers.map((courier) => (
                  <CourierCard
                    key={courier.id}
                    courier={courier}
                    isSelected={selectedCourierId === courier.id}
                    onSelect={() =>
                      setSelectedCourierId((prev) =>
                        prev === courier.id ? null : courier.id
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom info */}
          {connected && couriers.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-[#262626] shrink-0">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                נתוני מיקום בזמן אמת דרך OSRM
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Leaflet CSS overrides */}
      <style>{`
        .live-courier-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          font-family: system-ui, sans-serif;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.18);
        }
        .dark .leaflet-popup-content-wrapper {
          background: #1a1a1a;
          color: #e5e7eb;
        }
        .dark .leaflet-popup-tip {
          background: #1a1a1a;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
        }
        .leaflet-control-zoom a {
          width: 34px !important;
          height: 34px !important;
          line-height: 34px !important;
          font-size: 18px !important;
          border: none !important;
        }
        .dark .leaflet-control-zoom a {
          background: #1f1f1f !important;
          color: #fff !important;
        }
        .dark .leaflet-control-zoom a:hover {
          background: #2d2d2d !important;
        }
        .leaflet-control-attribution {
          font-size: 9px !important;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};

// ── Courier card sub-component ────────────────────────────────────────────────

interface CourierCardProps {
  courier: CourierData;
  isSelected: boolean;
  onSelect: () => void;
}

const CourierCard: React.FC<CourierCardProps> = ({ courier, isSelected, onSelect }) => {
  const progressPct = Math.round(courier.delivery.progress * 100);
  const statusLabel = STATUS_LABELS[courier.status] ?? courier.status;
  const statusBg = STATUS_BG[courier.status] ?? 'bg-gray-100 text-gray-600';
  const dotColor = STATUS_COLORS[courier.status] ?? '#94a3b8';

  return (
    <button
      onClick={onSelect}
      className={`w-full text-right px-4 py-3.5 transition-colors
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-950/20'
          : 'hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
        }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {courier.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusBg}`}
          >
            {statusLabel}
          </span>
          <ChevronRight
            size={14}
            className={`text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {/* Delivery info */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Package size={11} className="shrink-0 text-orange-400" />
          <span className="truncate">{courier.delivery.restaurant}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MapPin size={11} className="shrink-0 text-blue-400" />
          <span className="truncate">{courier.delivery.customer}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 dark:bg-[#2a2a2a] rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              backgroundColor: dotColor,
            }}
          />
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 tabular-nums">
          {progressPct}%
        </span>
      </div>
    </button>
  );
};
