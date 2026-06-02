import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react';
import { createPortal } from 'react-dom';
import { Layers, X } from 'lucide-react';

import { addAppTopBarActionListener } from '../components/layout/app-top-bar-actions';
import { Toggle } from '../components/common/toggle';
import type { Courier, Delivery, DeliveryStatus, Restaurant } from '../types/delivery.types';
import { DeliveriesLiveMapPanel } from './deliveries-live-map-panel';

type UseDeliveriesMapSplitArgs = {
  deliveries: Delivery[];
  couriers: Courier[];
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

const MAP_SPLIT_WIDTH_STORAGE_KEY = 'sendi:deliveries-map-split-width';
const MAP_SHEET_HEIGHT_STORAGE_KEY = 'sendi:deliveries-map-control-sheet-height';
const MAP_LAYER_VISIBILITY_STORAGE_KEY = 'sendi:deliveries-map-layer-visibility';
const DEFAULT_MAP_WIDTH = 50;
const MIN_MAP_WIDTH = 32;
const MAX_MAP_WIDTH = 74;
const DESKTOP_MAP_SPLIT_BREAKPOINT = 1024;
const MIN_DESKTOP_LIST_CONTENT_WIDTH = 340;
const DEFAULT_EXPANDED_SIDEBAR_WIDTH = 250;
const COLLAPSED_SIDEBAR_WIDTH = 60;
const DEFAULT_MAP_SHEET_HEIGHT = 52;
const MIN_MAP_SHEET_HEIGHT = 30;
const MAX_MAP_SHEET_HEIGHT = 100;

type MapLayerKey = 'deliveries' | 'couriers' | 'restaurants';

type MapLayerVisibility = Record<MapLayerKey, boolean>;

const DEFAULT_MAP_LAYER_VISIBILITY: MapLayerVisibility = {
  deliveries: true,
  couriers: true,
  restaurants: true,
};

const MAP_LAYER_OPTIONS: Array<{ key: MapLayerKey; label: string }> = [
  { key: 'deliveries', label: 'משלוחים' },
  { key: 'couriers', label: 'שליחים' },
  { key: 'restaurants', label: 'מסעדות' },
];
const MAP_SPLIT_ROUTE_PREFIXES = ['/couriers', '/dashboard', '/deliveries', '/restaurants'];

let sharedMapOpen = false;
const mapOpenListeners = new Set<() => void>();
let activeMapSplitInstances = 0;
let pendingBodyCleanupId: number | null = null;

const removeMapSplitBodyState = () => {
  if (typeof document === 'undefined') return;

  document.body.classList.remove(
    'deliveries-map-split-open',
    'deliveries-map-split-resizing',
    'deliveries-map-sheet-resizing',
  );
  document.body.style.removeProperty('--deliveries-map-split-width');
  document.body.style.removeProperty('--deliveries-map-mobile-height');
};

const clearPendingBodyCleanup = () => {
  if (pendingBodyCleanupId === null || typeof window === 'undefined') return;

  window.clearTimeout(pendingBodyCleanupId);
  pendingBodyCleanupId = null;
};

const isMapSplitRouteActive = () => {
  if (typeof window === 'undefined') return false;

  return MAP_SPLIT_ROUTE_PREFIXES.some((path) => window.location.pathname === path);
};

const scheduleBodyCleanupIfUnused = () => {
  if (typeof window === 'undefined') {
    if (activeMapSplitInstances === 0) removeMapSplitBodyState();
    return;
  }

  clearPendingBodyCleanup();
  pendingBodyCleanupId = window.setTimeout(() => {
    pendingBodyCleanupId = null;
    if (sharedMapOpen && isMapSplitRouteActive()) return;

    if (activeMapSplitInstances === 0) {
      removeMapSplitBodyState();
    }
  }, 80);
};

const subscribeToMapOpen = (listener: () => void) => {
  mapOpenListeners.add(listener);
  return () => {
    mapOpenListeners.delete(listener);
  };
};

const getMapOpenSnapshot = () => sharedMapOpen;

export const useDeliveriesMapOpen = () =>
  useSyncExternalStore(
    subscribeToMapOpen,
    getMapOpenSnapshot,
    getMapOpenSnapshot,
  );

const setSharedMapOpen = (nextOpen: SetStateAction<boolean>) => {
  const resolvedOpen =
    typeof nextOpen === 'function'
      ? (nextOpen as (current: boolean) => boolean)(sharedMapOpen)
      : nextOpen;

  if (resolvedOpen === sharedMapOpen) return;

  sharedMapOpen = resolvedOpen;
  mapOpenListeners.forEach((listener) => listener());
};

export const openDeliveriesMap = () => {
  setSharedMapOpen(true);
};

export const toggleDeliveriesMapOpen = () => {
  setSharedMapOpen((current) => !current);
};

const getStoredSidebarWidth = () => {
  if (typeof localStorage === 'undefined') return DEFAULT_EXPANDED_SIDEBAR_WIDTH;

  try {
    const isCollapsed = JSON.parse(localStorage.getItem('sidebar-collapsed') ?? 'false');
    if (isCollapsed) return COLLAPSED_SIDEBAR_WIDTH;

    const savedWidth = Number(localStorage.getItem('sidebar-width'));
    return Number.isFinite(savedWidth) ? savedWidth : DEFAULT_EXPANDED_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_EXPANDED_SIDEBAR_WIDTH;
  }
};

const getCurrentSidebarWidth = () => {
  if (typeof window === 'undefined' || window.innerWidth < DESKTOP_MAP_SPLIT_BREAKPOINT) return 0;

  const sidebar = typeof document === 'undefined'
    ? null
    : document.querySelector<HTMLElement>('.group\\/sidebar');
  const measuredWidth = sidebar?.getBoundingClientRect().width ?? 0;

  return measuredWidth > 0 ? measuredWidth : getStoredSidebarWidth();
};

const getMaxMapWidthForViewport = () => {
  if (typeof window === 'undefined' || window.innerWidth < DESKTOP_MAP_SPLIT_BREAKPOINT) {
    return MAX_MAP_WIDTH;
  }

  const viewportWidth = window.innerWidth;
  const minAppWidth = getCurrentSidebarWidth() + MIN_DESKTOP_LIST_CONTENT_WIDTH;
  const maxByAvailableListWidth = ((viewportWidth - minAppWidth) / viewportWidth) * 100;

  return Math.max(MIN_MAP_WIDTH, Math.min(MAX_MAP_WIDTH, maxByAvailableListWidth));
};

const clampMapWidth = (value: number) =>
  Math.min(getMaxMapWidthForViewport(), Math.max(MIN_MAP_WIDTH, value));

const clampMapSheetHeight = (value: number) =>
  Math.min(MAX_MAP_SHEET_HEIGHT, Math.max(MIN_MAP_SHEET_HEIGHT, value));

const shouldIgnoreSheetDragTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return true;

  return Boolean(
    target.closest(
      'button, a, input, textarea, select, [role="button"], [role="menuitem"], [data-no-sheet-drag]',
    ),
  );
};

const getSavedMapWidth = () => {
  if (typeof localStorage === 'undefined') return DEFAULT_MAP_WIDTH;

  const saved = Number(localStorage.getItem(MAP_SPLIT_WIDTH_STORAGE_KEY));
  return Number.isFinite(saved) ? clampMapWidth(saved) : DEFAULT_MAP_WIDTH;
};

const getSavedMapSheetHeight = () => {
  if (typeof localStorage === 'undefined') return DEFAULT_MAP_SHEET_HEIGHT;

  const saved = Number(localStorage.getItem(MAP_SHEET_HEIGHT_STORAGE_KEY));
  return Number.isFinite(saved) ? clampMapSheetHeight(saved) : DEFAULT_MAP_SHEET_HEIGHT;
};

const readStoredMapLayerVisibility = (): MapLayerVisibility => {
  if (typeof localStorage === 'undefined') return DEFAULT_MAP_LAYER_VISIBILITY;

  try {
    const raw = localStorage.getItem(MAP_LAYER_VISIBILITY_STORAGE_KEY);
    if (!raw) return DEFAULT_MAP_LAYER_VISIBILITY;

    const parsed = JSON.parse(raw) as Partial<MapLayerVisibility>;
    return {
      deliveries:
        typeof parsed.deliveries === 'boolean'
          ? parsed.deliveries
          : DEFAULT_MAP_LAYER_VISIBILITY.deliveries,
      couriers:
        typeof parsed.couriers === 'boolean'
          ? parsed.couriers
          : DEFAULT_MAP_LAYER_VISIBILITY.couriers,
      restaurants:
        typeof parsed.restaurants === 'boolean'
          ? parsed.restaurants
          : DEFAULT_MAP_LAYER_VISIBILITY.restaurants,
    };
  } catch {
    return DEFAULT_MAP_LAYER_VISIBILITY;
  }
};

export const useDeliveriesMapSplit = ({
  deliveries,
  couriers,
  restaurants,
  routeStopOrders,
  selectedDeliveryIds,
  focusedDeliveryId,
  onFocusedDeliveryChange,
  onOpenDelivery,
  selectedStatusFilters,
}: UseDeliveriesMapSplitArgs) => {
  const mapOpen = useDeliveriesMapOpen();
  const setMapOpen = useCallback((nextOpen: SetStateAction<boolean>) => {
    setSharedMapOpen(nextOpen);
  }, []);
  const [mapWidth, setMapWidth] = useState(getSavedMapWidth);
  const [mapSheetHeight, setMapSheetHeight] = useState(getSavedMapSheetHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [isSheetResizing, setIsSheetResizing] = useState(false);
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [mapLayerVisibility, setMapLayerVisibility] = useState(readStoredMapLayerVisibility);
  const isMapRendered = mapOpen;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncMapWidthToAvailableSpace = () => {
      setMapWidth((currentWidth) => clampMapWidth(currentWidth));
    };

    syncMapWidthToAvailableSpace();
    window.addEventListener('resize', syncMapWidthToAvailableSpace);

    const sidebar = typeof document === 'undefined'
      ? null
      : document.querySelector<HTMLElement>('.group\\/sidebar');
    const sidebarResizeObserver =
      sidebar && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(syncMapWidthToAvailableSpace)
        : null;

    if (sidebar) sidebarResizeObserver?.observe(sidebar);

    return () => {
      window.removeEventListener('resize', syncMapWidthToAvailableSpace);
      sidebarResizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (mapOpen) return;

    setIsMapSettingsOpen(false);
  }, [mapOpen]);

  useEffect(() => {
    activeMapSplitInstances += 1;
    clearPendingBodyCleanup();

    return () => {
      activeMapSplitInstances = Math.max(0, activeMapSplitInstances - 1);
      scheduleBodyCleanupIfUnused();
    };
  }, []);

  useEffect(
    () =>
      addAppTopBarActionListener('toggle-deliveries-map', () => {
        toggleDeliveriesMapOpen();
      }),
    [],
  );

  const updateMapWidthFromClientX = useCallback((clientX: number) => {
    if (typeof window === 'undefined' || window.innerWidth <= 0) return;

    setMapWidth(clampMapWidth((clientX / window.innerWidth) * 100));
  }, []);

  const updateMapSheetHeightFromClientY = useCallback((clientY: number) => {
    if (typeof window === 'undefined' || window.innerHeight <= 0) return;

    setMapSheetHeight(clampMapSheetHeight(((window.innerHeight - clientY) / window.innerHeight) * 100));
  }, []);

  const beginMobileSheetResize = useCallback((clientY: number) => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return false;

    updateMapSheetHeightFromClientY(clientY);
    setIsSheetResizing(true);
    return true;
  }, [updateMapSheetHeightFromClientY]);

  const handleResizePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateMapWidthFromClientX(event.clientX);
    setIsResizing(true);
  }, [updateMapWidthFromClientX]);

  const handleSheetResizePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!beginMobileSheetResize(event.clientY)) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [beginMobileSheetResize]);

  const handleResizeKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 5 : 2;
    let nextWidth: number | null = null;

    if (event.key === 'ArrowLeft') nextWidth = mapWidth - step;
    if (event.key === 'ArrowRight') nextWidth = mapWidth + step;
    if (event.key === 'Home') nextWidth = MIN_MAP_WIDTH;
    if (event.key === 'End') nextWidth = MAX_MAP_WIDTH;
    if (event.key === 'Enter' || event.key === ' ') nextWidth = DEFAULT_MAP_WIDTH;

    if (nextWidth === null) return;

    event.preventDefault();
    setMapWidth(clampMapWidth(nextWidth));
  }, [mapWidth]);

  const handleSheetResizeKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 6 : 3;
    let nextHeight: number | null = null;

    if (event.key === 'ArrowUp') nextHeight = mapSheetHeight + step;
    if (event.key === 'ArrowDown') nextHeight = mapSheetHeight - step;
    if (event.key === 'Home') nextHeight = MIN_MAP_SHEET_HEIGHT;
    if (event.key === 'End') nextHeight = MAX_MAP_SHEET_HEIGHT;
    if (event.key === 'Enter' || event.key === ' ') nextHeight = DEFAULT_MAP_SHEET_HEIGHT;

    if (nextHeight === null) return;

    event.preventDefault();
    setMapSheetHeight(clampMapSheetHeight(nextHeight));
  }, [mapSheetHeight]);

  useEffect(() => {
    if (!isResizing) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updateMapWidthFromClientX(event.clientX);
    };
    const handlePointerUp = () => setIsResizing(false);

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isResizing, updateMapWidthFromClientX]);

  useEffect(() => {
    if (!isSheetResizing) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updateMapSheetHeightFromClientY(event.clientY);
    };
    const handlePointerUp = () => setIsSheetResizing(false);

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isSheetResizing, updateMapSheetHeightFromClientY]);

  useEffect(() => {
    if (!isMapRendered || typeof document === 'undefined' || typeof window === 'undefined') {
      return undefined;
    }

    if (window.innerWidth >= 1024) return undefined;

    const header = document.querySelector<HTMLElement>('.app-layout-root header');
    if (!header) return undefined;

    const handleHeaderPointerDown = (event: PointerEvent) => {
      if (window.innerWidth >= 1024) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (shouldIgnoreSheetDragTarget(event.target)) return;

      if (!beginMobileSheetResize(event.clientY)) return;

      event.preventDefault();
      header.setPointerCapture?.(event.pointerId);
    };

    header.classList.add('deliveries-map-sheet-drag-handle');
    header.addEventListener('pointerdown', handleHeaderPointerDown);

    return () => {
      header.classList.remove('deliveries-map-sheet-drag-handle');
      header.removeEventListener('pointerdown', handleHeaderPointerDown);
    };
  }, [beginMobileSheetResize, isMapRendered]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(MAP_SPLIT_WIDTH_STORAGE_KEY, mapWidth.toFixed(2));
  }, [mapWidth]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(MAP_SHEET_HEIGHT_STORAGE_KEY, mapSheetHeight.toFixed(2));
  }, [mapSheetHeight]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(MAP_LAYER_VISIBILITY_STORAGE_KEY, JSON.stringify(mapLayerVisibility));
  }, [mapLayerVisibility]);

  const toggleMapLayer = useCallback((layerKey: MapLayerKey) => {
    setMapLayerVisibility((current) => ({
      ...current,
      [layerKey]: !current[layerKey],
    }));
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const splitClassName = 'deliveries-map-split-open';
    const resizingClassName = 'deliveries-map-split-resizing';
    const sheetResizingClassName = 'deliveries-map-sheet-resizing';
    if (isMapRendered) {
      document.body.classList.add(splitClassName);
      document.body.style.setProperty('--deliveries-map-split-width', `${mapWidth}vw`);
      document.body.style.setProperty('--deliveries-map-mobile-height', `${mapSheetHeight}svh`);
    } else {
      removeMapSplitBodyState();
    }

    document.body.classList.toggle(resizingClassName, isResizing);
    document.body.classList.toggle(sheetResizingClassName, isSheetResizing);

    return () => {
      document.body.classList.remove(resizingClassName);
      document.body.classList.remove(sheetResizingClassName);
    };
  }, [isMapRendered, isResizing, isSheetResizing, mapSheetHeight, mapWidth]);

  const mapSplitPortal =
    isMapRendered && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="deliveries-map-split-portal deliveries-map-split-portal--open"
            dir="rtl"
            aria-label="מפת משלוחים"
          >
            <DeliveriesLiveMapPanel
              deliveries={mapLayerVisibility.deliveries ? deliveries : []}
              couriers={mapLayerVisibility.couriers ? couriers : []}
              restaurants={mapLayerVisibility.restaurants ? restaurants : []}
              routeStopOrders={routeStopOrders}
              selectedDeliveryIds={selectedDeliveryIds}
              focusedDeliveryId={focusedDeliveryId}
              onFocusedDeliveryChange={onFocusedDeliveryChange}
              onOpenDelivery={onOpenDelivery}
              selectedStatusFilters={selectedStatusFilters}
            />
            <button
              type="button"
              className="deliveries-map-split-settings-button"
              data-haptic="selection"
              data-no-sheet-drag="true"
              onClick={() => setIsMapSettingsOpen((current) => !current)}
              aria-label="הגדרות מפה"
              aria-expanded={isMapSettingsOpen}
              title="הגדרות מפה"
            >
              <Layers className="h-4 w-4" />
            </button>
            {isMapSettingsOpen ? (
              <div className="deliveries-map-split-settings-panel" data-no-sheet-drag="true">
                <div className="border-b border-app-border px-3 py-2 text-xs font-semibold text-app-text-secondary dark:border-[#252525]">
                  נראות במפה
                </div>
                <div className="py-1">
                  {MAP_LAYER_OPTIONS.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span className="text-xs font-medium text-app-text">{item.label}</span>
                      <Toggle
                        checked={mapLayerVisibility[item.key]}
                        onChange={() => toggleMapLayer(item.key)}
                        ariaLabel={`נראות ${item.label} במפה`}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="deliveries-map-sheet-resizer"
              aria-label="שינוי גובה פאנל המשלוחים"
              aria-orientation="horizontal"
              aria-valuemin={MIN_MAP_SHEET_HEIGHT}
              aria-valuemax={MAX_MAP_SHEET_HEIGHT}
              aria-valuenow={Math.round(mapSheetHeight)}
              data-haptic="off"
              onPointerDown={handleSheetResizePointerDown}
              onKeyDown={handleSheetResizeKeyDown}
              onDoubleClick={() => setMapSheetHeight(DEFAULT_MAP_SHEET_HEIGHT)}
              role="separator"
              title="גרור למעלה או למטה לשינוי גובה פאנל המשלוחים. דאבל קליק מאפס."
            />
            <button
              type="button"
              className="deliveries-map-split-close"
              data-haptic="light"
              onClick={() => setMapOpen(false)}
              aria-label="סגור מפה"
              title="סגור מפה"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="deliveries-map-split-resizer"
              aria-label="שינוי רוחב המפה"
              aria-orientation="vertical"
              aria-valuemin={MIN_MAP_WIDTH}
              aria-valuemax={MAX_MAP_WIDTH}
              aria-valuenow={Math.round(mapWidth)}
              data-haptic="off"
              onPointerDown={handleResizePointerDown}
              onKeyDown={handleResizeKeyDown}
              onDoubleClick={() => setMapWidth(DEFAULT_MAP_WIDTH)}
              role="separator"
              title="גרור לשינוי רוחב המפה. דאבל קליק מאפס."
            />
          </div>,
          document.body,
        )
      : null;

  return { mapOpen, setMapOpen, mapSplitPortal };
};
