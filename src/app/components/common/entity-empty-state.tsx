import React from 'react';
import { Filter, Search, Sparkles } from 'lucide-react';

type EntityEmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  footerText: string;
};

export const EntityEmptyState: React.FC<EntityEmptyStateProps> = ({
  icon,
  title,
  description,
  footerText,
}) => {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20">
      <div className="relative">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9fe870]/20 to-[#9fe870]/5">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#9fe870] to-[#8ed960] shadow-lg">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>
      <h3 className="mb-2 text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">{title}</h3>
      <p className="mb-6 max-w-md text-center text-sm text-[#737373] dark:text-[#a3a3a3]">
        {description}
      </p>
      <div className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] bg-[#f5f5f5] px-4 py-2 dark:border-[#262626] dark:bg-[#0a0a0a]">
        <div className="h-2 w-2 animate-pulse rounded-full bg-[#9fe870]" />
        <span className="text-xs text-[#737373] dark:text-[#a3a3a3]">{footerText}</span>
      </div>
    </div>
  );
};

type EntityNoResultsStateProps = {
  description: string;
  onClearAll: () => void;
};

export const EntityNoResultsState: React.FC<EntityNoResultsStateProps> = ({
  description,
  onClearAll,
}) => {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20">
      <div className="relative">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5">
          <Search className="h-12 w-12 text-amber-500" />
        </div>
      </div>
      <h3 className="mb-2 text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">לא נמצאו תוצאות</h3>
      <p className="mb-4 max-w-md text-center text-sm text-[#737373] dark:text-[#a3a3a3]">
        {description}
      </p>
      <button
        onClick={onClearAll}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#9fe870] to-[#8ed960] px-5 py-2.5 text-sm font-medium text-[#0d0d12] shadow-lg shadow-[#9fe870]/30 transition-all hover:from-[#8ed960] hover:to-[#7dc850]"
      >
        <Filter className="h-4 w-4" />
        נקה את כל הפילטרים
      </button>
    </div>
  );
};
