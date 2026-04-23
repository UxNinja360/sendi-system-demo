import React from 'react';

type EntitySidePanelProps = {
  isOpen: boolean;
  children: React.ReactNode;
};

export const EntitySidePanel: React.FC<EntitySidePanelProps> = ({
  isOpen,
  children,
}) => {
  return (
    <div
      className={`shrink-0 transition-[width] duration-200 overflow-hidden border-l border-[#e5e5e5] dark:border-[#1f1f1f] ${
        isOpen ? 'w-[380px]' : 'w-0'
      }`}
    >
      <div
        className="w-[380px] h-full flex flex-col bg-white dark:bg-[#0a0a0a]"
        dir="rtl"
      >
        {children}
      </div>
    </div>
  );
};
