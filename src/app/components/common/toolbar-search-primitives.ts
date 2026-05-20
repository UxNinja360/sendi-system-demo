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
    'toolbar-search-shell',
    widthClass,
    'text-app-text',
    active
      ? 'border-app-border bg-app-surface shadow-none dark:border-app-nav-border dark:bg-[#0A0A0A]'
      : 'border-app-border bg-app-surface hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#0A0A0A] dark:hover:bg-[#111111]',
    className,
  ]
    .filter(Boolean)
    .join(' ');
