import React from 'react';
import { Menu } from 'lucide-react';

type ListPageHeaderProps = {
  title: string;
  count?: number;
  showZeroCount?: boolean;
  onToggleMobileSidebar?: () => void;
  primaryActionLabel?: string;
  primaryActionIcon?: React.ReactNode;
  onPrimaryAction?: () => void;
  primaryActionDataOnboarding?: string;
};

export const ListPageHeader: React.FC<ListPageHeaderProps> = ({
  title,
  count,
  showZeroCount = false,
  onToggleMobileSidebar,
  primaryActionLabel,
  primaryActionIcon,
  onPrimaryAction,
  primaryActionDataOnboarding,
}) => {
  const shouldShowCount =
    typeof count === 'number' && (showZeroCount || count > 0);

  return (
    <div className="app-safe-header sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-white px-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="rounded-lg p-1.5 text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">
          {title}
        </span>
        {shouldShowCount && (
          <span className="tabular-nums text-sm text-[#a3a3a3]">
            {count.toLocaleString()}
          </span>
        )}
      </div>

      {primaryActionLabel && onPrimaryAction ? (
        <button
          type="button"
          data-onboarding={primaryActionDataOnboarding}
          onClick={onPrimaryAction}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#9fe870] px-3 py-1.5 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#8fd65f]"
        >
          {primaryActionIcon}
          <span>{primaryActionLabel}</span>
        </button>
      ) : null}
    </div>
  );
};
