import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Package, Star } from 'lucide-react';

import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import { AppTooltip } from '../components/common/app-tooltip';
import { Toggle } from '../components/common/toggle';
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
  onTogglePower: (courier: Courier) => void;
  emptyState: React.ReactNode;
  selectionBar?: React.ReactNode;
};

const rowGridClass =
  'courier-vercel-row grid grid-cols-[minmax(0,1fr)_44px] md:grid-cols-[minmax(180px,260px)_minmax(104px,136px)_minmax(112px,150px)_minmax(96px,140px)_minmax(84px,116px)_minmax(96px,132px)_minmax(0,1fr)_minmax(64px,84px)_36px] xl:grid-cols-[minmax(200px,280px)_minmax(112px,144px)_minmax(124px,164px)_minmax(112px,150px)_minmax(96px,124px)_minmax(104px,140px)_minmax(0,1fr)_minmax(68px,88px)_36px] 2xl:grid-cols-[minmax(220px,300px)_minmax(120px,152px)_minmax(132px,176px)_minmax(124px,164px)_minmax(104px,132px)_minmax(112px,148px)_minmax(0,1fr)_minmax(72px,92px)_36px]';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

type DateValue = Date | string | number | null | undefined;

const toDate = (value: DateValue) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatElapsedDuration = (value: DateValue, now: number) => {
  const date = toDate(value);
  if (!date) return '-';

  const totalSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (totalSeconds < 60) return `${totalSeconds} שנ׳`;

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} דק׳`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours} שע׳ ${minutes} דק׳` : `${hours} שע׳`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days} ימ׳ ${remainingHours} שע׳` : `${days} ימ׳`;
};

const getConnectionMeta = (courier: Courier) => {
  const isConnected = courier.status !== 'offline';

  return {
    label: isConnected ? '\u05de\u05d7\u05d5\u05d1\u05e8' : '\u05dc\u05d0 \u05de\u05d7\u05d5\u05d1\u05e8',
    dot: isConnected ? 'bg-[#50e3c2]' : 'bg-app-text-muted',
    text: isConnected ? 'text-app-text' : 'text-app-text-secondary',
  };
};

const getShiftMeta = (courier: Courier) => {
  const isOnShift = courier.isOnShift;

  return {
    label: isOnShift ? '\u05d1\u05de\u05e9\u05de\u05e8\u05ea' : '\u05dc\u05d0 \u05d1\u05de\u05e9\u05de\u05e8\u05ea',
    isActive: isOnShift,
    startedAt: isOnShift ? courier.shiftStartedAt : null,
    dot: isOnShift ? 'bg-[#50e3c2]' : 'bg-app-text-muted',
    text: 'text-app-text-secondary',
  };
};

const CourierLiveStatus: React.FC<{
  label: string;
  isActive: boolean;
  startedAt: DateValue;
  textClassName: string;
  now: number;
}> = ({ label, isActive, startedAt, textClassName, now }) => {
  const elapsedLabel = isActive ? formatElapsedDuration(startedAt, now) : '';
  const displayLabel = elapsedLabel && elapsedLabel !== '-' ? `${label} ${elapsedLabel}` : label;

  return (
    <div className="min-w-0 text-right">
      <div className="flex min-w-0 items-center justify-start">
        <span className={joinClassNames('min-w-0 truncate text-sm font-normal tabular-nums', textClassName)}>
          {displayLabel}
        </span>
      </div>
    </div>
  );
};

const CourierDeliveryCount: React.FC<{ count: number; className?: string }> = ({ count, className }) => (
  <div className={joinClassNames('flex items-center gap-1.5 whitespace-nowrap text-sm font-normal text-app-text-secondary', className)}>
    <Package className="h-3.5 w-3.5 shrink-0" />
    <span className="tabular-nums">{count}</span>
  </div>
);

const CourierRating: React.FC<{ rating: number; className?: string }> = ({ rating, className }) => (
  <div className={joinClassNames('flex items-center gap-1.5 text-sm font-normal text-app-text-secondary', className)}>
    <Star className="h-3.5 w-3.5 shrink-0" />
    <span className="tabular-nums">{rating.toFixed(1)}</span>
  </div>
);

const CourierVercelRow: React.FC<{
  courier: Courier;
  now: number;
  onOpenActionsMenu: CouriersVercelListProps['onOpenActionsMenu'];
  onOpenContextMenu: CouriersVercelListProps['onOpenContextMenu'];
  onTogglePower: CouriersVercelListProps['onTogglePower'];
}> = ({
  courier,
  now,
  onOpenActionsMenu,
  onOpenContextMenu,
  onTogglePower,
}) => {
  const connectionMeta = getConnectionMeta(courier);
  const shiftMeta = getShiftMeta(courier);
  const isConnected = courier.status !== 'offline';

  return (
    <div
      onContextMenu={(event) => onOpenContextMenu(courier, event)}
      className={joinClassNames(
        rowGridClass,
        'group relative w-full min-w-0 border-b border-app-nav-border bg-app-surface text-app-text outline-none transition-colors hover:bg-app-surface-raised',
      )}
    >
      <div className="courier-row__identity col-start-1 row-start-1 flex min-h-0 min-w-0 items-center gap-3 px-2 py-3 md:col-auto md:row-auto md:min-h-[72px] md:py-2">
        <CourierAvatarMark name={courier.name} avatarUrl={courier.avatarUrl} size="sm" />
        <div className="min-w-0">
          <div className="min-w-0 truncate text-sm font-semibold text-app-text">{courier.name}</div>
          <div className="mt-1 truncate text-right text-sm font-normal text-app-text-secondary" dir="ltr">
            {courier.phone || '-'}
          </div>
        </div>
      </div>

      <div className="courier-row__vehicle col-start-1 row-start-4 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:py-2">
        <div className="truncate text-sm font-normal text-app-text-secondary">{courier.vehicleType}</div>
      </div>

      <div className="courier-row__employment col-start-1 row-start-5 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:py-2">
        <div className="truncate text-sm font-normal text-app-text-secondary">{courier.employmentType}</div>
      </div>

      <div className="courier-row__deliveries hidden min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:flex md:min-h-[72px] md:py-2">
        <CourierDeliveryCount count={courier.totalDeliveries} />
      </div>

      <div className="courier-row__connection hidden min-h-0 min-w-0 items-center px-2 py-1 md:col-auto md:row-auto md:flex md:min-h-[72px] md:py-2">
        <CourierRating rating={courier.rating} />
      </div>

      <div className="courier-row__shift col-start-1 row-start-3 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:py-2">
        <CourierLiveStatus
          label={shiftMeta.label}
          isActive={shiftMeta.isActive}
          startedAt={shiftMeta.startedAt}
          textClassName={shiftMeta.text}
          now={now}
        />
      </div>

      <div className="hidden min-h-0 min-w-0 md:block" aria-hidden="true" />

      <div className="courier-row__footer col-start-1 row-start-6 flex min-h-0 items-center justify-between px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:justify-start md:py-2">
        <CourierRating rating={courier.rating} className="md:hidden" />
        <span className="inline-flex md:hidden" onClick={(event) => event.stopPropagation()}>
          <AppTooltip label={connectionMeta.label} side="top" className="inline-flex">
            <Toggle checked={isConnected} onChange={() => onTogglePower(courier)} ariaLabel={connectionMeta.label} />
          </AppTooltip>
        </span>
        <div className="hidden min-w-0 md:flex md:w-full md:justify-start">
          <span className="inline-flex" onClick={(event) => event.stopPropagation()}>
            <AppTooltip label={connectionMeta.label} side="top" className="inline-flex">
              <Toggle checked={isConnected} onChange={() => onTogglePower(courier)} ariaLabel={connectionMeta.label} />
            </AppTooltip>
          </span>
        </div>
      </div>

      <div className="courier-row__actions col-start-2 row-start-1 flex min-h-0 items-start justify-center px-1 py-3 md:col-auto md:row-auto md:min-h-[72px] md:items-center md:py-0" onClick={(event) => event.stopPropagation()}>
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
  now: number;
  onOpenActionsMenu: CouriersVercelListProps['onOpenActionsMenu'];
  onOpenContextMenu: CouriersVercelListProps['onOpenContextMenu'];
  onTogglePower: CouriersVercelListProps['onTogglePower'];
}> = ({
  courier,
  currentDelivery,
  now,
  onOpenActionsMenu,
  onOpenContextMenu,
  onTogglePower,
}) => {
  const connectionMeta = getConnectionMeta(courier);
  const shiftMeta = getShiftMeta(courier);
  const isConnected = courier.status !== 'offline';
  const deliveryLabel = currentDelivery ? formatOrderNumber(currentDelivery.orderNumber) : '-';
  const deliveryMeta = currentDelivery ? currentDelivery.rest_name || currentDelivery.restaurantName : 'ללא משלוח פעיל';

  return (
    <div
      onContextMenu={(event) => onOpenContextMenu(courier, event)}
      className={joinClassNames(
        'group min-w-0 rounded-lg border border-app-nav-border bg-app-surface p-3 text-app-text outline-none transition-colors hover:bg-app-surface-raised',
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <CourierAvatarMark name={courier.name} avatarUrl={courier.avatarUrl} size="md" className="mt-0.5" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0 truncate text-sm font-semibold text-app-text">{courier.name}</div>
              <span className="inline-flex" onClick={(event) => event.stopPropagation()}>
                <AppTooltip label={connectionMeta.label} side="top" className="inline-flex">
                  <Toggle checked={isConnected} onChange={() => onTogglePower(courier)} ariaLabel={connectionMeta.label} />
                </AppTooltip>
              </span>
            </div>
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
          <CourierLiveStatus
            label={shiftMeta.label}
            isActive={shiftMeta.isActive}
            startedAt={shiftMeta.startedAt}
            textClassName={shiftMeta.text}
            now={now}
          />
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
  onTogglePower,
  emptyState,
  selectionBar,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

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
                now={now}
                onOpenActionsMenu={onOpenActionsMenu}
                onOpenContextMenu={onOpenContextMenu}
                onTogglePower={onTogglePower}
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
        <div className="courier-vercel-list-frame w-full min-w-0 overflow-visible border border-app-nav-border md:overflow-hidden" dir="rtl">
          {couriers.map((courier) => (
            <CourierVercelRow
              key={courier.id}
              courier={courier}
              now={now}
              onOpenActionsMenu={onOpenActionsMenu}
              onOpenContextMenu={onOpenContextMenu}
              onTogglePower={onTogglePower}
            />
          ))}
        </div>
      </div>
      {selectionBar}
    </div>
  );
};
