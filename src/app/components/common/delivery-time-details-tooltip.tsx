import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { format as formatDate } from 'date-fns';
import { createPortal } from 'react-dom';

type DateValue = Date | string | number | null | undefined;

export type DeliveryTimeDetailsData = {
  creation_time?: DateValue;
  createdAt?: DateValue;
  delivery_date?: DateValue;
  should_delivered_time?: DateValue;
  max_time_to_deliver?: number;
  maxDeliveryTime?: number;
  estimatedTime?: number;
  orderReadyTime?: DateValue;
  rest_last_eta?: DateValue;
  rest_approved_eta?: DateValue;
  estimatedArrivalAtRestaurant?: DateValue;
  estimatedArrivalAtCustomer?: DateValue;
};

const timeDetailsTooltipWidth = 328;
const timeDetailsTooltipEstimatedHeight = 190;
const timeDetailsTooltipGap = 8;
const timeDetailsTooltipViewportPadding = 8;

const toDeliveryDate = (value: DateValue) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTime = (value: DateValue) => {
  const date = toDeliveryDate(value);
  if (!date) return '-';
  return formatDate(date, 'HH:mm');
};

const formatDateOnly = (value: DateValue) => {
  const date = toDeliveryDate(value);
  if (!date) return '-';
  return formatDate(date, 'dd/MM/yyyy');
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

const formatElapsedSince = (value: DateValue, now: number) => {
  const date = toDeliveryDate(value);
  if (!date) return null;

  const totalSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  return `לפני ${formatDurationParts(totalSeconds)}`;
};

const getCreatedAt = (delivery: DeliveryTimeDetailsData) =>
  delivery.creation_time ?? delivery.createdAt ?? delivery.delivery_date;

const getCommitmentTime = (delivery: DeliveryTimeDetailsData) => {
  const explicitCommitment = delivery.should_delivered_time ?? delivery.delivery_date;
  if (explicitCommitment) return explicitCommitment;

  const createdAt = toDeliveryDate(getCreatedAt(delivery));
  const commitmentMinutes = delivery.max_time_to_deliver ?? delivery.maxDeliveryTime ?? delivery.estimatedTime;
  if (!createdAt || typeof commitmentMinutes !== 'number') return null;

  return new Date(createdAt.getTime() + commitmentMinutes * 60000);
};

export const DeliveryTimeDetailsTooltip: React.FC<{
  delivery: DeliveryTimeDetailsData;
  children: React.ReactNode;
}> = ({ delivery, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const triggerRef = useRef<HTMLSpanElement>(null);
  const createdAt = getCreatedAt(delivery);
  const commitmentTime = getCommitmentTime(delivery);
  const orderReadyTime = delivery.orderReadyTime ?? delivery.rest_approved_eta ?? delivery.rest_last_eta;
  const createdElapsed = formatElapsedSince(createdAt, now);

  const timeRows = [
    { label: 'תאריך', value: formatDateOnly(createdAt) },
    { label: 'שעת יצירה', value: formatTime(createdAt) },
    { label: 'התחייבות', value: formatTime(commitmentTime) },
    { label: 'מוכן במסעדה', value: formatTime(orderReadyTime) },
    { label: 'ETA למסעדה', value: formatTime(delivery.estimatedArrivalAtRestaurant) },
    { label: 'ETA ללקוח', value: formatTime(delivery.estimatedArrivalAtCustomer) },
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
      const preferredLeft = rect.right + timeDetailsTooltipGap;
      const fallbackLeft = rect.left - timeDetailsTooltipWidth - timeDetailsTooltipGap;
      const left =
        preferredLeft + timeDetailsTooltipWidth <= viewportWidth - timeDetailsTooltipViewportPadding
          ? preferredLeft
          : Math.max(timeDetailsTooltipViewportPadding, fallbackLeft);
      const centeredTop = rect.top + rect.height / 2 - timeDetailsTooltipEstimatedHeight / 2;
      const maxTop = viewportHeight - timeDetailsTooltipEstimatedHeight - timeDetailsTooltipViewportPadding;
      const top = Math.min(
        Math.max(timeDetailsTooltipViewportPadding, centeredTop),
        Math.max(timeDetailsTooltipViewportPadding, maxTop),
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
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-app-text-secondary focus:outline-none"
        tabIndex={0}
        aria-label="פרטי זמן משלוח"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
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
                <div className="text-right leading-5 text-[#8f8f8f]">{createdElapsed ?? '-'}</div>
                <div className="space-y-2">
                  {timeRows.map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8"
                    >
                      <span className="min-w-0 text-[#8f8f8f]">{row.label}</span>
                      <span dir="ltr" className="font-medium tabular-nums text-[#ededed]">
                        {row.value}
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
