import React, { useLayoutEffect, useRef } from 'react';
import { MapPin, Package, Phone, Store, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';

import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import type { EntityViewMode } from '../components/common/view-mode-toggle';

export type RestaurantVercelListItem = {
  restaurantId: string;
  name: string;
  status: string;
  isActive: boolean;
  totalDeliveries: number;
  contactPerson: string;
  phone: string;
  city: string;
  street: string;
  type: string;
  chainId: string;
};

type RestaurantsVercelListProps = {
  restaurants: RestaurantVercelListItem[];
  viewMode?: EntityViewMode;
  onOpenActionsMenu: (
    restaurant: RestaurantVercelListItem,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  onOpenContextMenu: (
    restaurant: RestaurantVercelListItem,
    event: React.MouseEvent<HTMLDivElement>,
  ) => void;
  emptyState: React.ReactNode;
  selectionBar?: React.ReactNode;
};

const rowGridClass =
  'grid grid-cols-[minmax(0,1fr)_44px] md:grid-cols-[minmax(260px,1.4fr)_minmax(140px,0.7fr)_minmax(260px,1.25fr)_minmax(180px,0.85fr)_44px]';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const getConnectionMeta = (restaurant: RestaurantVercelListItem) => ({
  label: restaurant.isActive ? 'מחובר' : 'לא מחובר',
  text: restaurant.isActive ? 'text-app-success-text' : 'text-app-text-secondary',
});

const RestaurantVercelRow: React.FC<{
  restaurant: RestaurantVercelListItem;
  onOpenActionsMenu: RestaurantsVercelListProps['onOpenActionsMenu'];
  onOpenContextMenu: RestaurantsVercelListProps['onOpenContextMenu'];
}> = ({
  restaurant,
  onOpenActionsMenu,
  onOpenContextMenu,
}) => {
  const navigate = useNavigate();
  const address = [restaurant.street, restaurant.city].filter(Boolean).join(', ') || '-';
  const connectionMeta = getConnectionMeta(restaurant);

  const navigateToRestaurant = () => {
    navigate(`/restaurant/${restaurant.restaurantId}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={navigateToRestaurant}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigateToRestaurant();
        }
      }}
      onContextMenu={(event) => onOpenContextMenu(restaurant, event)}
      className={joinClassNames(
        rowGridClass,
        'group relative w-full min-w-0 cursor-pointer border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors hover:bg-app-surface-raised focus-visible:bg-app-surface-raised md:min-w-[996px]',
      )}
    >
      <div className="col-start-1 row-start-1 flex min-h-0 min-w-0 items-center gap-3 px-2 py-3 md:col-auto md:row-auto md:min-h-[58px] md:px-3 md:py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-app-nav-border bg-app-surface-raised text-app-text">
          <Store className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-app-text">{restaurant.name}</div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-app-text-secondary">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{address}</span>
          </div>
        </div>
      </div>

      <div className="col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[58px] md:px-3 md:py-2">
        <div className="truncate text-sm font-semibold text-app-text">{restaurant.type}</div>
        {restaurant.chainId && restaurant.chainId !== '-' && (
          <div className="mt-1 truncate text-xs text-app-text-secondary">{restaurant.chainId}</div>
        )}
      </div>

      <div className="col-start-1 row-start-3 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[58px] md:px-3 md:py-2">
        <div className={joinClassNames('truncate text-sm font-semibold', connectionMeta.text)}>
          {connectionMeta.label}
        </div>
        <div className="mt-1 truncate text-xs text-app-text-secondary">{restaurant.status}</div>
      </div>

      <div className="col-start-1 row-start-4 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[58px] md:px-3 md:py-2">
        <div className="truncate text-sm font-semibold text-app-text">{restaurant.contactPerson || '-'}</div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-app-text-secondary">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate" dir="ltr">
            {restaurant.phone || '-'}
          </span>
        </div>
      </div>

      <div className="col-start-2 row-start-1 flex min-h-0 items-start justify-center px-1 py-3 md:col-auto md:row-auto md:min-h-[58px] md:items-center md:py-0" onClick={(event) => event.stopPropagation()}>
        <EntityRowActionTrigger
          onClick={(event) => onOpenActionsMenu(restaurant, event)}
          title={`פעולות מסעדה ${restaurant.name}`}
        />
      </div>
    </div>
  );
};

const RestaurantVercelCard: React.FC<{
  restaurant: RestaurantVercelListItem;
  onOpenActionsMenu: RestaurantsVercelListProps['onOpenActionsMenu'];
  onOpenContextMenu: RestaurantsVercelListProps['onOpenContextMenu'];
}> = ({
  restaurant,
  onOpenActionsMenu,
  onOpenContextMenu,
}) => {
  const navigate = useNavigate();
  const address = [restaurant.street, restaurant.city].filter(Boolean).join(', ') || '-';
  const connectionMeta = getConnectionMeta(restaurant);

  const navigateToRestaurant = () => {
    navigate(`/restaurant/${restaurant.restaurantId}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={navigateToRestaurant}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigateToRestaurant();
        }
      }}
      onContextMenu={(event) => onOpenContextMenu(restaurant, event)}
      className={joinClassNames(
        'group min-w-0 cursor-pointer rounded-lg border border-app-nav-border bg-app-surface p-3 text-app-text outline-none transition-colors hover:bg-app-surface-raised focus-visible:bg-app-surface-raised',
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-app-nav-border bg-app-surface-raised text-app-text">
            <Store className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-app-text">{restaurant.name}</div>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-app-text-secondary">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <EntityRowActionTrigger
            onClick={(event) => onOpenActionsMenu(restaurant, event)}
            title={`פעולות מסעדה ${restaurant.name}`}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-app-text-secondary">סוג</div>
          <div className="mt-1 truncate text-sm font-semibold text-app-text">{restaurant.type || '-'}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-app-text-secondary">חיבור</div>
          <div className={joinClassNames('mt-1 truncate text-sm font-semibold', connectionMeta.text)}>
            {connectionMeta.label}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-app-text-secondary">
            <UserRound className="h-3.5 w-3.5 shrink-0" />
            <span>איש קשר</span>
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-app-text">{restaurant.contactPerson || '-'}</div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-app-text-secondary">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>טלפון</span>
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-app-text" dir="ltr">{restaurant.phone || '-'}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-app-nav-border pt-3 text-xs text-app-text-secondary">
        <span>{restaurant.status}</span>
        <span className="inline-flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          <span className="tabular-nums">{restaurant.totalDeliveries}</span>
        </span>
      </div>
    </div>
  );
};

export const RestaurantsVercelList: React.FC<RestaurantsVercelListProps> = ({
  restaurants,
  viewMode = 'list',
  onOpenActionsMenu,
  onOpenContextMenu,
  emptyState,
  selectionBar,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return undefined;

    const alignToRtlStartEdge = () => {
      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      if (maxScrollLeft <= 0) return;
      element.scrollLeft = maxScrollLeft;
    };

    const animationFrame = window.requestAnimationFrame(alignToRtlStartEdge);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(alignToRtlStartEdge);

    resizeObserver?.observe(element);
    if (element.firstElementChild) {
      resizeObserver?.observe(element.firstElementChild);
    }
    window.addEventListener('resize', alignToRtlStartEdge);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', alignToRtlStartEdge);
    };
  }, [restaurants.length]);

  if (restaurants.length === 0) {
    return (
      <div data-view-mode={viewMode} className="flex min-h-0 flex-1 flex-col bg-app-background">
        <div className="bg-app-background">{emptyState}</div>
      </div>
    );
  }

  if (viewMode === 'cards') {
    return (
      <div data-view-mode="cards" className="flex min-h-0 flex-1 flex-col bg-app-background">
        <div className="resource-list-scroll min-h-0 flex-1 overflow-auto px-2 pb-3 md:px-3" dir="rtl">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {restaurants.map((restaurant) => (
              <RestaurantVercelCard
                key={restaurant.restaurantId}
                restaurant={restaurant}
                onOpenActionsMenu={onOpenActionsMenu}
                onOpenContextMenu={onOpenContextMenu}
              />
            ))}
          </div>
        </div>
        {selectionBar}
      </div>
    );
  }

  return (
    <div data-view-mode="list" className="flex min-h-0 flex-1 flex-col bg-app-background">
      <div ref={scrollContainerRef} className="resource-list-scroll min-h-0 flex-1 overflow-auto px-2 md:px-3" dir="ltr">
        <div className="w-full min-w-0 overflow-visible border border-app-nav-border md:min-w-[996px] md:overflow-hidden" dir="rtl">
          {restaurants.map((restaurant) => (
            <RestaurantVercelRow
              key={restaurant.restaurantId}
              restaurant={restaurant}
              onOpenActionsMenu={onOpenActionsMenu}
              onOpenContextMenu={onOpenContextMenu}
            />
          ))}
        </div>
      </div>
      {selectionBar}
    </div>
  );
};
