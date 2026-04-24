import React from 'react';
import { PageToolbar } from '../components/common/page-toolbar';
import { CouriersShifts } from '../couriers-shifts/couriers-shifts';

const SHIFTS_PAGE_TITLE = '\u05e0\u05d9\u05d4\u05d5\u05dc\u0020\u05de\u05e9\u05de\u05e8\u05d5\u05ea';

export const CouriersPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <PageToolbar
        title={SHIFTS_PAGE_TITLE}
        onToggleMobileSidebar={() => (window as any).toggleMobileSidebar?.()}
      />

      <div className="flex-1 overflow-hidden">
        <CouriersShifts />
      </div>
    </div>
  );
};
