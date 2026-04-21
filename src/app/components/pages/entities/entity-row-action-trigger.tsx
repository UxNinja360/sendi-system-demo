import React from 'react';
import { MoreHorizontal } from 'lucide-react';

type EntityRowActionTriggerProps = {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
};

export const EntityRowActionTrigger: React.FC<EntityRowActionTriggerProps> = ({
  onClick,
  title = 'עוד',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-lg p-1.5 text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#262626]"
      title={title}
    >
      <MoreHorizontal className="h-3.5 w-3.5" />
    </button>
  );
};
