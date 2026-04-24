import React from 'react';
import { Menu } from 'lucide-react';
import {
  ToolbarPeriodControl,
  type PeriodMode,
} from './toolbar-period-control';

type PageToolbarProps = {
  title: string;
  count?: number;
  showZeroCount?: boolean;
  onToggleMobileSidebar?: () => void;
  headerControls?: React.ReactNode;
  headerActions?: React.ReactNode;
  primaryActionLabel?: string;
  primaryActionIcon?: React.ReactNode;
  onPrimaryAction?: () => void;
  primaryActionDataOnboarding?: string;
  showPeriodControl?: boolean;
  periodControl?: React.ReactNode;
  controls?: React.ReactNode;
  actions?: React.ReactNode;
  summary?: React.ReactNode;
  controlsClassName?: string;
  actionsClassName?: string;
};

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

export const PageToolbar: React.FC<PageToolbarProps> = ({
  title,
  count,
  showZeroCount = false,
  onToggleMobileSidebar,
  headerControls,
  headerActions,
  primaryActionLabel,
  primaryActionIcon,
  onPrimaryAction,
  primaryActionDataOnboarding,
  showPeriodControl = true,
  periodControl,
  controls,
  actions,
  summary,
  controlsClassName = '',
  actionsClassName = '',
}) => {
  const [defaultPeriodMode, setDefaultPeriodMode] =
    React.useState<PeriodMode>('current_month');
  const [defaultMonthAnchor, setDefaultMonthAnchor] = React.useState(
    () => new Date(),
  );
  const [defaultCustomStartDate, setDefaultCustomStartDate] = React.useState(
    () => toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  const [defaultCustomEndDate, setDefaultCustomEndDate] = React.useState(
    () => toDateInputValue(new Date()),
  );
  const shouldShowCount =
    typeof count === 'number' && (showZeroCount || count > 0);
  const renderedSummary = summary ?? (shouldShowCount ? count.toLocaleString() : null);
  const renderedPeriodControl = showPeriodControl
    ? periodControl ?? (
        <ToolbarPeriodControl
          periodMode={defaultPeriodMode}
          setPeriodMode={setDefaultPeriodMode}
          monthAnchor={defaultMonthAnchor}
          setMonthAnchor={setDefaultMonthAnchor}
          customStartDate={defaultCustomStartDate}
          setCustomStartDate={setDefaultCustomStartDate}
          customEndDate={defaultCustomEndDate}
          setCustomEndDate={setDefaultCustomEndDate}
        />
      )
    : null;
  const hasSecondaryRow = Boolean(renderedPeriodControl || controls || actions);
  const hasSummaryRow = Boolean(renderedSummary || headerControls);
  const renderedHeaderActions =
    headerActions ??
    (primaryActionLabel && onPrimaryAction ? (
      <button
        type="button"
        data-onboarding={primaryActionDataOnboarding}
        onClick={onPrimaryAction}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#9fe870] px-3 py-1.5 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#8fd65f]"
      >
        {primaryActionIcon}
        <span>{primaryActionLabel}</span>
      </button>
    ) : null);

  return (
    <div className="app-safe-header sticky top-0 z-20 shrink-0 border-b border-[#e5e5e5] bg-white dark:border-[#1f1f1f] dark:bg-[#171717]">
      <div className="flex min-h-16 items-center justify-between gap-3 px-5">
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
        </div>

        {renderedHeaderActions}
      </div>

      {hasSecondaryRow ? (
        <div className="overflow-visible border-t border-[#f0f0f0] px-3 py-2.5 dark:border-[#1f1f1f]">
          <div className="flex flex-wrap items-center gap-2 md:min-w-0 md:flex-nowrap">
            {renderedPeriodControl ? (
              <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
                {renderedPeriodControl}
              </div>
            ) : null}
            {controls ? (
              <div
                className={`flex shrink-0 flex-nowrap items-center gap-1.5 ${controlsClassName}`.trim()}
              >
                {controls}
              </div>
            ) : null}
            {actions ? (
              <div
                className={`flex shrink-0 flex-nowrap items-center gap-1.5 ${actionsClassName}`.trim()}
              >
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasSummaryRow ? (
        <div className="border-t border-[#f0f0f0] px-4 py-1 dark:border-[#1f1f1f]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[#a3a3a3] dark:text-[#737373]">
              {renderedSummary}
            </span>
            {headerControls ? (
              <div className="flex items-center gap-1.5">
                {headerControls}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
