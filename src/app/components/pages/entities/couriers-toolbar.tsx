import React, { useState, useRef, useEffect } from 'react';
import { Columns3, Search, X } from 'lucide-react';

interface CouriersToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stats: {
    total: number;
    filtered: number;
    available: number;
    busy: number;
  };
  onAddCourier: () => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onToggleColumns: () => void;
  columnsOpen: boolean;
}

export const CouriersToolbar: React.FC<CouriersToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onToggleColumns,
  columnsOpen,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  return (
    <div className="relative flex items-center gap-1.5">
      {searchOpen ? (
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a3a3a3]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="חפש שליח או מספר טלפון..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-48 h-9 rounded-[4px] border border-transparent bg-[#f5f5f5] pl-6 pr-8 text-sm text-[#0d0d12] outline-none transition-all placeholder:text-[#a3a3a3] focus:border-[#9fe870]/50 dark:bg-[#262626] dark:text-[#fafafa]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:bg-[#e5e5e5] dark:hover:bg-[#333333]"
              >
                <X className="h-3 w-3 text-[#a3a3a3]" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setSearchOpen(false); onSearchChange(''); }}
            className="flex items-center justify-center w-9 h-9 rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors"
          >
            <X className="w-3.5 h-3.5 text-[#a3a3a3]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className={`flex items-center justify-center w-9 h-9 rounded-[4px] border text-sm font-medium transition-colors ${
            searchQuery
              ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
              : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
          }`}
        >
          <Search className="w-4 h-4" />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleColumns}
        className={`h-9 flex items-center gap-1.5 px-3 rounded-[4px] border text-sm font-medium transition-colors ${
          columnsOpen
            ? 'bg-[#f5f5f5] dark:bg-[#262626] border-[#e5e5e5] dark:border-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
            : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
        }`}
        title="הצג/הסתר עמודות"
      >
        <Columns3 className="w-3.5 h-3.5" />
        <span>עמודות</span>
      </button>
    </div>
  );
};
