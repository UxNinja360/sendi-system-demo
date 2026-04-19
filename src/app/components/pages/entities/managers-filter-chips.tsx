import React from 'react';
import { X } from 'lucide-react';

interface ManagersFilterChipsProps {
  statusFilter: 'all' | 'active' | 'inactive';
  onClearStatus: () => void;
  roleFilter: 'all' | 'admin' | 'supervisor' | 'support';
  onClearRole: () => void;
  searchQuery: string;
  onClearSearch: () => void;
  onClearAll: () => void;
}

export const ManagersFilterChips: React.FC<ManagersFilterChipsProps> = ({
  statusFilter,
  onClearStatus,
  roleFilter,
  onClearRole,
  searchQuery,
  onClearSearch,
  onClearAll,
}) => {
  const hasAnyFilter = statusFilter !== 'all' || roleFilter !== 'all' || searchQuery;

  if (!hasAnyFilter) return null;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'פעיל';
      case 'inactive': return 'לא פעיל';
      default: return '';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'מנהל ראשי';
      case 'supervisor': return 'מפקח';
      case 'support': return 'תמיכה';
      default: return '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[#737373] dark:text-[#a3a3a3]">מסננים פעילים:</span>

      {/* Status Chip */}
      {statusFilter !== 'all' && (
        <button
          onClick={onClearStatus}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#ecfae2] dark:bg-[#163300] text-[#0d0d12] dark:text-[#9fe870] rounded-lg text-xs font-medium hover:bg-[#d9f5c7] dark:hover:bg-[#1f4400] transition-all"
        >
          <span>{`סטטוס: ${getStatusLabel(statusFilter)}`}</span>
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Role Chip */}
      {roleFilter !== 'all' && (
        <button
          onClick={onClearRole}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#dbeafe] dark:bg-[#1e3a8a] text-[#1e40af] dark:text-[#93c5fd] rounded-lg text-xs font-medium hover:bg-[#bfdbfe] dark:hover:bg-[#1e40af] transition-all"
        >
          <span>{`תפקיד: ${getRoleLabel(roleFilter)}`}</span>
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Search Chip */}
      {searchQuery && (
        <button
          onClick={onClearSearch}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f3e8ff] dark:bg-[#581c87] text-[#6b21a8] dark:text-[#e9d5ff] rounded-lg text-xs font-medium hover:bg-[#e9d5ff] dark:hover:bg-[#6b21a8] transition-all"
        >
          <span>{`חיפוש: "${searchQuery}"`}</span>
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Clear All */}
      {(statusFilter !== 'all' || roleFilter !== 'all' || searchQuery) && (
        <button
          onClick={onClearAll}
          className="text-xs text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa] underline transition-colors"
        >
          נקה הכל
        </button>
      )}
    </div>
  );
};