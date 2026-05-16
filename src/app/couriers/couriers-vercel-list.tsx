import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  'courier-vercel-row grid grid-cols-[minmax(0,1fr)_44px] md:grid-cols-[minmax(180px,260px)_minmax(104px,136px)_minmax(112px,150px)_minmax(96px,140px)_minmax(0,1fr)_52px_52px_36px] xl:grid-cols-[minmax(200px,280px)_minmax(112px,144px)_minmax(124px,164px)_minmax(112px,150px)_minmax(0,1fr)_52px_52px_36px] 2xl:grid-cols-[minmax(220px,300px)_minmax(120px,152px)_minmax(132px,176px)_minmax(124px,164px)_minmax(0,1fr)_56px_56px_36px]';

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
    label: isOnShift ? '\u05e4\u05e2\u05d9\u05dc' : '\u05dc\u05d0 \u05e4\u05e2\u05d9\u05dc',
    isActive: isOnShift,
    startedAt: isOnShift ? courier.shiftStartedAt : null,
    dot: isOnShift ? 'bg-[#50e3c2]' : 'bg-app-text-muted',
    text: isOnShift ? 'text-app-text' : 'text-app-text-secondary',
  };
};

const CourierLiveStatus: React.FC<{
  label: string;
  isActive: boolean;
  startedAt: DateValue;
  dotClassName: string;
  textClassName: string;
  now: number;
}> = ({ label, isActive, startedAt, dotClassName, textClassName, now }) => (
  <div className="min-w-0 text-right">
    <div className="flex min-w-0 items-center justify-start gap-2">
      <span className={joinClassNames('h-2.5 w-2.5 shrink-0 rounded-full', dotClassName)} />
      <span className={joinClassNames('min-w-0 truncate text-sm font-medium', textClassName)}>
        {label}
      </span>
    </div>
    <div className="mt-1 truncate text-xs tabular-nums text-app-text-secondary" dir="rtl">
      {isActive ? formatElapsedDuration(startedAt, now) : '-'}
    </div>
  </div>
);

const CourierConnectionBadge: React.FC<{
  label: string;
  dotClassName: string;
  textClassName: string;
  className?: string;
}> = ({ label, dotClassName, textClassName, className }) => (
  <span className={joinClassNames('inline-flex shrink-0 items-center gap-1.5 text-sm font-normal', textClassName, className)}>
    <span className={joinClassNames('h-2 w-2 rounded-full', dotClassName)} />
    <span>{label}</span>
  </span>
);

const CourierDeliveryCount: React.FC<{ count: number; className?: string }> = ({ count, className }) => (
  <div className={joinClassNames('flex items-center gap-1.5 text-sm font-normal text-app-text-secondary', className)}>
    <Package className="h-3.5 w-3.5 shrink-0" />
    <span className="tabular-nums">{count}</span>
  </div>
);

const CourierVercelRow: React.FC<{
  courier: Courier;
  now: number;
  onOpenActionsMenu: CouriersVercelListProps['onOpenActionsMenu'];
  onOpenContextMenu: CouriersVercelListProps['onOpenContextMenu'];
}> = ({
  courier,
  now,
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
      <div className="courier-row__identity col-start-1 row-start-1 flex min-h-0 min-w-0 items-center gap-3 px-2 py-3 md:col-auto md:row-auto md:min-h-[72px] md:py-2">
        <CourierAvatarMark name={courier.name} avatarUrl={courier.avatarUrl} size="sm" />
        <div className="min-w-0">
          <div className="min-w-0 truncate text-sm font-semibold text-app-text">{courier.name}</div>
          <div className="mt-1 truncate text-right text-sm font-normal text-app-text-secondary" dir="ltr">
            {courier.phone || '-'}
          </div>
        </div>
      </div>

      <div className="courier-row__connection hidden min-h-0 min-w-0 items-center px-2 py-1 md:col-auto md:row-auto md:flex md:min-h-[72px] md:py-2">
        <CourierConnectionBadge
          label={connectionMeta.label}
          dotClassName={connectionMeta.dot}
          textClassName={connectionMeta.text}
          className="min-w-0"
        />
      </div>

      <div className="courier-row__deliveries hidden min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:flex md:min-h-[72px] md:py-2">
        <CourierDeliveryCount count={courier.totalDeliveries} />
      </div>

      <div className="courier-row__shift col-start-1 row-start-3 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:py-2">
        <CourierLiveStatus
          label={shiftMeta.label}
          isActive={shiftMeta.isActive}
          startedAt={shiftMeta.startedAt}
          dotClassName={shiftMeta.dot}
          textClassName={shiftMeta.text}
          now={now}
        />
      </div>

      <div className="courier-row__vehicle col-start-1 row-start-4 flex min-h-0 min-w-0 flex-col justify-center px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:py-2">
        <div className="truncate text-sm font-semibold text-app-text">{courier.vehicleType}</div>
        <div className="mt-1 truncate text-xs font-normal text-app-text-secondary">{courier.employmentType}</div>
      </div>

      <div className="hidden min-h-0 min-w-0 md:block" aria-hidden="true" />

      <div className="courier-row__footer col-start-1 row-start-5 flex min-h-0 items-center justify-between px-2 py-1 md:col-auto md:row-auto md:min-h-[72px] md:justify-center md:px-3 md:py-2">
        <CourierConnectionBadge
          label={connectionMeta.label}
          dotClassName={connectionMeta.dot}
          textClassName={connectionMeta.text}
          className="md:hidden"
        />
        <div className="hidden items-center gap-1.5 text-sm font-normal text-app-text-secondary md:flex">
          <Star className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">{courier.rating.toFixed(1)}</span>
        </div>
        <CourierDeliveryCount count={courier.totalDeliveries} className="courier-row__footer-total hidden" />
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
}> = ({
  courier,
  currentDelivery,
  now,
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
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0 truncate text-sm font-semibold text-app-text">{courier.name}</div>
              <CourierConnectionBadge
                label={connectionMeta.label}
                dotClassName={connectionMeta.dot}
                textClassName={connectionMeta.text}
              />
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
            dotClassName={shiftMeta.dot}
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
            />
          ))}
        </div>
      </div>
      {selectionBar}
    </div>
  );
};
