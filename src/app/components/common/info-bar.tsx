import React from 'react';

export type InfoBarTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'orange'
  | 'info'
  | 'muted'
  | 'danger';

export type InfoBarItem = {
  label: string;
  value: React.ReactNode;
  tone?: InfoBarTone;
};

type InfoBarProps = {
  leadLabel?: string;
  leadValue?: React.ReactNode;
  items: InfoBarItem[];
  className?: string;
};

const toneClassName: Record<InfoBarTone, string> = {
  default: 'text-[#0d0d12] dark:text-app-text',
  success: 'text-[#16a34a] dark:text-[#9fe870]',
  warning: 'text-[#ca8a04] dark:text-[#facc15]',
  orange: 'text-[#f97316] dark:text-[#ffa94d]',
  info: 'text-[#2563eb] dark:text-[#60a5fa]',
  muted: 'text-[#737373] dark:text-app-text-secondary',
  danger: 'text-[#ef4444] dark:text-[#ff6b6b]',
};

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const InfoBar: React.FC<InfoBarProps> = ({
  leadLabel,
  leadValue,
  items,
  className,
}) => (
  <div
    className={joinClassNames(
      'shrink-0 border-b border-[#e5e5e5] bg-[#fafafa] px-3 py-2 dark:border-app-nav-border dark:bg-[#000000]',
      className,
    )}
    dir="rtl"
  >
    <div className="flex max-w-full flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      {leadValue !== undefined ? (
        <div className="flex min-w-0 items-baseline gap-2">
          {leadLabel ? (
            <span className="shrink-0 text-[#737373] dark:text-app-text-secondary">{leadLabel}</span>
          ) : null}
          <span className="truncate text-sm font-semibold text-[#0d0d12] dark:text-app-text">
            {leadValue}
          </span>
        </div>
      ) : null}

      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex min-w-0 items-baseline gap-1.5">
          <span
            className={joinClassNames(
              'shrink-0 text-sm font-semibold tabular-nums',
              toneClassName[item.tone ?? 'default'],
            )}
          >
            {item.value}
          </span>
          <span className="truncate text-[#737373] dark:text-app-text-secondary">{item.label}</span>
        </div>
      ))}
    </div>
  </div>
);
