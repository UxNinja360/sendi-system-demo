import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useNavigation } from 'react-router';
import { Sidebar } from './sidebar';
import { Breadcrumbs } from './breadcrumbs';
import { SettingsPage } from '../pages/settings-page';
import { PageLoader } from '../ui/page-loader';
import { LoadingBar } from '../ui/loading-bar';
import { Toaster } from '../common/toaster';

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
    if (path.startsWith('/business')) return 'business';
    if (path === '/entities') return 'entities';
    if (path.startsWith('/settings')) return 'settings';
    return 'generic';
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login', { replace: true });
  };

  const isLivePage = location.pathname === '/live';
  const isSettingsPage = location.pathname === '/settings';
  const isLoading = navigation.state === 'loading';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fafafa] text-[#0d0d12] transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-[#fafafa]">
      <Toaster />

      <Sidebar onLogout={handleLogout} />

      <div className="flex h-full w-full flex-1 flex-col overflow-hidden">
        {!isLivePage && <Breadcrumbs />}

        <LoadingBar isLoading={isLoading || isPageLoading} />

        <div
          className={`relative flex-1 w-full bg-[#fafafa] dark:bg-[#0a0a0a] ${
            isLivePage || location.pathname === '/deliveries'
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
            {isSettingsPage ? <SettingsPage onLogout={handleLogout} /> : <Outlet />}
          </Suspense>
        </div>
      </div>
    </div>
  );
};
