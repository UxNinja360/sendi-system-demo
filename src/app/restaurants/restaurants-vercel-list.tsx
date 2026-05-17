import React, { useLayoutEffect, useRef } from 'react';
import { Package, Plus, Store, UserRound } from 'lucide-react';

import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import type { EntityViewMode } from '../components/common/view-mode-toggle';
import { SENDI_PLUS_LABEL, isSendiPlusRestaurant } from '../utils/sendi-plus';
import { RestaurantLogoMark } from './restaurant-logo-mark';

export type RestaurantVercelListItem = {
  restaurantId: string;
  name: string;
  logoUrl?: string;
  status: string;
  isActive: boolean;
  totalDeliveries: number;
  contactPerson: string;
  ownerPhone: string;
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
  'restaurant-vercel-row grid grid-cols-[minmax(0,1fr)_44px] md:grid-cols-[minmax(280px,420px)_minmax(128px,156px)_minmax(74px,96px)_36px] xl:grid-cols-[minmax(300px,460px)_minmax(132px,164px)_minmax(80px,104px)_36px] 2xl:grid-cols-[minmax(320px,500px)_minmax(140px,176px)_minmax(84px,112px)_36px]';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const getRestaurantStatusMeta = (restaurant: RestaurantVercelListItem) => ({
  label: restaurant.status,
  text: restaurant.isActive ? 'text-app-success-text' : 'text-app-text-secondary',
});

const SendiPlusTag: React.FC = () => (
  <span className="sendi-plus-mark sendi-plus-mark--active" aria-hidden="true">
    <span className="sendi-plus-mark__inner">
      <Plus className="h-2.5 w-2.5 text-white" strokeWidth={2.65} />
    </span>
  </span>
);

const RestaurantSourceBadge: React.FC<{ isSendiGo: boolean }> = ({ isSendiGo }) => {
  return (
    <span
      className={joinClassNames(
        'inline-flex min-w-0 items-center gap-1.5 text-sm font-normal',
        isSendiGo ? 'text-[#0a84ff] dark:text-[#38bdf8]' : 'text-app-text-secondary',
      )}
      dir="rtl"
    >
      <span className="truncate">{isSendiGo ? SENDI_PLUS_LABEL : 'מסעדה רגילה'}</span>
      {!isSendiGo ? (
        <Store className="h-3.5 w-3.5 shrink-0" />
      ) : null}
    </span>
  );
};

const RestaurantVercelRow: React.FC<{
  restaurant: RestaurantVercelListItem;
  onOpenActionsMenu: RestaurantsVercelListProps['onOpenActionsMenu'];
  onOpenContextMenu: RestaurantsVercelListProps['onOpenContextMenu'];
}> = ({
  restaurant,
  onOpenActionsMenu,
  onOpenContextMenu,
}) => {
  const address = [restaurant.street, restaurant.city].filter(Boolean).join(', ') || '-';
  const footerStatusText = restaurant.isActive ? 'מסעדה פעילה' : 'מסעדה לא פעילה';
  const footerStatusDotClassName = restaurant.isActive ? 'bg-app-success-text' : 'bg-app-text-secondary';
  const isSendiGo = isSendiPlusRestaurant(restaurant.name, restaurant.chainId);

  return (
    <div
      onContextMenu={(event) => onOpenContextMenu(restaurant, event)}
      className={joinClassNames(
        rowGridClass,
        'group relative w-full min-w-0 border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors hover:bg-app-surface-raised',
      )}
    >
      <div className="restaurant-row__identity col-start-1 row-start-1 flex min-h-0 min-w-0 items-center gap-3 px-2 py-3 md:col-auto md:row-auto md:min-h-[72px] md:py-2">
        <RestaurantLogoMark name={restaurant.name} logoUrl={restaurant.logoUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="truncate text-sm font-semibold text-app-text">{restaurant.name}</div>
            {isSendiGo ? <SendiPlusTag /> : null}
          </div>
          <div className="mt-1 truncate text-sm font-normal text-app-text-secondary">{address}</div>
        </div>
      </div>

      <div className="restaurant-row__status col-start-1 row-start-2 hidden min-h-0 min-w-0 items-center px-2 py-1 text-sm font-normal text-app-text-secondary md:col-start-2 md:row-auto md:flex md:min-h-[72px] md:py-2">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className={joinClassNames('h-2 w-2 shrink-0 rounded-full', footerStatusDotClassName)} />
          <span className="truncate">{footerStatusText}</span>
        </span>
      </div>

      <div className="restaurant-row__deliveries hidden min-h-0 min-w-0 items-center px-2 text-sm font-normal text-app-text-secondary md:col-start-3 md:flex md:min-h-[72px]">
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          <span className="tabular-nums">{restaurant.totalDeliveries}</span>
        </span>
      </div>

      <div className="restaurant-row__actions col-start-2 row-start-1 flex min-h-0 items-start justify-center px-1 py-3 md:col-auto md:row-auto md:min-h-[72px] md:items-center md:py-0" onClick={(event) => event.stopPropagation()}>
        <EntityRowActionTrigger
          onClick={(event) => onOpenActionsMenu(restaurant, event)}
          title={`פעולות מסעדה ${restaurant.name}`}
        />
      </div>

      <div className="restaurant-row__footer hidden min-h-0 items-center justify-between gap-3 text-sm font-normal text-app-text-secondary md:hidden">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className={joinClassNames('h-2 w-2 shrink-0 rounded-full', footerStatusDotClassName)} />
          <span className="truncate">{footerStatusText}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          <span className="tabular-nums">{restaurant.totalDeliveries}</span>
        </span>
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
  const address = [restaurant.street, restaurant.city].filter(Boolean).join(', ') || '-';
  const statusMeta = getRestaurantStatusMeta(restaurant);
  const isSendiGo = isSendiPlusRestaurant(restaurant.name, restaurant.chainId);

  return (
    <div
      onContextMenu={(event) => onOpenContextMenu(restaurant, event)}
      className={joinClassNames(
        'group min-w-0 rounded-lg border border-app-nav-border bg-app-surface p-3 text-app-text outline-none transition-colors hover:bg-app-surface-raised',
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <RestaurantLogoMark name={restaurant.name} logoUrl={restaurant.logoUrl} size="md" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="truncate text-sm font-semibold text-app-text">{restaurant.name}</div>
                {isSendiGo ? <SendiPlusTag /> : null}
              </div>
              <span className={joinClassNames('shrink-0 text-sm font-semibold', statusMeta.text)}>
                {statusMeta.label}
              </span>
            </div>
            <div className="mt-1 truncate text-xs text-app-text-secondary">{address}</div>
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
          <div className="flex items-center gap-1.5 text-[11px] text-app-text-secondary">
            <UserRound className="h-3.5 w-3.5 shrink-0" />
            <span>בעלים</span>
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-app-text">{restaurant.contactPerson || '-'}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-app-text-secondary">טלפון בעלים</div>
          <div className="mt-1 truncate text-sm font-semibold text-app-text" dir="ltr">{restaurant.ownerPhone || '-'}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-app-nav-border pt-3 text-xs text-app-text-secondary">
        <span />
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
        <div className="restaurant-vercel-list-frame w-full min-w-0 overflow-visible border border-app-nav-border md:overflow-hidden" dir="rtl">
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
