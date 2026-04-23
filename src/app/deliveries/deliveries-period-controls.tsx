import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { he } from 'date-fns/locale';
import type { PeriodMode } from '../components/ui/period-toolbar';

interface DeliveriesPeriodControlsProps {
  periodMode: PeriodMode;
  setPeriodMode: React.Dispatch<React.SetStateAction<PeriodMode>>;
  monthAnchor: Date;
  setMonthAnchor: React.Dispatch<React.SetStateAction<Date>>;
  datePickerOpen: boolean;
  setDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  datePickerRef: React.RefObject<HTMLDivElement | null>;
  calendarMonth: Date;
  setCalendarMonth: React.Dispatch<React.SetStateAction<Date>>;
  hoverDate: string | null;
  setHoverDate: React.Dispatch<React.SetStateAction<string | null>>;
  pickingStart: boolean;
  setPickingStart: React.Dispatch<React.SetStateAction<boolean>>;
  customStartDate: string;
  setCustomStartDate: (value: string) => void;
  customEndDate: string;
  setCustomEndDate: (value: string) => void;
  setDateRange: (value: 'all' | 'today' | 'week' | 'month' | 'custom') => void;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export const DeliveriesPeriodControls: React.FC<DeliveriesPeriodControlsProps> = ({
  periodMode,
  setPeriodMode,
  monthAnchor,
  setMonthAnchor,
  datePickerOpen,
  setDatePickerOpen,
  datePickerRef,
  calendarMonth,
  setCalendarMonth,
  hoverDate,
  setHoverDate,
  pickingStart,
  setPickingStart,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  setDateRange,
  setCurrentPage,
}) => (
  <div className="relative flex items-center gap-1" ref={datePickerRef}>
    {periodMode !== 'custom_range' && (
      <button
        onClick={() => setMonthAnchor(v => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
        className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#e5e5e5] bg-white transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:hover:bg-[#202020]"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    )}

    <button
      onClick={() => setDatePickerOpen(v => !v)}
      className={`flex h-9 min-w-[150px] items-center justify-center gap-2 rounded-[4px] border px-4 text-sm font-medium transition-colors ${
        periodMode === 'custom_range'
          ? 'border-[#0d0d12] bg-[#0d0d12] text-white dark:border-[#fafafa] dark:bg-[#fafafa] dark:text-[#0d0d12]'
          : 'border-[#e5e5e5] bg-white text-[#0d0d12] dark:border-[#262626] dark:bg-[#171717] dark:text-[#fafafa]'
      }`}
    >
      <Calendar className="h-4 w-4 shrink-0 opacity-60" />
      {periodMode === 'custom_range' && customStartDate && customEndDate
        ? `${formatDate(new Date(customStartDate), 'dd/MM')} - ${formatDate(new Date(customEndDate), 'dd/MM/yyyy')}`
        : formatDate(monthAnchor, 'MMMM yyyy', { locale: he })}
    </button>

    {periodMode !== 'custom_range' && (
      <button
        onClick={() => setMonthAnchor(v => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
        className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#e5e5e5] bg-white transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:hover:bg-[#202020]"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    )}

    {periodMode === 'custom_range' && (
      <button
        onClick={() => {
          setPeriodMode('current_month');
          setDatePickerOpen(false);
          setCurrentPage(1);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#e5e5e5] bg-white transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:hover:bg-[#202020]"
        title="נקה טווח"
      >
        <X className="h-3.5 w-3.5 text-[#737373]" />
      </button>
    )}

    {datePickerOpen &&
      (() => {
        const today = formatDate(new Date(), 'yyyy-MM-dd');
        const y = calendarMonth.getFullYear();
        const m = calendarMonth.getMonth();
        const firstDay = new Date(y, m, 1).getDay();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const cells: (string | null)[] = Array(firstDay).fill(null);

        for (let d = 1; d <= daysInMonth; d++) {
          cells.push(formatDate(new Date(y, m, d), 'yyyy-MM-dd'));
        }

        while (cells.length % 7 !== 0) {
          cells.push(null);
        }

        const handleDayClick = (day: string) => {
          if (pickingStart || (customStartDate && day < customStartDate)) {
            setCustomStartDate(day);
            setCustomEndDate('');
            setDateRange('custom');
            setPeriodMode('custom_range');
            setPickingStart(false);
          } else {
            setCustomEndDate(day);
            setDateRange('custom');
            setPeriodMode('custom_range');
            setCurrentPage(1);
            setPickingStart(true);
            setDatePickerOpen(false);
          }
        };

        const effectiveEnd = hoverDate && !pickingStart && !customEndDate ? hoverDate : customEndDate;

        return (
          <div
            className="absolute top-full right-0 z-50 mt-1.5 w-[280px] rounded-xl border border-[#e5e5e5] bg-white p-3 shadow-xl dark:border-[#262626] dark:bg-[#171717]"
            dir="rtl"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => setCalendarMonth(new Date(y, m - 1, 1))}
                className="rounded p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
                {formatDate(calendarMonth, 'MMMM yyyy', { locale: he })}
              </span>
              <button
                onClick={() => setCalendarMonth(new Date(y, m + 1, 1))}
                className="rounded p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7">
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
                <div key={d} className="py-0.5 text-center text-[10px] text-[#a3a3a3]">
                  {d}
                </div>
              ))}
            </div>

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
                    className={`relative h-7 w-full text-xs transition-colors ${
                      isStart || isEnd ? 'z-10 rounded-lg bg-[#9fe870] font-semibold text-[#0d0d12]' : ''
                    } ${inRange ? 'bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa]' : ''} ${
                      !isStart && !isEnd && !inRange
                        ? 'rounded-lg text-[#0d0d12] hover:bg-[#f5f5f5] dark:text-[#fafafa] dark:hover:bg-[#262626]'
                        : ''
                    } ${isToday && !isStart && !isEnd ? 'font-bold underline' : ''}`}
                  >
                    {parseInt(day.slice(8))}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 text-center text-[11px] text-[#a3a3a3]">
              {pickingStart
                ? 'לחץ על תאריך התחלה'
                : customStartDate && !customEndDate
                  ? 'לחץ על תאריך סיום'
                  : ''}
            </div>
          </div>
        );
      })()}
  </div>
);

