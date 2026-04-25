import React from 'react';
import { DeliveryBalanceHub } from '../delivery-balance/delivery-balance-hub';

export const DeliveryBalancePage: React.FC = () => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-6">
          <DeliveryBalanceHub />
        </div>
      </div>
    </div>
  );
};
