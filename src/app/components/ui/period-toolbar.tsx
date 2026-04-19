import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { he } from 'date-fns/locale';

export type PeriodMode = 'current_month' | 'custom_range';

interface PeriodToolbarProps {
  periodMode: PeriodMode;
  setPeriodMode: (mode: PeriodMode) => void;
  monthAnchor: Date;
  setMonthAnchor: React.Dispatch<React.SetStateAction<Date>>;
  customStartDate: string;
  setCustomStartDate: (v: string) => void;
  customEndDate: string;
  setCustomEndDate: (v: string) => void;
  summary?: string;
  className?: string;
  children?: React.ReactNode;
}

export const PeriodToolbar: React.FC<PeriodToolbarProps> = ({
  periodMode,
  setPeriodMode,
  monthAnchor,
  setMonthAnchor,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  summary,
  className = 'shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717] flex-wrap',
  children,
}) => {
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState(() => new Date());
  const [hoverDate, setHoverDate] = React.useState<string | null>(null);
  const [pickingStart, setPickingStart] = React.useState(true);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (datePickerOpen && !popoverRef.current?.contains(e.target as Node))
        setDatePickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [datePickerOpen]);

  const today = formatDate(new Date(), 'yyyy-MM-dd');
  const y = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();

  const displayLabel = React.useMemo(() => {
    if (periodMode === 'custom_range' && customStartDate && customEndDate)
      return `${formatDate(new Date(customStartDate), 'dd/MM')} – ${formatDate(new Date(customEndDate), 'dd/MM/yyyy')}`;
    return formatDate(monthAnchor, 'MMMM yyyy', { locale: he });
  }, [periodMode, monthAnchor, customStartDate, customEndDate]);

  const handleDayClick = (day: string) => {
    if (pickingStart || (customStartDate && day < customStartDate)) {
      setCustomStartDate(day);
      setCustomEndDate('');
      setPeriodMode('custom_range');
      setPickingStart(false);
    } else {
      setCustomEndDate(day);
      setPeriodMode('custom_range');
      setPickingStart(true);
      setDatePickerOpen(false);
    }
  };

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(formatDate(new Date(y, m, d), 'yyyy-MM-dd'));
  while (cells.length % 7 !== 0) cells.push(null);

  const effectiveEnd = hoverDate && !pickingStart && !customEndDate ? hoverDate : customEndDate;

  return (
    <div className={className}>
      {/* Month nav + clickable label */}
      <div className="flex items-center gap-1 relative" ref={popoverRef}>
        {periodMode !== 'custom_range' && (
          <button
            onClick={() => setMonthAnchor((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
            className="h-9 w-9 flex items-center justify-center rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => setDatePickerOpen((v) => !v)}
          className={`h-9 px-4 min-w-[150px] flex items-center justify-center gap-2 rounded-[4px] border text-sm font-medium capitalize transition-colors ${
            periodMode === 'custom_range'
              ? 'border-[#0d0d12] dark:border-[#fafafa] bg-[#0d0d12] dark:bg-[#fafafa] text-white dark:text-[#0d0d12]'
              : 'border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#0d0d12] dark:text-[#fafafa]'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0 opacity-60" />
          {displayLabel}
        </button>

        {periodMode !== 'custom_range' && (
          <button
            onClick={() => setMonthAnchor((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
            className="h-9 w-9 flex items-center justify-center rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {periodMode === 'custom_range' && (
          <button
            onClick={() => { setPeriodMode('current_month'); setDatePickerOpen(false); setPickingStart(true); }}
            className="h-9 w-9 flex items-center justify-center rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors"
            title="נקה טווח"
          >
            <X className="w-4 h-4 text-[#737373]" />
          </button>
        )}

        {/* Calendar popover */}
        {datePickerOpen && (
          <div className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-xl p-3 w-[280px]" dir="rtl">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setCalendarMonth(new Date(y, m - 1, 1))} className="p-1 rounded hover:bg-[#f5f5f5] dark:hover:bg-[#262626]">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
                {formatDate(calendarMonth, 'MMMM yyyy', { locale: he })}
              </span>
              <button onClick={() => setCalendarMonth(new Date(y, m + 1, 1))} className="p-1 rounded hover:bg-[#f5f5f5] dark:hover:bg-[#262626]">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {['א','ב','ג','ד','ה','ו','ש'].map((d) => (
                <div key={d} className="text-center text-[10px] text-[#a3a3a3] py-0.5">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const isStart = day === customStartDate;
                const isEnd = day === effectiveEnd;
                const inRange = customStartDate && effectiveEnd && day > customStartDate && day < effectiveEnd;
                const isToday = day === today;
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => !pickingStart && !customEndDate && setHoverDate(day)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={`h-7 w-full text-xs transition-colors
                      ${isStart || isEnd ? 'bg-[#9fe870] text-[#0d0d12] font-semibold rounded-lg' : ''}
                      ${inRange ? 'bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa]' : ''}
                      ${!isStart && !isEnd && !inRange ? 'text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-lg' : ''}
                      ${isToday && !isStart && !isEnd ? 'font-bold underline' : ''}
                    `}
                  >
                    {parseInt(day.slice(8))}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 text-center text-[11px] text-[#a3a3a3]">
              {pickingStart ? 'לחץ על תאריך התחלה' : !customEndDate ? 'לחץ על תאריך סיום' : ''}
            </div>
          </div>
        )}
      </div>

      {children}

      {summary && (
        <div className="mr-auto text-sm text-[#737373] dark:text-[#a3a3a3]">{summary}</div>
      )}
    </div>
  );
};
