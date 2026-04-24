import React from 'react';
import { PageToolbar } from '../components/common/page-toolbar';

export const OperatingHoursPage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <PageToolbar
        title={'\u05e9\u05e2\u05d5\u05ea\u0020\u05e4\u05e2\u05d9\u05dc\u05d5\u05ea'}
        onToggleMobileSidebar={() => (window as any).toggleMobileSidebar?.()}
      />

      <div className="flex-1" />
    </div>
  );
};
