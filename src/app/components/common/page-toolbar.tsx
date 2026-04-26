import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import {
  ToolbarPeriodControl,
  type PeriodMode,
} from './toolbar-period-control';
import { ToolbarIconButton } from './toolbar-icon-button';

type PageToolbarProps = {
  headerControls?: React.ReactNode;
  headerActions?: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionDataOnboarding?: string;
  showPeriodControl?: boolean;
  periodControl?: React.ReactNode;
  controls?: React.ReactNode;
  actions?: React.ReactNode;
  controlsClassName?: string;
  actionsClassName?: string;
};

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

export const PageToolbar: React.FC<PageToolbarProps> = ({
  headerControls,
  headerActions,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDataOnboarding,
  showPeriodControl = true,
  periodControl,
  controls,
  actions,
  controlsClassName = '',
  actionsClassName = '',
}) => {
  const primaryActionMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [primaryActionMenuOpen, setPrimaryActionMenuOpen] = React.useState(false);
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

  React.useEffect(() => {
    if (!primaryActionMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!primaryActionMenuRef.current?.contains(event.target as Node)) {
        setPrimaryActionMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPrimaryActionMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [primaryActionMenuOpen]);

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
  const renderedPrimaryAction =
    headerActions ??
    (primaryActionLabel && onPrimaryAction ? (
      <ToolbarIconButton
        data-onboarding={primaryActionDataOnboarding}
        onClick={() => setPrimaryActionMenuOpen((current) => !current)}
        label={primaryActionLabel}
        aria-haspopup="menu"
        aria-expanded={primaryActionMenuOpen}
        active={primaryActionMenuOpen}
      >
        <MoreHorizontal className="h-4 w-4" />
      </ToolbarIconButton>
    ) : null);
  const hasToolbarRow = Boolean(
    renderedPrimaryAction || renderedPeriodControl || controls || actions || headerControls,
  );

  return (
    <>
      {hasToolbarRow ? (
        <div className="app-toolbar-shell sticky top-0 z-20 shrink-0 border-b border-[#e5e5e5] bg-white dark:border-app-nav-border dark:bg-[#000000]">
          <div className="app-toolbar-row overflow-visible px-3 py-2.5">
            <div className="flex w-full min-w-0 flex-nowrap items-center gap-1.5">
              {renderedPeriodControl ? (
                <div className="flex max-w-full shrink-0 flex-nowrap items-center gap-1">
                  {renderedPeriodControl}
                </div>
              ) : null}
              {controls ? (
                <div
                  className={`flex max-w-full shrink-0 flex-nowrap items-center gap-1 ${controlsClassName}`.trim()}
                >
                  {controls}
                </div>
              ) : null}
              {actions ? (
                <div
                  className={`flex min-w-0 flex-1 flex-nowrap items-center gap-1 ${actionsClassName}`.trim()}
                >
                  {actions}
                </div>
              ) : null}
              {headerControls || renderedPrimaryAction ? (
                <div className="flex max-w-full shrink-0 flex-nowrap items-center gap-1">
                  {headerControls}
                  {renderedPrimaryAction ? (
                    <div ref={primaryActionMenuRef} className="relative flex shrink-0 items-center">
                      {renderedPrimaryAction}
                      {primaryActionMenuOpen && primaryActionLabel && onPrimaryAction ? (
                        <div
                          role="menu"
                          className="absolute left-0 top-full z-50 mt-2 min-w-40 overflow-hidden rounded-[var(--app-radius-md)] border border-app-border bg-app-surface py-1 text-right shadow-[var(--app-shadow-panel)]"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setPrimaryActionMenuOpen(false);
                              onPrimaryAction();
                            }}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
                          >
                            <span>{primaryActionLabel}</span>
                            <Plus className="h-3.5 w-3.5 text-app-brand" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
