import React, { useState } from 'react';
import { Columns3, Download } from 'lucide-react';

import { ToolbarSearchControl } from './toolbar-search-control';

const TEXT = {
  columns: '\u05e2\u05de\u05d5\u05d3\u05d5\u05ea',
  export: '\u05d9\u05d9\u05e6\u05d5\u05d0',
  toggleColumns:
    '\u05d4\u05e6\u05d2\u0020\u05d0\u05d5\u0020\u05d4\u05e1\u05ea\u05e8\u0020\u05e2\u05de\u05d5\u05d3\u05d5\u05ea',
} as const;

type ListToolbarActionsProps = {
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchWidthClass?: string;
  showSearch?: boolean;
  showColumnsToggle?: boolean;
  showExportButton?: boolean;
  columnsOpen?: boolean;
  onToggleColumns?: () => void;
  onExport?: () => void;
};

export const ListToolbarActions: React.FC<ListToolbarActionsProps> = ({
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  searchWidthClass = 'w-48',
  showSearch = true,
  showColumnsToggle = true,
  showExportButton = true,
  columnsOpen = false,
  onToggleColumns,
  onExport,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const canRenderSearch = showSearch && onSearchQueryChange && searchPlaceholder;
  const canRenderColumnsToggle = showColumnsToggle && onToggleColumns;
  const canRenderExportButton = showExportButton && onExport;

  return (
    <div className="relative flex flex-nowrap items-center gap-1.5">
      {canRenderSearch ? (
        <ToolbarSearchControl
          searchOpen={searchOpen}
          onSearchOpenChange={setSearchOpen}
          searchQuery={searchQuery ?? ''}
          onSearchQueryChange={onSearchQueryChange}
          placeholder={searchPlaceholder}
          widthClass={searchWidthClass}
        />
      ) : null}

      {canRenderColumnsToggle ? (
        <button
          type="button"
          onClick={onToggleColumns}
          title={TEXT.toggleColumns}
          aria-label={TEXT.columns}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
            columnsOpen
              ? 'border-[#e5e5e5] bg-[#f5f5f5] text-[#0d0d12] dark:border-[#262626] dark:bg-[#262626] dark:text-[#fafafa]'
              : 'border-[#e5e5e5] bg-white text-[#525252] hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]'
          }`}
        >
          <Columns3 className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {canRenderExportButton ? (
        <button
          type="button"
          onClick={onExport}
          title={TEXT.export}
          aria-label={TEXT.export}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[#e5e5e5] bg-white text-[#525252] transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
};
