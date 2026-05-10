import React, { useLayoutEffect, useRef } from 'react';
import { Package, Star } from 'lucide-react';
import { useNavigate } from 'react-router';

import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import type { EntityViewMode } from '../components/common/view-mode-toggle';
import type { Courier, Delivery } from '../types/delivery.types';
import { formatOrderNumber } from '../utils/order-number';
import { CourierAvatarMark } from './courier-avatar-mark';

type CouriersVercelListProps = {
  couriers: Courier[];
  viewMode?: EntityViewMode;
  activeDeliveriesByCourier: Map<string, Delivery>;
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
  'grid grid-cols-[minmax(0,1fr)_44px] md:grid-cols-[minmax(140px,220px)_minmax(112px,150px)_minmax(96px,140px)_minmax(0,1fr)_52px_36px] xl:grid-cols-[minmax(160px,240px)_minmax(124px,164px)_minmax(112px,150px)_minmax(0,1fr)_52px_36px] 2xl:grid-cols-[minmax(180px,260px)_minmax(132px,176px)_minmax(124px,164px)_minmax(0,1fr)_56px_36px]';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const getConnectionMeta = (courier: Courier) => {
  const isConnected = courier.status !== 'offline';

  return {
    label: isConnected ? '\u05de\u05d7\u05d5\u05d1\u05e8' : '\u05dc\u05d0 \u05de\u05d7\u05d5\u05d1\u05e8',
    text: isConnected ? 'text-app-success-text' : 'text-app-text-secondary',
  };
};

const getShiftMeta = (courier: Courier) => {
  const isOnShift = courier.isOnShift;

  return {
    label: isOnShift ? '\u05d1\u05de\u05e9\u05de\u05e8\u05ea' : '\u05dc\u05d0 \u05d1\u05de\u05e9\u05de\u05e8\u05ea',
    text: isOnShift ? 'text-app-text' : 'text-app-text-secondary',
  };
};

const CourierVercelRow: React.FC<{
  courier: Courier;
  onOpenActionsMenu: CouriersVercelListProps['onOpenActionsMenu'];
  onOpenContextMenu: CouriersVercelListProps['onOpenContextMenu'];
}> = ({
  courier,
  onOpenActionsMenu,
  onOpenContextMenu,
}) => {
  const navigate = useNavigate();
  const connectionMeta = getConnectionMeta(courier);
  const shiftMeta = getShiftMeta(courier);

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
        'group relative w-full min-w-0 cursor-pointer border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors hover:bg-app-surface-raised focus-visible:bg-app-surface-raised',
      )}
    >
      <div className="col-start-1 row-start-1 flex min-h-0 min-w-0 items-center gap-3 px-2 py-3 md:col-auto md:row-auto md:min-h-[72px] md:py-2">
        <CourierAvatarMark name={courier.name} avatarUrl={courier.avatarUrl} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-app-text">{courier.name}</div>
          <div className="mt-1 truncate text-right text-sm font-normal text-app-text-secondary" dir="ltr">
            {courier.phone || '-'}
          </div>
        </div>
      </div>

      <div className="col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:py-2">
        <span className={joinClassNames('truncate text-sm font-semibold', connectionMeta.text)}>
          {connectionMeta.label}
        </span>
        <div className={joinClassNames('mt-1 truncate text-sm font-normal', shiftMeta.text)}>
          {shiftMeta.label}
        </div>
      </div>

      <div className="col-start-1 row-start-3 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:py-2">
        <div className="truncate text-sm font-semibold text-app-text">{courier.vehicleType}</div>
      </div>

      <div className="hidden min-h-0 min-w-0 md:block" aria-hidden="true" />

      <div className="col-start-1 row-start-4 flex min-h-0 items-center justify-start px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:justify-center md:px-3 md:py-2">
        <div className="flex items-center gap-1.5 text-sm font-normal text-app-text-secondary">
          <Star className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">{courier.rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="col-start-2 row-start-1 flex min-h-0 items-start justify-center px-1 py-3 md:col-auto md:row-auto md:min-h-[72px] md:items-center md:py-0" onClick={(event) => event.stopPropagation()}>
        <EntityRowActionTrigger
          onClick={(event) => onOpenActionsMenu(courier, event)}
          title={`פעולות שליח ${courier.name}`}
        />
      </div>
    </div>
  );
};

const CourierVercelCard: React.FC<{
  courier: Courier;
  currentDelivery: Delivery | null;
  onOpenActionsMenu: CouriersVercelListProps['onOpenActionsMenu'];
  onOpenContextMenu: CouriersVercelListProps['onOpenContextMenu'];
}> = ({
  courier,
  currentDelivery,
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
        'group min-w-0 cursor-pointer rounded-lg border border-app-nav-border bg-app-surface p-3 text-app-text outline-none transition-colors hover:bg-app-surface-raised focus-visible:bg-app-surface-raised',
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <CourierAvatarMark name={courier.name} avatarUrl={courier.avatarUrl} size="md" className="mt-0.5" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-app-text">{courier.name}</div>
            <div className="mt-1 truncate text-right text-xs text-app-text-secondary" dir="ltr">
              {courier.phone || '-'}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <EntityRowActionTrigger
            onClick={(event) => onOpenActionsMenu(courier, event)}
            title={`פעולות שליח ${courier.name}`}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-app-text-secondary">חיבור</div>
          <div className={joinClassNames('mt-1 truncate text-sm font-semibold', connectionMeta.text)}>
            {connectionMeta.label}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-app-text-secondary">משמרת</div>
          <div className={joinClassNames('mt-1 truncate text-sm font-semibold', shiftMeta.text)}>
            {shiftMeta.label}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-app-text-secondary">משלוח נוכחי</div>
          <div className="mt-1 truncate text-sm font-semibold text-app-text">{deliveryLabel}</div>
          <div className="mt-1 truncate text-xs text-app-text-secondary">{deliveryMeta}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-app-text-secondary">רכב</div>
          <div className="mt-1 truncate text-sm font-semibold text-app-text">{courier.vehicleType}</div>
          <div className="mt-1 truncate text-xs text-app-text-secondary">{courier.employmentType}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-app-nav-border pt-3 text-xs text-app-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5" />
          <span className="tabular-nums">{courier.rating.toFixed(1)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          <span className="tabular-nums">{courier.totalDeliveries}</span>
        </span>
      </div>
    </div>
  );
};

export const CouriersVercelList: React.FC<CouriersVercelListProps> = ({
  couriers,
  viewMode = 'list',
  activeDeliveriesByCourier,
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
            {couriers.map((courier) => (
              <CourierVercelCard
                key={courier.id}
                courier={courier}
                currentDelivery={activeDeliveriesByCourier.get(courier.id) ?? null}
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
        <div className="w-full min-w-0 overflow-visible border border-app-nav-border md:overflow-hidden" dir="rtl">
          {couriers.map((courier) => (
            <CourierVercelRow
              key={courier.id}
              courier={courier}
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
