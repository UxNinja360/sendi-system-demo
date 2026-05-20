import React from 'react';

import { AppTooltip } from './app-tooltip';

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
      ? 'border-[#0D0D12] bg-[#F5F5F5] text-[#0D0D12] dark:border-[#2E2E2E] dark:bg-[#1F1F1F] dark:text-[#EDEDED]'
      : 'border-[#E5E5E5] bg-white text-[#0D0D12] hover:bg-[#F5F5F5] dark:border-app-nav-border dark:bg-[#0A0A0A] dark:text-[#EDEDED] dark:hover:bg-[#111111]',
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
      onClick,
      title,
      type = 'button',
      ...buttonProps
    },
    ref,
  ) => {
    const ariaLabel = buttonProps['aria-label'] ?? label;
    const tooltipLabel = title ?? label;
    const haptic =
      (buttonProps as { 'data-haptic'?: string })['data-haptic'] ?? 'light';
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      const isTouchLikeDevice =
        typeof window !== 'undefined' &&
        window.matchMedia('(hover: none), (pointer: coarse)').matches;

      if (isTouchLikeDevice) {
        event.currentTarget.blur();
      }
    };

    return (
      <AppTooltip label={tooltipLabel} side="bottom" sideOffset={8} className="inline-flex shrink-0">
        <button
          {...buttonProps}
          ref={ref}
          type={type}
          aria-label={ariaLabel}
          data-haptic={haptic}
          data-toolbar-icon-button
          data-active={active ? 'true' : 'false'}
          onClick={handleClick}
          className={getToolbarIconButtonClassName(active, className)}
        >
          {children}
        </button>
      </AppTooltip>
    );
  },
);

ToolbarIconButton.displayName = 'ToolbarIconButton';
