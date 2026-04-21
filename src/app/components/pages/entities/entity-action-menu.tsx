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
        className="absolute min-w-[180px] bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden py-1"
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
    <div className="px-3 py-2 border-b border-[#f5f5f5] dark:border-[#262626] mb-1">
      <p className="text-xs font-semibold text-[#0d0d12] dark:text-[#fafafa] truncate">
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
    'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors';
  const toneClassName = danger
    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
    : 'text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]';

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
  return <div className="border-t border-[#f5f5f5] dark:border-[#262626] my-1" />;
};
