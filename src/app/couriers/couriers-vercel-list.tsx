import React, { useLayoutEffect, useRef } from 'react';
import { Clock3, Package, Phone, Star, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';

import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import type { Courier, Delivery } from '../types/delivery.types';
import { formatOrderNumber } from '../utils/order-number';

type CouriersVercelListProps = {
  couriers: Courier[];
  selectedIds: Set<string>;
  activeDeliveriesByCourier: Map<string, Delivery>;
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
  'grid grid-cols-[minmax(0,1fr)_44px] md:grid-cols-[44px_minmax(210px,1.15fr)_minmax(160px,0.75fr)_minmax(92px,0.38fr)_minmax(220px,1.15fr)_minmax(160px,0.8fr)_44px]';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const getConnectionMeta = (courier: Courier) => {
  const isConnected = courier.status !== 'offline';

  return {
    label: isConnected ? '\u05de\u05d7\u05d5\u05d1\u05e8' : '\u05dc\u05d0 \u05de\u05d7\u05d5\u05d1\u05e8',
    text: isConnected ? 'text-green-400' : 'text-zinc-400',
  };
};

const getShiftMeta = (courier: Courier) => {
  const isOnShift = courier.isOnShift;

  return {
    label: isOnShift ? '\u05d1\u05de\u05e9\u05de\u05e8\u05ea' : '\u05dc\u05d0 \u05d1\u05de\u05e9\u05de\u05e8\u05ea',
    text: isOnShift ? 'text-app-text' : 'text-app-text-secondary',
    icon: isOnShift ? 'text-green-400' : 'text-app-text-secondary',
  };
};

const CourierRowCheckbox: React.FC<{
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

const CourierVercelRow: React.FC<{
  courier: Courier;
  currentDelivery: Delivery | null;
  isSelected: boolean;
  onToggleSelect: (courierId: string) => void;
  onOpenActionsMenu: CouriersVercelListProps['onOpenActionsMenu'];
  onOpenContextMenu: CouriersVercelListProps['onOpenContextMenu'];
}> = ({
  courier,
  currentDelivery,
  isSelected,
  onToggleSelect,
  onOpenActionsMenu,
  onOpenContextMenu,
}) => {
  const navigate = useNavigate();
  const connectionMeta = getConnectionMeta(courier);
  const shiftMeta = getShiftMeta(courier);
  const deliveryLabel = currentDelivery ? formatOrderNumber(currentDelivery.orderNumber) : '-';
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
        'group relative w-full min-w-0 cursor-pointer border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors hover:bg-app-surface-raised focus-visible:bg-app-surface-raised md:min-w-[1060px]',
        isSelected && 'bg-app-surface-raised',
      )}
    >
      <CourierRowCheckbox
        checked={isSelected}
        onChange={() => onToggleSelect(courier.id)}
        label={`בחר שליח ${courier.name}`}
      />

      <div className="col-start-1 row-start-1 flex min-h-0 min-w-0 items-center gap-3 px-2 py-3 md:col-auto md:row-auto md:min-h-[58px] md:px-3 md:py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-app-nav-border bg-app-surface-raised text-app-text">
          <UserRound className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-app-text">{courier.name}</div>
        </div>
      </div>

      <div className="col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[58px] md:px-3 md:py-2">
        <span className={joinClassNames('truncate text-sm font-semibold', connectionMeta.text)}>
          {connectionMeta.label}
        </span>
        <div className="mt-1 flex min-w-0 items-center gap-1.5">
          <Clock3 className={joinClassNames('h-3.5 w-3.5 shrink-0', shiftMeta.icon)} />
          <span className={joinClassNames('truncate text-xs font-medium', shiftMeta.text)}>
            {shiftMeta.label}
          </span>
        </div>
      </div>

      <div className="col-start-1 row-start-5 flex min-h-0 items-center justify-start px-2 py-1 md:col-auto md:row-auto md:min-h-[58px] md:justify-center md:px-3 md:py-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-app-text-secondary">
          <Star className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">{courier.rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="col-start-1 row-start-3 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[58px] md:px-3 md:py-2">
        <div className="truncate text-sm font-semibold text-app-text">{deliveryLabel}</div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-app-text-secondary">
          <Package className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{deliveryMeta}</span>
        </div>
      </div>

      <div className="col-start-1 row-start-4 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[58px] md:px-3 md:py-2">
        <div className="truncate text-sm font-semibold text-app-text">{courier.vehicleType}</div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-app-text-secondary">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate" dir="ltr">{courier.phone}</span>
        </div>
      </div>

      <div className="col-start-2 row-start-1 flex min-h-0 items-start justify-center px-1 py-3 md:col-auto md:row-auto md:min-h-[58px] md:items-center md:py-0" onClick={(event) => event.stopPropagation()}>
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
  }, [couriers.length]);

  if (couriers.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-app-background">
        <div className="bg-app-background">{emptyState}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-app-background">
      <div ref={scrollContainerRef} className="resource-list-scroll min-h-0 flex-1 overflow-auto px-2 md:px-3" dir="ltr">
        <div className="w-full min-w-0 overflow-visible border border-app-nav-border md:min-w-[1060px] md:overflow-hidden" dir="rtl">
          {couriers.map((courier) => (
            <CourierVercelRow
              key={courier.id}
              courier={courier}
              currentDelivery={activeDeliveriesByCourier.get(courier.id) ?? null}
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
