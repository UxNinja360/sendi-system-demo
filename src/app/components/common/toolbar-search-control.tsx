import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface ToolbarSearchControlProps {
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  placeholder: string;
  widthClass?: string;
}

export const ToolbarSearchControl: React.FC<ToolbarSearchControlProps> = ({
  searchOpen,
  onSearchOpenChange,
  searchQuery,
  onSearchQueryChange,
  placeholder,
  widthClass = 'w-48',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  return (
    <div className="relative flex items-center">
      {searchOpen ? (
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a3a3a3]" />
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              className={`${widthClass} h-9 rounded-[4px] border border-transparent bg-[#f5f5f5] pr-8 pl-6 text-sm text-[#0d0d12] outline-none transition-all placeholder:text-[#a3a3a3] focus:border-[#9fe870]/50 dark:bg-[#262626] dark:text-[#fafafa]`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:bg-[#e5e5e5] dark:hover:bg-[#333333]"
              >
                <X className="h-3 w-3 text-[#a3a3a3]" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onSearchOpenChange(false);
              onSearchQueryChange('');
            }}
            className="rounded p-1 transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
          >
            <X className="h-3.5 w-3.5 text-[#a3a3a3]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSearchOpenChange(true)}
          className={`flex h-9 w-9 items-center justify-center rounded-[4px] border text-sm font-medium transition-colors ${
            searchQuery
              ? 'border-[#9fe870]/40 bg-[#9fe870]/15 text-[#6bc84a]'
              : 'border-[#e5e5e5] bg-white text-[#525252] hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]'
          }`}
        >
          <Search className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
