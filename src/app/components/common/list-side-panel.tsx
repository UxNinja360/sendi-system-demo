import React from 'react';

type ListSidePanelProps = {
  isOpen: boolean;
  children: React.ReactNode;
};

export const ListSidePanel: React.FC<ListSidePanelProps> = ({
  isOpen,
  children,
}) => {
  return (
    <div
      className={`shrink-0 overflow-hidden transition-[width] duration-200 ${
        isOpen
          ? 'w-[404px]'
          : 'w-0'
      }`}
    >
      <div className="h-full w-[404px] bg-app-background p-3" dir="rtl">
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[8px] border border-app-border bg-app-surface">
          {children}
        </div>
      </div>
    </div>
  );
};
