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
import { X } from 'lucide-react';

import { addAppTopBarActionListener } from '../components/layout/app-top-bar-actions';
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
const DEFAULT_MAP_WIDTH = 50;
const MIN_MAP_WIDTH = 32;
const MAX_MAP_WIDTH = 74;
const DESKTOP_MAP_SPLIT_BREAKPOINT = 1024;
const MIN_DESKTOP_LIST_CONTENT_WIDTH = 340;
const DEFAULT_EXPANDED_SIDEBAR_WIDTH = 250;
const COLLAPSED_SIDEBAR_WIDTH = 60;
const DEFAULT_MAP_SHEET_HEIGHT = 52;
const MIN_MAP_SHEET_HEIGHT = 30;
const MAX_MAP_SHEET_HEIGHT = 86;

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

const scheduleBodyCleanupIfUnused = () => {
  if (typeof window === 'undefined') {
    if (activeMapSplitInstances === 0) removeMapSplitBodyState();
    return;
  }

  clearPendingBodyCleanup();
  pendingBodyCleanupId = window.setTimeout(() => {
    pendingBodyCleanupId = null;
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
  statusCounts,
  onStatusFilterToggle,
}: UseDeliveriesMapSplitArgs) => {
  const mapOpen = useDeliveriesMapOpen();
  const setMapOpen = useCallback((nextOpen: SetStateAction<boolean>) => {
    setSharedMapOpen(nextOpen);
  }, []);
  const [mapWidth, setMapWidth] = useState(getSavedMapWidth);
  const [mapSheetHeight, setMapSheetHeight] = useState(getSavedMapSheetHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [isSheetResizing, setIsSheetResizing] = useState(false);

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
        setMapOpen((current) => !current);
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

  const handleResizePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateMapWidthFromClientX(event.clientX);
    setIsResizing(true);
  }, [updateMapWidthFromClientX]);

  const handleSheetResizePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateMapSheetHeightFromClientY(event.clientY);
    setIsSheetResizing(true);
  }, [updateMapSheetHeightFromClientY]);

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
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(MAP_SPLIT_WIDTH_STORAGE_KEY, mapWidth.toFixed(2));
  }, [mapWidth]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(MAP_SHEET_HEIGHT_STORAGE_KEY, mapSheetHeight.toFixed(2));
  }, [mapSheetHeight]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const splitClassName = 'deliveries-map-split-open';
    const resizingClassName = 'deliveries-map-split-resizing';
    const sheetResizingClassName = 'deliveries-map-sheet-resizing';
    if (mapOpen) {
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
  }, [isResizing, isSheetResizing, mapOpen, mapSheetHeight, mapWidth]);

  const mapSplitPortal =
    mapOpen && typeof document !== 'undefined'
      ? createPortal(
          <div className="deliveries-map-split-portal" dir="rtl" aria-label="מפת משלוחים">
            <DeliveriesLiveMapPanel
              deliveries={deliveries}
              couriers={couriers}
              restaurants={restaurants}
              routeStopOrders={routeStopOrders}
              selectedDeliveryIds={selectedDeliveryIds}
              focusedDeliveryId={focusedDeliveryId}
              onFocusedDeliveryChange={onFocusedDeliveryChange}
              onOpenDelivery={onOpenDelivery}
              selectedStatusFilters={selectedStatusFilters}
              statusCounts={statusCounts}
              onStatusFilterToggle={onStatusFilterToggle}
            />
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
