import React from 'react';
import { PageToolbar } from '../components/common/page-toolbar';

export const DistancePricingPage: React.FC = () => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <PageToolbar
        title={'\u05ea\u05de\u05d7\u05d5\u05e8\u0020\u05dc\u05e4\u05d9\u0020\u05de\u05e8\u05d7\u05e7'}
        onToggleMobileSidebar={() => (window as any).toggleMobileSidebar?.()}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" />
    </div>
  );
};
