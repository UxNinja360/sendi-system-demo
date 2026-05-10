import { useEffect, useMemo, useState } from 'react';
import { Store } from 'lucide-react';

type RestaurantLogoMarkProps = {
  name: string;
  logoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClassNames = {
  xs: 'h-6 w-6 rounded-[5px] text-[10px]',
  sm: 'h-8 w-8 rounded-[6px] text-xs',
  md: 'h-10 w-10 rounded-[8px] text-sm',
  lg: 'h-20 w-20 rounded-[10px] text-xl',
};

const iconClassNames = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
};

const getRestaurantInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join('');

  return initials || null;
};

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const RestaurantLogoMark = ({
  name,
  logoUrl,
  size = 'md',
  className,
}: RestaurantLogoMarkProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = useMemo(() => getRestaurantInitials(name), [name]);

  useEffect(() => {
    setImageFailed(false);
  }, [logoUrl]);

  return (
    <span
      className={joinClassNames(
        'relative flex shrink-0 items-center justify-center overflow-hidden border border-app-nav-border bg-app-surface-raised font-semibold text-app-text shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--app-border)_20%,transparent)]',
        sizeClassNames[size],
        className,
      )}
    >
      {logoUrl && !imageFailed ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : initials ? (
        <span className="leading-none">{initials}</span>
      ) : (
        <Store className={joinClassNames('text-app-text-secondary', iconClassNames[size])} />
      )}
    </span>
  );
};
