import React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

export type FilterOption = {
  id: string;
  label: string;
};

export type SingleSelectFilterOption = {
  id: string;
  label: string;
  count?: number;
  dotClassName?: string;
};

type ListMultiSelectFilterProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeOtherMenus: () => void;
  selectedValues: Set<string>;
  setSelectedValues: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleValue: (id: string) => void;
  options: FilterOption[];
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  defaultLabel: string;
  pluralLabel: string;
  placeholder: string;
  setCurrentPage?: (page: number) => void;
  icon?: React.ReactNode;
};

type ListSingleSelectFilterProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeOtherMenus: () => void;
  value: string;
  onChange: (value: string) => void;
  options: SingleSelectFilterOption[];
  defaultLabel: string;
  clearValue?: string;
  setCurrentPage?: (page: number) => void;
};

const getCheckboxClass = (isActive: boolean) =>
  `flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
    isActive ? 'border-[#9fe870] bg-[#9fe870]' : 'border-[#d4d4d4] dark:border-[#404040]'
  }`;

const getOptionButtonClass = (isActive: boolean) =>
  `w-full flex items-center gap-2.5 px-3 py-2 text-right text-sm transition-colors ${
    isActive
      ? 'bg-[#f5f5f5] text-[#0d0d12] dark:bg-[#262626] dark:text-[#fafafa]'
      : 'text-[#525252] hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#262626]'
  }`;

export const getListFilterButtonClass = (isActive: boolean) =>
  `flex h-9 items-center gap-1.5 rounded-[4px] border px-3 text-sm font-medium transition-colors ${
    isActive
      ? 'border-[#9fe870]/40 bg-[#9fe870]/15 text-[#6bc84a]'
      : 'border-[#e5e5e5] bg-white text-[#525252] hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]'
  }`;

export const ListMultiSelectFilter: React.FC<ListMultiSelectFilterProps> = ({
  containerRef,
  isOpen,
  setOpen,
  closeOtherMenus,
  selectedValues,
  setSelectedValues,
  toggleValue,
  options,
  searchValue,
  setSearchValue,
  defaultLabel,
  pluralLabel,
  placeholder,
  setCurrentPage,
  icon,
}) => {
  const isActive = selectedValues.size > 0;
  const selectedLabel =
    selectedValues.size === 0
      ? defaultLabel
      : selectedValues.size === 1
        ? (options.find((option) => selectedValues.has(option.id))?.label ?? defaultLabel)
        : `${selectedValues.size} ${pluralLabel}`;

  const filteredOptions = options.filter((option) => !searchValue || option.label.includes(searchValue));

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          setOpen((value) => !value);
          closeOtherMenus();
        }}
        className={getListFilterButtonClass(isActive)}
      >
        {icon}
        <span>{selectedLabel}</span>
        {isActive ? (
          <span
            onClick={(event) => {
              event.stopPropagation();
              setSelectedValues(new Set());
              setOpen(false);
              setCurrentPage?.(1);
            }}
            className="cursor-pointer rounded p-0.5 transition-colors hover:bg-[#dcfce7] dark:hover:bg-[#052e16]"
            role="button"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className={`h-3 w-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-1.5 flex max-h-[260px] min-w-[200px] flex-col rounded-xl border border-[#e5e5e5] bg-white shadow-xl dark:border-[#262626] dark:bg-[#171717]">
          <div className="border-b border-[#f0f0f0] p-2 dark:border-[#262626]">
            <input
              autoFocus
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg bg-[#f5f5f5] px-2.5 py-1.5 text-sm text-[#0d0d12] outline-none placeholder-[#a3a3a3] dark:bg-[#141414] dark:text-[#fafafa]"
              style={{ direction: 'rtl' }}
            />
          </div>
          <div className="overflow-y-auto py-1">
            {filteredOptions.map((option) => {
              const optionActive = selectedValues.has(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    toggleValue(option.id);
                    setCurrentPage?.(1);
                  }}
                  className={getOptionButtonClass(optionActive)}
                >
                  <span className={getCheckboxClass(optionActive)}>
                    {optionActive && <Check className="h-2.5 w-2.5 text-[#0d0d12]" />}
                  </span>
                  <span className="flex-1 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const ListSingleSelectFilter: React.FC<ListSingleSelectFilterProps> = ({
  containerRef,
  isOpen,
  setOpen,
  closeOtherMenus,
  value,
  onChange,
  options,
  defaultLabel,
  clearValue = 'all',
  setCurrentPage,
}) => {
  const isActive = value !== clearValue;
  const selectedOption = options.find((option) => option.id === value);
  const buttonLabel = selectedOption?.label ?? defaultLabel;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          setOpen((open) => !open);
          closeOtherMenus();
        }}
        className={getListFilterButtonClass(isActive)}
      >
        <span>{buttonLabel}</span>
        {isActive ? (
          <>
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#9fe870] text-[10px] font-bold text-[#0d0d12]">
              1
            </span>
            <span
              role="button"
              onClick={(event) => {
                event.stopPropagation();
                onChange(clearValue);
                setOpen(false);
                setCurrentPage?.(1);
              }}
              className="cursor-pointer rounded p-0.5 transition-colors hover:bg-[#dcfce7] dark:hover:bg-[#052e16]"
            >
              <X className="h-3 w-3" />
            </span>
          </>
        ) : (
          <ChevronDown className={`h-3 w-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-1.5 min-w-[180px] rounded-[4px] border border-[#e5e5e5] bg-white py-1 shadow-xl dark:border-[#262626] dark:bg-[#171717]">
          {options.map((option) => {
            const isSelected = option.id === value;
            return (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                  setCurrentPage?.(1);
                }}
                className={getOptionButtonClass(isSelected)}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {isSelected ? <Check className="h-3.5 w-3.5 text-[#16a34a]" /> : null}
                </span>
                {option.dotClassName ? (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${option.dotClassName} ${isSelected ? '' : 'opacity-50'}`} />
                ) : null}
                <span className={`flex-1 text-right ${isSelected ? 'font-medium' : ''}`}>{option.label}</span>
                {typeof option.count === 'number' ? (
                  <span className="rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] font-bold text-[#737373] dark:bg-[#262626] dark:text-[#a3a3a3]">
                    {option.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
