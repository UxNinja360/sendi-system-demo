import React from 'react';
import { Columns3, Download, Search, X } from 'lucide-react';

type DeliveriesToolbarActionsProps = {
  searchRef: React.RefObject<HTMLDivElement | null>;
  searchOpen: boolean;
  searchQuery: string;
  columnsOpen: boolean;
  onSearchQueryChange: (value: string) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onClearSearch: () => void;
  onToggleColumns: () => void;
  onOpenExport: () => void;
};

export const DeliveriesToolbarActions: React.FC<DeliveriesToolbarActionsProps> = ({
  searchRef,
  searchOpen,
  searchQuery,
  columnsOpen,
  onSearchQueryChange,
  onOpenSearch,
  onCloseSearch,
  onClearSearch,
  onToggleColumns,
  onOpenExport,
}) => {
  return (
    <>
      <div className="relative flex items-center" ref={searchRef}>
        {searchOpen ? (
          <div className="flex items-center gap-1">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3] pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="חפש משלוח..."
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                className="w-48 h-9 pr-8 pl-6 bg-[#f5f5f5] dark:bg-[#262626] border border-transparent focus:border-[#9fe870]/50 rounded-[4px] text-sm text-[#0d0d12] dark:text-[#fafafa] placeholder-[#a3a3a3] outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={onClearSearch}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[#e5e5e5] dark:hover:bg-[#262626] transition-colors"
                >
                  <X className="w-3 h-3 text-[#a3a3a3]" />
                </button>
              )}
            </div>
            <button
              onClick={onCloseSearch}
              className="p-1 rounded hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#a3a3a3]" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenSearch}
            className={`flex items-center justify-center w-9 h-9 rounded-[4px] border text-sm font-medium transition-colors ${
              searchQuery
                ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
                : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="relative">
        <button
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

      <button
        onClick={onOpenExport}
        className="h-9 flex items-center gap-1.5 px-3 rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] text-sm font-medium text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden md:inline">ייצוא</span>
      </button>
    </>
  );
};
