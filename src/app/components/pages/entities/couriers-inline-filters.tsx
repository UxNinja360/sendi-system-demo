import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface CouriersInlineFiltersProps {
  statusFilter: 'all' | 'available' | 'busy' | 'offline';
  onStatusChange: (status: 'all' | 'available' | 'busy' | 'offline') => void;
  deliveryFilter: 'all' | 'with_delivery' | 'without_delivery';
  onDeliveryChange: (filter: 'all' | 'with_delivery' | 'without_delivery') => void;
  sortBy: 'name' | 'rating' | 'deliveries' | 'status';
  onSortChange: (sort: 'name' | 'rating' | 'deliveries' | 'status') => void;
  statusCounts: {
    all: number;
    available: number;
    busy: number;
    offline: number;
  };
}

const STATUS_LABELS = { all: 'סטטוס', available: 'זמין', busy: 'תפוס', offline: 'לא מחובר' };
const DELIVERY_LABELS = { all: 'משלוחים', with_delivery: 'עם משלוח פעיל', without_delivery: 'ללא משלוח' };
const SORT_LABELS = { name: 'מיון: שם', rating: 'מיון: דירוג', deliveries: 'מיון: משלוחים', status: 'מיון: סטטוס' };

const btnBase = 'h-9 flex items-center gap-1.5 px-3 rounded-[4px] text-sm font-medium transition-colors whitespace-nowrap';
const btnInactive = 'bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f1f]';
const btnActive = 'bg-[#9fe870]/15 border border-[#9fe870]/40 text-[#6bc84a]';

export const CouriersInlineFilters: React.FC<CouriersInlineFiltersProps> = ({
  statusFilter,
  onStatusChange,
  deliveryFilter,
  onDeliveryChange,
  sortBy,
  onSortChange,
  statusCounts,
}) => {
  const [statusOpen, setStatusOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!statusRef.current?.contains(e.target as Node)) setStatusOpen(false);
      if (!deliveryRef.current?.contains(e.target as Node)) setDeliveryOpen(false);
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dropdownClass = 'absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-[4px] shadow-xl py-1 min-w-[180px]';
  const itemBase = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-right transition-colors';
  const itemActive = 'text-[#16a34a] bg-[#f0fdf4] dark:bg-[#052e16]';
  const itemInactive = 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]';

  return (
    <div className="hidden md:contents">

      {/* Status filter */}
      <div className="relative" ref={statusRef}>
        <button
          onClick={() => { setStatusOpen(v => !v); setDeliveryOpen(false); setSortOpen(false); }}
          className={`${btnBase} ${statusFilter !== 'all' ? btnActive : btnInactive}`}
        >
          <span>{STATUS_LABELS[statusFilter]}</span>
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
            {(['all', 'available', 'busy', 'offline'] as const).map(s => (
              <button key={s} onClick={() => { onStatusChange(s); setStatusOpen(false); }} className={`${itemBase} ${statusFilter === s ? itemActive : itemInactive}`}>
                {statusFilter === s ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                <span className="flex-1">{STATUS_LABELS[s]}</span>
                {s !== 'all' && <span className="text-[10px] bg-[#f5f5f5] dark:bg-[#262626] px-1.5 py-0.5 rounded-full font-bold">{statusCounts[s]}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Delivery filter */}
      <div className="relative" ref={deliveryRef}>
        <button
          onClick={() => { setDeliveryOpen(v => !v); setStatusOpen(false); setSortOpen(false); }}
          className={`${btnBase} ${deliveryFilter !== 'all' ? btnActive : btnInactive}`}
        >
          <span>{DELIVERY_LABELS[deliveryFilter]}</span>
          {deliveryFilter !== 'all' ? (
            <>
              <span className="bg-[#9fe870] text-[#0d0d12] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">1</span>
              <span
                role="button"
                onClick={e => { e.stopPropagation(); onDeliveryChange('all'); setDeliveryOpen(false); }}
                className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            </>
          ) : (
            <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${deliveryOpen ? 'rotate-180' : ''}`} />
          )}
        </button>
        {deliveryOpen && (
          <div className={dropdownClass}>
            {(['all', 'with_delivery', 'without_delivery'] as const).map(d => (
              <button key={d} onClick={() => { onDeliveryChange(d); setDeliveryOpen(false); }} className={`${itemBase} ${deliveryFilter === d ? itemActive : itemInactive}`}>
                {deliveryFilter === d ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                <span className="flex-1">{DELIVERY_LABELS[d]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort */}
      <div className="relative" ref={sortRef}>
        <button
          onClick={() => { setSortOpen(v => !v); setStatusOpen(false); setDeliveryOpen(false); }}
          className={`${btnBase} ${sortBy !== 'name' ? btnActive : btnInactive}`}
        >
          <span>{SORT_LABELS[sortBy]}</span>
          <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
        </button>
        {sortOpen && (
          <div className={dropdownClass}>
            {(['name', 'rating', 'deliveries', 'status'] as const).map(s => (
              <button key={s} onClick={() => { onSortChange(s); setSortOpen(false); }} className={`${itemBase} ${sortBy === s ? itemActive : itemInactive}`}>
                {sortBy === s ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                <span className="flex-1">{SORT_LABELS[s]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
