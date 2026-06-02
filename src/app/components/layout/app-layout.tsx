import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useNavigation } from 'react-router';
import { Sidebar } from './sidebar';
import { MobileMenuNudge } from './mobile-menu-nudge';
import { AppTopBar } from './app-top-bar';
import { MobileFloatingDock } from './mobile-floating-dock';
import { PageLoader } from '../ui/page-loader';
import { LoadingBar } from '../ui/loading-bar';
import { Toaster } from '../common/toaster';
import { OperationalAlerts } from '../../notifications/operational-alerts';
import { APP_MANAGED_SCROLL_PATHS } from '../../app-navigation';
import { clearAuthSession, readAuthSession } from '../../auth/auth-session';

export const AppLayout: React.FC = () => {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [mobileMenuToggle, setMobileMenuToggle] = useState<(() => void) | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();

  useEffect(() => {
    const session = readAuthSession();
    if (!session) {
      navigate('/login', { replace: true });
      return;
    }

    if (session.workspace?.onboardingStatus !== 'complete') {
      navigate('/onboarding', { replace: true });
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
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  const registerMobileMenuToggle = useCallback((toggle: (() => void) | null) => {
    setMobileMenuToggle(() => toggle);
  }, []);

  const openMobileMenu = useCallback(() => {
    mobileMenuToggle?.();
  }, [mobileMenuToggle]);

  const isLivePage = location.pathname === '/live';
  const isSettingsPage = location.pathname.startsWith('/settings');
  const isManagedScrollPage =
    isLivePage || isSettingsPage || APP_MANAGED_SCROLL_PATHS.has(location.pathname);
  const isLoading = navigation.state === 'loading';

  return (
    <div className="app-layout-root app-shell-height flex w-full overflow-hidden bg-app-background text-[#0d0d12] transition-colors duration-300 dark:text-app-text">
      <Toaster />
      <OperationalAlerts />

      <Sidebar onLogout={handleLogout} onMobileMenuToggleReady={registerMobileMenuToggle} />

      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        <LoadingBar isLoading={isLoading || isPageLoading} />
        {!isLivePage && <AppTopBar onOpenMobileMenu={openMobileMenu} />}

        <div
          className={`relative min-h-0 flex-1 w-full bg-app-background ${
            isManagedScrollPage
              ? 'overflow-hidden flex flex-col'
              : 'overflow-y-auto scroll-smooth'
          }`}
        >
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-app-background">
              <PageLoader page={getCurrentPage()} />
            </div>
          )}

          <Suspense fallback={<PageLoader page={getCurrentPage()} />}>
            <Outlet />
          </Suspense>
        </div>

        {isLivePage && <MobileMenuNudge onOpenMenu={openMobileMenu} />}
        {!isLivePage && <MobileFloatingDock onOpenMenu={openMobileMenu} />}
      </div>
    </div>
  );
};
