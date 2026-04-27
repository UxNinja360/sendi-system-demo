import React from 'react';
import { MapPin, Phone, Store, UserRound } from 'lucide-react';
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
  'grid grid-cols-[44px_minmax(260px,1.4fr)_minmax(140px,0.7fr)_minmax(260px,1.25fr)_minmax(180px,0.85fr)_minmax(120px,0.55fr)_44px]';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const RestaurantRowCheckbox: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <label
    className="flex h-full items-center justify-center"
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
        'group min-w-[1040px] cursor-pointer border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors hover:bg-app-surface-raised focus-visible:bg-app-surface-raised',
        isSelected && 'bg-app-surface-raised',
      )}
    >
      <RestaurantRowCheckbox
        checked={isSelected}
        onChange={() => onToggleSelect(restaurant.restaurantId)}
        label={`בחר מסעדה ${restaurant.name}`}
      />

      <div className="flex min-h-[58px] min-w-0 items-center gap-3 px-3 py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-app-nav-border bg-app-surface-raised text-app-text">
          <Store className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-app-text">{restaurant.name}</div>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-app-text-secondary">
            <span className="truncate">{restaurant.type}</span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-app-text-secondary" />
            <span className="truncate">{restaurant.chainId}</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-[58px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={joinClassNames(
              'h-2 w-2 rounded-full',
              restaurant.isActive ? 'bg-green-500' : 'bg-zinc-500',
            )}
          />
          <span className="truncate text-xs font-semibold text-app-text">
            {restaurant.status}
          </span>
        </div>
        <span
          className={joinClassNames(
            'mt-1 w-fit rounded-md border px-2 py-0.5 text-[11px] font-semibold',
            restaurant.isActive
              ? 'border-green-500/35 bg-green-500/10 text-green-400'
              : 'border-zinc-500/35 bg-zinc-500/10 text-zinc-300',
          )}
        >
          {restaurant.isActive ? 'פעיל' : 'לא פעיל'}
        </span>
      </div>

      <div className="flex min-h-[58px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="truncate text-sm font-semibold text-app-text">{address}</div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-app-text-secondary">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{restaurant.city || '-'}</span>
        </div>
      </div>

      <div className="flex min-h-[58px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="truncate text-sm font-semibold text-app-text">{restaurant.contactPerson || '-'}</div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-app-text-secondary">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate" dir="ltr">{restaurant.phone || '-'}</span>
        </div>
      </div>

      <div className="flex min-h-[58px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-app-text">
          <span>{restaurant.totalDeliveries}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-app-text-secondary">
          <UserRound className="h-3.5 w-3.5" />
          <span>משלוחים</span>
        </div>
      </div>

      <div className="flex min-h-[58px] items-center justify-center px-1" onClick={(event) => event.stopPropagation()}>
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
  if (restaurants.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-app-background">
        <div className="bg-app-background">{emptyState}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-app-background">
      <div className="resource-list-scroll min-h-0 flex-1 overflow-auto px-3" dir="ltr">
        <div className="min-w-[1040px] overflow-hidden border border-app-nav-border" dir="rtl">
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
