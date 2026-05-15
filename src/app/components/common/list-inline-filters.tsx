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
  appearance?: 'default' | 'status';
  setCurrentPage?: (page: number) => void;
};

export type ListInlineFilterItem =
  | ListInlineSingleSelectFilterItem
  | ListInlineMultiSelectFilterItem;

type ListInlineFiltersProps = {
  filters: ListInlineFilterItem[];
};

const TEXT = {
  filters: '\u05e4\u05d9\u05dc\u05d8\u05e8\u05d9\u05dd',
  close: '\u05e1\u05d2\u05d5\u05e8',
  clear: '\u05e0\u05e7\u05d4',
  search: '\u05d7\u05d9\u05e4\u05d5\u05e9',
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
  const mobileStatusFilter =
    filters.length === 1 &&
    isMultiSelectFilter(filters[0]) &&
    filters[0].appearance === 'status'
      ? filters[0]
      : null;
  const mobileSheetTitle = TEXT.filters;

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
      {mobileStatusFilter ? (
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-1 min-[540px]:w-auto">
          <ListMultiSelectFilter
            containerRef={refCallbacks[mobileStatusFilter.key]}
            isOpen={openFilterKey === mobileStatusFilter.key}
            setOpen={(nextOpen) => {
              const resolvedOpen =
                typeof nextOpen === 'function'
                  ? nextOpen(openFilterKey === mobileStatusFilter.key)
                  : nextOpen;

              setOpenFilterKey(resolvedOpen ? mobileStatusFilter.key : null);
            }}
            closeOtherMenus={() => setOpenFilterKey(null)}
            selectedValues={mobileStatusFilter.selectedValues}
            setSelectedValues={mobileStatusFilter.setSelectedValues}
            toggleValue={mobileStatusFilter.toggleValue}
            options={mobileStatusFilter.options}
            searchValue={mobileStatusFilter.searchValue ?? ''}
            setSearchValue={mobileStatusFilter.setSearchValue ?? (() => undefined)}
            defaultLabel={mobileStatusFilter.defaultLabel}
            pluralLabel={mobileStatusFilter.pluralLabel}
            placeholder={mobileStatusFilter.placeholder ?? `${TEXT.search} ${mobileStatusFilter.defaultLabel}...`}
            icon={mobileStatusFilter.icon}
            showSearch={mobileStatusFilter.showSearch}
            appearance={mobileStatusFilter.appearance}
            setCurrentPage={mobileStatusFilter.setCurrentPage}
          />
        </div>
      ) : (
        <button
          type="button"
          data-haptic="medium"
          onClick={() => setMobileSheetOpen(true)}
          className={`${getListFilterButtonClass(activeFilterCount > 0)} md:hidden`}
          aria-label={TEXT.filters}
          title={TEXT.filters}
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{TEXT.filters}</span>
          {activeFilterCount > 0 ? (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-app-nav-active-bg text-[10px] font-bold text-app-text">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      )}

      {!mobileStatusFilter ? (
        <div className="hidden min-w-0 shrink-0 flex-nowrap items-center gap-1 md:flex">
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
                closeOtherMenus={() => setOpenFilterKey(null)}
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
                appearance={filter.appearance}
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
                closeOtherMenus={() => setOpenFilterKey(null)}
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
      ) : null}

      {mobileSheetOpen ? (
        <div
          className="fixed inset-0 z-[70] bg-black/60 md:hidden"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-hidden rounded-t-3xl border-t border-app-border bg-app-surface"
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-app-text-secondary" />
                <span className="text-sm font-semibold text-app-text">
                  {mobileSheetTitle}
                </span>
              </div>
              <button
                type="button"
                data-haptic="selection"
                onClick={() => setMobileSheetOpen(false)}
                className="rounded-lg p-1.5 text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
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
                        <span className="text-sm font-medium text-app-text">
                          {filter.defaultLabel}
                        </span>
                        {isActive ? (
                          <button
                            type="button"
                            data-haptic="light"
                            onClick={() => {
                              if (isMultiSelectFilter(filter)) {
                                filter.setSelectedValues(new Set());
                                filter.setCurrentPage?.(1);
                              } else {
                                filter.onChange(clearValue);
                                filter.setCurrentPage?.(1);
                              }
                            }}
                            className="text-xs font-medium text-app-brand-text"
                          >
                            {TEXT.clear}
                          </button>
                        ) : null}
                      </div>

                      {isMultiSelectFilter(filter) && filter.showSearch !== false ? (
                        <div className="relative">
                          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
                          <input
                            value={filter.searchValue ?? ''}
                            onChange={(event) => filter.setSearchValue?.(event.target.value)}
                            placeholder={filter.placeholder ?? `${TEXT.search} ${filter.defaultLabel}...`}
                            className="w-full rounded-xl border border-app-border bg-app-surface-raised py-2 pr-9 pl-3 text-sm text-app-text outline-none transition-colors placeholder:text-app-text-muted focus:border-app-brand focus:bg-app-surface"
                          />
                        </div>
                      ) : null}

                      <div className="overflow-hidden rounded-xl border border-app-border">
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
                                    data-haptic="selection"
                                    onClick={() => {
                                      filter.toggleValue(option.id);
                                      filter.setCurrentPage?.(1);
                                    }}
                                    className={`flex w-full items-center gap-2.5 px-3 py-3 text-right text-sm transition-colors ${
                                      isSelected
                                        ? 'bg-app-surface-raised text-app-text'
                                        : 'text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text'
                                    }`}
                                  >
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                      {isSelected ? (
                                        <Check className="h-3.5 w-3.5 text-app-brand" />
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
                                      <span className="rounded-full bg-app-surface-raised px-1.5 py-0.5 text-[10px] font-bold text-app-text-secondary">
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
                                  data-haptic="selection"
                                  onClick={() => {
                                    filter.onChange(option.id);
                                    filter.setCurrentPage?.(1);
                                  }}
                                  className={`flex w-full items-center gap-2.5 px-3 py-3 text-right text-sm transition-colors ${
                                    isSelected
                                      ? 'bg-app-surface-raised text-app-text'
                                      : 'text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text'
                                  }`}
                                >
                                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                    {isSelected ? (
                                      <Check className="h-3.5 w-3.5 text-app-brand" />
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
                                    <span className="rounded-full bg-app-surface-raised px-1.5 py-0.5 text-[10px] font-bold text-app-text-secondary">
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
