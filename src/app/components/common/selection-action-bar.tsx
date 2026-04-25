import React from 'react';

type SelectionActionBarProps = {
  selectedCount: number;
  selectionLabel?: React.ReactNode;
  entitySingular?: string;
  entityPlural?: string;
  onClear: () => void;
  clearLabel?: string;
  actions?: React.ReactNode;
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
    'bg-[#16a34a] text-white shadow-[#16a34a]/20 hover:bg-[#15803d]',
  neutral:
    'bg-[#404040] text-white shadow-black/10 hover:bg-[#262626]',
  outline:
    'border border-[#d4d4d4] bg-white text-[#0d0d12] hover:bg-[#f5f5f5] dark:border-[#404040] dark:bg-[#171717] dark:text-[#fafafa] dark:hover:bg-[#262626]',
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
}) => (
  <button
    {...buttonProps}
    type={type}
    className={joinClassNames(
      'inline-flex min-h-9 items-center justify-center rounded-lg px-4 py-2 text-sm font-bold shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-40',
      ACTION_VARIANT_CLASSES[variant],
      className,
    )}
  >
    {children}
  </button>
);

export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  selectedCount,
  selectionLabel,
  entitySingular,
  entityPlural,
  onClear,
  clearLabel = TEXT.clearSelection,
  actions,
}) => {
  if (selectedCount <= 0) return null;

  const resolvedSelectionLabel =
    selectionLabel ??
    `${TEXT.selectedPrefix} ${selectedCount} ${
      selectedCount === 1
        ? (entitySingular ?? entityPlural ?? '')
        : (entityPlural ?? entitySingular ?? '')
    }`.trim();

  return (
    <div className="sticky inset-x-0 bottom-0 z-20 border-t border-[#e5e5e5] bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:border-[#262626] dark:bg-[#171717]">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
        <div className="inline-flex w-fit items-center rounded-full border border-[#d7efc8] bg-[#ecfae2] px-3 py-1.5 text-sm font-semibold text-[#166534] dark:border-[#365314] dark:bg-[#163300] dark:text-[#b5f27d]">
          {resolvedSelectionLabel}
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-start gap-2 sm:justify-end">
          {actions}
          <button
            type="button"
            onClick={onClear}
            className="min-h-9 rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm font-semibold text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:text-[#a3a3a3] dark:hover:bg-[#262626]"
          >
            {clearLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
