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
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--app-radius-xs)] border transition-colors focus:outline-none focus:ring-2 focus:ring-app-brand/40 disabled:cursor-not-allowed disabled:opacity-40',
    active
      ? 'border-app-brand/40 bg-app-brand-subtle text-app-brand-text'
      : 'border-app-border bg-app-surface text-app-text-secondary hover:bg-app-surface-raised',
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
