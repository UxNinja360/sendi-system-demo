import React from 'react';

type ListInfoBarProps = {
  children: React.ReactNode;
};

export const ListInfoBar: React.FC<ListInfoBarProps> = ({ children }) => {
  return (
    <div className="shrink-0 border-b border-[#e5e5e5] bg-white px-4 py-1 dark:border-[#1f1f1f] dark:bg-[#171717]">
      <span className="text-xs text-[#a3a3a3] dark:text-[#737373]">{children}</span>
    </div>
  );
};
