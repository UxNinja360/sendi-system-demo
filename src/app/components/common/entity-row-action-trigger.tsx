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
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
      title={title}
    >
      <MoreHorizontal className="h-[18px] w-[18px]" />
    </button>
  );
};
