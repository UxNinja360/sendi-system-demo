import React from 'react';
import { Menu } from 'lucide-react';
import { CouriersShifts } from '../../components/entities/couriers-shifts';

const SHIFTS_PAGE_TITLE = '\u05e0\u05d9\u05d4\u05d5\u05dc \u05de\u05e9\u05de\u05e8\u05d5\u05ea';

export const CouriersPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <div className="shrink-0 h-16 flex items-stretch border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
        <div className="flex items-center gap-2.5 px-5">
          <button
            onClick={() => (window as any).toggleMobileSidebar?.()}
            className="md:hidden p-1.5 rounded-lg text-[#737373] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">{SHIFTS_PAGE_TITLE}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <CouriersShifts />
      </div>
    </div>
  );
};
