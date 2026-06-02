import React from 'react';

const getBusinessInitials = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export const BusinessAvatar: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span
    className={`flex shrink-0 items-center justify-center rounded-full bg-app-brand-solid font-bold text-app-background shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] ${className ?? 'h-7 w-7 text-[11px]'}`}
    aria-hidden="true"
  >
    {getBusinessInitials(name)}
  </span>
);
