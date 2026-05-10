import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { format as formatDate } from 'date-fns';
import { Clock3, MapPinned, PackageCheck, Store, UsersRound, type LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';

import type { DeliveryStatus } from '../../types/delivery.types';

type DateValue = Date | string | number | null | undefined;

export type DeliveryStageTimelineData = {
  status: DeliveryStatus;
  creation_time?: DateValue;
  createdAt?: DateValue;
  delivery_date?: DateValue;
  assignedAt?: DateValue;
  coupled_time?: DateValue;
  deliveryCreditConsumedAt?: DateValue;
  arrivedAtRestaurantAt?: DateValue;
  arrived_at_rest?: DateValue;
  pickedUpAt?: DateValue;
  took_it_time?: DateValue;
  arrivedAtCustomerAt?: DateValue;
  arrived_at_client?: DateValue;
  deliveredAt?: DateValue;
  delivered_time?: DateValue;
};

const deliveryHoverCardWidth = 364;
const deliveryHoverCardEstimatedHeight = 178;
const deliveryHoverCardGap = 8;
const deliveryHoverCardViewportPadding = 8;
const deliveryHoverCardCompactBreakpoint = 768;

const toDeliveryDate = (value: DateValue) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTimelineTime = (value: DateValue) => {
  const date = toDeliveryDate(value);
  if (!date) return '-';
  return formatDate(date, 'HH:mm');
};

const formatDurationParts = (totalSeconds: number) => {
  if (totalSeconds < 1) return 'עכשיו';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];

  const addPart = (amount: number, singular: string, plural: string) => {
    if (amount === 1) {
      parts.push(singular);
      return;
    }
    if (amount > 1) {
      parts.push(`${amount} ${plural}`);
    }
  };

  addPart(days, 'יום', 'ימים');
  addPart(hours, 'שעה', 'שעות');
  addPart(minutes, 'דקה', 'דקות');
  addPart(seconds, 'שנייה', 'שניות');

  return parts.slice(0, 3).join(', ');
};

const formatAssignmentDuration = (assignedAt: DateValue, deliveredAt: DateValue, now: number) => {
  const assignedDate = toDeliveryDate(assignedAt);
  if (!assignedDate) return null;

  const deliveredDate = toDeliveryDate(deliveredAt);
  const endTime = deliveredDate?.getTime() ?? now;
  const totalSeconds = Math.max(0, Math.floor((endTime - assignedDate.getTime()) / 1000));

  return formatDurationParts(totalSeconds);
};

const stageStatusLabels: Record<DeliveryStatus, string> = {
  pending: 'ממתין',
  assigned: 'שובץ',
  delivering: 'נאסף',
  delivered: 'נמסר',
  cancelled: 'בוטל',
  expired: 'פג תוקף',
};

const stageStatusToneClassNames: Record<DeliveryStatus, string> = {
  pending: 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  assigned: 'bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300',
  delivering: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  delivered: 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  cancelled: 'bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  expired: 'bg-zinc-500/10 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300',
};

const getStageIndicatorMeta = (status: DeliveryStatus) => {
  switch (status) {
    case 'pending':
      return { activeSegments: 1, color: '#f97316' };
    case 'assigned':
      return { activeSegments: 2, color: '#eab308' };
    case 'delivering':
      return { activeSegments: 3, color: 'var(--app-success-text)' };
    case 'delivered':
      return { activeSegments: 4, color: '#0070f3' };
    case 'cancelled':
      return { activeSegments: 4, color: '#ef4444' };
    case 'expired':
    default:
      return { activeSegments: 0, color: '#71717a' };
  }
};

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const createArcPath = (startAngle: number, endAngle: number) => {
  const start = polarToCartesian(16, 16, 11, endAngle);
  const end = polarToCartesian(16, 16, 11, startAngle);

  return `M ${start.x} ${start.y} A 11 11 0 0 0 ${end.x} ${end.y}`;
};

const stageRingSegments = [
  createArcPath(12, 78),
  createArcPath(102, 168),
  createArcPath(192, 258),
  createArcPath(282, 348),
];

export const DeliveryStageIndicator: React.FC<{ status: DeliveryStatus }> = ({ status }) => {
  const { activeSegments, color } = getStageIndicatorMeta(status);

  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
      <svg className="h-8 w-8" viewBox="0 0 32 32" aria-hidden="true">
        {stageRingSegments.map((path, index) => (
          <path
            key={`stage-track-${index}`}
            d={path}
            fill="none"
            stroke="var(--app-border-strong)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
        {stageRingSegments.slice(0, activeSegments).map((path, index) => (
          <path
            key={`stage-active-${index}`}
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </span>
  );
};

export const DeliveryStageTimelineTooltip: React.FC<{
  delivery: DeliveryStageTimelineData;
  children?: React.ReactNode;
  triggerClassName?: string;
}> = ({ delivery, children, triggerClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const triggerRef = useRef<HTMLSpanElement>(null);
  const assignedAt = delivery.assignedAt ?? delivery.coupled_time ?? delivery.deliveryCreditConsumedAt;
  const arrivedAtRestaurant =
    delivery.arrivedAtRestaurantAt ?? delivery.arrived_at_rest ?? delivery.pickedUpAt ?? delivery.took_it_time;
  const deliveredAt = delivery.deliveredAt ?? delivery.delivered_time;
  const arrivedAtCustomer =
    delivery.arrivedAtCustomerAt ?? delivery.arrived_at_client ?? deliveredAt;
  const assignmentDuration = formatAssignmentDuration(assignedAt, deliveredAt, now);
  const statusLabel = stageStatusLabels[delivery.status];

  const timelineRows: Array<{ label: string; value: DateValue; icon: LucideIcon }> = [
    { label: 'צוות לשליח', value: assignedAt, icon: UsersRound },
    { label: 'הגיע למסעדה', value: arrivedAtRestaurant, icon: Store },
    { label: 'הגיע ללקוח', value: arrivedAtCustomer, icon: MapPinned },
  ];

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    setNow(Date.now());
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(intervalId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handlePointerDown = (event: PointerEvent) => {
      if (triggerRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(
        deliveryHoverCardWidth,
        viewportWidth - deliveryHoverCardViewportPadding * 2,
      );
      const isCompact = viewportWidth < deliveryHoverCardCompactBreakpoint;
      let left = rect.right + deliveryHoverCardGap;
      let top = rect.top + rect.height / 2 - deliveryHoverCardEstimatedHeight / 2;

      if (isCompact) {
        left = Math.max(deliveryHoverCardViewportPadding, (viewportWidth - width) / 2);
        const belowTop = rect.bottom + deliveryHoverCardGap;
        const aboveTop = rect.top - deliveryHoverCardEstimatedHeight - deliveryHoverCardGap;
        top =
          belowTop + deliveryHoverCardEstimatedHeight <= viewportHeight - deliveryHoverCardViewportPadding
            ? belowTop
            : aboveTop;
      } else {
        const preferredLeft = rect.right + deliveryHoverCardGap;
        const fallbackLeft = rect.left - width - deliveryHoverCardGap;
        left =
          preferredLeft + width <= viewportWidth - deliveryHoverCardViewportPadding
            ? preferredLeft
            : Math.max(deliveryHoverCardViewportPadding, fallbackLeft);
      }

      const maxTop = viewportHeight - deliveryHoverCardEstimatedHeight - deliveryHoverCardViewportPadding;
      top = Math.min(
        Math.max(deliveryHoverCardViewportPadding, top),
        Math.max(deliveryHoverCardViewportPadding, maxTop),
      );

      setPosition({ left, top, width });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <>
      <span
        ref={triggerRef}
        className={triggerClassName ?? 'relative flex h-8 w-8 shrink-0 items-center justify-center focus:outline-none'}
        tabIndex={0}
        aria-label="ציר זמן סטטוס משלוח"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
        }}
      >
        {children ?? <DeliveryStageIndicator status={delivery.status} />}
      </span>
      {isOpen && position && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              dir="rtl"
              className="pointer-events-none fixed z-[9999] max-w-[calc(100vw-16px)] rounded-[6px] border border-app-border bg-app-surface p-2 text-sm text-app-text shadow-[0_8px_22px_rgba(0,0,0,0.22)]"
              style={{ left: position.left, top: position.top, width: position.width }}
            >
              <div dir="rtl" className="space-y-2">
                <div
                  className={`flex min-h-9 items-center justify-between gap-3 rounded-[4px] px-2.5 py-2 ${stageStatusToneClassNames[delivery.status]}`}
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <PackageCheck className="h-4 w-4 shrink-0" />
                    <span className="truncate">{statusLabel}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium opacity-90">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{assignmentDuration ?? '-'}</span>
                  </span>
                </div>
                <div className="space-y-1.5 px-1 py-1">
                  {timelineRows.map((row) => {
                    const RowIcon = row.icon;

                    return (
                      <div
                        key={row.label}
                        className="flex min-h-7 items-center justify-between gap-3"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-app-text-secondary">
                          <RowIcon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 truncate">{row.label}</span>
                        </span>
                        <span dir="ltr" className="font-medium tabular-nums text-app-text">
                          {formatTimelineTime(row.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};
