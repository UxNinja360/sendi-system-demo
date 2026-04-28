import React, { useLayoutEffect, useRef } from 'react';
import { MapPin, Phone, Store } from 'lucide-react';
import { useNavigate } from 'react-router';

import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';

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
  selectedIds: Set<string>;
  onToggleSelect: (restaurantId: string) => void;
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
  'grid grid-cols-[minmax(0,1fr)_44px] md:grid-cols-[44px_minmax(260px,1.4fr)_minmax(140px,0.7fr)_minmax(260px,1.25fr)_minmax(180px,0.85fr)_44px]';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const getConnectionMeta = (restaurant: RestaurantVercelListItem) => ({
  label: restaurant.isActive ? 'מחובר' : 'לא מחובר',
  text: restaurant.isActive ? 'text-green-400' : 'text-zinc-400',
});

const RestaurantRowCheckbox: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}> = ({ checked, onChange, label, className }) => (
  <label
    className={joinClassNames(
      'absolute left-11 top-4 z-20 flex h-6 w-6 items-center justify-center rounded bg-app-surface/90 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100 md:static md:h-full md:w-auto md:bg-transparent md:opacity-100 md:transition-none',
      checked && 'opacity-100',
      className,
    )}
    onClick={(event) => event.stopPropagation()}
  >
    <span className="sr-only">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer rounded border-[#404040] bg-transparent accent-[#ededed] focus:ring-1 focus:ring-[#ededed] focus:ring-offset-0"
    />
  </label>
);

const RestaurantVercelRow: React.FC<{
  restaurant: RestaurantVercelListItem;
  isSelected: boolean;
  onToggleSelect: (restaurantId: string) => void;
  onOpenActionsMenu: RestaurantsVercelListProps['onOpenActionsMenu'];
  onOpenContextMenu: RestaurantsVercelListProps['onOpenContextMenu'];
}> = ({
  restaurant,
  isSelected,
  onToggleSelect,
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
        'group relative w-full min-w-0 cursor-pointer border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors hover:bg-app-surface-raised focus-visible:bg-app-surface-raised md:min-w-[1040px]',
        isSelected && 'bg-app-surface-raised',
      )}
    >
      <RestaurantRowCheckbox
        checked={isSelected}
        onChange={() => onToggleSelect(restaurant.restaurantId)}
        label={`בחר מסעדה ${restaurant.name}`}
      />

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
        <div className="mt-1 truncate text-xs text-app-text-secondary">{restaurant.chainId || '-'}</div>
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

export const RestaurantsVercelList: React.FC<RestaurantsVercelListProps> = ({
  restaurants,
  selectedIds,
  onToggleSelect,
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
      <div className="flex min-h-0 flex-1 flex-col bg-app-background">
        <div className="bg-app-background">{emptyState}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-app-background">
      <div ref={scrollContainerRef} className="resource-list-scroll min-h-0 flex-1 overflow-auto px-2 md:px-3" dir="ltr">
        <div className="w-full min-w-0 overflow-visible border border-app-nav-border md:min-w-[1040px] md:overflow-hidden" dir="rtl">
          {restaurants.map((restaurant) => (
            <RestaurantVercelRow
              key={restaurant.restaurantId}
              restaurant={restaurant}
              isSelected={selectedIds.has(restaurant.restaurantId)}
              onToggleSelect={onToggleSelect}
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
