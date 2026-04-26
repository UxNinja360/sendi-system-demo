import React from 'react';
import { CouriersShifts } from '../couriers-shifts/couriers-shifts';

export const CouriersPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-app-background" dir="rtl">
      <div className="flex-1 overflow-hidden">
        <CouriersShifts />
      </div>
    </div>
  );
};
