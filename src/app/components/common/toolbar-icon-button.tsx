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
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-xs)] border transition-colors focus:outline-none focus:ring-2 focus:ring-[#ededed]/25 disabled:cursor-not-allowed disabled:opacity-40',
    active
      ? 'border-app-nav-border bg-[#0A0A0A] text-app-text'
      : 'border-app-border bg-app-surface text-app-text-secondary hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#0A0A0A] dark:hover:bg-[#1A1A1A]',
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
