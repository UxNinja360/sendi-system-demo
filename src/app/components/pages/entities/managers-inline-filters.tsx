import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface ManagersInlineFiltersProps {
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusChange: (status: 'all' | 'active' | 'inactive') => void;
  roleFilter: 'all' | 'admin' | 'supervisor' | 'support';
  onRoleChange: (role: 'all' | 'admin' | 'supervisor' | 'support') => void;
  sortBy: 'name' | 'role' | 'rating' | 'actions';
  onSortChange: (sort: 'name' | 'role' | 'rating' | 'actions') => void;
  statusCounts: {
    all: number;
    active: number;
    inactive: number;
  };
  roleCounts: {
    all: number;
    admin: number;
    supervisor: number;
    support: number;
  };
}

export const ManagersInlineFilters: React.FC<ManagersInlineFiltersProps> = ({
  statusFilter,
  onStatusChange,
  roleFilter,
  onRoleChange,
  sortBy,
  onSortChange,
  statusCounts,
  roleCounts,
}) => {
  const [statusOpen, setStatusOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusLabels = {
    all: 'סטטוס',
    active: 'פעיל',
    inactive: 'לא פעיל',
  };

  const roleLabels = {
    all: 'תפקיד',
    admin: 'מנהל ראשי',
    supervisor: 'מפקח',
    support: 'תמיכה',
  };

  const sortLabels = {
    name: 'מיון: שם',
    role: 'מיון: תפקיד',
    rating: 'מיון: דירוג',
    actions: 'מיון: פעולות',
  };

  const btnBase = 'h-9 flex items-center gap-1.5 px-3 rounded-[4px] text-sm font-medium transition-colors whitespace-nowrap';
  const btnInactive = 'bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f1f]';
  const btnActive = 'bg-[#9fe870]/15 border border-[#9fe870]/40 text-[#6bc84a]';
  const dropdownClass = 'absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-[4px] shadow-xl py-1 min-w-[180px]';
  const itemBase = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-right transition-colors';
  const itemActive = 'text-[#16a34a] bg-[#f0fdf4] dark:bg-[#052e16]';
  const itemInactive = 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div ref={statusRef} className="relative">
        <button
          onClick={() => { setStatusOpen(v => !v); setRoleOpen(false); setSortOpen(false); }}
          className={`${btnBase} ${statusFilter !== 'all' ? btnActive : btnInactive}`}
        >
          <span>{statusLabels[statusFilter]}</span>
          {statusFilter !== 'all' ? (
            <>
              <span className="bg-[#9fe870] text-[#0d0d12] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">1</span>
              <span
                role="button"
                onClick={e => { e.stopPropagation(); onStatusChange('all'); setStatusOpen(false); }}
                className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            </>
          ) : (
            <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
          )}
        </button>

        {statusOpen && (
          <div className={dropdownClass}>
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button key={s} onClick={() => { onStatusChange(s); setStatusOpen(false); }} className={`${itemBase} ${statusFilter === s ? itemActive : itemInactive}`}>
                {statusFilter === s ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                <span className="flex-1">{statusLabels[s]}</span>
                <span className="text-[10px] bg-[#f5f5f5] dark:bg-[#262626] px-1.5 py-0.5 rounded-full font-bold">{statusCounts[s]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={roleRef} className="relative">
        <button
          onClick={() => { setRoleOpen(v => !v); setStatusOpen(false); setSortOpen(false); }}
          className={`${btnBase} ${roleFilter !== 'all' ? btnActive : btnInactive}`}
        >
          <span>{roleLabels[roleFilter]}</span>
          {roleFilter !== 'all' ? (
            <>
              <span className="bg-[#9fe870] text-[#0d0d12] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">1</span>
              <span
                role="button"
                onClick={e => { e.stopPropagation(); onRoleChange('all'); setRoleOpen(false); }}
                className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            </>
          ) : (
            <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${roleOpen ? 'rotate-180' : ''}`} />
          )}
        </button>

        {roleOpen && (
          <div className={dropdownClass}>
            {(['all', 'admin', 'supervisor', 'support'] as const).map(r => (
              <button key={r} onClick={() => { onRoleChange(r); setRoleOpen(false); }} className={`${itemBase} ${roleFilter === r ? itemActive : itemInactive}`}>
                {roleFilter === r ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                <span className="flex-1">{roleLabels[r]}</span>
                <span className="text-[10px] bg-[#f5f5f5] dark:bg-[#262626] px-1.5 py-0.5 rounded-full font-bold">{roleCounts[r]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={sortRef} className="relative">
        <button
          onClick={() => { setSortOpen(v => !v); setStatusOpen(false); setRoleOpen(false); }}
          className={`${btnBase} ${sortBy !== 'name' ? btnActive : btnInactive}`}
        >
          <span>{sortLabels[sortBy]}</span>
          <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
        </button>

        {sortOpen && (
          <div className={dropdownClass}>
            {(['name', 'role', 'rating', 'actions'] as const).map(s => (
              <button key={s} onClick={() => { onSortChange(s); setSortOpen(false); }} className={`${itemBase} ${sortBy === s ? itemActive : itemInactive}`}>
                {sortBy === s ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                <span className="flex-1">{sortLabels[s]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
