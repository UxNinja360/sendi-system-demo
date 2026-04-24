import type React from 'react';
import { Activity, Bike, LayoutDashboard, MoreHorizontal, Package } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { getNavItemById, isNavItemActive, type AppNavItem } from '../../app-navigation';
import { useDelivery } from '../../context/delivery-context-value';

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

export const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useDelivery();
  const activeDeliveriesCount = state.deliveries.filter(
    (delivery) => delivery.status !== 'delivered' && delivery.status !== 'cancelled'
  ).length;
  const items = MOBILE_NAV_IDS
    .map((id) => getNavItemById(id))
    .filter((item): item is AppNavItem => Boolean(item));
  const isPrimaryRouteActive = items.some((item) => isNavItemActive(item, location.pathname));

  return (
    <nav
      dir="rtl"
      aria-label="ניווט ראשי"
      className="shrink-0 border-t border-[#e5e5e5] bg-white/95 px-1.5 pt-1.5 backdrop-blur dark:border-[#262626] dark:bg-[#0a0a0a]/95 md:hidden"
      style={{ paddingBottom: 'calc(0.375rem + var(--app-safe-bottom))' }}
    >
      <div className="grid grid-cols-5 items-stretch gap-1">
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
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'bg-[#f0fdf4] text-[#16a34a] dark:bg-[#102015] dark:text-[#9fe870]'
                  : 'text-[#737373] hover:bg-[#f5f5f5] hover:text-[#0d0d12] dark:text-[#a3a3a3] dark:hover:bg-[#171717] dark:hover:text-[#fafafa]'
              }`}
            >
              <span className="relative flex h-5 items-center justify-center">
                <Icon className="h-[18px] w-[18px] stroke-[1.8px]" />
                {badge ? (
                  <span className="absolute -left-3 -top-1 min-w-4 rounded-full bg-[#16a34a] px-1 text-[9px] font-bold leading-4 text-white dark:bg-[#9fe870] dark:text-[#0d0d12]">
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
          onClick={() => (window as Window & { toggleMobileSidebar?: () => void }).toggleMobileSidebar?.()}
          aria-label="פתח תפריט"
          className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[10px] font-medium transition-colors ${
            !isPrimaryRouteActive
              ? 'bg-[#f0fdf4] text-[#16a34a] dark:bg-[#102015] dark:text-[#9fe870]'
              : 'text-[#737373] hover:bg-[#f5f5f5] hover:text-[#0d0d12] dark:text-[#a3a3a3] dark:hover:bg-[#171717] dark:hover:text-[#fafafa]'
          }`}
        >
          <MoreHorizontal className="h-[18px] w-[18px] stroke-[1.8px]" />
          <span className="max-w-full truncate leading-none">עוד</span>
        </button>
      </div>
    </nav>
  );
};
