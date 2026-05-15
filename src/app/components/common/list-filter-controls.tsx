import React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';

export type FilterOption = {
  id: string;
  label: string;
  count?: number;
  dotClassName?: string;
};

export type SingleSelectFilterOption = {
  id: string;
  label: string;
  count?: number;
  dotClassName?: string;
};

type ListMultiSelectFilterProps = {
  containerRef: FilterContainerRef;
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
  showSearch?: boolean;
  appearance?: 'default' | 'status';
};

type ListSingleSelectFilterProps = {
  containerRef: FilterContainerRef;
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

type FilterContainerRef = React.RefObject<HTMLDivElement | null> | ((node: HTMLDivElement | null) => void);

const getCheckboxClass = (isActive: boolean) =>
  `flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
    isActive ? 'border-app-brand bg-app-brand' : 'border-[#d4d4d4] dark:border-[#404040]'
  }`;

const getOptionButtonClass = (isActive: boolean) =>
  `w-full flex items-center gap-2.5 px-3 py-2 text-right text-sm transition-colors ${
    isActive
      ? 'bg-app-surface-raised text-app-text dark:bg-app-nav-active-bg dark:text-app-text'
      : 'text-app-text-secondary hover:bg-app-surface-raised dark:text-app-text-secondary dark:hover:bg-app-surface-raised'
  }`;

const TEXT = {
  only: 'רק זה',
  check: 'סמן',
  uncheck: 'בטל',
  checkAll: 'סמן הכל',
} as const;

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const getListFilterButtonClass = (isActive: boolean) =>
  `flex h-10 items-center gap-1.5 rounded-[4px] border px-3 text-sm font-medium transition-colors md:w-[112px] md:justify-between ${
    isActive
      ? 'border-app-brand bg-app-brand-subtle text-app-brand-text dark:border-app-nav-border dark:bg-[#0A0A0A] dark:text-[#EDEDED]'
      : 'border-app-border bg-app-surface text-app-text-secondary hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#0A0A0A] dark:text-[#EDEDED] dark:hover:bg-[#111111]'
  }`;

const FILTER_MENU_GAP = 6;
const FILTER_MENU_VIEWPORT_MARGIN = 12;

const assignFilterContainerRef = (ref: FilterContainerRef, node: HTMLDivElement | null) => {
  if (typeof ref === 'function') {
    ref(node);
    return;
  }

  (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
};

const useFixedFilterMenu = (isOpen: boolean, minWidth: number, externalRef: FilterContainerRef) => {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({});

  const updateMenuPosition = React.useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(minWidth, rect.width);
    const desiredRight = window.innerWidth - rect.right;
    const maxRight = Math.max(
      FILTER_MENU_VIEWPORT_MARGIN,
      window.innerWidth - width - FILTER_MENU_VIEWPORT_MARGIN,
    );

    setMenuStyle({
      top: rect.bottom + FILTER_MENU_GAP,
      right: Math.min(
        Math.max(FILTER_MENU_VIEWPORT_MARGIN, desiredRight),
        maxRight,
      ),
      width,
    });
  }, [minWidth]);

  const setRootRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      assignFilterContainerRef(externalRef, node);
    },
    [externalRef],
  );

  React.useLayoutEffect(() => {
    if (!isOpen) return undefined;

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  return { menuStyle, setRootRef };
};

const StatusDotSummary: React.FC<{
  options: FilterOption[];
  selectedValues: Set<string>;
}> = ({ options, selectedValues }) => (
  <span className="flex shrink-0 items-center -space-x-1" dir="ltr" aria-hidden="true">
    {options.map((option) => (
      <span
        key={option.id}
        className={joinClassNames(
          'h-2 w-2 rounded-full ring-1 ring-app-surface',
          option.dotClassName ?? 'bg-app-text-muted',
          selectedValues.has(option.id) ? '' : 'opacity-25 grayscale',
        )}
      />
    ))}
  </span>
);

const StatusFilterCheckbox: React.FC<{ checked: boolean }> = ({ checked }) => (
  <span
    className={joinClassNames(
      'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
      checked
        ? 'border-app-brand-solid bg-app-brand-solid text-app-background'
        : 'border-app-border-strong bg-transparent text-transparent',
    )}
  >
    {checked ? <Check className="h-3 w-3 stroke-[3]" /> : null}
  </span>
);

const getStatusTextActionLabel = (
  isSelected: boolean,
  selectedCount: number,
  totalCount: number,
) => {
  if (selectedCount === 0) return TEXT.check;
  if (isSelected && selectedCount < totalCount) return TEXT.checkAll;
  if (!isSelected) return TEXT.only;
  return TEXT.only;
};

const getStatusCheckboxActionLabel = (isSelected: boolean) => (
  isSelected ? TEXT.uncheck : TEXT.check
);

type StatusFilterOptionRowProps = {
  option: FilterOption;
  isActive: boolean;
  selectedCount: number;
  totalCount: number;
  onToggle: (optionId: string) => void;
  onTextAction: (optionId: string, isActive: boolean) => void;
};

const StatusFilterOptionRow: React.FC<StatusFilterOptionRowProps> = ({
  option,
  isActive,
  selectedCount,
  totalCount,
  onToggle,
  onTextAction,
}) => {
  const checkboxActionLabel = getStatusCheckboxActionLabel(isActive);
  const textActionLabel = getStatusTextActionLabel(isActive, selectedCount, totalCount);

  return (
    <div className="status-filter-row text-app-text" dir="ltr">
      <button
        type="button"
        data-haptic="selection"
        onClick={() => onToggle(option.id)}
        title={checkboxActionLabel}
        aria-label={`${checkboxActionLabel} ${option.label}`}
        className="status-filter-checkbox-zone flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] focus:outline-none"
      >
        <StatusFilterCheckbox checked={isActive} />
      </button>
      <button
        type="button"
        data-haptic="medium"
        onClick={() => onTextAction(option.id, isActive)}
        title={textActionLabel}
        aria-label={`${textActionLabel} ${option.label}`}
        className="status-filter-text-zone h-8 min-w-0 text-right text-sm font-semibold text-app-text focus:outline-none"
        dir="ltr"
      >
        <span className="status-filter-action-slot" dir="rtl" aria-hidden="true">
          <span className="status-filter-action-cue status-filter-text-cue text-xs font-medium text-app-text-secondary">
            {textActionLabel}
          </span>
          <span className="status-filter-action-cue status-filter-checkbox-cue text-xs font-medium text-app-text-secondary">
            {checkboxActionLabel}
          </span>
        </span>
        <span className="status-filter-label-zone flex h-full min-w-0 items-center gap-2 px-2" dir="rtl">
          {option.dotClassName ? (
            <span
              className={joinClassNames(
                'h-2.5 w-2.5 shrink-0 rounded-full',
                option.dotClassName,
                isActive ? '' : 'opacity-45 grayscale',
              )}
            />
          ) : null}
          <span className="min-w-0 flex-1 truncate text-app-text">{option.label}</span>
        </span>
      </button>
    </div>
  );
};

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
  showSearch = true,
  appearance = 'default',
}) => {
  const isStatusAppearance = appearance === 'status';
  const { menuStyle, setRootRef } = useFixedFilterMenu(
    isOpen,
    isStatusAppearance ? 220 : 200,
    containerRef,
  );
  const selectedOptions = options.filter((option) => selectedValues.has(option.id));
  const selectedCount = selectedOptions.length;
  const isActive = selectedCount > 0;
  const selectedLabel =
    selectedCount === 0
      ? defaultLabel
      : selectedCount === 1
        ? (selectedOptions[0]?.label ?? defaultLabel)
        : `${selectedCount} ${pluralLabel}`;

  const filteredOptions = options.filter(
    (option) => !showSearch || !searchValue || option.label.includes(searchValue),
  );
  const optionIds = options.map((option) => option.id);

  const setValuesAndResetPage = (nextValues: Set<string>) => {
    setSelectedValues(nextValues);
    setCurrentPage?.(1);
  };

  const handleStatusTextAction = (optionId: string, isSelected: boolean) => {
    if (isSelected && selectedCount < options.length) {
      setValuesAndResetPage(new Set(optionIds));
      return;
    }

    setValuesAndResetPage(new Set([optionId]));
  };

  const handleStatusCheckboxToggle = (optionId: string) => {
    toggleValue(optionId);
    setCurrentPage?.(1);
  };

  if (isStatusAppearance) {
    const statusButtonLabel = `${defaultLabel} ${selectedCount}/${options.length}`;

    return (
      <div className="relative w-full min-w-0 shrink min-[540px]:w-[178px] min-[540px]:shrink-0" ref={setRootRef}>
        <button
          type="button"
          data-haptic="medium"
          title={statusButtonLabel}
          onClick={() => {
            if (isOpen) {
              setOpen(false);
              return;
            }

            closeOtherMenus();
            setOpen(true);
          }}
          className="flex h-10 w-full min-w-0 items-center gap-1.5 rounded-[6px] border border-app-border bg-app-surface px-2 text-sm font-semibold text-app-text transition-colors hover:bg-app-surface-raised md:gap-2 md:px-3 dark:border-app-nav-border dark:bg-[#0A0A0A] dark:text-[#EDEDED] dark:hover:bg-[#111111]"
        >
          <StatusDotSummary options={options} selectedValues={selectedValues} />
          <span className="min-w-0 flex-1 truncate text-right">{defaultLabel}</span>
          <span className="shrink-0 rounded-full bg-app-nav-active-bg px-1.5 py-0.5 text-xs font-bold leading-none text-app-text">
            {selectedCount}/{options.length}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-app-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && typeof document !== 'undefined'
          ? createPortal(
              <div
                className="fixed z-50 max-w-[calc(100vw-24px)] rounded-[8px] border border-app-border bg-app-surface p-2 shadow-[var(--app-shadow-panel)] dark:border-app-nav-border"
                dir="rtl"
                style={menuStyle}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="space-y-0.5">
                  {filteredOptions.map((option) => {
                    const optionActive = selectedValues.has(option.id);

                    return (
                      <StatusFilterOptionRow
                        key={option.id}
                        option={option}
                        isActive={optionActive}
                        selectedCount={selectedCount}
                        totalCount={options.length}
                        onToggle={handleStatusCheckboxToggle}
                        onTextAction={handleStatusTextAction}
                      />
                    );
                  })}
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  }

  return (
    <div className="relative w-[112px] shrink-0" ref={setRootRef}>
      <button
        type="button"
        data-haptic="medium"
        title={selectedLabel}
        onClick={() => {
          if (isOpen) {
            setOpen(false);
            return;
          }

          closeOtherMenus();
          setOpen(true);
        }}
        className={getListFilterButtonClass(isActive)}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate text-right">{selectedLabel}</span>
        {isActive ? (
          <span
            data-haptic="light"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedValues(new Set());
              setOpen(false);
              setCurrentPage?.(1);
            }}
            className="shrink-0 cursor-pointer rounded p-0.5 transition-colors hover:bg-app-brand-subtle dark:hover:bg-app-brand-subtle"
            role="button"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed z-50 flex max-h-[260px] min-w-[200px] max-w-[calc(100vw-24px)] flex-col rounded-xl border border-app-border bg-app-surface shadow-[var(--app-shadow-panel)]"
              style={menuStyle}
              onMouseDown={(event) => event.stopPropagation()}
            >
              {showSearch ? (
                <div className="border-b border-app-border p-2">
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg bg-app-surface-raised px-2.5 py-1.5 text-sm text-app-text outline-none placeholder:text-app-text-muted"
                    style={{ direction: 'rtl' }}
                  />
                </div>
              ) : null}
              <div className="overflow-y-auto py-1">
                {filteredOptions.map((option) => {
                  const optionActive = selectedValues.has(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      data-haptic="selection"
                      onClick={() => {
                        toggleValue(option.id);
                        setCurrentPage?.(1);
                      }}
                      className={getOptionButtonClass(optionActive)}
                    >
                      <span className={getCheckboxClass(optionActive)}>
                        {optionActive ? <Check className="h-2.5 w-2.5 text-white" /> : null}
                      </span>
                      {option.dotClassName ? (
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${option.dotClassName} ${optionActive ? '' : 'opacity-50'}`}
                        />
                      ) : null}
                      <span className={`flex-1 truncate text-right ${optionActive ? 'font-medium' : ''}`}>
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
            </div>,
            document.body,
          )
        : null}
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
  const { menuStyle, setRootRef } = useFixedFilterMenu(isOpen, 180, containerRef);
  const isActive = value !== clearValue;
  const selectedOption = options.find((option) => option.id === value);
  const buttonLabel = selectedOption?.label ?? defaultLabel;

  return (
    <div className="relative w-[112px] shrink-0" ref={setRootRef}>
      <button
        type="button"
        data-haptic="medium"
        title={buttonLabel}
        onClick={() => {
          if (isOpen) {
            setOpen(false);
            return;
          }

          closeOtherMenus();
          setOpen(true);
        }}
        className={getListFilterButtonClass(isActive)}
      >
        <span className="min-w-0 flex-1 truncate text-right">{buttonLabel}</span>
        {isActive ? (
          <>
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-app-brand text-[10px] font-bold text-white">
              1
            </span>
            <span
              role="button"
              data-haptic="light"
              onClick={(event) => {
                event.stopPropagation();
                onChange(clearValue);
                setOpen(false);
                setCurrentPage?.(1);
              }}
              className="shrink-0 cursor-pointer rounded p-0.5 transition-colors hover:bg-app-brand-subtle dark:hover:bg-app-brand-subtle"
            >
              <X className="h-3 w-3" />
            </span>
          </>
        ) : (
          <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed z-50 min-w-[180px] max-w-[calc(100vw-24px)] rounded-[4px] border border-app-border bg-app-surface py-1 shadow-[var(--app-shadow-panel)]"
              style={menuStyle}
              onMouseDown={(event) => event.stopPropagation()}
            >
              {options.map((option) => {
                const isSelected = option.id === value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    data-haptic="selection"
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                      setCurrentPage?.(1);
                    }}
                    className={getOptionButtonClass(isSelected)}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {isSelected ? <Check className="h-3.5 w-3.5 text-app-brand" /> : null}
                    </span>
                    {option.dotClassName ? (
                      <span className={`h-2 w-2 shrink-0 rounded-full ${option.dotClassName} ${isSelected ? '' : 'opacity-50'}`} />
                    ) : null}
                    <span className={`flex-1 text-right ${isSelected ? 'font-medium' : ''}`}>{option.label}</span>
                    {typeof option.count === 'number' ? (
                      <span className="rounded-full bg-app-surface-raised px-1.5 py-0.5 text-[10px] font-bold text-app-text-secondary">
                        {option.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};
