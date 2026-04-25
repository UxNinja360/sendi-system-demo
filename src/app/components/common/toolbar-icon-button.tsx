import React from 'react';

type ToolbarIconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  active?: boolean;
  children: React.ReactNode;
  label: string;
};

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const getToolbarIconButtonClassName = (
  active = false,
  className?: string,
) =>
  joinClassNames(
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border transition-colors focus:outline-none focus:ring-2 focus:ring-[#9fe870]/40 disabled:cursor-not-allowed disabled:opacity-40',
    active
      ? 'border-[#9fe870]/40 bg-[#9fe870]/15 text-[#6bc84a]'
      : 'border-[#e5e5e5] bg-white text-[#525252] hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]',
    className,
  );

export const ToolbarIconButton = React.forwardRef<
  HTMLButtonElement,
  ToolbarIconButtonProps
>(
  (
    {
      active = false,
      children,
      className,
      label,
      title,
      type = 'button',
      ...buttonProps
    },
    ref,
  ) => {
    const ariaLabel = buttonProps['aria-label'] ?? label;

    return (
      <button
        {...buttonProps}
        ref={ref}
        type={type}
        title={title ?? label}
        aria-label={ariaLabel}
        className={getToolbarIconButtonClassName(active, className)}
      >
        {children}
      </button>
    );
  },
);

ToolbarIconButton.displayName = 'ToolbarIconButton';
