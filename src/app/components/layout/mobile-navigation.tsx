import type React from 'react';
import { Activity, Bike, LayoutDashboard, MoreHorizontal, Package } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { getNavItemById, isNavItemActive, type AppNavItem } from '../../app-navigation';
import { useDelivery } from '../../context/delivery-context-value';
import { isOperationalDelivery } from '../../utils/delivery-status';

const MOBILE_NAV_IDS = ['live', 'dashboard', 'deliveries', 'couriers'] as const;

const MOBILE_NAV_LABELS: Record<(typeof MOBILE_NAV_IDS)[number], string> = {
  live: 'לייב',
  dashboard: 'דשבורד',
  deliveries: 'משלוחים',
  couriers: 'שליחים',
};

const MOBILE_NAV_ICONS: Record<
  (typeof MOBILE_NAV_IDS)[number],
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  live: Activity,
  dashboard: LayoutDashboard,
  deliveries: Package,
  couriers: Bike,
};

const getBadge = (item: AppNavItem, activeDeliveriesCount: number) => {
  if (item.id === 'live' || item.id === 'deliveries') {
    return activeDeliveriesCount > 0 ? activeDeliveriesCount.toLocaleString('he-IL') : null;
  }

  return null;
};

type MobileNavigationProps = {
  onOpenMenu: () => void;
};

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ onOpenMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useDelivery();
  const activeDeliveriesCount = state.deliveries.filter(isOperationalDelivery).length;
  const items = MOBILE_NAV_IDS
    .map((id) => getNavItemById(id))
    .filter((item): item is AppNavItem => Boolean(item));
  const isPrimaryRouteActive = items.some((item) => isNavItemActive(item, location.pathname));

  return (
    <nav
      dir="rtl"
      aria-label="ניווט ראשי"
      className="shrink-0 border-t border-app-nav-border bg-app-nav-bg/95 px-3 pt-2 backdrop-blur md:hidden"
      style={{ paddingBottom: 'calc(0.5rem + var(--app-safe-bottom))' }}
    >
      <div className="grid grid-cols-5 items-stretch gap-1 rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-nav-bg p-1">
        {items.map((item) => {
          const Icon = MOBILE_NAV_ICONS[item.id as (typeof MOBILE_NAV_IDS)[number]];
          const isActive = isNavItemActive(item, location.pathname);
          const badge = getBadge(item, activeDeliveriesCount);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[var(--app-radius-sm)] px-1 py-1.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'bg-app-nav-active-bg text-app-text shadow-sm ring-1 ring-app-nav-border'
                  : 'text-app-text-secondary hover:bg-app-surface hover:text-app-text'
              }`}
            >
              {isActive ? <span className="absolute top-1 h-0.5 w-5 rounded-full bg-app-nav-indicator" /> : null}
              <span className="relative flex h-5 items-center justify-center">
                <Icon className="h-[18px] w-[18px] stroke-[1.8px]" />
                {badge ? (
                  <span
                    className={`absolute -left-3 -top-1 min-w-4 rounded-full px-1 text-[9px] font-semibold leading-4 shadow-sm ${
                      isActive
                        ? 'bg-app-text text-app-background'
                        : 'bg-app-nav-badge-bg text-app-nav-badge-text ring-1 ring-app-nav-border'
                    }`}
                  >
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate leading-none">
                {MOBILE_NAV_LABELS[item.id as (typeof MOBILE_NAV_IDS)[number]]}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="פתח תפריט"
          className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[var(--app-radius-sm)] px-1 py-1.5 text-[10px] font-medium transition-colors ${
            !isPrimaryRouteActive
              ? 'bg-app-nav-active-bg text-app-text shadow-sm ring-1 ring-app-nav-border'
              : 'text-app-text-secondary hover:bg-app-surface hover:text-app-text'
          }`}
        >
          {!isPrimaryRouteActive ? <span className="absolute top-1 h-0.5 w-5 rounded-full bg-app-nav-indicator" /> : null}
          <MoreHorizontal className="h-[18px] w-[18px] stroke-[1.8px]" />
          <span className="max-w-full truncate leading-none">עוד</span>
        </button>
      </div>
    </nav>
  );
};
