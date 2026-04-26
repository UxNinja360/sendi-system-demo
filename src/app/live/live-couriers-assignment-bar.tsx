import React from 'react';
import { X } from 'lucide-react';

type LiveCouriersAssignmentBarProps = {
  assignmentMode: boolean;
  selectedDeliveryCount: number;
  selectedCourierId?: string | null;
  selectedCourierName?: string;
  onCancelAssignment?: () => void;
  onClearCourierSelection?: () => void;
  onConfirmAssignment?: () => void;
};

export const LiveCouriersAssignmentBar: React.FC<LiveCouriersAssignmentBarProps> = ({
  assignmentMode,
  selectedDeliveryCount,
  selectedCourierId,
  selectedCourierName,
  onCancelAssignment,
  onClearCourierSelection,
  onConfirmAssignment,
}) => {
  if (!assignmentMode) return null;

  return (
    <div className="sticky inset-x-0 bottom-0 z-20 mt-auto border-t border-[#e5e5e5] bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:border-app-border dark:bg-app-surface">
      {!selectedCourierId ? (
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-[#737373] dark:text-app-text-secondary">
            <span className="font-bold text-[#0d0d12] dark:text-app-text">{selectedDeliveryCount}</span>
            <span>{selectedDeliveryCount === 1 ? 'משלוח' : 'משלוחים'} — בחר שליח מהרשימה</span>
          </div>
          <button
            onClick={onCancelAssignment}
            className="rounded-lg p-1.5 transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
          >
            <X className="h-4 w-4 text-[#737373]" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClearCourierSelection}
            className="flex-shrink-0 rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm font-semibold text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:border-app-border dark:hover:bg-[#262626]"
          >
            חזור
          </button>
          <button
            onClick={onConfirmAssignment}
            className="flex-1 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[#22c55e]/20 transition-colors hover:bg-[#16a34a]"
          >
            ✓ אשר שיבוץ ל{selectedCourierName}
          </button>
        </div>
      )}
    </div>
  );
};

