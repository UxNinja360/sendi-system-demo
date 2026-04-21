import React, { useEffect, useRef, useState } from 'react';
import { Columns3, Search, X } from 'lucide-react';

interface EntityToolbarControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder: string;
  searchWidthClass?: string;
  onToggleColumns: () => void;
  columnsOpen: boolean;
}

export const EntityToolbarControls: React.FC<EntityToolbarControlsProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  searchWidthClass = 'w-52',
  onToggleColumns,
  columnsOpen,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
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
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className={`${searchWidthClass} h-9 rounded-[4px] border border-transparent bg-[#f5f5f5] pl-6 pr-8 text-sm text-[#0d0d12] outline-none transition-all placeholder:text-[#a3a3a3] focus:border-[#9fe870]/50 dark:bg-[#262626] dark:text-[#fafafa]`}
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
            onClick={() => {
              setSearchOpen(false);
              onSearchChange('');
            }}
            className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#e5e5e5] bg-white transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:hover:bg-[#202020]"
          >
            <X className="h-3.5 w-3.5 text-[#a3a3a3]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className={`flex h-9 w-9 items-center justify-center rounded-[4px] border text-sm font-medium transition-colors ${
            searchQuery
              ? 'border-[#9fe870]/40 bg-[#9fe870]/15 text-[#6bc84a]'
              : 'border-[#e5e5e5] bg-white text-[#525252] hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]'
          }`}
        >
          <Search className="h-4 w-4" />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleColumns}
        className={`flex h-9 items-center gap-1.5 rounded-[4px] border px-3 text-sm font-medium transition-colors ${
          columnsOpen
            ? 'border-[#e5e5e5] bg-[#f5f5f5] text-[#0d0d12] dark:border-[#262626] dark:bg-[#262626] dark:text-[#fafafa]'
            : 'border-[#e5e5e5] bg-white text-[#525252] hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]'
        }`}
        title={'\u05d4\u05e6\u05d2/\u05d4\u05e1\u05ea\u05e8 \u05e2\u05de\u05d5\u05d3\u05d5\u05ea'}
      >
        <Columns3 className="h-3.5 w-3.5" />
        <span>{'\u05e2\u05de\u05d5\u05d3\u05d5\u05ea'}</span>
      </button>
    </div>
  );
};
