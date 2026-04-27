import React from 'react';
import { Bike, Clock3, Package, Phone, Star, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';

import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import type { Courier, Delivery } from '../types/delivery.types';

type CouriersVercelListProps = {
  couriers: Courier[];
  selectedIds: Set<string>;
  activeDeliveriesByCourier: Map<string, Delivery>;
  deliveriesCountByCourierInPeriod: Map<string, number>;
  onToggleSelect: (courierId: string) => void;
  onOpenActionsMenu: (
    courier: Courier,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  onOpenContextMenu: (
    courier: Courier,
    event: React.MouseEvent<HTMLDivElement>,
  ) => void;
  emptyState: React.ReactNode;
  selectionBar?: React.ReactNode;
};

const rowGridClass =
  'grid grid-cols-[44px_minmax(220px,1.15fr)_minmax(132px,0.7fr)_minmax(132px,0.7fr)_minmax(220px,1.15fr)_minmax(160px,0.8fr)_minmax(112px,0.55fr)_44px]';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const getOrderNumber = (delivery: Delivery) =>
  delivery.orderNumber.startsWith('#') ? delivery.orderNumber : `#${delivery.orderNumber}`;

const getStatusMeta = (courier: Courier) => {
  if (courier.status === 'available') {
    return {
      label: 'זמין',
      dot: 'bg-green-500',
      chip: 'border-green-500/35 bg-green-500/10 text-green-400',
    };
  }

  if (courier.status === 'busy') {
    return {
      label: 'בתפוסה',
      dot: 'bg-yellow-500',
      chip: 'border-yellow-500/35 bg-yellow-500/10 text-yellow-400',
    };
  }

  return {
    label: 'לא מחובר',
    dot: 'bg-zinc-500',
    chip: 'border-zinc-500/35 bg-zinc-500/10 text-zinc-300',
  };
};

const CourierRowCheckbox: React.FC<{
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

const CourierVercelRow: React.FC<{
  courier: Courier;
  currentDelivery: Delivery | null;
  deliveriesCount: number;
  isSelected: boolean;
  onToggleSelect: (courierId: string) => void;
  onOpenActionsMenu: CouriersVercelListProps['onOpenActionsMenu'];
  onOpenContextMenu: CouriersVercelListProps['onOpenContextMenu'];
}> = ({
  courier,
  currentDelivery,
  deliveriesCount,
  isSelected,
  onToggleSelect,
  onOpenActionsMenu,
  onOpenContextMenu,
}) => {
  const navigate = useNavigate();
  const statusMeta = getStatusMeta(courier);
  const shiftLabel = courier.isOnShift ? 'במשמרת' : 'לא במשמרת';
  const deliveryLabel = currentDelivery ? getOrderNumber(currentDelivery) : '-';
  const deliveryMeta = currentDelivery ? currentDelivery.rest_name || currentDelivery.restaurantName : 'ללא משלוח פעיל';

  const navigateToCourier = () => {
    navigate(`/courier/${courier.id}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={navigateToCourier}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigateToCourier();
        }
      }}
      onContextMenu={(event) => onOpenContextMenu(courier, event)}
      className={joinClassNames(
        rowGridClass,
        'group min-w-[1080px] cursor-pointer border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors hover:bg-app-surface-raised focus-visible:bg-app-surface-raised',
        isSelected && 'bg-app-surface-raised',
      )}
    >
      <CourierRowCheckbox
        checked={isSelected}
        onChange={() => onToggleSelect(courier.id)}
        label={`בחר שליח ${courier.name}`}
      />

      <div className="flex min-h-[58px] min-w-0 items-center gap-3 px-3 py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-app-nav-border bg-app-surface-raised text-app-text">
          <UserRound className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-app-text">{courier.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-app-text-secondary">
            <Star className="h-3.5 w-3.5" />
            <span>{courier.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-[58px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={joinClassNames('h-2 w-2 rounded-full', statusMeta.dot)} />
          <span className="truncate text-xs font-semibold text-app-text">{statusMeta.label}</span>
        </div>
        <span className={joinClassNames('mt-1 w-fit rounded-md border px-2 py-0.5 text-[11px] font-semibold', statusMeta.chip)}>
          {statusMeta.label}
        </span>
      </div>

      <div className="flex min-h-[58px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="truncate text-sm font-semibold text-app-text">{shiftLabel}</div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-app-text-secondary">
          <Clock3 className="h-3.5 w-3.5" />
          <span>{courier.isOnShift ? 'פעיל' : 'כבוי'}</span>
        </div>
      </div>

      <div className="flex min-h-[58px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="truncate text-sm font-semibold text-app-text">{deliveryLabel}</div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-app-text-secondary">
          <Package className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{deliveryMeta}</span>
        </div>
      </div>

      <div className="flex min-h-[58px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="truncate text-sm font-semibold text-app-text">{courier.vehicleType}</div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-app-text-secondary">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate" dir="ltr">{courier.phone}</span>
        </div>
      </div>

      <div className="flex min-h-[58px] min-w-0 flex-col justify-center px-3 py-2">
        <div className="text-sm font-semibold text-app-text">{deliveriesCount}</div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-app-text-secondary">
          <Bike className="h-3.5 w-3.5" />
          <span>משלוחים</span>
        </div>
      </div>

      <div className="flex min-h-[58px] items-center justify-center px-1" onClick={(event) => event.stopPropagation()}>
        <EntityRowActionTrigger
          onClick={(event) => onOpenActionsMenu(courier, event)}
          title={`פעולות שליח ${courier.name}`}
        />
      </div>
    </div>
  );
};

export const CouriersVercelList: React.FC<CouriersVercelListProps> = ({
  couriers,
  selectedIds,
  activeDeliveriesByCourier,
  deliveriesCountByCourierInPeriod,
  onToggleSelect,
  onOpenActionsMenu,
  onOpenContextMenu,
  emptyState,
  selectionBar,
}) => {
  if (couriers.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-app-background">
        <div className="bg-app-background">{emptyState}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-app-background">
      <div className="resource-list-scroll min-h-0 flex-1 overflow-auto px-3" dir="ltr">
        <div className="min-w-[1080px] overflow-hidden border border-app-nav-border" dir="rtl">
          {couriers.map((courier) => (
            <CourierVercelRow
              key={courier.id}
              courier={courier}
              currentDelivery={activeDeliveriesByCourier.get(courier.id) ?? null}
              deliveriesCount={deliveriesCountByCourierInPeriod.get(courier.id) ?? 0}
              isSelected={selectedIds.has(courier.id)}
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
