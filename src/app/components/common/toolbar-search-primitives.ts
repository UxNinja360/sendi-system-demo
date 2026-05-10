type ToolbarSearchShellOptions = {
  active: boolean;
  widthClass?: string;
  className?: string;
};

export const toolbarSearchIconClassName =
  'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted';

export const toolbarSearchInputClassName =
  'min-w-[120px] flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-text-muted';

export const toolbarSearchClearButtonClassName =
  'absolute left-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:bg-app-surface-raised';

export const getToolbarSearchShellClassName = ({
  active,
  widthClass = 'w-full',
  className = '',
}: ToolbarSearchShellOptions) =>
  [
    'flex h-10 items-center gap-1.5 overflow-hidden rounded-[4px] border pr-9 pl-8 text-sm transition-[background-color,border-color,box-shadow,color]',
    widthClass,
    'text-app-text',
    active
      ? 'border-app-border-strong bg-app-surface shadow-[0_0_0_1px_color-mix(in_srgb,var(--app-border-strong)_18%,transparent)] dark:border-[#6B6B6B] dark:bg-[#050505] dark:shadow-none'
      : 'border-app-border bg-app-surface hover:border-app-border-strong hover:bg-app-surface dark:border-[#3A3A3A] dark:bg-[#050505] dark:hover:border-[#6B6B6B] dark:hover:bg-[#050505]',
    className,
  ]
    .filter(Boolean)
    .join(' ');
