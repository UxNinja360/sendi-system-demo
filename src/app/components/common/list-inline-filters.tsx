import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Filter, Search, X } from 'lucide-react';

import {
  ListMultiSelectFilter,
  ListSingleSelectFilter,
  getListFilterButtonClass,
  type FilterOption,
  type SingleSelectFilterOption,
} from './list-filter-controls';

type ListInlineSingleSelectFilterItem = {
  key: string;
  kind?: 'single-select';
  value: string;
  onChange: (value: string) => void;
  options: SingleSelectFilterOption[];
  defaultLabel: string;
  clearValue?: string;
  setCurrentPage?: (page: number) => void;
};

type ListInlineMultiSelectFilterItem = {
  key: string;
  kind: 'multi-select';
  selectedValues: Set<string>;
  setSelectedValues: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleValue: (value: string) => void;
  options: FilterOption[];
  defaultLabel: string;
  pluralLabel: string;
  searchValue?: string;
  setSearchValue?: React.Dispatch<React.SetStateAction<string>>;
  placeholder?: string;
  clearValue?: string;
  icon?: React.ReactNode;
  showSearch?: boolean;
  setCurrentPage?: (page: number) => void;
};

export type ListInlineFilterItem =
  | ListInlineSingleSelectFilterItem
  | ListInlineMultiSelectFilterItem;

type ListInlineFiltersProps = {
  filters: ListInlineFilterItem[];
};

const TEXT = {
  filters: 'פילטרים',
  close: 'סגור',
  clear: 'נקה',
  search: 'חיפוש',
} as const;

const isMultiSelectFilter = (
  filter: ListInlineFilterItem,
): filter is ListInlineMultiSelectFilterItem => filter.kind === 'multi-select';

export const ListInlineFilters: React.FC<ListInlineFiltersProps> = ({ filters }) => {
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const refCallbacks = useMemo(
    () =>
      Object.fromEntries(
        filters.map((filter) => [
          filter.key,
          (node: HTMLDivElement | null) => {
            containerRefs.current[filter.key] = node;
          },
        ]),
      ) as Record<string, (node: HTMLDivElement | null) => void>,
    [filters],
  );

  const activeFilterCount = useMemo(
    () =>
      filters.filter((filter) => {
        if (isMultiSelectFilter(filter)) {
          return filter.selectedValues.size > 0;
        }

        return filter.value !== (filter.clearValue ?? 'all');
      }).length,
    [filters],
  );

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!openFilterKey) return;

      const activeContainer = containerRefs.current[openFilterKey];
      if (!activeContainer?.contains(event.target as Node)) {
        setOpenFilterKey(null);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [openFilterKey]);

  useEffect(() => {
    if (!mobileSheetOpen) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [mobileSheetOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileSheetOpen(true)}
        className={`${getListFilterButtonClass(activeFilterCount > 0)} md:hidden`}
        aria-label={TEXT.filters}
        title={TEXT.filters}
      >
        <Filter className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{TEXT.filters}</span>
        {activeFilterCount > 0 ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#9fe870] text-[10px] font-bold text-[#0d0d12]">
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      <div className="hidden md:contents">
        {filters.map((filter) =>
          isMultiSelectFilter(filter) ? (
            <ListMultiSelectFilter
              key={filter.key}
              containerRef={refCallbacks[filter.key]}
              isOpen={openFilterKey === filter.key}
              setOpen={(nextOpen) => {
                const resolvedOpen =
                  typeof nextOpen === 'function'
                    ? nextOpen(openFilterKey === filter.key)
                    : nextOpen;

                setOpenFilterKey(resolvedOpen ? filter.key : null);
              }}
              closeOtherMenus={() => {
                setOpenFilterKey((current) =>
                  current === filter.key ? current : null,
                );
              }}
              selectedValues={filter.selectedValues}
              setSelectedValues={filter.setSelectedValues}
              toggleValue={filter.toggleValue}
              options={filter.options}
              searchValue={filter.searchValue ?? ''}
              setSearchValue={filter.setSearchValue ?? (() => undefined)}
              defaultLabel={filter.defaultLabel}
              pluralLabel={filter.pluralLabel}
              placeholder={filter.placeholder ?? `${TEXT.search} ${filter.defaultLabel}...`}
              icon={filter.icon}
              showSearch={filter.showSearch}
              setCurrentPage={filter.setCurrentPage}
            />
          ) : (
            <ListSingleSelectFilter
              key={filter.key}
              containerRef={refCallbacks[filter.key]}
              isOpen={openFilterKey === filter.key}
              setOpen={(nextOpen) => {
                const resolvedOpen =
                  typeof nextOpen === 'function'
                    ? nextOpen(openFilterKey === filter.key)
                    : nextOpen;

                setOpenFilterKey(resolvedOpen ? filter.key : null);
              }}
              closeOtherMenus={() => {
                setOpenFilterKey((current) =>
                  current === filter.key ? current : null,
                );
              }}
              value={filter.value}
              onChange={filter.onChange}
              options={filter.options}
              defaultLabel={filter.defaultLabel}
              clearValue={filter.clearValue}
              setCurrentPage={filter.setCurrentPage}
            />
          ),
        )}
      </div>

      {mobileSheetOpen ? (
        <div
          className="fixed inset-0 z-[70] bg-black/60 md:hidden"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden rounded-t-3xl border-t border-[#262626] bg-white dark:bg-[#171717]"
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3 dark:border-[#262626]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#737373]" />
                <span className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                  {TEXT.filters}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="rounded-lg p-1.5 text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
                aria-label={TEXT.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(80vh-64px)] overflow-y-auto px-4 py-4">
              <div className="space-y-5">
                {filters.map((filter) => {
                  const clearValue = filter.clearValue ?? 'all';
                  const isActive = isMultiSelectFilter(filter)
                    ? filter.selectedValues.size > 0
                    : filter.value !== clearValue;

                  return (
                    <section key={filter.key} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
                          {filter.defaultLabel}
                        </span>
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (isMultiSelectFilter(filter)) {
                                filter.setSelectedValues(new Set());
                                filter.setCurrentPage?.(1);
                              } else {
                                filter.onChange(clearValue);
                                filter.setCurrentPage?.(1);
                              }
                            }}
                            className="text-xs font-medium text-[#6bc84a]"
                          >
                            {TEXT.clear}
                          </button>
                        ) : null}
                      </div>

                      {isMultiSelectFilter(filter) && filter.showSearch !== false ? (
                        <div className="relative">
                          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" />
                          <input
                            value={filter.searchValue ?? ''}
                            onChange={(event) => filter.setSearchValue?.(event.target.value)}
                            placeholder={filter.placeholder ?? `${TEXT.search} ${filter.defaultLabel}...`}
                            className="w-full rounded-xl border border-[#e5e5e5] bg-[#fafafa] py-2 pr-9 pl-3 text-sm text-[#0d0d12] outline-none transition-colors focus:border-[#9fe870] dark:border-[#262626] dark:bg-[#141414] dark:text-[#fafafa]"
                          />
                        </div>
                      ) : null}

                      <div className="overflow-hidden rounded-xl border border-[#e5e5e5] dark:border-[#262626]">
                        {isMultiSelectFilter(filter)
                          ? filter.options
                              .filter(
                                (option) =>
                                  filter.showSearch === false ||
                                  !(filter.searchValue ?? '') ||
                                  option.label.includes(filter.searchValue ?? ''),
                              )
                              .map((option) => {
                                const isSelected = filter.selectedValues.has(option.id);

                                return (
                                  <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => {
                                    filter.toggleValue(option.id);
                                    filter.setCurrentPage?.(1);
                                  }}
                                  className={`flex w-full items-center gap-2.5 px-3 py-3 text-right text-sm transition-colors ${
                                      isSelected
                                        ? 'bg-[#f5f5f5] text-[#0d0d12] dark:bg-[#262626] dark:text-[#fafafa]'
                                        : 'text-[#525252] hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#202020]'
                                    }`}
                                  >
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                      {isSelected ? (
                                        <Check className="h-3.5 w-3.5 text-[#16a34a]" />
                                      ) : null}
                                    </span>
                                    {option.dotClassName ? (
                                      <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${option.dotClassName} ${isSelected ? '' : 'opacity-50'}`}
                                      />
                                    ) : null}
                                    <span className={`flex-1 text-right ${isSelected ? 'font-medium' : ''}`}>
                                      {option.label}
                                    </span>
                                    {typeof option.count === 'number' ? (
                                      <span className="rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] font-bold text-[#737373] dark:bg-[#202020] dark:text-[#a3a3a3]">
                                        {option.count}
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })
                          : filter.options.map((option) => {
                              const isSelected = option.id === filter.value;

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => {
                                    filter.onChange(option.id);
                                    filter.setCurrentPage?.(1);
                                  }}
                                  className={`flex w-full items-center gap-2.5 px-3 py-3 text-right text-sm transition-colors ${
                                    isSelected
                                      ? 'bg-[#f5f5f5] text-[#0d0d12] dark:bg-[#262626] dark:text-[#fafafa]'
                                      : 'text-[#525252] hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#202020]'
                                  }`}
                                >
                                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                    {isSelected ? (
                                      <Check className="h-3.5 w-3.5 text-[#16a34a]" />
                                    ) : null}
                                  </span>
                                  {option.dotClassName ? (
                                    <span
                                      className={`h-2 w-2 shrink-0 rounded-full ${option.dotClassName} ${isSelected ? '' : 'opacity-50'}`}
                                    />
                                  ) : null}
                                  <span className={`flex-1 text-right ${isSelected ? 'font-medium' : ''}`}>
                                    {option.label}
                                  </span>
                                  {typeof option.count === 'number' ? (
                                    <span className="rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] font-bold text-[#737373] dark:bg-[#202020] dark:text-[#a3a3a3]">
                                      {option.count}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
