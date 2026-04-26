import React from 'react';
import { createPortal } from 'react-dom';

export type LiveSortMenuOption = {
  id: string;
  label: string;
};

type LiveSortMenuProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  options: LiveSortMenuOption[];
  selectedId: string;
  width?: number;
  onClose: () => void;
  onSelect: (id: string) => void;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

const VIEWPORT_GUTTER = 8;
const MENU_OFFSET = 8;
const ITEM_HEIGHT = 42;

export const LiveSortMenu: React.FC<LiveSortMenuProps> = ({
  anchorRef,
  open,
  options,
  selectedId,
  width = 192,
  onClose,
  onSelect,
}) => {
  const [position, setPosition] = React.useState<MenuPosition | null>(null);

  const updatePosition = React.useCallback(() => {
    if (typeof window === 'undefined') return;

    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    if (anchor.getClientRects().length === 0 || (rect.width === 0 && rect.height === 0)) {
      setPosition(null);
      return;
    }

    const menuHeight = options.length * ITEM_HEIGHT;
    const maxLeft = window.innerWidth - width - VIEWPORT_GUTTER;
    const left = Math.max(VIEWPORT_GUTTER, Math.min(rect.left, maxLeft));
    let top = rect.bottom + MENU_OFFSET;

    if (top + menuHeight > window.innerHeight - VIEWPORT_GUTTER) {
      top = Math.max(VIEWPORT_GUTTER, rect.top - menuHeight - MENU_OFFSET);
    }

    setPosition({ top, left, width });
  }, [anchorRef, options.length, width]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return undefined;

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  if (!open || typeof document === 'undefined' || !position) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[1990]" onClick={onClose} />
      <div
        dir="rtl"
        className="fixed z-[2000] overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-2xl dark:border-app-border dark:bg-app-surface"
        style={position}
      >
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`w-full px-4 py-2.5 text-right text-sm transition-colors ${
              selectedId === option.id
                ? 'bg-[#f0fdf4] font-bold text-[#22c55e] dark:bg-[#0a2f1a]'
                : 'text-[#0d0d12] hover:bg-[#fafafa] dark:text-[#fafafa] dark:hover:bg-[#262626]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>,
    document.body
  );
};
