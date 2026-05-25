import React from 'react';

type SelectionActionBarProps = {
  selectedCount: number;
  selectionLabel?: React.ReactNode;
  entitySingular?: string;
  entityPlural?: string;
  onClear: () => void;
  clearLabel?: string;
  actions?: React.ReactNode;
  layout?: 'default' | 'single-row';
  showClearAction?: boolean;
};

type SelectionActionButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'neutral' | 'outline' | 'accent' | 'warning';
  };

const TEXT = {
  selectedPrefix: '\u05e0\u05d1\u05d7\u05e8\u05d5',
  clearSelection: '\u05e0\u05e7\u05d4 \u05d1\u05d7\u05d9\u05e8\u05d4',
} as const;

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const ACTION_VARIANT_CLASSES: Record<
  NonNullable<SelectionActionButtonProps['variant']>,
  string
> = {
  primary:
    'bg-app-brand-solid text-app-background shadow-black/10 hover:bg-app-brand-hover',
  neutral:
    'bg-[#404040] text-white shadow-black/10 hover:bg-[#262626]',
  outline:
    'border border-[#d4d4d4] bg-white text-[#0d0d12] hover:bg-[#f5f5f5] dark:border-[#404040] dark:bg-app-surface dark:text-app-text dark:hover:bg-[#262626]',
  accent:
    'bg-[#7c3aed] text-white shadow-[#7c3aed]/20 hover:bg-[#6d28d9]',
  warning:
    'bg-[#ea580c] text-white shadow-[#ea580c]/20 hover:bg-[#c2410c]',
};

export const SelectionActionButton: React.FC<SelectionActionButtonProps> = ({
  children,
  className,
  type = 'button',
  variant = 'primary',
  ...buttonProps
}) => {
  const haptic =
    (buttonProps as { 'data-haptic'?: string })['data-haptic'] ??
    (variant === 'warning' ? 'warning' : variant === 'primary' ? 'medium' : 'light');

  return (
    <button
      {...buttonProps}
      type={type}
      data-haptic={haptic}
      className={joinClassNames(
        'inline-flex min-h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        ACTION_VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </button>
  );
};

export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  selectedCount,
  selectionLabel,
  entitySingular,
  entityPlural,
  onClear,
  clearLabel = TEXT.clearSelection,
  actions,
  layout = 'default',
  showClearAction = true,
}) => {
  if (selectedCount <= 0) return null;

  const resolvedSelectionLabel =
    selectionLabel ??
    `${TEXT.selectedPrefix} ${selectedCount} ${
      selectedCount === 1
        ? (entitySingular ?? entityPlural ?? '')
        : (entityPlural ?? entitySingular ?? '')
    }`.trim();
  const isSingleRow = layout === 'single-row';

  return (
    <div
      className={joinClassNames(
        isSingleRow
          ? 'fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.875rem)] left-3 right-3 z-40 mx-auto max-w-[760px] rounded-2xl border border-[#e5e5e5] bg-white/95 shadow-[0_12px_40px_rgba(0,0,0,0.26)] backdrop-blur dark:border-app-border dark:bg-app-surface/95'
          : 'sticky inset-x-0 bottom-0 z-20 border-t border-[#e5e5e5] bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:border-app-border dark:bg-app-surface',
      )}
    >
      <div
        className={joinClassNames(
          isSingleRow
            ? 'flex min-w-0 items-center gap-2 px-3 py-2 sm:px-4'
            : 'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center',
        )}
      >
        <div
          className={joinClassNames(
            'inline-flex w-fit shrink-0 items-center rounded-full border border-app-brand bg-app-brand-subtle px-3 py-1.5 text-sm font-semibold text-app-brand-text dark:border-app-nav-border dark:bg-app-brand-subtle dark:text-app-brand-text',
            isSingleRow && 'max-w-[30vw] truncate px-2.5 text-xs sm:max-w-none sm:px-3 sm:text-sm',
          )}
        >
          {resolvedSelectionLabel}
        </div>
        <div
          className={joinClassNames(
            isSingleRow
              ? 'flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2'
              : 'flex flex-1 flex-wrap items-center justify-start gap-2 sm:justify-end',
          )}
        >
          {actions}
          {showClearAction ? (
            <button
              type="button"
              onClick={onClear}
              data-haptic="light"
              className="min-h-9 shrink-0 whitespace-nowrap rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm font-semibold text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:border-app-border dark:text-app-text-secondary dark:hover:bg-[#262626]"
            >
              {clearLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
