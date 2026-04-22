import React, { useState } from 'react';
import { Columns3 } from 'lucide-react';

import { ToolbarSearchControl } from '../../common/toolbar-search-control';

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

  return (
    <div className="relative flex items-center gap-1.5">
      <ToolbarSearchControl
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchChange}
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
    </div>
  );
};
