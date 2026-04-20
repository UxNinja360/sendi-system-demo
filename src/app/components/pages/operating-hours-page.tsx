import React from 'react';
import { Check, Menu } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export const OperatingHoursPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSave = () => {
    toast.success('השינויים נשמרו בהצלחה', { icon: '✅' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-white px-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (window as any).toggleMobileSidebar?.()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#525252] transition-colors hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#262626] md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">שעות פעילות</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[90rem] flex flex-col gap-5">
          {DAYS.map((day, index) => (
            <div
              key={day}
              className="flex flex-col gap-3 rounded-xl border border-[#e5e5e5] bg-white px-6 py-5 dark:border-[#1f1f1f] dark:bg-[#171717] md:flex-row md:items-center md:justify-between"
            >
              <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa] md:w-20">{day}</span>

              <div className="flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center md:w-auto">
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <input
                    type="time"
                    defaultValue="09:00"
                    className="flex-1 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#0d0d12] outline-none transition-all focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/20 dark:border-[#262626] dark:bg-[#171717] dark:text-[#fafafa] sm:flex-none"
                  />
                  <span className="font-medium text-[#666d80] dark:text-[#a3a3a3]">—</span>
                  <input
                    type="time"
                    defaultValue="22:00"
                    className="flex-1 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#0d0d12] outline-none transition-all focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/20 dark:border-[#262626] dark:bg-[#171717] dark:text-[#fafafa] sm:flex-none"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked={index < 6}
                    className="h-4 w-4 rounded accent-[#9fe870]"
                  />
                  <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">פעיל</span>
                </label>
              </div>
            </div>
          ))}

          <div className="flex justify-start pt-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-[#9fe870] px-6 py-3 font-medium text-[#0d0d12] transition-all hover:bg-[#8ed75f]"
            >
              <Check className="h-4 w-4" />
              שמור שינויים
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
