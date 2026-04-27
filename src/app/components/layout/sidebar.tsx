import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Activity,
  BarChart,
  Bike,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  LayoutDashboard,
  Map,
  Package,
  Palette,
  Power,
  Ruler,
  Settings,
  SlidersHorizontal,
  Store,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { getNavItemById, isNavItemActive, SIDEBAR_NAV_SECTIONS } from '../../app-navigation';
import type { AppNavIconKey, AppNavItem } from '../../app-navigation';
import { useDelivery } from '../../context/delivery-context-value';
import { getDeliveryCustomerCharge } from '../../utils/delivery-finance';
import { isOperationalDelivery } from '../../utils/delivery-status';
import { AppLogo } from '../icons/app-logo';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface SidebarProps {
  onLogout: () => void;
  onMobileMenuToggleReady?: (toggle: (() => void) | null) => void;
}

interface SidebarIconTooltipProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

const LABELS = {
  selectBusiness: '\u05d1\u05d7\u05d9\u05e8\u05ea \u05e2\u05e1\u05e7',
  acceptDeliveries: '\u05e7\u05d1\u05dc\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
  autoAssign: '\u05e9\u05d9\u05d1\u05d5\u05e5 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9',
  noActiveCouriers: '\u05d0\u05d9 \u05d0\u05e4\u05e9\u05e8 \u05dc\u05e4\u05ea\u05d5\u05d7 \u05e7\u05d1\u05dc\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05d1\u05dc\u05d9 \u05e9\u05dc\u05d9\u05d7\u05d9\u05dd \u05e4\u05e2\u05d9\u05dc\u05d9\u05dd',
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

const SidebarIconTooltip: React.FC<SidebarIconTooltipProps> = ({ label, children, className }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className={className}>{children}</div>
    </TooltipTrigger>
    <TooltipContent side="left">{label}</TooltipContent>
  </Tooltip>
);

export const Sidebar: React.FC<SidebarProps> = ({ onLogout: _onLogout, onMobileMenuToggleReady }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useDelivery();
  const [isBusinessPopupOpen, setIsBusinessPopupOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(BUSINESSES[0]);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      if (window.innerWidth < 768) return false;
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [isLegacySectionOpen, setIsLegacySectionOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-legacy-open');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [isExperimentsSectionOpen, setIsExperimentsSectionOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-experiments-open');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [isOperationsToolsSectionOpen, setIsOperationsToolsSectionOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-operations-tools-open');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const isExpanded = !isCollapsed || !isDesktop;
  const activeCouriersCount = state.couriers.filter((courier) => courier.status !== 'offline').length;
  const activeDeliveriesCount = state.deliveries.filter(isOperationalDelivery).length;
  const walletRevenue = state.deliveries
    .filter((delivery) => delivery.status === 'delivered')
    .reduce((sum, delivery) => sum + getDeliveryCustomerCharge(delivery), 0);
  const isSystemToggleDisabled = !state.isSystemOpen && activeCouriersCount === 0;
  const walletItem = getNavItemById('wallet');
  const balanceItem = getNavItemById('delivery-balance');
  const settingsItem = getNavItemById('settings');

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
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
    try {
      localStorage.setItem('sidebar-legacy-open', JSON.stringify(isLegacySectionOpen));
    } catch {
      // Storage can fail in restricted contexts; the in-memory state is enough.
    }
  }, [isLegacySectionOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebar-experiments-open', JSON.stringify(isExperimentsSectionOpen));
    } catch {
      // Storage can fail in restricted contexts; the in-memory state is enough.
    }
  }, [isExperimentsSectionOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebar-operations-tools-open', JSON.stringify(isOperationsToolsSectionOpen));
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
    setIsCollapsed((prev) => !prev);
  }, []);

  useEffect(() => {
    onMobileMenuToggleReady?.(toggleMobileMenu);
    return () => onMobileMenuToggleReady?.(null);
  }, [onMobileMenuToggleReady, toggleMobileMenu]);

  const closeMobileMenu = () => {
    if (!isDesktop) setIsCollapsed(false);
  };

  const handleNav = (path: string) => {
    navigate(path);
    closeMobileMenu();
  };

  const getNavBadge = (item: AppNavItem) => {
    if (item.badge === 'activeDeliveries') return activeDeliveriesCount.toLocaleString('he-IL');
    if (item.badge === 'deliveryBalance') return state.deliveryBalance.toLocaleString('he-IL');
    if (item.badge === 'walletRevenue') return `₪${Math.round(walletRevenue).toLocaleString('he-IL')}`;
    return null;
  };

  const toggleSystem = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isSystemToggleDisabled) {
      alert(LABELS.noActiveCouriers);
      return;
    }
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
        (section.id === 'operations' &&
          item.id === 'restaurants' &&
          section.items[itemIndex - 1]?.id === 'reports');

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
      {!isDesktop && isCollapsed && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
      )}

      {isBusinessPopupOpen && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={() => setIsBusinessPopupOpen(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4" dir="rtl">
            <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-[var(--app-radius-md)] border border-app-border bg-app-surface shadow-2xl">
              <div className="border-b border-app-border px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-app-text">
                    {LABELS.selectBusiness}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsBusinessPopupOpen(false)}
                    className="text-app-text-secondary transition-colors hover:text-app-text"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {BUSINESSES.map((business) => (
                  <button
                    key={business}
                    type="button"
                    onClick={() => {
                      setSelectedBusiness(business);
                      setIsBusinessPopupOpen(false);
                    }}
                    className={`mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-right text-sm transition-colors ${
                      selectedBusiness === business
                        ? 'bg-app-nav-active-bg font-medium text-app-nav-active-text shadow-[inset_0_0_0_1px_var(--app-border)]'
                        : 'text-app-text-secondary hover:bg-app-nav-hover-bg hover:text-app-text'
                    }`}
                  >
                    <Store size={18} className="shrink-0" />
                    <span className="truncate">{business}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div
        dir="rtl"
        className={`app-shell-height group/sidebar fixed inset-y-0 right-0 z-[110] flex flex-col border-l border-app-nav-border bg-app-nav-bg shadow-xl md:static md:z-50 md:shadow-none ${
          isCollapsed ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
        style={{
          width: isDesktop ? (isCollapsed ? '60px' : '256px') : '260px',
          transition: isDesktop
            ? 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
            : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {isDesktop && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsCollapsed((value) => !value);
            }}
            className="group/sidebar-resize absolute bottom-0 left-0 top-0 z-20 hidden w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center focus:outline-none md:flex"
            aria-label={isCollapsed ? 'Open sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Open sidebar' : 'Collapse sidebar'}
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover/sidebar-resize:bg-app-nav-border" />
            <span className="pointer-events-none absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-app-nav-border bg-app-nav-bg text-app-text-secondary opacity-0 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-[opacity,background-color,color,border-color] group-hover/sidebar-resize:opacity-100 group-hover/sidebar-resize:border-[#2E2E2E] group-hover/sidebar-resize:bg-[#1A1A1A] group-hover/sidebar-resize:text-app-text group-focus-visible/sidebar-resize:opacity-100 group-focus-visible/sidebar-resize:ring-2 group-focus-visible/sidebar-resize:ring-[#ededed]/20">
              {isCollapsed ? (
                <ChevronLeft className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>
          </button>
        )}

        <div
          className="app-safe-header flex shrink-0 items-center justify-between border-b border-app-nav-border bg-app-nav-bg px-4 py-0"
        >
          <div className="flex items-center gap-2 md:hidden">
            <AppLogo size={20} className="text-[#02B74F]" />
            <span className="text-base font-bold tracking-tight text-[#0d0d12] dark:text-app-text">Sendi</span>
          </div>

          {!isCollapsed && (
            <div className="hidden items-center gap-2 md:flex">
              <AppLogo size={20} className="text-[#02B74F]" />
              <span className="text-base font-bold tracking-tight text-[#0d0d12] dark:text-app-text">Sendi</span>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto hidden md:flex">
              <AppLogo size={20} className="text-[#02B74F]" />
            </div>
          )}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              closeMobileMenu();
            }}
            className="text-app-text-secondary hover:text-app-text md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>

          {!isCollapsed && <div className="hidden w-4 md:block" />}
        </div>

        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              if (!isDesktop) {
                setIsCollapsed(false);
              }
            }
          }}
          className="flex-1 overflow-y-auto bg-app-nav-bg py-2 scrollbar-thin scrollbar-thumb-[#d4d4d4] dark:scrollbar-thumb-[#404040]"
        >
          {SIDEBAR_NAV_SECTIONS.map((section, sectionIndex) => (
            <React.Fragment key={section.id}>
              {sectionIndex > 0 &&
                section.id !== 'legacy' &&
                !(
                  SIDEBAR_NAV_SECTIONS[sectionIndex - 1]?.id === 'core' &&
                  section.id === 'operations'
                ) &&
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
            onClick={() => setIsBusinessPopupOpen(!isBusinessPopupOpen)}
            className={footerItemClass(false)}
            aria-label={selectedBusiness}
          >
            {isExpanded ? (
              <span className="flex items-center gap-2 text-xs text-current transition-colors">
                <Store size={14} className="shrink-0" />
                <span className="truncate">{selectedBusiness}</span>
                <ChevronLeft size={12} className="shrink-0" />
              </span>
            ) : (
              <SidebarIconTooltip label={selectedBusiness} className="hidden justify-center md:flex">
                <Store size={15} className="text-current transition-colors" />
              </SidebarIconTooltip>
            )}
          </button>

          <button
            type="button"
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
                    {LABELS.acceptDeliveries}
                  </span>
                  <button
                    type="button"
                    onClick={toggleSystem}
                    disabled={isSystemToggleDisabled}
                    className={`relative h-5 w-10 rounded-full transition-colors ${
                      state.isSystemOpen
                        ? 'bg-[#02B74F]'
                        : isSystemToggleDisabled
                          ? 'cursor-not-allowed bg-[#e5e5e5] opacity-50 dark:bg-[#404040]'
                          : 'bg-[#e5e5e5] dark:bg-[#404040]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        state.isSystemOpen ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-app-text-secondary">
                    {LABELS.autoAssign}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      dispatch({ type: 'TOGGLE_AUTO_ASSIGN' });
                    }}
                    className={`relative h-5 w-10 rounded-full transition-colors ${
                      state.autoAssignEnabled ? 'bg-[#02B74F]' : 'bg-[#e5e5e5] dark:bg-[#404040]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        state.autoAssignEnabled ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ) : (
              <SidebarIconTooltip
                label={state.isSystemOpen ? LABELS.acceptDeliveries : LABELS.systemClosed}
                className="hidden justify-center md:flex"
              >
                <button
                  type="button"
                  onClick={toggleSystem}
                  disabled={isSystemToggleDisabled}
                  className="flex items-center justify-center"
                >
                  <Power className={`h-4 w-4 transition-colors ${state.isSystemOpen ? 'text-[#02B74F]' : 'text-[#dc2626]'}`} />
                </button>
              </SidebarIconTooltip>
            )}
          </div>

          <button
            type="button"
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
