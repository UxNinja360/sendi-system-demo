import React from 'react';
import { ArrowLeft } from 'lucide-react';

type ModuleMetric = {
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'default' | 'success' | 'warning' | 'info';
};

type ModuleSection = {
  title: string;
  description?: string;
  items?: string[];
};

type ModuleScaffoldProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  statusLabel?: string;
  statusTone?: 'draft' | 'connected' | 'warning';
  metrics?: ModuleMetric[];
  sections?: ModuleSection[];
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionDisabled?: boolean;
  children?: React.ReactNode;
};

const toneClassName = (tone: ModuleMetric['tone'] = 'default') => {
  if (tone === 'success') return 'text-app-success-text';
  if (tone === 'warning') return 'text-app-warning-text';
  if (tone === 'info') return 'text-app-info-text';
  return 'text-app-text';
};

const statusClassName = (tone: ModuleScaffoldProps['statusTone'] = 'draft') => {
  if (tone === 'connected') {
    return 'border-app-brand/30 bg-app-brand-subtle text-app-brand-text';
  }
  if (tone === 'warning') {
    return 'border-app-warning-text/30 bg-app-warning-subtle text-app-warning-text';
  }
  return 'border-app-border bg-app-surface-raised text-app-text-secondary';
};

export const ModuleScaffold: React.FC<ModuleScaffoldProps> = ({
  icon,
  title,
  subtitle,
  statusLabel = 'ממתין לחיבור',
  statusTone = 'draft',
  metrics = [],
  sections = [],
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
  children,
}) => {
  return (
    <div className="h-full overflow-y-auto bg-app-background px-4 py-5 sm:px-6" dir="rtl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-col gap-4 border-b border-app-border pb-5 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface text-app-brand-text">
              {icon}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-normal text-app-text">
                  {title}
                </h1>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClassName(statusTone)}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-app-text-secondary">
                {subtitle}
              </p>
            </div>
          </div>

          {primaryActionLabel ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={primaryActionDisabled || !onPrimaryAction}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[var(--app-radius-xs)] border border-app-border bg-app-surface px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span>{primaryActionLabel}</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {metrics.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-4 py-3"
              >
                <div className="text-xs text-app-text-secondary">{metric.label}</div>
                <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClassName(metric.tone)}`}>
                  {metric.value}
                </div>
                {metric.helper ? (
                  <div className="mt-1 text-xs text-app-text-muted">
                    {metric.helper}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {children}

        {sections.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface p-4"
              >
                <h2 className="text-sm font-semibold text-app-text">
                  {section.title}
                </h2>
                {section.description ? (
                  <p className="mt-1 text-sm leading-6 text-app-text-secondary">
                    {section.description}
                  </p>
                ) : null}
                {section.items?.length ? (
                  <div className="mt-3 space-y-2">
                    {section.items.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-app-text-secondary">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-app-brand" />
                        <span className="leading-6">{item}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
