import React from 'react';

type VercelEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const VercelEmptyState: React.FC<VercelEmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="bg-app-background px-3" dir="rtl">
    <div className="flex min-h-[320px] items-center justify-center rounded-[6px] border border-app-border bg-app-surface">
      <div className="flex max-w-md flex-col items-center px-6 text-center">
        <h3 className="text-sm font-semibold text-app-text">{title}</h3>
        <p className="mt-3 text-sm text-app-text-secondary">{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-4 text-sm font-medium text-app-brand-text transition-colors hover:text-app-brand"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  </div>
);
