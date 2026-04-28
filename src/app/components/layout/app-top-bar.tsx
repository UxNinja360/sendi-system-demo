import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  MessageSquare,
  MoreHorizontal,
  PackagePlus,
  Store,
  UserPlus,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { getNavItemForPath } from '../../app-navigation';
import { useDelivery } from '../../context/delivery-context-value';
import { formatOrderNumber } from '../../utils/order-number';
import { AppTopBarAction, emitAppTopBarAction } from './app-top-bar-actions';

type PageMenuAction = {
  action: AppTopBarAction;
  label: string;
  icon: ReactNode;
};

type TopBarBreadcrumb = {
  parentLabel: string;
  parentPath: string;
  currentLabel: string;
};

const getPageMenuAction = (pathname: string): PageMenuAction | null => {
  if (pathname === '/deliveries') {
    return {
      action: 'create-delivery',
      label: 'יצירת משלוח',
      icon: <PackagePlus className="h-4 w-4 text-app-text-secondary" />,
    };
  }

  if (pathname === '/couriers') {
    return {
      action: 'create-courier',
      label: 'הוספת שליח',
      icon: <UserPlus className="h-4 w-4 text-app-text-secondary" />,
    };
  }

  if (pathname === '/restaurants') {
    return {
      action: 'create-restaurant',
      label: 'הוספת מסעדה',
      icon: <Store className="h-4 w-4 text-app-text-secondary" />,
    };
  }

  return null;
};

const getPathDetailId = (pathname: string, prefix: string) => {
  if (!pathname.startsWith(prefix)) return null;
  return decodeURIComponent(pathname.slice(prefix.length));
};

export const AppTopBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useDelivery();
  const currentItem = getNavItemForPath(location.pathname);
  const pageTitle = currentItem?.label ?? 'Sendi';
  const pageMenuAction = getPageMenuAction(location.pathname);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const deliveryId = getPathDetailId(location.pathname, '/delivery/');
  const restaurantId = getPathDetailId(location.pathname, '/restaurant/');
  const courierId = getPathDetailId(location.pathname, '/courier/');
  const customerId = getPathDetailId(location.pathname, '/customer/');

  const topBarBreadcrumb: TopBarBreadcrumb | null = (() => {
    if (deliveryId) {
      const delivery = state.deliveries.find((item) => item.id === deliveryId);

      return {
        parentLabel: 'משלוחים',
        parentPath: '/deliveries',
        currentLabel: delivery ? formatOrderNumber(delivery.orderNumber) : deliveryId,
      };
    }

    if (restaurantId) {
      const restaurant = state.restaurants.find((item) => item.id === restaurantId);

      return {
        parentLabel: 'מסעדות',
        parentPath: '/restaurants',
        currentLabel: restaurant?.name ?? restaurantId,
      };
    }

    if (courierId) {
      const courier = state.couriers.find((item) => item.id === courierId);

      return {
        parentLabel: 'שליחים',
        parentPath: '/couriers',
        currentLabel: courier?.name ?? courierId,
      };
    }

    if (customerId) {
      return {
        parentLabel: 'לקוחות',
        parentPath: '/customers',
        currentLabel: customerId,
      };
    }

    if (location.pathname === '/design-system/playground') {
      return {
        parentLabel: 'מערכת עיצוב',
        parentPath: '/design-system',
        currentLabel: 'פלייגראונד',
      };
    }

    return null;
  })();

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handlePageMenuAction = () => {
    if (!pageMenuAction) return;
    emitAppTopBarAction(pageMenuAction.action);
    setIsMenuOpen(false);
  };

  return (
    <header
      dir="rtl"
      className="relative flex h-12 shrink-0 items-center border-b border-app-nav-border bg-app-background px-3 text-app-text md:h-14 md:px-5"
    >
      <div className="pointer-events-none absolute inset-x-[128px] flex justify-center sm:inset-x-[148px] md:inset-x-0">
        {topBarBreadcrumb ? (
          <nav
            aria-label="ניווט פנימי"
            className="pointer-events-auto flex h-5 max-w-full min-w-0 items-center gap-2 text-sm leading-5 md:max-w-[42vw]"
          >
            <button
              type="button"
              onClick={() => navigate(topBarBreadcrumb.parentPath)}
              className="inline-flex h-5 min-w-0 max-w-full items-center truncate border-b border-transparent text-sm font-medium leading-5 text-app-text-secondary transition-colors hover:border-app-text-secondary focus-visible:rounded-[3px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-app-border"
            >
              {topBarBreadcrumb.parentLabel}
            </button>
            <span className="shrink-0 text-app-text-secondary/60" dir="ltr">/</span>
            <span className="min-w-0 truncate font-semibold leading-5 text-app-text" dir="auto">
              {topBarBreadcrumb.currentLabel}
            </span>
          </nav>
        ) : (
          <div className="max-w-full truncate text-sm font-semibold text-app-text md:max-w-[42vw]">
            {pageTitle}
          </div>
        )}
      </div>

      <div ref={menuRef} className="relative mr-auto">
        <button
          type="button"
          onClick={() => setIsMenuOpen((value) => !value)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--app-radius-sm)] text-app-text-secondary transition-colors hover:bg-app-nav-hover-bg hover:text-app-text"
          aria-label="אפשרויות"
          aria-expanded={isMenuOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {isMenuOpen ? (
          <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[var(--app-radius-md)] border border-app-border bg-app-surface text-right shadow-[var(--app-shadow-panel)]">
            {pageMenuAction ? (
              <>
                <button
                  type="button"
                  onClick={handlePageMenuAction}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-app-text transition-colors hover:bg-app-surface-raised"
                >
                  {pageMenuAction.icon}
                  <span>{pageMenuAction.label}</span>
                </button>
                <div className="mx-2 border-t border-app-border" />
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-app-text transition-colors hover:bg-app-surface-raised"
            >
              <MessageSquare className="h-4 w-4 text-app-text-secondary" />
              <span>שליחת פידבק</span>
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
