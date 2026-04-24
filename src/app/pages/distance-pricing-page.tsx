import React from 'react';
import { PageToolbar } from '../components/common/page-toolbar';

export const DistancePricingPage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <PageToolbar
        title={'\u05ea\u05de\u05d7\u05d5\u05e8\u0020\u05dc\u05e4\u05d9\u0020\u05de\u05e8\u05d7\u05e7'}
        onToggleMobileSidebar={() => (window as any).toggleMobileSidebar?.()}
      />

      <div className="flex-1" />
    </div>
  );
};
