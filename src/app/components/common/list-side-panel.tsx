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
      className={`shrink-0 overflow-hidden border-l border-[#e5e5e5] transition-[width] duration-200 dark:border-[#1f1f1f] ${
        isOpen ? 'w-[380px]' : 'w-0'
      }`}
    >
      <div className="flex h-full w-[380px] flex-col bg-white dark:bg-[#0a0a0a]" dir="rtl">
        {children}
      </div>
    </div>
  );
};
