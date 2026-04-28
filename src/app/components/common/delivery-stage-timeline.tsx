import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { format as formatDate } from 'date-fns';
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

const deliveryHoverCardWidth = 328;
const deliveryHoverCardEstimatedHeight = 132;
const deliveryHoverCardGap = 8;
const deliveryHoverCardViewportPadding = 8;

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

const getStageIndicatorMeta = (status: DeliveryStatus) => {
  switch (status) {
    case 'pending':
      return { activeSegments: 1, color: '#f97316' };
    case 'assigned':
      return { activeSegments: 2, color: '#eab308' };
    case 'delivering':
      return { activeSegments: 3, color: '#22c55e' };
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
            stroke="#303030"
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
}> = ({ delivery }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const triggerRef = useRef<HTMLSpanElement>(null);
  const assignedAt = delivery.assignedAt ?? delivery.coupled_time ?? delivery.deliveryCreditConsumedAt;
  const arrivedAtRestaurant =
    delivery.arrivedAtRestaurantAt ?? delivery.arrived_at_rest ?? delivery.pickedUpAt ?? delivery.took_it_time;
  const deliveredAt = delivery.deliveredAt ?? delivery.delivered_time;
  const arrivedAtCustomer =
    delivery.arrivedAtCustomerAt ?? delivery.arrived_at_client ?? deliveredAt;
  const assignmentDuration = formatAssignmentDuration(assignedAt, deliveredAt, now);

  const timelineRows = [
    { label: 'צוות לשליח', value: assignedAt },
    { label: 'הגיע למסעדה', value: arrivedAtRestaurant },
    { label: 'הגיע ללקוח', value: arrivedAtCustomer },
  ];

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    setNow(Date.now());
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(intervalId);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const preferredLeft = rect.right + deliveryHoverCardGap;
      const fallbackLeft = rect.left - deliveryHoverCardWidth - deliveryHoverCardGap;
      const left =
        preferredLeft + deliveryHoverCardWidth <= viewportWidth - deliveryHoverCardViewportPadding
          ? preferredLeft
          : Math.max(deliveryHoverCardViewportPadding, fallbackLeft);
      const centeredTop = rect.top + rect.height / 2 - deliveryHoverCardEstimatedHeight / 2;
      const maxTop = viewportHeight - deliveryHoverCardEstimatedHeight - deliveryHoverCardViewportPadding;
      const top = Math.min(
        Math.max(deliveryHoverCardViewportPadding, centeredTop),
        Math.max(deliveryHoverCardViewportPadding, maxTop),
      );

      setPosition({ left, top });
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
        className="relative flex h-8 w-8 shrink-0 items-center justify-center focus:outline-none"
        tabIndex={0}
        aria-label="ציר זמן סטטוס משלוח"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={(event) => event.stopPropagation()}
      >
        <DeliveryStageIndicator status={delivery.status} />
      </span>
      {isOpen && position && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              dir="rtl"
              className="pointer-events-none fixed z-[9999] w-[328px] rounded-md border border-[#2a2a2a] bg-[#0b0b0b] px-3.5 py-3 text-sm text-[#ededed] shadow-2xl"
              style={{ left: position.left, top: position.top }}
            >
              <div dir="rtl" className="space-y-3">
                <div className="text-right leading-5 text-[#8f8f8f]">{assignmentDuration ?? '-'}</div>
                <div className="space-y-2">
                  {timelineRows.map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8"
                    >
                      <span className="min-w-0 text-[#8f8f8f]">{row.label}</span>
                      <span dir="ltr" className="font-medium tabular-nums text-[#ededed]">
                        {formatTimelineTime(row.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};
