import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type AppTooltipProps = {
  children: React.ReactNode;
  className?: string;
  label: React.ReactNode;
  side?: React.ComponentProps<typeof TooltipContent>['side'];
  sideOffset?: number;
};

export const AppTooltip: React.FC<AppTooltipProps> = ({
  children,
  className,
  label,
  side = 'left',
  sideOffset,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className={className}>{children}</div>
    </TooltipTrigger>
    <TooltipContent side={side} sideOffset={sideOffset}>
      {label}
    </TooltipContent>
  </Tooltip>
);
