import React from 'react';
import { Menu } from 'lucide-react';
import { ShipmentHub } from './finance/shipment-hub';

export const FinancesPage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa] dark:bg-[#0a0a0a]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-white px-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (window as any).toggleMobileSidebar?.()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#525252] transition-colors hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#262626] md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">יתרת משלוחים</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-6">
          <ShipmentHub />
        </div>
      </div>
    </div>
  );
};
