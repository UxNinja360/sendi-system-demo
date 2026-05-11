import React from 'react';

type EntityActionMenuProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  menuRef?: React.Ref<HTMLDivElement>;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
};

type EntityActionMenuOverlayProps = {
  open: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  children: React.ReactNode;
};

type EntityActionMenuHeaderProps = {
  title: string;
  subtitle?: React.ReactNode;
};

type EntityActionMenuItemProps = {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  danger?: boolean;
  disabled?: boolean;
};

export const EntityActionMenu = React.forwardRef<HTMLDivElement, EntityActionMenuProps>(
  ({ children, style, onClick, onPointerDown }, ref) => {
    return (
      <div
        ref={ref}
        dir="rtl"
        className="absolute w-56 overflow-hidden rounded-[var(--app-radius-md)] border border-app-border bg-app-surface py-1 text-right shadow-[var(--app-shadow-panel)]"
        style={style}
        onClick={onClick}
        onPointerDown={onPointerDown}
      >
        {children}
      </div>
    );
  },
);

EntityActionMenu.displayName = 'EntityActionMenu';

export const EntityActionMenuOverlay: React.FC<EntityActionMenuOverlayProps> = ({
  open,
  position,
  onClose,
  children,
}) => {
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !position) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </div>
  );
};

export const EntityActionMenuHeader: React.FC<EntityActionMenuHeaderProps> = ({
  title,
  subtitle,
}) => {
  return (
    <div className="mx-2 mb-1 border-b border-app-border px-1 py-2">
      <p className="truncate text-sm font-semibold text-app-text">
        {title}
      </p>
      {subtitle ? <div className="mt-0.5">{subtitle}</div> : null}
    </div>
  );
};

export const EntityActionMenuItem: React.FC<EntityActionMenuItemProps> = ({
  icon,
  children,
  onClick,
  danger = false,
  disabled = false,
}) => {
  const baseClassName =
    'flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-app-text-secondary';
  const toneClassName = danger
    ? 'text-red-500 hover:bg-red-500/10'
    : 'text-app-text hover:bg-app-surface-raised';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClassName} ${toneClassName} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {icon}
      {children}
    </button>
  );
};

export const EntityActionMenuDivider: React.FC = () => {
  return <div className="mx-2 my-1 border-t border-app-border" />;
};
