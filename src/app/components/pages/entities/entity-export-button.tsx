import React from 'react';
import { Download } from 'lucide-react';

type EntityExportButtonProps = {
  onClick: () => void;
};

export const EntityExportButton: React.FC<EntityExportButtonProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 flex items-center gap-1.5 px-3 rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] text-sm font-medium text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">ייצוא</span>
    </button>
  );
};
