import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Activity,
  BarChart,
  Bike,
  Calendar,
  ChevronLeft,
  Clock,
  FileText,
  LayoutDashboard,
  Map,
  Package,
  Power,
  Ruler,
  Settings,
  Sidebar as SidebarIcon,
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
  ruler: Ruler,
  settings: Settings,
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

    return (
      <button
        key={item.id}
        type="button"
        data-onboarding={ONBOARDING_BY_ID[item.id]}
        onClick={(event) => {
          event.stopPropagation();
          handleNav(item.path);
        }}
        className={`mx-2 mb-1 block w-[calc(100%-1rem)] cursor-pointer rounded-lg text-right transition-all duration-200 ${
          isActive
            ? 'bg-[#f5f5f5] text-[#16a34a] dark:bg-[#262626] dark:text-[#22c55e]'
            : 'text-[#737373] hover:bg-[#fafafa] hover:text-[#0d0d12] dark:text-[#a3a3a3] dark:hover:bg-[#1a1a1a] dark:hover:text-[#fafafa]'
        }`}
        aria-label={item.label}
      >
        {isExpanded ? (
          <span className="flex items-center gap-3 px-4 py-2.5">
            <Icon size={19} className="shrink-0 stroke-[1.8px]" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
            {badge && (
              <span className="shrink-0 text-[11px] font-medium tabular-nums text-[#a3a3a3] dark:text-[#737373]">
                {badge}
              </span>
            )}
          </span>
        ) : (
          <SidebarIconTooltip
            label={badge ? `${item.label} • ${badge}` : item.label}
            className="flex items-center justify-center py-2.5"
          >
            <Icon size={19} className="stroke-[1.8px]" />
          </SidebarIconTooltip>
        )}
      </button>
    );
  };

  const footerItemClass = (isActive: boolean) =>
    `w-full cursor-pointer border-b border-[#e5e5e5] px-4 py-3 text-right transition-colors dark:border-[#262626] ${
      isActive
        ? 'bg-[#f5f5f5] dark:bg-[#1a1a1a]'
        : 'hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a]'
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
            <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-2xl dark:border-[#262626] dark:bg-[#171717]">
              <div className="border-b border-[#e5e5e5] px-6 py-4 dark:border-[#262626]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {LABELS.selectBusiness}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsBusinessPopupOpen(false)}
                    className="text-[#737373] transition-colors hover:text-[#0d0d12] dark:text-[#a3a3a3] dark:hover:text-[#fafafa]"
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
                        ? 'bg-[#9fe870] font-medium text-[#0d0d12]'
                        : 'text-[#36394a] hover:bg-[#f5f5f5] dark:text-[#d4d4d4] dark:hover:bg-[#262626]'
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
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsCollapsed(!isCollapsed);
        }}
        className={`app-shell-height fixed inset-y-0 right-0 z-[110] flex flex-col border-l border-[#e5e5e5] bg-[#fafafa] shadow-xl dark:border-[#262626] dark:bg-[#0a0a0a] md:static md:z-50 md:shadow-none ${
          isCollapsed ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
        style={{
          width: isDesktop ? (isCollapsed ? '60px' : '200px') : '240px',
          transition: isDesktop
            ? 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
            : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="app-safe-header flex shrink-0 cursor-pointer items-center justify-between border-b border-[#e5e5e5] bg-[#fafafa] px-4 py-0 transition-colors hover:bg-[#f0f0f0] dark:border-[#262626] dark:bg-[#0a0a0a] dark:hover:bg-[#111111]"
        >
          <div className="flex items-center gap-2 md:hidden">
            <AppLogo size={20} className="text-[#02B74F]" />
            <span className="text-base font-bold tracking-tight text-[#0d0d12] dark:text-[#fafafa]">Sendi</span>
          </div>

          {!isCollapsed && (
            <div className="hidden items-center gap-2 md:flex">
              <AppLogo size={20} className="text-[#02B74F]" />
              <span className="text-base font-bold tracking-tight text-[#0d0d12] dark:text-[#fafafa]">Sendi</span>
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
            className="text-[#737373] hover:text-[#0d0d12] dark:text-[#a3a3a3] dark:hover:text-[#fafafa] md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>

          {!isCollapsed && (
            <div className="hidden text-[#737373] dark:text-[#a3a3a3] md:block">
              <SidebarIcon size={16} />
            </div>
          )}
        </div>

        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              if (!isDesktop) {
                setIsCollapsed(false);
              } else {
                setIsCollapsed(!isCollapsed);
              }
            }
          }}
          className="flex-1 cursor-pointer overflow-y-auto bg-[#fafafa] py-2 scrollbar-thin scrollbar-thumb-[#d4d4d4] dark:bg-[#0a0a0a] dark:scrollbar-thumb-[#404040]"
        >
          {SIDEBAR_NAV_SECTIONS.map((section, sectionIndex) => (
            <React.Fragment key={section.id}>
              {sectionIndex > 0 && (
                <div className="mx-4 my-2 border-t border-[#e5e5e5] dark:border-[#262626]" />
              )}
              {isExpanded && (
                <div className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-[#a3a3a3] dark:text-[#555]">
                  {section.label}
                </div>
              )}
              {section.items.map(renderNavItem)}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-auto shrink-0 border-t border-[#e5e5e5] dark:border-[#262626]">
          <button
            type="button"
            onClick={() => setIsBusinessPopupOpen(!isBusinessPopupOpen)}
            className={footerItemClass(false)}
            aria-label={selectedBusiness}
          >
            {isExpanded ? (
              <span className="flex items-center gap-2 text-xs text-[#666d80] transition-colors hover:text-[#9fe870] dark:text-[#a3a3a3] dark:hover:text-[#9fe870]">
                <Store size={14} className="shrink-0" />
                <span className="truncate">{selectedBusiness}</span>
                <ChevronLeft size={12} className="shrink-0" />
              </span>
            ) : (
              <SidebarIconTooltip label={selectedBusiness} className="hidden justify-center md:flex">
                <Store size={15} className="text-[#666d80] transition-colors hover:text-[#9fe870] dark:text-[#a3a3a3] dark:hover:text-[#9fe870]" />
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
                  <Wallet size={16} className="shrink-0 text-[#16a34a] dark:text-[#9fe870]" />
                  <span className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                    {walletItem?.label ?? LABELS.wallet}
                  </span>
                </span>
                <span className="text-xs font-bold text-[#16a34a] dark:text-[#9fe870]">
                  ₪{Math.round(walletRevenue).toLocaleString('he-IL')}
                </span>
              </span>
            ) : (
              <SidebarIconTooltip
                label={walletItem?.label ?? LABELS.wallet}
                className="hidden flex-col items-center gap-1 md:flex"
              >
                <Wallet size={16} className="text-[#16a34a] dark:text-[#9fe870]" />
                <span className="text-[10px] font-bold text-[#16a34a] dark:text-[#9fe870]">
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
                  <Package size={16} className="shrink-0 text-[#0fcdd3]" />
                  <span className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
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
                <Package size={16} className="text-[#0fcdd3]" />
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

          <div className="border-b border-[#e5e5e5] px-4 py-3 dark:border-[#262626]">
            {isExpanded ? (
              <div className="space-y-3">
                <div data-onboarding="system-toggle" className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
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
                  <span className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
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
                ? 'bg-[#f5f5f5] text-[#16a34a] dark:bg-[#262626] dark:text-[#22c55e]'
                : 'text-[#36394a] hover:bg-[#f5f5f5] dark:text-[#d4d4d4] dark:hover:bg-[#404040]'
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
