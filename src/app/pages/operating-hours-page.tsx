import React from 'react';
import { PageToolbar } from '../components/common/page-toolbar';

export const OperatingHoursPage: React.FC = () => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <PageToolbar
        title={'\u05e9\u05e2\u05d5\u05ea\u0020\u05e4\u05e2\u05d9\u05dc\u05d5\u05ea'}
        onToggleMobileSidebar={() => (window as any).toggleMobileSidebar?.()}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" />
    </div>
  );
};
