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
          ? 'w-[380px] border-l border-[#e5e5e5] dark:border-app-border'
          : 'w-0 border-l-0'
      }`}
    >
      <div className="flex h-full w-[380px] flex-col bg-white dark:bg-app-surface" dir="rtl">
        {children}
      </div>
    </div>
  );
};
