import React from 'react';
import { Check, DollarSign, Menu, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DistancePricing } from './finance/distance-pricing';

export const DistancePricingPage: React.FC = () => {
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
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">תמחור לפי מרחק</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-6">
          <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white dark:border-[#1f1f1f] dark:bg-[#171717]">
            <div className="border-b border-[#e5e5e5] px-4 py-3 dark:border-[#1f1f1f]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#16a34a] dark:text-[#9fe870]" />
                  <span className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">טווחי מחיר</span>
                </div>

                <button
                  onClick={() => toast.info('הוספת טווח חדש - בבנייה', { icon: '🚧' })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-[#0a0a0a] dark:text-[#fafafa] dark:hover:bg-[#151515]"
                >
                  <Plus className="h-4 w-4" />
                  הוסף טווח
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4 md:p-5">
              <DistancePricing />

              <div className="rounded-xl border border-[#9fe870]/30 bg-[#ecfae2] p-4 dark:bg-[#163300]">
                <p className="text-sm text-[#36394a] dark:text-[#d4d4d4]">
                  <span className="font-bold text-[#0d0d12] dark:text-[#fafafa]">טיפ:</span>
                  {' '}
                  המערכת מחשבת אוטומטית את המרחק בין הנקודות ומחילה את התעריף המתאים.
                  כדאי לוודא שאין חפיפות בין הטווחים.
                </p>
              </div>
            </div>

            <div className="border-t border-[#e5e5e5] px-4 py-4 dark:border-[#1f1f1f]">
              <div className="flex flex-col justify-end gap-3 sm:flex-row">
                <button
                  onClick={handleSave}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9fe870] px-6 py-3 font-medium text-[#0d0d12] transition-all hover:bg-[#8ed75f] sm:w-auto"
                >
                  <Check className="h-4 w-4" />
                  שמור שינויים
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
