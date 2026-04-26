import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ToolbarIconButton } from './toolbar-icon-button';

export type PeriodMode = 'current_month' | 'custom_range';

const WEEKDAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const SHORT_MONTH_LABELS = [
  'ינו',
  'פבר',
  'מרץ',
  'אפר',
  'מאי',
  'יונ',
  'יול',
  'אוג',
  'ספט',
  'אוק',
  'נוב',
  'דצמ',
] as const;

const pad = (value: number) => value.toString().padStart(2, '0');

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
};

const getWeekDates = (date: Date) => {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
};

const getMonthDays = (calendarMonth: Date) => {
  const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
  const lead = start.getDay();
  const total = Math.ceil((lead + end.getDate()) / 7) * 7;

  return Array.from({ length: total }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index - lead);
    return {
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === calendarMonth.getMonth(),
    };
  });
};

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

const formatShortDate = (date: Date, withYear = false) =>
  date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });

const getRangeLabel = (startDate: string, endDate: string) =>
  `${parseDateKey(startDate).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
  })} - ${parseDateKey(endDate).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`;

type CalendarPopoverProps = {
  calendarMonth: Date;
  setCalendarMonth: React.Dispatch<React.SetStateAction<Date>>;
  getDayClassName: (day: { date: Date; key: string; inMonth: boolean }) => string;
  onDayClick: (date: Date, key: string) => void;
  onDayMouseEnter?: (key: string) => void;
  onDayMouseLeave?: () => void;
};

const CalendarPopover: React.FC<CalendarPopoverProps> = ({
  calendarMonth,
  setCalendarMonth,
  getDayClassName,
  onDayClick,
  onDayMouseEnter,
  onDayMouseLeave,
}) => {
  const monthDays = React.useMemo(() => getMonthDays(calendarMonth), [calendarMonth]);

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[286px] rounded-[4px] border border-app-border bg-app-surface p-3 shadow-[var(--app-shadow-panel)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() =>
            setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
          }
          className="rounded-[4px] p-1.5 text-app-text-secondary hover:bg-app-surface-raised"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium text-app-text">{formatMonthLabel(calendarMonth)}</div>
        <button
          type="button"
          onClick={() =>
            setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
          }
          className="rounded-[4px] p-1.5 text-app-text-secondary hover:bg-app-surface-raised"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] text-app-text-secondary">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day) => (
          <button
            key={day.key}
            type="button"
            onClick={() => onDayClick(day.date, day.key)}
            onMouseEnter={() => onDayMouseEnter?.(day.key)}
            onMouseLeave={onDayMouseLeave}
            className={getDayClassName(day)}
          >
            {day.date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
};

type ToolbarPeriodControlProps = {
  periodMode: PeriodMode;
  setPeriodMode: React.Dispatch<React.SetStateAction<PeriodMode>>;
  monthAnchor: Date;
  setMonthAnchor: React.Dispatch<React.SetStateAction<Date>>;
  customStartDate: string;
  setCustomStartDate: (value: string) => void;
  customEndDate: string;
  setCustomEndDate: (value: string) => void;
  onCustomRangeChange?: () => void;
  onCustomRangeComplete?: () => void;
  onReset?: () => void;
};

export const ToolbarPeriodControl: React.FC<ToolbarPeriodControlProps> = ({
  periodMode,
  setPeriodMode,
  monthAnchor,
  setMonthAnchor,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  onCustomRangeChange,
  onCustomRangeComplete,
  onReset,
}) => {
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState(() => new Date());
  const [hoverDate, setHoverDate] = React.useState<string | null>(null);
  const [pickingStart, setPickingStart] = React.useState(true);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!calendarOpen) return;
    const handler = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [calendarOpen]);

  React.useEffect(() => {
    if (!calendarOpen) return;
    if (periodMode === 'custom_range' && customStartDate) {
      const start = parseDateKey(customStartDate);
      setCalendarMonth(new Date(start.getFullYear(), start.getMonth(), 1));
      return;
    }
    setCalendarMonth(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1));
  }, [calendarOpen, customStartDate, monthAnchor, periodMode]);

  const todayKey = toDateKey(new Date());
  const currentMonthSelectionKey = React.useMemo(() => {
    const today = new Date();
    const selectedDay =
      today.getFullYear() === monthAnchor.getFullYear() &&
      today.getMonth() === monthAnchor.getMonth()
        ? today.getDate()
        : 1;
    return toDateKey(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), selectedDay));
  }, [monthAnchor]);
  const effectiveEnd = hoverDate && !pickingStart && !customEndDate ? hoverDate : customEndDate;
  const displayLabel =
    periodMode === 'custom_range' && customStartDate && customEndDate
      ? getRangeLabel(customStartDate, customEndDate)
      : formatMonthLabel(monthAnchor);
  const compactLabel =
    periodMode === 'custom_range'
      ? displayLabel
      : `${SHORT_MONTH_LABELS[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}`;

  const moveMonth = (direction: -1 | 1) => {
    setMonthAnchor((value) => new Date(value.getFullYear(), value.getMonth() + direction, 1));
  };

  const handleDayClick = (_date: Date, key: string) => {
    if (pickingStart || (customStartDate && key < customStartDate)) {
      setCustomStartDate(key);
      setCustomEndDate('');
      setPeriodMode('custom_range');
      setPickingStart(false);
      onCustomRangeChange?.();
      return;
    }

    setCustomEndDate(key);
    setPeriodMode('custom_range');
    setPickingStart(true);
    setCalendarOpen(false);
    onCustomRangeChange?.();
    onCustomRangeComplete?.();
  };

  const getDayClassName = ({ key, inMonth }: { key: string; inMonth: boolean }) => {
    if (periodMode !== 'custom_range') {
      const isSelected = key === currentMonthSelectionKey;
      const isToday = key === todayKey;

      return [
        'aspect-square rounded-[4px] text-xs transition-colors',
        isSelected
          ? 'bg-[#fafafa] font-semibold text-[#0d0d12]'
          : inMonth
            ? 'text-app-text hover:bg-app-surface-raised'
            : 'text-app-text-muted',
        isToday && !isSelected ? 'ring-1 ring-[#ededed]/35' : '',
      ].join(' ');
    }

    const isStart = key === customStartDate;
    const isEnd = key === effectiveEnd;
    const inRange =
      Boolean(customStartDate) &&
      Boolean(effectiveEnd) &&
      key > customStartDate &&
      key < effectiveEnd;
    const isToday = key === todayKey;

    return [
      'aspect-square rounded-[4px] text-xs transition-colors',
      isStart || isEnd
        ? 'bg-[#0d0d12] text-white dark:bg-[#fafafa] dark:text-[#0d0d12]'
        : inRange
          ? 'bg-app-surface-raised text-app-text'
          : inMonth
            ? 'text-app-text hover:bg-app-surface-raised'
            : 'text-app-text-muted',
      isToday && !isStart && !isEnd ? 'ring-1 ring-[#ededed]/35' : '',
    ].join(' ');
  };

  return (
    <div ref={popoverRef} className="relative flex items-center gap-1" dir="rtl">
      {periodMode !== 'custom_range' ? (
        <ToolbarIconButton onClick={() => moveMonth(-1)} label="חודש קודם">
          <ChevronRight className="h-4 w-4" />
        </ToolbarIconButton>
      ) : null}

      <button
        type="button"
        onClick={() => setCalendarOpen((value) => !value)}
        className={`flex h-9 min-w-[136px] items-center justify-center gap-2 rounded-[4px] border px-3 text-sm font-semibold transition-colors sm:min-w-[190px] ${
          periodMode === 'custom_range'
            ? 'border-app-nav-border bg-[#0A0A0A] text-app-text'
            : 'border-app-border bg-app-surface text-app-text hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#0A0A0A] dark:hover:bg-[#1A1A1A]'
        }`}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-app-text-secondary" />
        <span className="truncate sm:hidden">{compactLabel}</span>
        <span className="hidden truncate sm:inline">{displayLabel}</span>
      </button>

      {periodMode !== 'custom_range' ? (
        <ToolbarIconButton onClick={() => moveMonth(1)} label="חודש הבא">
          <ChevronLeft className="h-4 w-4" />
        </ToolbarIconButton>
      ) : null}

      {periodMode === 'custom_range' ? (
        <ToolbarIconButton
          onClick={() => {
            setPeriodMode('current_month');
            setCalendarOpen(false);
            setPickingStart(true);
            onReset?.();
          }}
          label="נקה טווח"
        >
          <X className="h-4 w-4" />
        </ToolbarIconButton>
      ) : null}

      {calendarOpen ? (
        <CalendarPopover
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          getDayClassName={getDayClassName}
          onDayClick={handleDayClick}
          onDayMouseEnter={(key) => {
            if (!pickingStart && !customEndDate) setHoverDate(key);
          }}
          onDayMouseLeave={() => setHoverDate(null)}
        />
      ) : null}
    </div>
  );
};

type ToolbarWeekPickerProps = {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
};

export const ToolbarWeekPicker: React.FC<ToolbarWeekPickerProps> = ({
  selectedDate,
  onDateChange,
}) => {
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const weekDates = React.useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const selectedDateKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());

  React.useEffect(() => {
    if (!calendarOpen) return;
    const handler = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [calendarOpen]);

  React.useEffect(() => {
    if (!calendarOpen) return;
    setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [calendarOpen, selectedDate]);

  const weekLabel = `${formatShortDate(weekDates[0])} - ${formatShortDate(weekDates[6], true)}`;

  const changeWeek = (direction: -1 | 1) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + direction * 7);
    onDateChange(next);
  };

  const getDayClassName = ({ key, inMonth }: { key: string; inMonth: boolean }) => {
    const isSelected = key === selectedDateKey;
    const isToday = key === todayKey;
    const isInSelectedWeek = weekDates.some((date) => toDateKey(date) === key);

    return [
      'aspect-square rounded-[4px] text-xs transition-colors',
      isSelected
        ? 'bg-[#0d0d12] text-white dark:bg-[#fafafa] dark:text-[#0d0d12]'
        : isInSelectedWeek
          ? 'bg-app-surface-raised text-app-text'
          : inMonth
            ? 'text-app-text hover:bg-app-surface-raised'
            : 'text-app-text-muted',
      isToday && !isSelected ? 'ring-1 ring-[#ededed]/35' : '',
    ].join(' ');
  };

  return (
    <div ref={popoverRef} className="relative flex items-center gap-1" dir="rtl">
      <ToolbarIconButton onClick={() => changeWeek(-1)} label="שבוע קודם">
        <ChevronRight className="h-4 w-4" />
      </ToolbarIconButton>
      <button
        type="button"
        onClick={() => setCalendarOpen((value) => !value)}
        className="flex h-9 min-w-[150px] items-center justify-center gap-2 rounded-[4px] border border-app-border bg-app-surface px-3 text-sm font-semibold text-app-text transition-colors hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#0A0A0A] dark:hover:bg-[#1A1A1A] sm:min-w-[190px]"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-app-text-secondary" />
        <span className="truncate">{weekLabel}</span>
      </button>
      <ToolbarIconButton onClick={() => changeWeek(1)} label="שבוע הבא">
        <ChevronLeft className="h-4 w-4" />
      </ToolbarIconButton>
      <button
        type="button"
        onClick={() => {
          onDateChange(new Date());
          setCalendarOpen(false);
        }}
        className="hidden h-9 items-center rounded-[4px] border border-app-border bg-app-surface px-3 text-sm font-medium text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text dark:border-app-nav-border dark:bg-[#0A0A0A] dark:hover:bg-[#1A1A1A] sm:flex"
      >
        היום
      </button>

      {calendarOpen ? (
        <CalendarPopover
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          getDayClassName={getDayClassName}
          onDayClick={(date) => {
            onDateChange(date);
            setCalendarOpen(false);
          }}
        />
      ) : null}
    </div>
  );
};
