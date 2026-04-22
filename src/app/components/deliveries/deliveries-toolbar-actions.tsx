import React, { useState } from 'react';
import { Columns3, Download } from 'lucide-react';

import { ToolbarSearchControl } from '../common/toolbar-search-control';

type DeliveriesToolbarActionsProps = {
  searchQuery: string;
  columnsOpen: boolean;
  onSearchQueryChange: (value: string) => void;
  onToggleColumns: () => void;
  onOpenExport: () => void;
};

export const DeliveriesToolbarActions: React.FC<DeliveriesToolbarActionsProps> = ({
  searchQuery,
  columnsOpen,
  onSearchQueryChange,
  onToggleColumns,
  onOpenExport,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <ToolbarSearchControl
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        placeholder="חפש משלוח..."
        widthClass="w-48"
      />

      <div className="relative">
        <button
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
      </div>

      <button
        onClick={onOpenExport}
        className="flex h-9 items-center gap-1.5 rounded-[4px] border border-[#e5e5e5] bg-white px-3 text-sm font-medium text-[#525252] transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden md:inline">ייצוא</span>
      </button>
    </>
  );
};
