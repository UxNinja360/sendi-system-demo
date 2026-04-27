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
    <div className="flex min-h-[320px] items-center justify-center rounded-[6px] border border-[#2e2e2e] bg-[#1a1a1a]">
      <div className="flex max-w-md flex-col items-center px-6 text-center">
        <h3 className="text-sm font-semibold text-app-text">{title}</h3>
        <p className="mt-3 text-sm text-app-text-secondary">{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-4 text-sm font-medium text-[#3291ff] transition-colors hover:text-[#52a8ff]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  </div>
);
