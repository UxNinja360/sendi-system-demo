import React from 'react';
import { Ruler } from 'lucide-react';

export const DistancePricing: React.FC = () => {
  return (
    <div className="space-y-3">
      {[
        { range: '0-2 ק״מ', price: '12', basePrice: true, active: true },
        { range: '2-5 ק״מ', price: '18', basePrice: false, active: true },
        { range: '5-10 ק״מ', price: '25', basePrice: false, active: true },
        { range: '10-15 ק״מ', price: '35', basePrice: false, active: true },
        { range: '15-20 ק״מ', price: '45', basePrice: false, active: false },
        { range: '20+ ק״מ', price: '60', basePrice: false, active: false },
      ].map((tier, idx) => (
        <div
          key={idx}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl border border-[#e5e5e5] dark:border-[#262626] gap-3"
        >
          <div className="flex items-center gap-4">
            <Ruler size={18} className="text-[#9fe870] shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{tier.range}</p>
                {tier.basePrice && (
                  <span className="text-[10px] font-bold text-[#9fe870] bg-[#ecfae2] dark:bg-[#163300] px-2 py-0.5 rounded-full">
                    מחיר בסיס
                  </span>
                )}
              </div>
              <p className="text-xs text-[#666d80] dark:text-[#a3a3a3]">מחיר למשלוח בטווח זה</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={tier.price}
                className="w-20 px-3 py-2 text-sm bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:border-[#9fe870] text-center font-bold"
              />
              <span className="text-sm font-medium text-[#666d80] dark:text-[#a3a3a3]">₪</span>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked={tier.active}
                className="w-4 h-4 rounded accent-[#9fe870]"
              />
              <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">פעיל</span>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
};
