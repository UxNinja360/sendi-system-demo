import { useLocation, useNavigate } from 'react-router';
import { Home, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../context/language.context';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname;
    const breadcrumbs: BreadcrumbItem[] = [];

    // Home always exists
    breadcrumbs.push({ label: t('breadcrumbs.home'), path: '/dashboard' });

    // Dashboard
    if (path === '/dashboard') {
      breadcrumbs.push({ label: t('nav.dashboard'), path: '/dashboard' });
    }
    // LIVE
    else if (path === '/live') {
      breadcrumbs.push({ label: 'LIVE', path: '/live' });
    }
    // Settings
    else if (path.startsWith('/settings')) {
      breadcrumbs.push({ label: t('nav.settings'), path: '/settings' });
      
      if (path === '/settings/shipments') {
        breadcrumbs.push({ label: t('breadcrumbs.shipmentBalance'), path: '/settings/shipments' });
      } else if (path === '/settings/reports') {
        breadcrumbs.push({ label: t('nav.reports'), path: '/settings/reports' });
      } else if (path === '/settings/performance') {
        breadcrumbs.push({ label: t('breadcrumbs.performance'), path: '/settings/performance' });
      } else if (path === '/settings/payouts') {
        breadcrumbs.push({ label: t('nav.monthlyPayout'), path: '/settings/payouts' });
      } else if (path === '/settings/history') {
        breadcrumbs.push({ label: t('nav.purchaseHistory'), path: '/settings/history' });
      }
    }
    else if (path === '/hours') {
      breadcrumbs.push({ label: t('breadcrumbs.operatingHours'), path: '/hours' });
    }
    else if (path === '/zones') {
      breadcrumbs.push({ label: t('breadcrumbs.deliveryZones'), path: '/zones' });
    }
    else if (path === '/distance-pricing') {
      breadcrumbs.push({ label: t('breadcrumbs.distancePricing'), path: '/distance-pricing' });
    }
    else if (path === '/wallet') {
      breadcrumbs.push({ label: 'ארנק', path: '/wallet' });
    }
    else if (path === '/log') {
      breadcrumbs.push({ label: 'LOG', path: '/log' });
    }
    // Entity Management
    else if (path === '/entities') {
      breadcrumbs.push({ label: t('nav.entityManagement'), path: '/entities' });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // If only one item (home only), don't display anything
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <div className="w-full bg-[#fafafa] dark:bg-[#0a0a0a] border-b border-[#e5e5e5] dark:border-[#262626] transition-colors duration-300">
      
    </div>
  );
};
