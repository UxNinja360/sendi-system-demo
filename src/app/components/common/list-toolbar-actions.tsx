import React, { useState } from 'react';
import { Columns3, Download } from 'lucide-react';

import { ToolbarSearchControl } from './toolbar-search-control';
import { ToolbarIconButton } from './toolbar-icon-button';

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
  const searchAsPrimaryControl =
    canRenderSearch && !canRenderColumnsToggle && !canRenderExportButton;

  return (
    <div
      className={`relative flex min-w-0 flex-nowrap items-center gap-1.5 ${
        searchAsPrimaryControl ? 'flex-1' : ''
      }`.trim()}
    >
      {canRenderSearch ? (
        <ToolbarSearchControl
          searchOpen={searchOpen}
          onSearchOpenChange={setSearchOpen}
          searchQuery={searchQuery ?? ''}
          onSearchQueryChange={onSearchQueryChange}
          placeholder={searchPlaceholder}
          widthClass={searchAsPrimaryControl ? 'w-full' : searchWidthClass}
          alwaysOpen={searchAsPrimaryControl}
        />
      ) : null}

      {canRenderColumnsToggle ? (
        <ToolbarIconButton
          onClick={onToggleColumns}
          label={TEXT.columns}
          title={TEXT.toggleColumns}
          active={columnsOpen}
        >
          <Columns3 className="h-3.5 w-3.5" />
        </ToolbarIconButton>
      ) : null}

      {canRenderExportButton ? (
        <ToolbarIconButton
          onClick={onExport}
          label={TEXT.export}
        >
          <Download className="h-3.5 w-3.5" />
        </ToolbarIconButton>
      ) : null}
    </div>
  );
};
