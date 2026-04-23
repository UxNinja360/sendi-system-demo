import React, { useState } from 'react';
import { Columns3, Download } from 'lucide-react';

import { ToolbarSearchControl } from './toolbar-search-control';

type ListToolbarActionsProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchPlaceholder: string;
  searchWidthClass?: string;
  columnsOpen: boolean;
  onToggleColumns: () => void;
  onExport?: () => void;
};

export const ListToolbarActions: React.FC<ListToolbarActionsProps> = ({
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  searchWidthClass = 'w-48',
  columnsOpen,
  onToggleColumns,
  onExport,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-1.5">
      <ToolbarSearchControl
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        placeholder={searchPlaceholder}
        widthClass={searchWidthClass}
      />

      <button
        type="button"
        onClick={onToggleColumns}
        className={`flex h-9 items-center gap-1.5 rounded-[4px] border px-3 text-sm font-medium transition-colors ${
          columnsOpen
            ? 'border-[#e5e5e5] bg-[#f5f5f5] text-[#0d0d12] dark:border-[#262626] dark:bg-[#262626] dark:text-[#fafafa]'
            : 'border-[#e5e5e5] bg-white text-[#525252] hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]'
        }`}
        title="הצג/הסתר עמודות"
      >
        <Columns3 className="h-3.5 w-3.5" />
        <span>עמודות</span>
      </button>

      {onExport ? (
        <button
          type="button"
          onClick={onExport}
          className="flex h-9 items-center gap-1.5 rounded-[4px] border border-[#e5e5e5] bg-white px-3 text-sm font-medium text-[#525252] transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">ייצוא</span>
        </button>
      ) : null}
    </div>
  );
};
