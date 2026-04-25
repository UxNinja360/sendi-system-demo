import React from 'react';

type EntityListShellProps = {
  sidePanel?: React.ReactNode;
  toolbar?: React.ReactNode;
  overview?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  mainClassName?: string;
  contentClassName?: string;
};

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const EntityListShell: React.FC<EntityListShellProps> = ({
  sidePanel,
  toolbar,
  overview,
  children,
  className,
  mainClassName,
  contentClassName,
}) => (
  <div
    className={joinClassNames(
      'flex h-full flex-row overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]',
      className,
    )}
    dir="ltr"
  >
    {sidePanel}

    <div
      className={joinClassNames(
        'flex min-w-0 flex-1 flex-col overflow-hidden',
        mainClassName,
      )}
      dir="rtl"
    >
      {toolbar}
      {overview}

      <div
        className={joinClassNames(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  </div>
);
