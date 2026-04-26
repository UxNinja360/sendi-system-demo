import type { PeriodMode } from '../components/common/toolbar-date-picker';
import type { Delivery } from '../types/delivery.types';

export type DateRange = {
  start: Date;
  end: Date;
};

const pad = (value: number) => value.toString().padStart(2, '0');

export const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseInputDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const getPeriodDateRange = (
  periodMode: PeriodMode,
  monthAnchor: Date,
  customStartDate: string,
  customEndDate: string,
): DateRange => {
  if (periodMode === 'custom_range' && customStartDate && customEndDate) {
    const start = parseInputDate(customStartDate);
    const end = parseInputDate(customEndDate);
    if (start && end) {
      return start <= end
        ? { start: startOfDay(start), end: endOfDay(end) }
        : { start: startOfDay(end), end: endOfDay(start) };
    }
  }

  return {
    start: new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1),
    end: new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0, 23, 59, 59, 999),
  };
};

export const getDeliveryDate = (delivery: Delivery) => {
  const value = delivery.createdAt ?? delivery.creation_time;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isDateInRange = (date: Date | null, range: DateRange) =>
  Boolean(date && date >= range.start && date <= range.end);

export const isDeliveryInPeriod = (delivery: Delivery, range: DateRange) =>
  isDateInRange(getDeliveryDate(delivery), range);
