export type AppNavSectionId =
  | 'core'
  | 'operations'
  | 'operationsTools'
  | 'experiments'
  | 'data'
  | 'legacy'
  | 'business'
  | 'settings';

export type AppNavIconKey =
  | 'activity'
  | 'alertTriangle'
  | 'barChart'
  | 'bike'
  | 'calendar'
  | 'clock'
  | 'fileText'
  | 'layoutDashboard'
  | 'map'
  | 'package'
  | 'ruler'
  | 'settings'
  | 'store'
  | 'trendingUp'
  | 'users'
  | 'wallet';

export type AppNavItem = {
  id: string;
  path: string;
  routePath?: string;
  label: string;
  section: AppNavSectionId;
  icon: AppNavIconKey;
  showInSidebar?: boolean;
  managedScroll?: boolean;
  exact?: boolean;
  activePathPrefixes?: string[];
  badge?: 'activeDeliveries' | 'deliveryBalance' | 'walletRevenue';
};

export type AppNavSection = {
  id: AppNavSectionId;
  label: string;
  items: AppNavItem[];
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    id: 'live',
    path: '/live',
    routePath: 'live',
    label: '\u05de\u05e0\u05d2\u05f3\u05e8 \u05dc\u05d9\u05d9\u05d1',
    section: 'core',
    icon: 'activity',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
    badge: 'activeDeliveries',
  },
  {
    id: 'dashboard',
    path: '/dashboard',
    routePath: 'dashboard',
    label: '\u05d3\u05e9\u05d1\u05d5\u05e8\u05d3',
    section: 'core',
    icon: 'layoutDashboard',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'legacy-dashboard',
    path: '/legacy/dashboard',
    routePath: 'legacy/dashboard',
    label: '\u05d3\u05e9\u05d1\u05d5\u05e8\u05d3 \u05d9\u05e9\u05df',
    section: 'legacy',
    icon: 'layoutDashboard',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'legacy-deliveries',
    path: '/legacy/deliveries',
    routePath: 'legacy/deliveries',
    label: '\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05d9\u05e9\u05df',
    section: 'legacy',
    icon: 'package',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'legacy-couriers',
    path: '/legacy/couriers',
    routePath: 'legacy/couriers',
    label: '\u05e9\u05dc\u05d9\u05d7\u05d9\u05dd \u05d9\u05e9\u05df',
    section: 'legacy',
    icon: 'bike',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'legacy-restaurants',
    path: '/legacy/restaurants',
    routePath: 'legacy/restaurants',
    label: '\u05de\u05e1\u05e2\u05d3\u05d5\u05ea \u05d9\u05e9\u05df',
    section: 'legacy',
    icon: 'store',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'deliveries',
    path: '/deliveries',
    routePath: 'deliveries',
    label: '\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
    section: 'operations',
    icon: 'package',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
    activePathPrefixes: ['/delivery/'],
  },
  {
    id: 'dispatch',
    path: '/dispatch',
    routePath: 'dispatch',
    label: '\u05d7\u05d3\u05e8 \u05e6\u05d9\u05d5\u05d5\u05ea',
    section: 'experiments',
    icon: 'activity',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'exceptions',
    path: '/exceptions',
    routePath: 'exceptions',
    label: '\u05ea\u05d9\u05d1\u05ea \u05d7\u05e8\u05d9\u05d2\u05d9\u05dd',
    section: 'experiments',
    icon: 'alertTriangle',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'restaurants',
    path: '/restaurants',
    routePath: 'restaurants',
    label: '\u05de\u05e1\u05e2\u05d3\u05d5\u05ea',
    section: 'operations',
    icon: 'store',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
    activePathPrefixes: ['/restaurant/'],
  },
  {
    id: 'couriers',
    path: '/couriers',
    routePath: 'couriers',
    label: '\u05e9\u05dc\u05d9\u05d7\u05d9\u05dd',
    section: 'operations',
    icon: 'bike',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
    activePathPrefixes: ['/courier/'],
  },
  {
    id: 'courier-shifts',
    path: '/couriers/shifts',
    routePath: 'couriers/shifts',
    label: '\u05de\u05e9\u05de\u05e8\u05d5\u05ea',
    section: 'data',
    icon: 'calendar',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'customers',
    path: '/customers',
    routePath: 'customers',
    label: '\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea',
    section: 'operations',
    icon: 'users',
    managedScroll: true,
    exact: true,
    activePathPrefixes: ['/customer/'],
  },
  {
    id: 'zones',
    path: '/zones',
    routePath: 'zones',
    label: '\u05d0\u05d6\u05d5\u05e8\u05d9 \u05de\u05e9\u05dc\u05d5\u05d7',
    section: 'operationsTools',
    icon: 'map',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'distance-pricing',
    path: '/distance-pricing',
    routePath: 'distance-pricing',
    label: '\u05ea\u05de\u05d7\u05d5\u05e8 \u05dc\u05e4\u05d9 \u05de\u05e8\u05d7\u05e7',
    section: 'operationsTools',
    icon: 'ruler',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'hours',
    path: '/hours',
    routePath: 'hours',
    label: '\u05e9\u05e2\u05d5\u05ea \u05e4\u05e2\u05d9\u05dc\u05d5\u05ea',
    section: 'operationsTools',
    icon: 'clock',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'reports',
    path: '/reports',
    routePath: 'reports',
    label: '\u05d3\u05d5\u05d7\u05d5\u05ea',
    section: 'data',
    icon: 'fileText',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'performance',
    path: '/performance',
    routePath: 'performance',
    label: '\u05d1\u05d9\u05e6\u05d5\u05e2\u05d9\u05dd',
    section: 'legacy',
    icon: 'trendingUp',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'log',
    path: '/log',
    routePath: 'log',
    label: '\u05d9\u05d5\u05de\u05df \u05e4\u05e2\u05d5\u05dc\u05d5\u05ea',
    section: 'experiments',
    icon: 'fileText',
    showInSidebar: true,
    managedScroll: true,
    exact: true,
  },
  {
    id: 'wallet',
    path: '/wallet',
    routePath: 'wallet',
    label: '\u05d0\u05e8\u05e0\u05e7',
    section: 'business',
    icon: 'wallet',
    managedScroll: true,
    exact: true,
    badge: 'walletRevenue',
  },
  {
    id: 'delivery-balance',
    path: '/delivery-balance',
    routePath: 'delivery-balance',
    label: '\u05d9\u05ea\u05e8\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
    section: 'business',
    icon: 'package',
    managedScroll: true,
    exact: true,
    badge: 'deliveryBalance',
  },
  {
    id: 'settings',
    path: '/settings',
    routePath: 'settings',
    label: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea',
    section: 'settings',
    icon: 'settings',
    managedScroll: true,
  },
];

const visibleSidebarItems = APP_NAV_ITEMS.filter((item) => item.showInSidebar);

export const SIDEBAR_NAV_SECTIONS: AppNavSection[] = [
  {
    id: 'core',
    label: '\u05e8\u05d0\u05e9\u05d9',
    items: visibleSidebarItems.filter((item) => item.section === 'core'),
  },
  {
    id: 'operations',
    label: '\u05ea\u05e4\u05e2\u05d5\u05dc',
    items: visibleSidebarItems.filter((item) => item.section === 'operations'),
  },
  {
    id: 'data',
    label: '\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd',
    items: visibleSidebarItems.filter((item) => item.section === 'data'),
  },
  {
    id: 'operationsTools',
    label: '\u05ea\u05e4\u05e2\u05d5\u05dc',
    items: visibleSidebarItems.filter((item) => item.section === 'operationsTools'),
  },
  {
    id: 'experiments',
    label: '\u05e2\u05de\u05d5\u05d3\u05d9 \u05e0\u05d9\u05e1\u05d9\u05d5\u05df',
    items: visibleSidebarItems.filter((item) => item.section === 'experiments'),
  },
  {
    id: 'legacy',
    label: '\u05e2\u05de\u05d5\u05d3\u05d9\u05dd \u05d9\u05e9\u05e0\u05d9\u05dd',
    items: visibleSidebarItems.filter((item) => item.section === 'legacy'),
  },
];

export const APP_MANAGED_SCROLL_PATHS = new Set(
  APP_NAV_ITEMS.filter((item) => item.managedScroll).map((item) => item.path)
);

export const isNavItemActive = (item: AppNavItem, pathname: string) => {
  if (pathname === item.path) return true;
  if (item.activePathPrefixes?.some((prefix) => pathname.startsWith(prefix))) return true;
  if (item.exact) return false;
  return pathname.startsWith(`${item.path}/`);
};

export const getNavItemForPath = (pathname: string) =>
  APP_NAV_ITEMS.find((item) => isNavItemActive(item, pathname)) ?? null;

export const getNavItemById = (id: string) =>
  APP_NAV_ITEMS.find((item) => item.id === id) ?? null;

export const getNavItemByPath = (path: string) =>
  APP_NAV_ITEMS.find((item) => item.path === path) ?? null;
