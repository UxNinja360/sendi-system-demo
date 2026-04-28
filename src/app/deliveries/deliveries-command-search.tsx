import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bike, Check, Search, Store, X } from 'lucide-react';

type CommandKind = 'restaurants' | 'couriers';

type CommandOption = {
  id: string;
  label: string;
  subtitle?: string;
  count?: number;
};

type ActiveToken = {
  key: string;
  kind: CommandKind | 'search';
  label: string;
  value: string;
  onRemove: () => void;
};

type DeliveriesCommandSearchProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  restaurantOptions: CommandOption[];
  selectedRestaurants: Set<string>;
  setSelectedRestaurants: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleRestaurant: (id: string) => void;
  courierOptions: CommandOption[];
  selectedCouriers: Set<string>;
  setSelectedCouriers: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleCourier: (id: string) => void;
  setCurrentPage: (page: number) => void;
};

const TEXT = {
  placeholder: 'חיפוש משלוחים',
  filters: 'פילטרים',
  suggestions: 'הצעות',
  activeFilters: 'סינון פעיל',
  clear: 'נקה',
  clearAll: 'נקה הכל',
  noResults: 'אין התאמות לפילטר הזה',
  restaurants: 'מסעדות',
  couriers: 'שליחים',
  freeSearch: 'חיפוש',
} as const;

const COMMANDS: Array<{
  kind: CommandKind;
  label: string;
  prefix: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    kind: 'restaurants',
    label: TEXT.restaurants,
    prefix: `${TEXT.restaurants}:`,
    icon: Store,
  },
  {
    kind: 'couriers',
    label: TEXT.couriers,
    prefix: `${TEXT.couriers}:`,
    icon: Bike,
  },
];

const normalize = (value: string) => value.trim().toLocaleLowerCase('he');

const getCommandKind = (value: string): CommandKind | null => {
  const normalized = normalize(value);

  if (normalized.startsWith('מסעדות:') || normalized.startsWith('מסעדה:')) {
    return 'restaurants';
  }

  if (normalized.startsWith('שליחים:') || normalized.startsWith('שליח:')) {
    return 'couriers';
  }

  return null;
};

const getCommandConfig = (kind: CommandKind) =>
  COMMANDS.find((command) => command.kind === kind) ?? COMMANDS[0];

const getCommandSearchValue = (value: string, kind: CommandKind | null) => {
  if (!kind) return '';

  const colonIndex = value.indexOf(':');
  if (colonIndex === -1) return '';

  return value.slice(colonIndex + 1).trim();
};

const optionMatches = (option: CommandOption, query: string) => {
  if (!query) return true;

  const normalizedQuery = normalize(query);
  return (
    normalize(option.label).includes(normalizedQuery) ||
    normalize(option.subtitle ?? '').includes(normalizedQuery)
  );
};

const getOptionLabel = (kind: CommandKind, option: CommandOption) =>
  `${getCommandConfig(kind).prefix} ${option.label}`;

export const DeliveriesCommandSearch: React.FC<DeliveriesCommandSearchProps> = ({
  searchQuery,
  onSearchQueryChange,
  restaurantOptions,
  selectedRestaurants,
  setSelectedRestaurants,
  toggleRestaurant,
  courierOptions,
  selectedCouriers,
  setSelectedCouriers,
  toggleCourier,
  setCurrentPage,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState(searchQuery);
  const [isOpen, setIsOpen] = useState(false);

  const activeCommand = getCommandKind(draft);
  const commandSearchValue = getCommandSearchValue(draft, activeCommand);

  useEffect(() => {
    if (getCommandKind(draft)) return;
    setDraft(searchQuery);
  }, [draft, searchQuery]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const visibleOptions = useMemo(() => {
    const options = activeCommand === 'restaurants' ? restaurantOptions : courierOptions;
    return options.filter((option) => optionMatches(option, commandSearchValue)).slice(0, 12);
  }, [activeCommand, commandSearchValue, courierOptions, restaurantOptions]);

  const activeTokens = useMemo<ActiveToken[]>(() => {
    const restaurantTokens = restaurantOptions
      .filter((option) => selectedRestaurants.has(option.id))
      .map((option) => ({
        key: `restaurant-${option.id}`,
        kind: 'restaurants' as const,
        label: TEXT.restaurants,
        value: option.label,
        onRemove: () => {
          setSelectedRestaurants((current) => {
            const next = new Set(current);
            next.delete(option.id);
            return next;
          });
          setCurrentPage(1);
        },
      }));

    const courierTokens = courierOptions
      .filter((option) => selectedCouriers.has(option.id))
      .map((option) => ({
        key: `courier-${option.id}`,
        kind: 'couriers' as const,
        label: TEXT.couriers,
        value: option.label,
        onRemove: () => {
          setSelectedCouriers((current) => {
            const next = new Set(current);
            next.delete(option.id);
            return next;
          });
          setCurrentPage(1);
        },
      }));

    const searchToken = searchQuery
      ? [
          {
            key: 'free-search',
            kind: 'search' as const,
            label: TEXT.freeSearch,
            value: searchQuery,
            onRemove: () => {
              onSearchQueryChange('');
              setDraft('');
              setCurrentPage(1);
            },
          },
        ]
      : [];

    return [...searchToken, ...restaurantTokens, ...courierTokens];
  }, [
    courierOptions,
    onSearchQueryChange,
    restaurantOptions,
    searchQuery,
    selectedCouriers,
    selectedRestaurants,
    setCurrentPage,
    setSelectedCouriers,
    setSelectedRestaurants,
  ]);

  const handleDraftChange = useCallback(
    (value: string) => {
      const nextCommand = getCommandKind(value);
      setDraft(value);
      setIsOpen(true);

      if (nextCommand) {
        if (searchQuery) onSearchQueryChange('');
        return;
      }

      onSearchQueryChange(value);
      setCurrentPage(1);
    },
    [onSearchQueryChange, searchQuery, setCurrentPage],
  );

  const handleCommandClick = useCallback(
    (kind: CommandKind) => {
      const command = getCommandConfig(kind);
      setDraft(command.prefix);
      onSearchQueryChange('');
      setIsOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [onSearchQueryChange],
  );

  const handleOptionClick = useCallback(
    (option: CommandOption) => {
      if (!activeCommand) return;

      if (activeCommand === 'restaurants') {
        toggleRestaurant(option.id);
      } else {
        toggleCourier(option.id);
      }

      setDraft('');
      setIsOpen(true);
      setCurrentPage(1);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [activeCommand, setCurrentPage, toggleCourier, toggleRestaurant],
  );

  const clearDraft = useCallback(() => {
    setDraft('');
    onSearchQueryChange('');
    setCurrentPage(1);
    inputRef.current?.focus();
  }, [onSearchQueryChange, setCurrentPage]);

  const clearAll = useCallback(() => {
    setDraft('');
    onSearchQueryChange('');
    setSelectedRestaurants(new Set());
    setSelectedCouriers(new Set());
    setCurrentPage(1);
    inputRef.current?.focus();
  }, [
    onSearchQueryChange,
    setCurrentPage,
    setSelectedCouriers,
    setSelectedRestaurants,
  ]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (event.key === 'Enter' && activeCommand && visibleOptions.length > 0) {
        event.preventDefault();
        handleOptionClick(visibleOptions[0]);
      }
    },
    [activeCommand, handleOptionClick, visibleOptions],
  );

  const inlineTokens = activeTokens.filter((token) => token.kind !== 'search');
  const hasInlineTokens = inlineTokens.length > 0;
  const showClearButton = Boolean(draft || hasInlineTokens);
  const searchShellClassName = [
    'flex h-10 w-full items-center gap-1.5 overflow-hidden rounded-[4px] border pr-9 pl-8 text-sm transition-[background-color,border-color,box-shadow,color]',
    'text-[#0d0d12] dark:text-app-text',
    isOpen
      ? 'border-[#8F8F8F] bg-[#0A0A0A] shadow-[0_0_0_1px_rgba(143,143,143,0.16)]'
      : 'border-[#e5e5e5] bg-[#f5f5f5] hover:border-[#8F8F8F] hover:bg-white dark:border-app-nav-border dark:bg-[#0A0A0A] dark:hover:border-[#8F8F8F]',
  ].join(' ');

  return (
    <div ref={rootRef} className="relative z-30 flex min-w-0 flex-1" dir="rtl">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8F8F8F]" />
        <div
          className={searchShellClassName}
          onClick={() => {
            setIsOpen(true);
            inputRef.current?.focus();
          }}
        >
          {inlineTokens.map((token) => (
            <button
              key={token.key}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                token.onRemove();
              }}
              className="flex max-w-[42%] shrink-0 items-center gap-1 rounded-[4px] border border-[#d4d4d4] bg-white px-1.5 py-0.5 text-xs font-medium text-[#0d0d12] transition-colors hover:border-[#9fe870]/60 dark:border-app-nav-border dark:bg-[#171717] dark:text-app-text"
              title={`${token.label}: ${token.value}`}
            >
              <span className="min-w-0 truncate">{`${token.label}: ${token.value}`}</span>
              <X className="h-3 w-3 shrink-0 text-[#737373] dark:text-[#EDEDED]" />
            </button>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={draft}
            placeholder={hasInlineTokens ? 'הוסף עוד פילטר...' : TEXT.placeholder}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className="min-w-[120px] flex-1 bg-transparent text-sm text-[#8F8F8F] outline-none placeholder:text-[#8F8F8F]"
          />
        </div>
        {showClearButton ? (
          <button
            type="button"
            onClick={draft ? clearDraft : clearAll}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:bg-[#e5e5e5] dark:hover:bg-[#333333]"
            aria-label={draft ? TEXT.clear : TEXT.clearAll}
            title={draft ? TEXT.clear : TEXT.clearAll}
          >
            <X className="h-3.5 w-3.5 text-[#a3a3a3] dark:text-[#EDEDED]" />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-50 flex max-h-[360px] w-full min-w-[280px] flex-col overflow-hidden rounded-xl border border-[#e5e5e5] bg-white text-right shadow-xl dark:border-app-border dark:bg-app-surface"
          onMouseDown={(event) => event.preventDefault()}
        >
          {activeTokens.length > 0 ? (
            <div className="border-b border-[#f0f0f0] px-3 py-2 dark:border-app-border">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#737373] dark:text-app-text-secondary">
                  {TEXT.activeFilters}
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-medium text-[#6bc84a] transition-colors hover:text-[#9fe870]"
                >
                  {TEXT.clearAll}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeTokens.map((token) => (
                  <button
                    key={token.key}
                    type="button"
                    onClick={token.onRemove}
                    className="flex max-w-full items-center gap-1 rounded-[4px] border border-[#d4d4d4] bg-[#fafafa] px-2 py-1 text-xs font-medium text-[#0d0d12] transition-colors hover:border-[#9fe870]/60 dark:border-app-nav-border dark:bg-[#0A0A0A] dark:text-app-text"
                    title={`${token.label}: ${token.value}`}
                  >
                    <span className="min-w-0 truncate">{`${token.label}: ${token.value}`}</span>
                    <X className="h-3 w-3 shrink-0 text-[#737373] dark:text-[#EDEDED]" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {activeCommand ? (
            <>
              <div className="border-b border-[#f0f0f0] px-3 py-2 text-xs font-semibold text-[#737373] dark:border-app-border dark:text-app-text-secondary">
                {TEXT.suggestions}
              </div>
              <div className="min-h-0 overflow-y-auto py-1">
                {visibleOptions.length > 0 ? (
                  visibleOptions.map((option) => {
                    const isSelected =
                      activeCommand === 'restaurants'
                        ? selectedRestaurants.has(option.id)
                        : selectedCouriers.has(option.id);

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleOptionClick(option)}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-right text-sm transition-colors ${
                          isSelected
                            ? 'bg-[#f5f5f5] text-[#0d0d12] dark:bg-[#262626] dark:text-app-text'
                            : 'text-[#525252] hover:bg-[#f5f5f5] dark:text-[#EDEDED] dark:hover:bg-[#262626]'
                        }`}
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                          {isSelected ? <Check className="h-3.5 w-3.5 text-[#16a34a]" /> : null}
                        </span>
                        <span className={`min-w-0 flex-1 truncate ${isSelected ? 'font-medium' : ''}`}>
                          {getOptionLabel(activeCommand, option)}
                        </span>
                        {option.subtitle ? (
                          <span className="max-w-[42%] shrink-0 truncate text-xs text-[#a3a3a3]">
                            {option.subtitle}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-sm text-[#737373] dark:text-app-text-secondary">
                    {TEXT.noResults}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-2">
              <div className="px-3 pb-2 text-xs font-semibold text-[#737373] dark:text-app-text-secondary">
                {TEXT.filters}
              </div>
              <div className="space-y-1">
                {COMMANDS.map((command) => {
                  const Icon = command.icon;

                  return (
                    <button
                      key={command.kind}
                      type="button"
                      onClick={() => handleCommandClick(command.kind)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-right text-sm text-[#525252] transition-colors hover:bg-[#f5f5f5] dark:text-[#EDEDED] dark:hover:bg-[#262626]"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[#a3a3a3] dark:text-[#EDEDED]" />
                      <span className="font-medium text-[#0d0d12] dark:text-app-text">
                        {command.prefix}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
