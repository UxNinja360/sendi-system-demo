import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Activity,
  BarChart,
  Bike,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  FileText,
  LayoutDashboard,
  Map,
  Package,
  Palette,
  Power,
  Ruler,
  Search,
  Settings,
  SlidersHorizontal,
  Store,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from 'lucide-react';
import { getNavItemById, isNavItemActive, SIDEBAR_NAV_SECTIONS } from '../../app-navigation';
import type { AppNavIconKey, AppNavItem } from '../../app-navigation';
import { useDelivery } from '../../context/delivery-context-value';
import { findDeliveryRestaurant, getDeliveryWalletCharge } from '../../utils/delivery-finance';
import { isOperationalDelivery } from '../../utils/delivery-status';
import {
  SENDI_PLUS_RADIUS_CHANGE_EVENT,
  SENDI_PLUS_TERMS_ACCEPTED_CHANGE_EVENT,
  SENDI_PLUS_TERMS_ACCEPTED_STORAGE_KEY,
  isRestaurantActiveForDisplay,
  isRestaurantEligibleForDeliveryIntake,
  isSendiPlusRestaurant,
  readStoredSendiPlusRadius,
} from '../../utils/sendi-plus';
import {
  DELIVERY_ZONES_CHANGE_EVENT,
  isPointCoveredByActiveDeliveryZones,
  loadStoredDeliveryServiceAreas,
} from '../../utils/delivery-zones';
import { AppTooltip as SidebarIconTooltip } from '../common/app-tooltip';
import { playHaptic } from '../../utils/haptics';
import { Toggle } from '../common/toggle';

interface SidebarProps {
  onLogout: () => void;
  onMobileMenuToggleReady?: (toggle: (() => void) | null) => void;
}

const LABELS = {
  selectBusiness: '\u05d1\u05d7\u05d9\u05e8\u05ea \u05e2\u05e1\u05e7',
  searchBusiness: '\u05d7\u05e4\u05e9 \u05d7\u05d1\u05e8\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd...',
  deliveryCompanies: '\u05d7\u05d1\u05e8\u05d5\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
  noBusinesses: '\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d5 \u05d7\u05d1\u05e8\u05d5\u05ea',
  acceptDeliveries: '\u05e7\u05d1\u05dc\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
  autoAssign: '\u05e9\u05d9\u05d1\u05d5\u05e5 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9',
  intakeBlocked: '\u05e7\u05d1\u05dc\u05d4 \u05d7\u05e1\u05d5\u05de\u05d4',
  systemClosed: '\u05de\u05e2\u05e8\u05db\u05ea \u05e1\u05d2\u05d5\u05e8\u05d4',
  settings: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea',
  wallet: '\u05d0\u05e8\u05e0\u05e7',
  deliveryBalance: '\u05d9\u05ea\u05e8\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
  beta: '\u05d1\u05d8\u05d0',
};

const BUSINESSES = [
  'Tel Aviv - Runners',
  'Mr. Delivery',
  'Delivery Champion',
  'Express Deliveries',
  'Jerusalem Couriers',
  'Haifa Delivery',
  'Beer Sheva Couriers',
  'Netanya Deliveries',
  'Petah Tikva Delivery',
  'Rishon LeZion Couriers',
  'Ashdod Express',
  'Ramat Gan Deliveries',
  'Bnei Brak Delivery',
];

const SIDEBAR_MIN_WIDTH = 250;
const SIDEBAR_MAX_WIDTH = 400;
const SIDEBAR_COLLAPSED_WIDTH = 60;
const MOBILE_SIDEBAR_WIDTH = 260;
const MOBILE_MENU_SWIPE_START_THRESHOLD = 3;
const MOBILE_MENU_SWIPE_CLOSE_THRESHOLD = 76;
const DESKTOP_SIDEBAR_BREAKPOINT = 1024;
const SIDEBAR_LEGACY_OPEN_KEY = 'sidebar-legacy-open-v2';
const SIDEBAR_EXPERIMENTS_OPEN_KEY = 'sidebar-experiments-open-v2';
const SIDEBAR_OPERATIONS_TOOLS_OPEN_KEY = 'sidebar-operations-tools-open-v2';

const clampSidebarWidth = (width: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));

const getBusinessInitials = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const BusinessAvatar: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span
    className={`flex shrink-0 items-center justify-center rounded-full bg-app-brand-solid font-bold text-app-background shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] ${className ?? 'h-7 w-7 text-[11px]'}`}
    aria-hidden="true"
  >
    {getBusinessInitials(name)}
  </span>
);

const BusinessPlanBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex h-[18px] shrink-0 items-center rounded-full border border-app-nav-border bg-app-surface-raised px-2 text-[11px] font-medium leading-none text-app-text dark:border-[#2E2E2E] dark:bg-[#1F1F1F] dark:text-[#EDEDED] ${className}`}
  >
    PRO
  </span>
);

const ONBOARDING_BY_ID: Record<string, string> = {
  live: 'nav-live',
  restaurants: 'nav-restaurants',
  couriers: 'nav-couriers',
};

const NAV_ICON_MAP: Record<AppNavIconKey, React.FC<React.SVGProps<SVGSVGElement>>> = {
  activity: Activity,
  alertTriangle: TriangleAlert,
  barChart: BarChart,
  bike: Bike,
  calendar: Calendar,
  clock: Clock,
  fileText: FileText,
  layoutDashboard: LayoutDashboard,
  map: Map,
  package: Package,
  palette: Palette,
  ruler: Ruler,
  settings: Settings,
  sliders: SlidersHorizontal,
  store: Store,
  trendingUp: TrendingUp,
  users: Users,
  wallet: Wallet,
};

export const Sidebar: React.FC<SidebarProps> = ({ onLogout: _onLogout, onMobileMenuToggleReady }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useDelivery();
  const businessSwitcherRef = useRef<HTMLDivElement | null>(null);
  const businessSearchRef = useRef<HTMLInputElement | null>(null);
  const [isBusinessPopupOpen, setIsBusinessPopupOpen] = useState(false);
  const [businessSearch, setBusinessSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState(BUSINESSES[0]);
  const [sendiPlusRadiusKm, setSendiPlusRadiusKm] = useState(readStoredSendiPlusRadius);
  const [sendiPlusAccessVersion, setSendiPlusAccessVersion] = useState(0);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= DESKTOP_SIDEBAR_BREAKPOINT);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      if (window.innerWidth < DESKTOP_SIDEBAR_BREAKPOINT) return false;
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('sidebar-width'));
      return Number.isFinite(saved) ? clampSidebarWidth(saved) : SIDEBAR_MIN_WIDTH;
    } catch {
      return SIDEBAR_MIN_WIDTH;
    }
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number; didMove: boolean } | null>(null);
  const [mobileMenuDragX, setMobileMenuDragX] = useState(0);
  const mobileMenuDragXRef = useRef(0);
  const [isMobileMenuDragging, setIsMobileMenuDragging] = useState(false);
  const mobileMenuSwipeRef = useRef<{
    startX: number;
    startY: number;
    started: boolean;
  } | null>(null);
  const mobileMenuPointerIdRef = useRef<number | null>(null);
  const mobileMenuSwipeClickGuardRef = useRef(false);
  const [isLegacySectionOpen, setIsLegacySectionOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_LEGACY_OPEN_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [isExperimentsSectionOpen, setIsExperimentsSectionOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_EXPERIMENTS_OPEN_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [isOperationsToolsSectionOpen, setIsOperationsToolsSectionOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_OPERATIONS_TOOLS_OPEN_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const isExpanded = !isCollapsed || !isDesktop;
  const isMobileMenuOpen = !isDesktop && isCollapsed;
  const updateMobileMenuDragX = useCallback((value: number) => {
    mobileMenuDragXRef.current = value;
    setMobileMenuDragX(value);
  }, []);
  const mobileMenuTranslateX = !isDesktop
    ? isMobileMenuDragging
      ? mobileMenuDragX
      : isMobileMenuOpen
        ? 0
        : MOBILE_SIDEBAR_WIDTH
    : undefined;
  const mobileMenuOpenProgress =
    mobileMenuTranslateX === undefined
      ? 0
      : Math.max(0, Math.min(1, 1 - mobileMenuTranslateX / MOBILE_SIDEBAR_WIDTH));
  const activeDeliveriesCount = state.deliveries.filter(isOperationalDelivery).length;
  const deliveredDeliveriesCount = state.deliveries.filter((delivery) => delivery.status === 'delivered').length;
  const activeRestaurantsCount = state.restaurants.filter((restaurant) =>
    isRestaurantActiveForDisplay(restaurant),
  ).length;
  const activeCouriersCount = state.couriers.filter((courier) => courier.status !== 'offline').length;
  const sendiPlusDeliveryZones = useMemo(
    () => loadStoredDeliveryServiceAreas(),
    [sendiPlusAccessVersion],
  );
  const hasDeliveryIntakeRestaurants = useMemo(
    () => state.restaurants.some((restaurant) =>
      isRestaurantEligibleForDeliveryIntake(restaurant, sendiPlusRadiusKm) &&
      (!isSendiPlusRestaurant(restaurant.name, restaurant.chainId) ||
        (Number.isFinite(restaurant.lat) &&
          Number.isFinite(restaurant.lng) &&
          isPointCoveredByActiveDeliveryZones(
            { lat: restaurant.lat, lng: restaurant.lng },
            sendiPlusDeliveryZones,
          )))
    ),
    [sendiPlusDeliveryZones, sendiPlusRadiusKm, state.restaurants],
  );
  const isDeliveryIntakeBlocked = state.isSystemOpen && !hasDeliveryIntakeRestaurants;
  const systemStatusLabel = isDeliveryIntakeBlocked
    ? LABELS.intakeBlocked
    : state.isSystemOpen
      ? LABELS.acceptDeliveries
      : LABELS.systemClosed;
  const walletRevenue = state.deliveries
    .filter((delivery) => delivery.status === 'delivered')
    .reduce(
      (sum, delivery) =>
        sum + getDeliveryWalletCharge(delivery, findDeliveryRestaurant(delivery, state.restaurants)),
      0,
    );
  const walletItem = getNavItemById('wallet');
  const balanceItem = getNavItemById('delivery-balance');
  const settingsItem = getNavItemById('settings');
  const filteredBusinesses = useMemo(() => {
    const query = businessSearch.trim().toLowerCase();
    if (!query) return BUSINESSES;
    return BUSINESSES.filter((business) => business.toLowerCase().includes(query));
  }, [businessSearch]);

  useEffect(() => {
    if (!isBusinessPopupOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (businessSwitcherRef.current?.contains(event.target as Node)) return;
      setIsBusinessPopupOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsBusinessPopupOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBusinessPopupOpen]);

  useEffect(() => {
    const syncSendiPlusRadius = () => {
      setSendiPlusRadiusKm(readStoredSendiPlusRadius());
    };
    const syncSendiPlusAccess = () => {
      setSendiPlusAccessVersion((version) => version + 1);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === 'sendi-plus-radius-km' ||
        event.key === 'sendi-go-radius-km'
      ) {
        syncSendiPlusRadius();
      }

      if (event.key === SENDI_PLUS_TERMS_ACCEPTED_STORAGE_KEY) {
        syncSendiPlusAccess();
      }

      if (event.key === 'delivery_zones_v1') {
        syncSendiPlusAccess();
      }
    };

    window.addEventListener(SENDI_PLUS_RADIUS_CHANGE_EVENT, syncSendiPlusRadius);
    window.addEventListener(SENDI_PLUS_TERMS_ACCEPTED_CHANGE_EVENT, syncSendiPlusAccess);
    window.addEventListener(DELIVERY_ZONES_CHANGE_EVENT, syncSendiPlusAccess);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener(SENDI_PLUS_RADIUS_CHANGE_EVENT, syncSendiPlusRadius);
      window.removeEventListener(SENDI_PLUS_TERMS_ACCEPTED_CHANGE_EVENT, syncSendiPlusAccess);
      window.removeEventListener(DELIVERY_ZONES_CHANGE_EVENT, syncSendiPlusAccess);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!isBusinessPopupOpen) return;
    window.setTimeout(() => businessSearchRef.current?.focus(), 0);
  }, [isBusinessPopupOpen]);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= DESKTOP_SIDEBAR_BREAKPOINT;
      setIsDesktop(desktop);
      if (!desktop) setIsCollapsed(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
    } catch {
      // Storage can fail in restricted contexts; the in-memory state is enough.
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (!isDesktop) return;

    try {
      localStorage.setItem('sidebar-width', String(sidebarWidth));
    } catch {
      // Storage can fail in restricted contexts; the in-memory state is enough.
    }
  }, [isDesktop, sidebarWidth]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizingSidebar]);

  useEffect(() => {
    if (isDesktop || !isCollapsed) {
      updateMobileMenuDragX(0);
      setIsMobileMenuDragging(false);
      mobileMenuSwipeRef.current = null;
      mobileMenuPointerIdRef.current = null;
      mobileMenuSwipeClickGuardRef.current = false;
    }
  }, [isCollapsed, isDesktop, updateMobileMenuDragX]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_LEGACY_OPEN_KEY, JSON.stringify(isLegacySectionOpen));
    } catch {
      // Storage can fail in restricted contexts; the in-memory state is enough.
    }
  }, [isLegacySectionOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_EXPERIMENTS_OPEN_KEY, JSON.stringify(isExperimentsSectionOpen));
    } catch {
      // Storage can fail in restricted contexts; the in-memory state is enough.
    }
  }, [isExperimentsSectionOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_OPERATIONS_TOOLS_OPEN_KEY, JSON.stringify(isOperationsToolsSectionOpen));
    } catch {
      // Storage can fail in restricted contexts; the in-memory state is enough.
    }
  }, [isOperationsToolsSectionOpen]);

  const renderCollapsibleSection = (
    section: (typeof SIDEBAR_NAV_SECTIONS)[number],
    isOpen: boolean,
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>,
  ) => (
    <>
      {isExpanded ? (
        <button
          type="button"
          data-haptic="medium"
          onClick={() => setIsOpen((value) => !value)}
          className="mx-2 mb-1 flex h-9 w-[calc(100%-1rem)] items-center gap-3 rounded-[var(--app-radius-sm)] px-4 text-right text-sm font-medium text-app-text-secondary transition-colors hover:bg-app-nav-hover-bg hover:text-app-text"
          aria-expanded={isOpen}
        >
          <ChevronLeft
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${
              isOpen ? '-rotate-90' : ''
            }`}
          />
          <span className="min-w-0 flex-1 truncate">{section.label}</span>
        </button>
      ) : (
        <SidebarIconTooltip
          label={section.label}
          className="mx-2 mb-1 flex h-9 items-center justify-center rounded-[var(--app-radius-sm)] text-app-text-secondary hover:bg-app-nav-hover-bg hover:text-app-text"
        >
          <button
            type="button"
            data-haptic="medium"
            onClick={() => setIsOpen((value) => !value)}
            aria-label={section.label}
            aria-expanded={isOpen}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${
                isOpen ? '-rotate-90' : ''
              }`}
            />
          </button>
        </SidebarIconTooltip>
      )}
      {isOpen && section.items.map(renderNavItem)}
    </>
  );

  const toggleMobileMenu = useCallback(() => {
    updateMobileMenuDragX(0);
    setIsMobileMenuDragging(false);
    mobileMenuSwipeRef.current = null;
    mobileMenuPointerIdRef.current = null;
    mobileMenuSwipeClickGuardRef.current = false;
    setIsCollapsed((prev) => !prev);
  }, [updateMobileMenuDragX]);

  const toggleDesktopSidebar = useCallback(() => {
    setIsCollapsed((value) => {
      const nextValue = !value;
      if (!nextValue) setSidebarWidth(SIDEBAR_MIN_WIDTH);
      return nextValue;
    });
  }, []);

  const handleSidebarResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!isDesktop) return;

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      sidebarResizeRef.current = {
        startX: event.clientX,
        startWidth: isCollapsed ? SIDEBAR_MIN_WIDTH : sidebarWidth,
        didMove: false,
      };
      setIsResizingSidebar(true);
    },
    [isCollapsed, isDesktop, sidebarWidth],
  );

  const handleSidebarResizePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const resizeState = sidebarResizeRef.current;
      if (!resizeState) return;

      const delta = resizeState.startX - event.clientX;
      if (Math.abs(delta) < 3 && !resizeState.didMove) return;

      resizeState.didMove = true;
      if (isCollapsed) setIsCollapsed(false);
      setSidebarWidth(clampSidebarWidth(resizeState.startWidth + delta));
    },
    [isCollapsed],
  );

  const finishSidebarResize = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const resizeState = sidebarResizeRef.current;
      if (!resizeState) return;

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // The pointer may already be released by the browser.
      }

      if (!resizeState.didMove) {
        toggleDesktopSidebar();
      }

      sidebarResizeRef.current = null;
      setIsResizingSidebar(false);
    },
    [toggleDesktopSidebar],
  );

  const cancelSidebarResize = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released by the browser.
    }

    sidebarResizeRef.current = null;
    setIsResizingSidebar(false);
  }, []);

  const startMobileMenuSwipeAt = useCallback(
    (clientX: number, clientY: number) => {
      if (isDesktop || !isCollapsed) return;

      mobileMenuSwipeRef.current = {
        startX: clientX,
        startY: clientY,
        started: false,
      };
      updateMobileMenuDragX(0);
      mobileMenuSwipeClickGuardRef.current = false;
    },
    [isCollapsed, isDesktop, updateMobileMenuDragX],
  );

  const moveMobileMenuSwipeTo = useCallback(
    (clientX: number, clientY: number) => {
      const swipe = mobileMenuSwipeRef.current;
      if (!swipe || isDesktop) return false;

      const deltaX = clientX - swipe.startX;
      const deltaY = clientY - swipe.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (!swipe.started) {
        if (deltaX <= MOBILE_MENU_SWIPE_START_THRESHOLD || absX < absY * 0.85) return false;

        swipe.started = true;
        setIsMobileMenuDragging(true);
        playHaptic('medium', { force: true });
      }

      const clampedDelta = Math.min(MOBILE_SIDEBAR_WIDTH, Math.max(0, deltaX));

      updateMobileMenuDragX(clampedDelta);

      return true;
    },
    [isDesktop, updateMobileMenuDragX],
  );

  const finishMobileMenuSwipe = useCallback(() => {
    const swipe = mobileMenuSwipeRef.current;
    if (!swipe) return;

    const currentDragX = mobileMenuDragXRef.current;
    const shouldClose =
      swipe.started &&
      currentDragX >= MOBILE_MENU_SWIPE_CLOSE_THRESHOLD;
    mobileMenuSwipeRef.current = null;
    mobileMenuPointerIdRef.current = null;
    mobileMenuSwipeClickGuardRef.current = swipe.started;
    setIsMobileMenuDragging(false);

    if (shouldClose) {
      setIsCollapsed(false);
      updateMobileMenuDragX(0);
      return;
    }

    updateMobileMenuDragX(0);
  }, [updateMobileMenuDragX]);

  useEffect(() => {
    if (isDesktop || typeof document === 'undefined') return;

    const handleNativeTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      if (mobileMenuPointerIdRef.current !== null) return;

      const touch = event.touches[0];
      if (isCollapsed) {
        startMobileMenuSwipeAt(touch.clientX, touch.clientY);
      }
    };

    const handleNativeTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      if (moveMobileMenuSwipeTo(touch.clientX, touch.clientY)) {
        event.preventDefault();
      }
    };

    document.addEventListener('touchstart', handleNativeTouchStart, { passive: true });
    document.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    document.addEventListener('touchend', finishMobileMenuSwipe);
    document.addEventListener('touchcancel', finishMobileMenuSwipe);

    const handleNativePointerDown = (event: PointerEvent) => {
      if (event.button > 0 || mobileMenuPointerIdRef.current !== null) return;
      if (event.pointerType === 'mouse' && window.innerWidth >= DESKTOP_SIDEBAR_BREAKPOINT) return;

      if (isCollapsed) {
        mobileMenuPointerIdRef.current = event.pointerId;
        startMobileMenuSwipeAt(event.clientX, event.clientY);
      }
    };

    const handleNativePointerMove = (event: PointerEvent) => {
      if (mobileMenuPointerIdRef.current !== event.pointerId) return;

      if (moveMobileMenuSwipeTo(event.clientX, event.clientY)) {
        event.preventDefault();
      }
    };

    const handleNativePointerEnd = (event: PointerEvent) => {
      if (mobileMenuPointerIdRef.current !== event.pointerId) return;
      finishMobileMenuSwipe();
    };

    document.addEventListener('pointerdown', handleNativePointerDown);
    document.addEventListener('pointermove', handleNativePointerMove, { passive: false });
    document.addEventListener('pointerup', handleNativePointerEnd);
    document.addEventListener('pointercancel', handleNativePointerEnd);
    document.addEventListener('mouseup', finishMobileMenuSwipe);
    window.addEventListener('blur', finishMobileMenuSwipe);

    return () => {
      document.removeEventListener('touchstart', handleNativeTouchStart);
      document.removeEventListener('touchmove', handleNativeTouchMove);
      document.removeEventListener('touchend', finishMobileMenuSwipe);
      document.removeEventListener('touchcancel', finishMobileMenuSwipe);
      document.removeEventListener('pointerdown', handleNativePointerDown);
      document.removeEventListener('pointermove', handleNativePointerMove);
      document.removeEventListener('pointerup', handleNativePointerEnd);
      document.removeEventListener('pointercancel', handleNativePointerEnd);
      document.removeEventListener('mouseup', finishMobileMenuSwipe);
      window.removeEventListener('blur', finishMobileMenuSwipe);
    };
  }, [
    finishMobileMenuSwipe,
    isCollapsed,
    isDesktop,
    moveMobileMenuSwipeTo,
    startMobileMenuSwipeAt,
  ]);

  useEffect(() => {
    onMobileMenuToggleReady?.(toggleMobileMenu);
    return () => onMobileMenuToggleReady?.(null);
  }, [onMobileMenuToggleReady, toggleMobileMenu]);

  const closeMobileMenu = () => {
    if (!isDesktop) {
      updateMobileMenuDragX(0);
      setIsMobileMenuDragging(false);
      mobileMenuSwipeRef.current = null;
      mobileMenuPointerIdRef.current = null;
      mobileMenuSwipeClickGuardRef.current = false;
      setIsCollapsed(false);
    }
  };

  const handleNav = (path: string) => {
    navigate(path);
    closeMobileMenu();
  };

  const getNavBadge = (item: AppNavItem) => {
    if (item.badge === 'activeDeliveries') return activeDeliveriesCount.toLocaleString('he-IL');
    if (item.badge === 'deliveredDeliveries') return deliveredDeliveriesCount.toLocaleString('he-IL');
    if (item.badge === 'activeRestaurants') return activeRestaurantsCount.toLocaleString('he-IL');
    if (item.badge === 'activeCouriers') return activeCouriersCount.toLocaleString('he-IL');
    if (item.badge === 'deliveryBalance') return state.deliveryBalance.toLocaleString('he-IL');
    if (item.badge === 'walletRevenue') return `₪${Math.round(walletRevenue).toLocaleString('he-IL')}`;
    return null;
  };

  const toggleSystem = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    dispatch({ type: 'TOGGLE_SYSTEM' });
  };

  const renderNavItem = (item: AppNavItem) => {
    const Icon = NAV_ICON_MAP[item.icon];
    const isActive = isNavItemActive(item, location.pathname);
    const badge = getNavBadge(item);
    const tagLabel = item.tag === 'beta' ? LABELS.beta : null;

    return (
      <button
        key={item.id}
        type="button"
        data-haptic={isActive ? 'selection' : 'light'}
        data-onboarding={ONBOARDING_BY_ID[item.id]}
        onClick={(event) => {
          event.stopPropagation();
          handleNav(item.path);
        }}
        className={`relative mx-2 mb-1 block w-[calc(100%-1rem)] cursor-pointer rounded-[var(--app-radius-sm)] text-right transition-colors duration-150 ${
          isActive
            ? 'bg-[#f5f5f5] text-app-nav-active-text dark:bg-[#1F1F1F]'
            : 'text-app-text-secondary hover:bg-app-nav-hover-bg hover:text-app-text'
        }`}
        aria-label={item.label}
      >
        {isExpanded ? (
          <span className="flex h-9 items-center gap-3 px-4">
            <Icon size={19} className="shrink-0 stroke-[1.8px]" />
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>
              {tagLabel && (
                <span className="shrink-0 rounded-[4px] border border-app-nav-border bg-app-nav-hover-bg px-1.5 text-[10px] font-semibold leading-4 text-app-text-secondary">
                  {tagLabel}
                </span>
              )}
            </span>
            {badge && (
              <span
                className={`shrink-0 rounded-[4px] px-1.5 text-[11px] font-medium tabular-nums ${
                  isActive
                    ? 'text-app-text-secondary'
                    : 'text-app-text-muted'
                }`}
              >
                {badge}
              </span>
            )}
          </span>
        ) : (
          <SidebarIconTooltip
            label={[item.label, tagLabel, badge].filter(Boolean).join(' • ')}
            className="flex h-9 items-center justify-center"
          >
            <Icon size={19} className="stroke-[1.8px]" />
          </SidebarIconTooltip>
        )}
      </button>
    );
  };

  const renderStaticSectionItems = (section: (typeof SIDEBAR_NAV_SECTIONS)[number]) =>
    section.items.map((item, itemIndex) => {
      const shouldShowInlineDivider =
        (section.id === 'core' &&
          item.id === 'dashboard' &&
          section.items[itemIndex - 1]?.id === 'live') ||
        (section.id === 'data' &&
          item.id === 'reports' &&
          section.items[itemIndex - 1]?.id === 'courier-shifts');

      return (
        <React.Fragment key={item.id}>
          {shouldShowInlineDivider && <div className="mx-4 my-2 border-t border-app-nav-border" />}
          {renderNavItem(item)}
        </React.Fragment>
      );
    });

  const footerItemClass = (isActive: boolean) =>
    `w-full cursor-pointer border-b border-app-nav-border px-4 py-3 text-right transition-colors ${
      isActive
        ? 'bg-[#f5f5f5] text-app-nav-active-text dark:bg-[#1F1F1F]'
        : 'text-app-text-secondary hover:bg-app-nav-hover-bg hover:text-app-text'
    }`;

  return (
    <>
      {!isDesktop && (
        <div
          className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-[opacity,backdrop-filter] duration-300 ease-out lg:hidden ${
            isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          style={{
            opacity: mobileMenuOpenProgress * 0.95,
            backdropFilter: `blur(${mobileMenuOpenProgress * 4}px)`,
            touchAction: 'pan-y',
          }}
          onClick={() => {
            if (mobileMenuSwipeClickGuardRef.current) {
              mobileMenuSwipeClickGuardRef.current = false;
              return;
            }

            closeMobileMenu();
          }}
        />
      )}

      <div
        dir="rtl"
        className={`app-shell-height group/sidebar fixed inset-y-0 right-0 z-[110] flex flex-col border-l border-app-nav-border bg-app-nav-bg shadow-xl will-change-transform lg:static lg:z-50 lg:shadow-none ${
          isCollapsed ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        style={{
          width: isDesktop ? (isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth) : `${MOBILE_SIDEBAR_WIDTH}px`,
          transform: mobileMenuTranslateX === undefined ? undefined : `translateX(${mobileMenuTranslateX}px)`,
          touchAction: isDesktop ? undefined : 'pan-y',
          transition: isDesktop
            ? isResizingSidebar
              ? 'none'
              : 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
            : isMobileMenuDragging
            ? 'none'
            : isCollapsed
            ? 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)'
            : 'transform 340ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {isDesktop && (
          <button
            type="button"
            data-haptic="off"
            onPointerDown={handleSidebarResizePointerDown}
            onPointerMove={handleSidebarResizePointerMove}
            onPointerUp={finishSidebarResize}
            onPointerCancel={cancelSidebarResize}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              toggleDesktopSidebar();
            }}
            className="group/sidebar-resize absolute bottom-0 left-0 top-0 z-20 hidden w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center focus:outline-none lg:flex"
            aria-label={isCollapsed ? 'Open sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Open sidebar' : 'Collapse sidebar'}
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover/sidebar-resize:bg-app-nav-border" />
            <span className="pointer-events-none absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-app-nav-border bg-app-nav-bg text-app-text-secondary opacity-0 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-[opacity,background-color,color,border-color] group-hover/sidebar-resize:opacity-100 group-hover/sidebar-resize:border-app-border group-hover/sidebar-resize:bg-app-surface-raised group-hover/sidebar-resize:text-app-text group-focus-visible/sidebar-resize:opacity-100 group-focus-visible/sidebar-resize:ring-2 group-focus-visible/sidebar-resize:ring-app-brand/20">
              {isCollapsed ? (
                <ChevronLeft className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>
          </button>
        )}

        <div
          className="app-safe-header relative flex shrink-0 items-center justify-between gap-2 border-b border-app-nav-border bg-app-nav-bg px-3 py-0"
        >
          <div
            ref={businessSwitcherRef}
            className={`relative flex min-w-0 ${isExpanded ? 'flex-1' : 'mx-auto'}`}
          >
            {isExpanded ? (
              <button
                type="button"
                data-haptic="medium"
                onClick={(event) => {
                  event.stopPropagation();
                  setBusinessSearch('');
                  setIsBusinessPopupOpen((value) => !value);
                }}
                className="group flex h-10 w-full min-w-0 flex-1 items-center gap-2 rounded-[6px] px-2 text-right text-app-text transition-colors focus:outline-none"
                aria-expanded={isBusinessPopupOpen}
                aria-haspopup="dialog"
                aria-label={LABELS.selectBusiness}
              >
                <BusinessAvatar name={selectedBusiness} className="h-5 w-5 text-[9px]" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {selectedBusiness}
                </span>
                <BusinessPlanBadge />
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
                    isBusinessPopupOpen
                      ? 'border-app-border-strong bg-app-surface-raised text-app-text'
                      : 'border-transparent text-app-text-secondary group-hover:border-app-border-strong group-hover:bg-app-surface-raised group-hover:text-app-text'
                  }`}
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                </span>
              </button>
            ) : (
              <SidebarIconTooltip label={selectedBusiness} className="hidden justify-center md:flex">
                <button
                  type="button"
                  data-haptic="medium"
                  onClick={(event) => {
                    event.stopPropagation();
                    setBusinessSearch('');
                    setIsBusinessPopupOpen((value) => !value);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-[6px] transition-colors ${
                    isBusinessPopupOpen ? 'bg-[#1F1F1F]' : 'hover:bg-app-nav-hover-bg'
                  }`}
                  aria-expanded={isBusinessPopupOpen}
                  aria-haspopup="dialog"
                  aria-label={LABELS.selectBusiness}
                >
                  <BusinessAvatar name={selectedBusiness} className="h-6 w-6 text-[10px]" />
                </button>
              </SidebarIconTooltip>
            )}

            {isBusinessPopupOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-[220] w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[8px] border border-app-nav-border bg-app-surface text-app-text shadow-2xl shadow-black/10 dark:bg-[#0A0A0A] dark:shadow-black/40">
                <div className="border-b border-app-nav-border p-2">
                  <div className="flex h-10 items-center gap-2 rounded-[6px] border border-transparent px-2 text-app-text-secondary focus-within:border-app-border-strong focus-within:bg-app-surface-raised dark:focus-within:border-[#3A3A3A] dark:focus-within:bg-[#111111]">
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                      ref={businessSearchRef}
                      value={businessSearch}
                      onChange={(event) => setBusinessSearch(event.target.value)}
                      placeholder={LABELS.searchBusiness}
                      className="min-w-0 flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-text-muted"
                    />
                    <span className="shrink-0 rounded-[4px] border border-app-nav-border px-1.5 py-0.5 text-[10px] font-medium text-app-text-secondary">
                      Esc
                    </span>
                  </div>
                </div>

                <div className="max-h-[304px] overflow-y-auto p-2">
                  {filteredBusinesses.length > 0 ? (
                    filteredBusinesses.map((business) => {
                      const isSelected = business === selectedBusiness;

                      return (
                        <button
                          key={business}
                          type="button"
                          data-haptic={isSelected ? 'selection' : 'light'}
                          onClick={() => {
                            setSelectedBusiness(business);
                            setIsBusinessPopupOpen(false);
                          }}
                          className={`mb-1 flex h-11 w-full items-center gap-3 rounded-[6px] px-2 text-right text-sm transition-colors ${
                            isSelected
                              ? 'bg-app-surface-raised text-app-text'
                              : 'text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text'
                          }`}
                        >
                          <BusinessAvatar name={business} className="h-6 w-6 text-[10px]" />
                          <span className="min-w-0 flex-1 truncate font-medium">{business}</span>
                          <BusinessPlanBadge className="px-1.5 text-[9px]" />
                          {isSelected ? (
                            <Check className="h-4 w-4 shrink-0 text-[#EDEDED]" />
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-2 py-8 text-center text-sm text-app-text-secondary">
                      {LABELS.noBusinesses}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="flex-1 overflow-y-auto bg-app-nav-bg py-2 scrollbar-thin scrollbar-thumb-[#d4d4d4] dark:scrollbar-thumb-[#404040]">
          {SIDEBAR_NAV_SECTIONS.map((section, sectionIndex) => (
            <React.Fragment key={section.id}>
              {sectionIndex > 0 &&
                section.id !== 'legacy' &&
                !(
                  SIDEBAR_NAV_SECTIONS[sectionIndex - 1]?.id === 'operationsTools' &&
                  section.id === 'experiments'
                ) && (
                <div className="mx-4 my-2 border-t border-app-nav-border" />
              )}
              {section.id === 'experiments' ? (
                renderCollapsibleSection(
                  section,
                  isExperimentsSectionOpen,
                  setIsExperimentsSectionOpen,
                )
              ) : section.id === 'operationsTools' ? (
                renderCollapsibleSection(
                  section,
                  isOperationsToolsSectionOpen,
                  setIsOperationsToolsSectionOpen,
                )
              ) : section.id === 'legacy' ? (
                renderCollapsibleSection(section, isLegacySectionOpen, setIsLegacySectionOpen)
              ) : (
                renderStaticSectionItems(section)
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-auto shrink-0 border-t border-app-nav-border">
          <button
            type="button"
            data-haptic="selection"
            onClick={() => handleNav(walletItem?.path ?? '/wallet')}
            className={footerItemClass(location.pathname === (walletItem?.path ?? '/wallet'))}
          >
            {isExpanded ? (
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Wallet size={16} className="shrink-0 text-current" />
                  <span className="text-xs text-current">
                    {walletItem?.label ?? LABELS.wallet}
                  </span>
                </span>
                <span className="text-xs font-semibold text-app-text tabular-nums">
                  ₪{Math.round(walletRevenue).toLocaleString('he-IL')}
                </span>
              </span>
            ) : (
              <SidebarIconTooltip
                label={walletItem?.label ?? LABELS.wallet}
                className="hidden flex-col items-center gap-1 md:flex"
              >
                <Wallet size={16} className="text-current" />
                <span className="text-[10px] font-semibold text-app-text tabular-nums">
                  {walletRevenue > 999 ? `${Math.floor(walletRevenue / 1000)}K` : Math.round(walletRevenue)}
                </span>
              </SidebarIconTooltip>
            )}
          </button>

          <button
            type="button"
            data-haptic="selection"
            onClick={() => handleNav(balanceItem?.path ?? '/delivery-balance')}
            className={footerItemClass(location.pathname === (balanceItem?.path ?? '/delivery-balance'))}
          >
            {isExpanded ? (
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Package size={16} className="shrink-0 text-current" />
                  <span className="text-xs text-current">
                    {balanceItem?.label ?? LABELS.deliveryBalance}
                  </span>
                </span>
                <span
                  className={`text-xs font-bold ${
                    state.deliveryBalance <= 100
                      ? 'text-[#dc2626] dark:text-[#f87171]'
                      : 'text-[#f59e0b] dark:text-[#fbbf24]'
                  }`}
                >
                  {state.deliveryBalance.toLocaleString('he-IL')}
                </span>
              </span>
            ) : (
              <SidebarIconTooltip
                label={balanceItem?.label ?? LABELS.deliveryBalance}
                className="hidden flex-col items-center gap-1 md:flex"
              >
                <Package size={16} className="text-current" />
                <span
                  className={`text-[10px] font-bold ${
                    state.deliveryBalance <= 100
                      ? 'text-[#dc2626] dark:text-[#f87171]'
                      : 'text-[#f59e0b] dark:text-[#fbbf24]'
                  }`}
                >
                  {state.deliveryBalance > 999 ? `${Math.floor(state.deliveryBalance / 1000)}K` : state.deliveryBalance}
                </span>
              </SidebarIconTooltip>
            )}
          </button>

          <div className="border-b border-app-nav-border px-4 py-3">
            {isExpanded ? (
              <div className="space-y-3">
                <div data-onboarding="system-toggle" className="flex items-center justify-between gap-3">
                  <span className="text-xs text-app-text-secondary">
                    {systemStatusLabel}
                  </span>
                  <Toggle
                    checked={state.isSystemOpen}
                    onChange={() => toggleSystem()}
                    ariaLabel={systemStatusLabel}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-app-text-secondary">
                    {LABELS.autoAssign}
                  </span>
                  <Toggle
                    checked={state.autoAssignEnabled}
                    onChange={() => dispatch({ type: 'TOGGLE_AUTO_ASSIGN' })}
                    ariaLabel={LABELS.autoAssign}
                  />
                </div>
              </div>
            ) : (
              <SidebarIconTooltip
                label={systemStatusLabel}
                className="hidden justify-center md:flex"
              >
                <button
                  type="button"
                  data-haptic={state.isSystemOpen ? 'warning' : 'success'}
                  onClick={toggleSystem}
                  className="flex items-center justify-center"
                >
                  <Power
                    className={`h-4 w-4 transition-colors ${
                      state.isSystemOpen
                        ? isDeliveryIntakeBlocked
                          ? 'text-[#f59e0b]'
                          : 'text-app-success-text'
                        : 'text-[#dc2626]'
                    }`}
                  />
                </button>
              </SidebarIconTooltip>
            )}
          </div>

          <button
            type="button"
            data-haptic="selection"
            onClick={() => handleNav(settingsItem?.path ?? '/settings')}
            className={`w-full cursor-pointer px-4 py-3 text-right transition-colors ${
              location.pathname.startsWith(settingsItem?.path ?? '/settings')
                ? 'bg-[#f5f5f5] text-app-nav-active-text dark:bg-[#1F1F1F]'
                : 'text-app-text-secondary hover:bg-app-nav-hover-bg hover:text-app-text'
            }`}
          >
            {isExpanded ? (
              <span className="flex items-center gap-3">
                <Settings size={20} className="shrink-0 stroke-[1.5px]" />
                <span className="truncate text-sm font-medium">{settingsItem?.label ?? LABELS.settings}</span>
              </span>
            ) : (
              <SidebarIconTooltip
                label={settingsItem?.label ?? LABELS.settings}
                className="hidden items-center justify-center md:flex"
              >
                <Settings size={20} className="stroke-[1.5px]" />
              </SidebarIconTooltip>
            )}
          </button>
        </div>
      </div>

    </>
  );
};
