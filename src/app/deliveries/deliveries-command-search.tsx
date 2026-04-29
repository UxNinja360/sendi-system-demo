import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bike, Check, Search, Store, X } from 'lucide-react';

type CommandKind = 'restaurants' | 'chains' | 'couriers';

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
  chainOptions: CommandOption[];
  selectedChains: Set<string>;
  setSelectedChains: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleChain: (id: string) => void;
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
  chains: 'רשתות',
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
    kind: 'chains',
    label: TEXT.chains,
    prefix: `${TEXT.chains}:`,
    icon: Store,
  },
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

  if (normalized.startsWith('רשת:') || normalized.startsWith('רשתות:')) {
    return 'chains';
  }

  if (normalized.startsWith('שליחים:') || normalized.startsWith('שליח:')) {
    return 'couriers';
  }

  return null;
};

const getCommandConfig = (kind: CommandKind) =>
  COMMANDS.find((command) => command.kind === kind) ?? COMMANDS[0];

const parseCommandInput = (value: string): { kind: CommandKind; query: string } | null => {
  const kind = getCommandKind(value);
  if (!kind) return null;

  const colonIndex = value.indexOf(':');
  if (colonIndex === -1) {
    return { kind, query: '' };
  }

  return {
    kind,
    query: value.slice(colonIndex + 1).trimStart(),
  };
};

const optionMatches = (option: CommandOption, query: string) => {
  if (!query) return true;

  const normalizedQuery = normalize(query);
  return (
    normalize(option.label).includes(normalizedQuery) ||
    normalize(option.subtitle ?? '').includes(normalizedQuery)
  );
};

export const DeliveriesCommandSearch: React.FC<DeliveriesCommandSearchProps> = ({
  searchQuery,
  onSearchQueryChange,
  restaurantOptions,
  selectedRestaurants,
  setSelectedRestaurants,
  toggleRestaurant,
  chainOptions,
  selectedChains,
  setSelectedChains,
  toggleChain,
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
  const [commandContext, setCommandContext] = useState<CommandKind | null>(null);
  const activeCommandConfig = commandContext ? getCommandConfig(commandContext) : null;

  useEffect(() => {
    if (commandContext) return;
    setDraft(searchQuery);
  }, [commandContext, searchQuery]);

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
    const options =
      commandContext === 'restaurants'
        ? restaurantOptions
        : commandContext === 'chains'
          ? chainOptions
          : courierOptions;
    return options.filter((option) => optionMatches(option, draft)).slice(0, 12);
  }, [chainOptions, commandContext, courierOptions, draft, restaurantOptions]);

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

    const chainTokens = chainOptions
      .filter((option) => selectedChains.has(option.id))
      .map((option) => ({
        key: `chain-${option.id}`,
        kind: 'chains' as const,
        label: TEXT.chains,
        value: option.label,
        onRemove: () => {
          setSelectedChains((current) => {
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

    return [...searchToken, ...restaurantTokens, ...chainTokens, ...courierTokens];
  }, [
    chainOptions,
    courierOptions,
    onSearchQueryChange,
    restaurantOptions,
    searchQuery,
    selectedChains,
    selectedCouriers,
    selectedRestaurants,
    setCurrentPage,
    setSelectedChains,
    setSelectedCouriers,
    setSelectedRestaurants,
  ]);

  const handleDraftChange = useCallback(
    (value: string) => {
      const parsedCommand = parseCommandInput(value);
      setDraft(value);
      setIsOpen(true);

      if (parsedCommand) {
        setCommandContext(parsedCommand.kind);
        setDraft(parsedCommand.query);
        if (searchQuery) onSearchQueryChange('');
        return;
      }

      if (commandContext) {
        return;
      }

      onSearchQueryChange(value);
      setCurrentPage(1);
    },
    [commandContext, onSearchQueryChange, searchQuery, setCurrentPage],
  );

  const handleCommandClick = useCallback(
    (kind: CommandKind) => {
      setCommandContext(kind);
      setDraft('');
      onSearchQueryChange('');
      setIsOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [onSearchQueryChange],
  );

  const handleOptionClick = useCallback(
    (option: CommandOption) => {
      if (!commandContext) return;

      if (commandContext === 'restaurants') {
        toggleRestaurant(option.id);
      } else if (commandContext === 'chains') {
        toggleChain(option.id);
      } else {
        toggleCourier(option.id);
      }

      setDraft('');
      setIsOpen(true);
      setCurrentPage(1);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [commandContext, setCurrentPage, toggleChain, toggleCourier, toggleRestaurant],
  );

  const clearDraft = useCallback(() => {
    setDraft('');
    if (!commandContext) {
      onSearchQueryChange('');
    }
    setCurrentPage(1);
    inputRef.current?.focus();
  }, [commandContext, onSearchQueryChange, setCurrentPage]);

  const clearCommandContext = useCallback(() => {
    setCommandContext(null);
    setDraft(searchQuery);
    setIsOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [searchQuery]);

  const clearAll = useCallback(() => {
    setDraft('');
    setCommandContext(null);
    onSearchQueryChange('');
    setSelectedRestaurants(new Set());
    setSelectedChains(new Set());
    setSelectedCouriers(new Set());
    setCurrentPage(1);
    inputRef.current?.focus();
  }, [
    onSearchQueryChange,
    setCurrentPage,
    setSelectedChains,
    setSelectedCouriers,
    setSelectedRestaurants,
  ]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (event.key === 'Backspace' && commandContext && !draft) {
        event.preventDefault();
        clearCommandContext();
        return;
      }

      if (event.key === 'Enter' && commandContext && visibleOptions.length > 0) {
        event.preventDefault();
        handleOptionClick(visibleOptions[0]);
      }
    },
    [clearCommandContext, commandContext, draft, handleOptionClick, visibleOptions],
  );

  const inlineTokens = activeTokens.filter((token) => token.kind !== 'search');
  const hasInlineTokens = inlineTokens.length > 0;
  const showClearButton = Boolean(draft || commandContext || hasInlineTokens);
  const inputPlaceholder = commandContext
    ? `${TEXT.search} ${activeCommandConfig?.label ?? ''}...`
    : hasInlineTokens
      ? 'הוסף עוד פילטר...'
      : TEXT.placeholder;
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
          {activeCommandConfig ? (
            <button
              key={activeCommandConfig.kind}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                clearCommandContext();
              }}
              className="flex shrink-0 items-center gap-1 rounded-[4px] border border-[#9fe870]/40 bg-[#f0f9e8] px-1.5 py-0.5 text-xs font-medium text-[#0d0d12] transition-colors dark:border-[#335c1a] dark:bg-[#16210f] dark:text-app-text"
              title={activeCommandConfig.label}
            >
              <span className="truncate">{activeCommandConfig.label}</span>
              <X className="h-3 w-3 shrink-0 text-[#737373] dark:text-[#EDEDED]" />
            </button>
          ) : null}
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
              <span className="shrink-0 rounded-[3px] bg-[#f5f5f5] px-1 py-0.5 text-[10px] font-semibold text-[#737373] dark:bg-[#262626] dark:text-app-text-secondary">
                {token.label}
              </span>
              <span className="min-w-0 truncate">{token.value}</span>
              <X className="h-3 w-3 shrink-0 text-[#737373] dark:text-[#EDEDED]" />
            </button>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={draft}
            placeholder={inputPlaceholder}
            aria-label={commandContext ? `${TEXT.search} ${activeCommandConfig?.label ?? ''}` : TEXT.placeholder}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className="min-w-[120px] flex-1 bg-transparent text-sm text-[#8F8F8F] outline-none placeholder:text-[#8F8F8F]"
          />
        </div>
        {showClearButton ? (
          <button
            type="button"
            onClick={draft ? clearDraft : commandContext ? clearCommandContext : clearAll}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:bg-[#e5e5e5] dark:hover:bg-[#333333]"
            aria-label={draft ? TEXT.clear : commandContext ? TEXT.filters : TEXT.clearAll}
            title={draft ? TEXT.clear : commandContext ? TEXT.filters : TEXT.clearAll}
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
                    <span className="shrink-0 rounded-[3px] bg-white px-1 py-0.5 text-[10px] font-semibold text-[#737373] dark:bg-[#262626] dark:text-app-text-secondary">
                      {token.label}
                    </span>
                    <span className="min-w-0 truncate">{token.value}</span>
                    <X className="h-3 w-3 shrink-0 text-[#737373] dark:text-[#EDEDED]" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {commandContext ? (
            <>
              <div className="border-b border-[#f0f0f0] px-3 py-2 text-xs font-semibold text-[#737373] dark:border-app-border dark:text-app-text-secondary">
                {`${TEXT.suggestions} - ${activeCommandConfig?.label ?? ''}`}
              </div>
              <div className="min-h-0 overflow-y-auto py-1">
                {visibleOptions.length > 0 ? (
                  visibleOptions.map((option) => {
                    const isSelected =
                      commandContext === 'restaurants'
                        ? selectedRestaurants.has(option.id)
                        : commandContext === 'chains'
                          ? selectedChains.has(option.id)
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
                            {option.label}
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
