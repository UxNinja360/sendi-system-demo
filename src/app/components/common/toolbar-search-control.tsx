import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ToolbarIconButton } from './toolbar-icon-button';
import {
  getToolbarSearchShellClassName,
  toolbarSearchClearButtonClassName,
  toolbarSearchIconClassName,
  toolbarSearchInputClassName,
} from './toolbar-search-primitives';

interface ToolbarSearchControlProps {
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  placeholder: string;
  widthClass?: string;
  alwaysOpen?: boolean;
}

const TEXT = {
  search: '\u05d7\u05d9\u05e4\u05d5\u05e9',
  close: '\u05e1\u05d2\u05d5\u05e8',
} as const;

export const ToolbarSearchControl: React.FC<ToolbarSearchControlProps> = ({
  searchOpen,
  onSearchOpenChange,
  searchQuery,
  onSearchQueryChange,
  placeholder,
  widthClass = 'w-48',
  alwaysOpen = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const isSearchVisible = alwaysOpen || searchOpen;

  useEffect(() => {
    if (searchOpen && !alwaysOpen) {
      inputRef.current?.focus();
    }
  }, [alwaysOpen, searchOpen]);

  return (
    <div className={alwaysOpen ? 'relative flex min-w-0 flex-1 items-center' : 'relative flex items-center'}>
      {isSearchVisible ? (
        <div className={alwaysOpen ? 'flex min-w-0 flex-1 items-center gap-1' : 'flex items-center gap-1'}>
          <div className={alwaysOpen ? 'relative min-w-0 flex-1' : 'relative'}>
            <Search className={toolbarSearchIconClassName} />
            <div
              className={getToolbarSearchShellClassName({
                active: inputFocused,
                widthClass: alwaysOpen ? 'w-full' : widthClass,
              })}
              onClick={() => inputRef.current?.focus()}
            >
              <input
                ref={inputRef}
                type="text"
                data-haptic="light"
                placeholder={placeholder}
                value={searchQuery}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                className={toolbarSearchInputClassName}
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                data-haptic="light"
                onClick={() => onSearchQueryChange('')}
                className={toolbarSearchClearButtonClassName}
              >
                <X className="h-3 w-3 text-app-text-muted" />
              </button>
            )}
          </div>
          {alwaysOpen ? null : (
            <button
              type="button"
              data-haptic="light"
              onClick={() => {
                onSearchOpenChange(false);
                onSearchQueryChange('');
              }}
              title={TEXT.close}
              aria-label={TEXT.close}
              className="rounded p-1 transition-colors hover:bg-app-surface-raised dark:hover:bg-[#262626]"
            >
              <X className="h-3.5 w-3.5 text-app-text-muted" />
            </button>
          )}
        </div>
      ) : (
        <ToolbarIconButton
          onClick={() => onSearchOpenChange(true)}
          label={TEXT.search}
          active={Boolean(searchQuery)}
        >
          <Search className="h-4 w-4" />
        </ToolbarIconButton>
      )}
    </div>
  );
};
