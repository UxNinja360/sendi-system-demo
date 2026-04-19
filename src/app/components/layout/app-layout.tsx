import { useState, useEffect, Suspense } from 'react'; // useState kept for isPageLoading
import { Outlet, useLocation, useNavigate, useNavigation } from 'react-router';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';
import { Breadcrumbs } from './breadcrumbs';
import { SettingsPage } from '../pages/settings-page';
import { PageLoader } from '../ui/page-loader';
import { LoadingBar } from '../ui/loading-bar';
import { Toaster } from '../common/toaster';
import { MiniMap } from '../common/mini-map';
import { useLanguage } from '../../context/language.context';
import { OnboardingProvider } from '../../context/onboarding.context';
import { OnboardingTooltip } from '../onboarding/onboarding-tooltip';


export const AppLayout: React.FC = () => {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { t } = useLanguage();

  // Check authentication
  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (auth !== 'true') {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // Track page changes and force loading bar
  useEffect(() => {
    setIsPageLoading(true);
    const minLoadTime = setTimeout(() => {
      setIsPageLoading(false);
    }, 200);
    return () => clearTimeout(minLoadTime);
  }, [location.pathname]);

  // Get page title based on current route
  const getTitle = () => {
    const path = location.pathname;
    
    if (path === '/dashboard') return t('nav.dashboard');
    if (path === '/live') return 'LIVE';
    if (path === '/tracking') return t('nav.deliveryTracking');
    if (path === '/deliveries') return t('nav.history');
    if (path.startsWith('/delivery/')) return t('nav.deliveryDetails');
    if (path === '/couriers') return t('nav.couriers');
    if (path.startsWith('/courier/')) return t('nav.courierDetails');
    if (path === '/restaurants') return t('nav.restaurants');
    if (path.startsWith('/restaurant/')) return t('nav.restaurantDetails');
    if (path === '/customers') return t('nav.customers');
    if (path.startsWith('/customer/')) return t('nav.customerDetails');
    if (path === '/managers' || path === '/settings/managers') return t('nav.managers');
    if (path.startsWith('/business')) return t('nav.businessManagement');
    if (path === '/statistics') return t('nav.dataCenter');
    if (path === '/reports') return t('nav.reports');
    if (path === '/performance') return t('breadcrumbs.performance');
    if (path === '/wallet') return 'ארנק';
    if (path === '/admin') return t('nav.adminMode');
    if (path === '/appearance') return t('nav.appearance');
    if (path === '/account') return t('nav.accountSettings');
    if (path === '/entities') return t('nav.entityManagement');
    if (path.startsWith('/settings')) {
      if (path === '/settings/managers') return t('nav.managers');
      if (path === '/settings/payouts') return t('nav.monthlyPayout');
      if (path === '/settings/history') return t('nav.purchaseHistory');
      return t('nav.settings');
    }
    
    return 'SENDI.IO';
  };

  // Get current page name for loader
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    if (path === '/live') return 'live';
    if (path.startsWith('/business')) return 'business';
    if (path === '/entities') return 'entities';
    if (path.startsWith('/settings')) return 'settings';
    return 'generic';
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login', { replace: true });
  };

  const isLivePage = location.pathname === '/live';
  const isSettingsPage = location.pathname === '/settings';
  const isLoading = navigation.state === 'loading';

  return (
    <OnboardingProvider>
    <div className="flex w-full h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-[#0d0d12] dark:text-[#fafafa] transition-colors duration-300 overflow-hidden">
      {/* Toast Notifications */}
      <Toaster />
      <OnboardingTooltip />
      
      {/* Mini Map - Global Floating Map - Hide on Live page */}
      {!isLivePage && <MiniMap />}

      {/* Sidebar - Always available */}
      <Sidebar onLogout={handleLogout} />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Hide TopBar, Breadcrumbs, ControlBar, SubNav for Live page */}
        {!isLivePage && (
          <>
            <Breadcrumbs />
          </>
        )}
        {/* Loading Bar */}
        <LoadingBar isLoading={isLoading || isPageLoading} />
        <div className={`flex-1 w-full bg-[#fafafa] dark:bg-[#0a0a0a] relative ${isLivePage || location.pathname === '/deliveries' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto scroll-smooth'}`}>
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-[#fafafa] dark:bg-[#0a0a0a]">
              <PageLoader page={getCurrentPage()} />
            </div>
          )}
          <Suspense fallback={<PageLoader page={getCurrentPage()} />}>
            {isSettingsPage ? (
              <SettingsPage onLogout={handleLogout} />
            ) : (
              <Outlet />
            )}
          </Suspense>
        </div>
      </div>
    </div>
    </OnboardingProvider>
  );
};
