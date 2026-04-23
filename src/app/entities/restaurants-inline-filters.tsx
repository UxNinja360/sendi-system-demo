import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface RestaurantsInlineFiltersProps {
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusChange: (status: 'all' | 'active' | 'inactive') => void;
  cityFilter: string;
  onCityChange: (city: string) => void;
  typeFilter: string;
  onTypeChange: (type: string) => void;
  cityOptions: string[];
  typeOptions: string[];
  statusCounts: { all: number; active: number; inactive: number };
}

const STATUS_LABELS: Record<string, string> = { all: 'סטטוס', active: 'פעיל', inactive: 'לא פעיל' };

const btnBase = 'h-9 flex items-center gap-1.5 px-3 rounded-[4px] text-sm font-medium transition-colors whitespace-nowrap';
const btnInactive = 'bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f1f]';
const btnActive = 'bg-[#9fe870]/15 border border-[#9fe870]/40 text-[#6bc84a]';

export const RestaurantsInlineFilters: React.FC<RestaurantsInlineFiltersProps> = ({
  statusFilter,
  onStatusChange,
  cityFilter,
  onCityChange,
  typeFilter,
  onTypeChange,
  cityOptions,
  typeOptions,
  statusCounts,
}) => {
  const [statusOpen, setStatusOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!statusRef.current?.contains(e.target as Node)) setStatusOpen(false);
      if (!cityRef.current?.contains(e.target as Node)) setCityOpen(false);
      if (!typeRef.current?.contains(e.target as Node)) setTypeOpen(false);
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
          onClick={() => { setStatusOpen(v => !v); setCityOpen(false); setTypeOpen(false); }}
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
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button key={s} onClick={() => { onStatusChange(s); setStatusOpen(false); }} className={`${itemBase} ${statusFilter === s ? itemActive : itemInactive}`}>
                {statusFilter === s ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                <span className="flex-1">{STATUS_LABELS[s]}</span>
                <span className="text-[10px] bg-[#f5f5f5] dark:bg-[#262626] px-1.5 py-0.5 rounded-full font-bold">{statusCounts[s]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* City filter */}
      <div className="relative" ref={cityRef}>
        <button
          onClick={() => { setCityOpen(v => !v); setStatusOpen(false); setTypeOpen(false); }}
          className={`${btnBase} ${cityFilter !== 'all' ? btnActive : btnInactive}`}
        >
          <span>{cityFilter === 'all' ? 'עיר' : cityFilter}</span>
          {cityFilter !== 'all' ? (
            <>
              <span className="bg-[#9fe870] text-[#0d0d12] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">1</span>
              <span
                role="button"
                onClick={e => { e.stopPropagation(); onCityChange('all'); setCityOpen(false); }}
                className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            </>
          ) : (
            <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
          )}
        </button>
        {cityOpen && (
          <div className={`${dropdownClass} max-h-64 overflow-y-auto`}>
            <button onClick={() => { onCityChange('all'); setCityOpen(false); }} className={`${itemBase} ${cityFilter === 'all' ? itemActive : itemInactive}`}>
              {cityFilter === 'all' ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
              <span className="flex-1">כל הערים</span>
            </button>
            {cityOptions.map(city => (
              <button key={city} onClick={() => { onCityChange(city); setCityOpen(false); }} className={`${itemBase} ${cityFilter === city ? itemActive : itemInactive}`}>
                {cityFilter === city ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                <span className="flex-1">{city}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Type filter */}
      <div className="relative" ref={typeRef}>
        <button
          onClick={() => { setTypeOpen(v => !v); setStatusOpen(false); setCityOpen(false); }}
          className={`${btnBase} ${typeFilter !== 'all' ? btnActive : btnInactive}`}
        >
          <span>{typeFilter === 'all' ? 'סוג' : typeFilter}</span>
          {typeFilter !== 'all' ? (
            <>
              <span className="bg-[#9fe870] text-[#0d0d12] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">1</span>
              <span
                role="button"
                onClick={e => { e.stopPropagation(); onTypeChange('all'); setTypeOpen(false); }}
                className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            </>
          ) : (
            <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${typeOpen ? 'rotate-180' : ''}`} />
          )}
        </button>
        {typeOpen && (
          <div className={`${dropdownClass} max-h-64 overflow-y-auto`}>
            <button onClick={() => { onTypeChange('all'); setTypeOpen(false); }} className={`${itemBase} ${typeFilter === 'all' ? itemActive : itemInactive}`}>
              {typeFilter === 'all' ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
              <span className="flex-1">כל הסוגים</span>
            </button>
            {typeOptions.map(type => (
              <button key={type} onClick={() => { onTypeChange(type); setTypeOpen(false); }} className={`${itemBase} ${typeFilter === type ? itemActive : itemInactive}`}>
                {typeFilter === type ? <Check className="w-3.5 h-3.5 text-[#16a34a] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                <span className="flex-1">{type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

