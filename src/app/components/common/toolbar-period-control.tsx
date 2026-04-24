import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { he } from 'date-fns/locale';

export type PeriodMode = 'current_month' | 'custom_range';

interface ToolbarPeriodControlProps {
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
}

const WEEKDAY_LABELS = [
  '\u05d0',
  '\u05d1',
  '\u05d2',
  '\u05d3',
  '\u05d4',
  '\u05d5',
  '\u05e9',
];

const RESET_RANGE_LABEL = '\u05e0\u05e7\u05d4 \u05d8\u05d5\u05d5\u05d7';
const PICK_START_LABEL =
  '\u05dc\u05d7\u05e5 \u05e2\u05dc \u05ea\u05d0\u05e8\u05d9\u05da \u05d4\u05ea\u05d7\u05dc\u05d4';
const PICK_END_LABEL =
  '\u05dc\u05d7\u05e5 \u05e2\u05dc \u05ea\u05d0\u05e8\u05d9\u05da \u05e1\u05d9\u05d5\u05dd';
const SHORT_MONTH_LABELS = [
  '\u05d9\u05e0\u05d5',
  '\u05e4\u05d1\u05e8',
  '\u05de\u05e8\u05e5',
  '\u05d0\u05e4\u05e8',
  '\u05de\u05d0\u05d9',
  '\u05d9\u05d5\u05e0',
  '\u05d9\u05d5\u05dc',
  '\u05d0\u05d5\u05d2',
  '\u05e1\u05e4\u05d8',
  '\u05d0\u05d5\u05e7',
  '\u05e0\u05d5\u05d1',
  '\u05d3\u05e6\u05de',
] as const;

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
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState(() => new Date());
  const [hoverDate, setHoverDate] = React.useState<string | null>(null);
  const [pickingStart, setPickingStart] = React.useState(true);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        datePickerOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [datePickerOpen]);

  const today = formatDate(new Date(), 'yyyy-MM-dd');
  const y = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();

  const displayLabel = React.useMemo(() => {
    if (periodMode === 'custom_range' && customStartDate && customEndDate) {
      return `${formatDate(new Date(customStartDate), 'dd/MM')} - ${formatDate(
        new Date(customEndDate),
        'dd/MM/yyyy',
      )}`;
    }

    return formatDate(monthAnchor, 'MMMM yyyy', { locale: he });
  }, [customEndDate, customStartDate, monthAnchor, periodMode]);

  const compactDisplayLabel = React.useMemo(() => {
    if (periodMode === 'custom_range') {
      return displayLabel;
    }

    return `${SHORT_MONTH_LABELS[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}`;
  }, [displayLabel, monthAnchor, periodMode]);
  const handleDayClick = (day: string) => {
    if (pickingStart || (customStartDate && day < customStartDate)) {
      setCustomStartDate(day);
      setCustomEndDate('');
      onCustomRangeChange?.();
      setPeriodMode('custom_range');
      setPickingStart(false);
      return;
    }

    setCustomEndDate(day);
    onCustomRangeChange?.();
    setPeriodMode('custom_range');
    setPickingStart(true);
    setDatePickerOpen(false);
    onCustomRangeComplete?.();
  };

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(formatDate(new Date(y, m, d), 'yyyy-MM-dd'));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const effectiveEnd =
    hoverDate && !pickingStart && !customEndDate ? hoverDate : customEndDate;

  return (
    <div className="relative flex items-center gap-1" ref={popoverRef}>
      {periodMode !== 'custom_range' ? (
        <button
          type="button"
          onClick={() =>
            setMonthAnchor((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))
          }
          className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#e5e5e5] bg-white transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:hover:bg-[#202020]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setDatePickerOpen((value) => !value)}
        className={`flex h-9 min-w-[118px] items-center justify-center gap-1.5 rounded-[4px] border px-3 text-sm font-medium transition-colors sm:min-w-[150px] sm:gap-2 sm:px-4 ${
          periodMode === 'custom_range'
            ? 'border-[#0d0d12] bg-[#0d0d12] text-white dark:border-[#fafafa] dark:bg-[#fafafa] dark:text-[#0d0d12]'
            : 'border-[#e5e5e5] bg-white text-[#0d0d12] dark:border-[#262626] dark:bg-[#171717] dark:text-[#fafafa]'
        }`}
      >
        <Calendar className="h-4 w-4 shrink-0 opacity-60" />
        <span className="sm:hidden">{compactDisplayLabel}</span>
        <span className="hidden sm:inline">{displayLabel}</span>
      </button>

      {periodMode !== 'custom_range' ? (
        <button
          type="button"
          onClick={() =>
            setMonthAnchor((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))
          }
          className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#e5e5e5] bg-white transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:hover:bg-[#202020]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      ) : null}

      {periodMode === 'custom_range' ? (
        <button
          type="button"
          onClick={() => {
            setPeriodMode('current_month');
            setDatePickerOpen(false);
            setPickingStart(true);
            onReset?.();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#e5e5e5] bg-white transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:hover:bg-[#202020]"
          title={RESET_RANGE_LABEL}
        >
          <X className="h-4 w-4 text-[#737373]" />
        </button>
      ) : null}

      {datePickerOpen ? (
        <div
          className="absolute top-full right-0 z-50 mt-1.5 w-[280px] rounded-xl border border-[#e5e5e5] bg-white p-3 shadow-xl dark:border-[#262626] dark:bg-[#171717]"
          dir="rtl"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCalendarMonth(new Date(y, m - 1, 1))}
              className="rounded p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
              {formatDate(calendarMonth, 'MMMM yyyy', { locale: he })}
            </span>
            <button
              type="button"
              onClick={() => setCalendarMonth(new Date(y, m + 1, 1))}
              className="rounded p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7">
            {WEEKDAY_LABELS.map((day) => (
              <div
                key={day}
                className="py-0.5 text-center text-[10px] text-[#a3a3a3]"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((day, index) => {
              if (!day) {
                return <div key={index} />;
              }

              const isStart = day === customStartDate;
              const isEnd = day === effectiveEnd;
              const inRange =
                Boolean(customStartDate) &&
                Boolean(effectiveEnd) &&
                day > customStartDate &&
                day < effectiveEnd;
              const isToday = day === today;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() =>
                    !pickingStart && !customEndDate && setHoverDate(day)
                  }
                  onMouseLeave={() => setHoverDate(null)}
                  className={`relative h-7 w-full text-xs transition-colors ${
                    isStart || isEnd
                      ? 'z-10 rounded-lg bg-[#9fe870] font-semibold text-[#0d0d12]'
                      : ''
                  } ${
                    inRange
                      ? 'bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa]'
                      : ''
                  } ${
                    !isStart && !isEnd && !inRange
                      ? 'rounded-lg text-[#0d0d12] hover:bg-[#f5f5f5] dark:text-[#fafafa] dark:hover:bg-[#262626]'
                      : ''
                  } ${isToday && !isStart && !isEnd ? 'font-bold underline' : ''}`}
                >
                  {parseInt(day.slice(8), 10)}
                </button>
              );
            })}
          </div>

          <div className="mt-2 text-center text-[11px] text-[#a3a3a3]">
            {pickingStart
              ? PICK_START_LABEL
              : customStartDate && !customEndDate
                ? PICK_END_LABEL
                : ''}
          </div>
        </div>
      ) : null}
    </div>
  );
};
