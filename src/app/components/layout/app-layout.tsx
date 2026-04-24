import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useNavigation } from 'react-router';
import { Sidebar } from './sidebar';
import { MobileNavigation } from './mobile-navigation';
import { MobileMenuNudge } from './mobile-menu-nudge';
import { Breadcrumbs } from './breadcrumbs';
import { PageLoader } from '../ui/page-loader';
import { LoadingBar } from '../ui/loading-bar';
import { Toaster } from '../common/toaster';
import { APP_MANAGED_SCROLL_PATHS } from '../../app-navigation';

export const AppLayout: React.FC = () => {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (auth !== 'true') {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    setIsPageLoading(true);
    const minLoadTime = setTimeout(() => {
      setIsPageLoading(false);
    }, 200);
    return () => clearTimeout(minLoadTime);
  }, [location.pathname]);

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    if (path === '/live') return 'live';
    if (path === '/entities') return 'entities';
    if (path.startsWith('/settings')) return 'settings';
    return 'generic';
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login', { replace: true });
  };

  const isLivePage = location.pathname === '/live';
  const isManagedScrollPage =
    isLivePage || APP_MANAGED_SCROLL_PATHS.has(location.pathname);
  const isLoading = navigation.state === 'loading';

  return (
    <div className="app-shell-height flex w-full overflow-hidden bg-[#fafafa] text-[#0d0d12] transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-[#fafafa]">
      <Toaster />

      <Sidebar onLogout={handleLogout} />

      <div className="flex h-full w-full flex-1 flex-col overflow-hidden">
        {!isLivePage && <Breadcrumbs />}

        <LoadingBar isLoading={isLoading || isPageLoading} />

        <div
          className={`relative flex-1 w-full bg-[#fafafa] dark:bg-[#0a0a0a] ${
            isManagedScrollPage
              ? 'overflow-hidden flex flex-col'
              : 'overflow-y-auto scroll-smooth'
          }`}
        >
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-[#fafafa] dark:bg-[#0a0a0a]">
              <PageLoader page={getCurrentPage()} />
            </div>
          )}

          <Suspense fallback={<PageLoader page={getCurrentPage()} />}>
            <Outlet />
          </Suspense>
        </div>

        {!isLivePage && <MobileNavigation />}
        <MobileMenuNudge />
      </div>
    </div>
  );
};
