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
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-xs)] border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 disabled:cursor-not-allowed disabled:opacity-40',
    active
      ? 'border-app-border-strong bg-app-nav-active-bg text-app-nav-active-text dark:border-[#2E2E2E] dark:bg-[#1F1F1F] dark:text-[#EDEDED]'
      : 'border-app-border bg-app-surface text-app-text-secondary hover:bg-app-surface-raised dark:border-app-nav-border dark:bg-[#0A0A0A] dark:text-[#EDEDED] dark:hover:bg-[#111111]',
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
    const haptic =
      (buttonProps as { 'data-haptic'?: string })['data-haptic'] ?? 'light';

    return (
      <button
        {...buttonProps}
        ref={ref}
        type={type}
        title={title ?? label}
        aria-label={ariaLabel}
        data-haptic={haptic}
        className={getToolbarIconButtonClassName(active, className)}
      >
        {children}
      </button>
    );
  },
);

ToolbarIconButton.displayName = 'ToolbarIconButton';
