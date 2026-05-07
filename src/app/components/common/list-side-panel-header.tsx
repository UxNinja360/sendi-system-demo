import React from 'react';
import { X } from 'lucide-react';

type ListSidePanelHeaderProps = {
  icon: React.ReactNode;
  title: string;
  onClose: () => void;
};

export const ListSidePanelHeader: React.FC<ListSidePanelHeaderProps> = ({
  icon,
  title,
  onClose,
}) => {
  return (
    <div className="shrink-0 flex items-center justify-between border-b border-app-border bg-app-surface-raised px-4 py-3 dark:bg-app-surface">
      <div className="flex items-center gap-2">
        <div className="text-app-text">{icon}</div>
        <span className="text-sm font-semibold text-app-text">{title}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-1.5 transition-colors hover:bg-app-interactive-hover"
      >
        <X className="h-4 w-4 text-app-text-secondary" />
      </button>
    </div>
  );
};
