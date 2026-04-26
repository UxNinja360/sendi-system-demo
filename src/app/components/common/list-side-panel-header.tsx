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
    <div className="shrink-0 flex items-center justify-between border-b border-[#e5e5e5] bg-[#fafafa] px-4 py-3 dark:border-app-border dark:bg-app-surface">
      <div className="flex items-center gap-2">
        <div className="text-[#0d0d12] dark:text-app-text">{icon}</div>
        <span className="text-sm font-semibold text-[#0d0d12] dark:text-app-text">{title}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-1.5 transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
      >
        <X className="h-4 w-4 text-[#737373] dark:text-app-text-secondary" />
      </button>
    </div>
  );
};
