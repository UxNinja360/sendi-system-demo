import React from 'react';

type ListFiltersRowProps = {
  filters: React.ReactNode;
  actions: React.ReactNode;
  filtersClassName?: string;
  actionsClassName?: string;
};

export const ListFiltersRow: React.FC<ListFiltersRowProps> = ({
  filters,
  actions,
  filtersClassName = '',
  actionsClassName = '',
}) => {
  return (
    <div className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 border-b border-[#e5e5e5] bg-white dark:border-[#1f1f1f] dark:bg-[#171717] flex-wrap">
      <div className={`flex items-center gap-1.5 flex-wrap ${filtersClassName}`.trim()}>{filters}</div>
      <div className="flex-1" />
      <div className={`flex items-center gap-1.5 ${actionsClassName}`.trim()}>{actions}</div>
    </div>
  );
};
