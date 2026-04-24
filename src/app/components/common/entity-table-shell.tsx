import React, { useEffect, useRef } from 'react';

import {
  ENTITY_TABLE_ACTIONS_BODY_CLASS,
  ENTITY_TABLE_ACTIONS_HEAD_CLASS,
  ENTITY_TABLE_CHECKBOX_BODY_CLASS,
  ENTITY_TABLE_CHECKBOX_BODY_LABEL_CLASS,
  ENTITY_TABLE_CHECKBOX_HEAD_CLASS,
  ENTITY_TABLE_CHECKBOX_HEAD_LABEL_CLASS,
  ENTITY_TABLE_HEAD_CLASS,
} from './entity-table-shared';

export type EntityTableShellProps = {
  ariaLabel: string;
  colgroup: React.ReactNode;
  headerRow: React.ReactNode;
  children: React.ReactNode;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  wrapperClassName?: string;
  tableClassName?: string;
  theadClassName?: string;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  onMouseMove?: React.MouseEventHandler<HTMLDivElement>;
  onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  style?: React.CSSProperties;
};

type EntityTableCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  indeterminate?: boolean;
};

type EntityTableActionsCellProps = {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLTableCellElement>;
  className?: string;
  contentClassName?: string;
};

export const EntityTableShell: React.FC<EntityTableShellProps> = ({
  ariaLabel,
  colgroup,
  headerRow,
  children,
  scrollContainerRef,
  wrapperClassName = '',
  tableClassName = 'w-full',
  theadClassName = ENTITY_TABLE_HEAD_CLASS,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const setContainerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;

      if (scrollContainerRef) {
        scrollContainerRef.current = node;
      }
    },
    [scrollContainerRef],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      touchStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touchStart = touchStartRef.current;
      if (!touchStart || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const isVerticalGesture = Math.abs(deltaY) >= Math.abs(deltaX);

      if (isVerticalGesture) {
        const maxScrollTop = element.scrollHeight - element.clientHeight;
        const atTop = element.scrollTop <= 0;
        const atBottom = element.scrollTop >= maxScrollTop - 1;

        if (atTop && deltaY > 0) {
          return;
        }

        if (atBottom && deltaY < 0) {
          event.preventDefault();
        }

        return;
      }

      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      const atLeftEdge = element.scrollLeft <= 0;
      const atRightEdge = element.scrollLeft >= maxScrollLeft - 1;

      if ((atLeftEdge && deltaX > 0) || (atRightEdge && deltaX < 0)) {
        event.preventDefault();
      }
    };

    const clearTouchState = () => {
      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', clearTouchState, { passive: true });
    element.addEventListener('touchcancel', clearTouchState, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', clearTouchState);
      element.removeEventListener('touchcancel', clearTouchState);
    };
  }, []);

  return (
    <div
      ref={setContainerRef}
      className={['app-table-shell relative flex-1 overflow-auto min-w-0', wrapperClassName].filter(Boolean).join(' ')}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={style}
      dir="ltr"
    >
      <table className={tableClassName} role="grid" aria-label={ariaLabel} dir="rtl">
        {colgroup}
        <thead className={theadClassName}>
          {headerRow}
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
};

export const EntityTableHeaderCheckbox: React.FC<EntityTableCheckboxProps> = ({
  checked,
  onChange,
  indeterminate = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate && !checked;
    }
  }, [checked, indeterminate]);

  return (
    <th className={ENTITY_TABLE_CHECKBOX_HEAD_CLASS}>
      <label
        className={ENTITY_TABLE_CHECKBOX_HEAD_LABEL_CLASS}
        style={{ touchAction: 'manipulation' }}
      >
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 cursor-pointer rounded border-[#d4d4d4] text-[#16a34a] accent-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 dark:border-[#404040]"
        />
      </label>
    </th>
  );
};

export const EntityTableRowCheckbox: React.FC<EntityTableCheckboxProps> = ({
  checked,
  onChange,
}) => (
  <td className={ENTITY_TABLE_CHECKBOX_BODY_CLASS} onClick={(event) => event.stopPropagation()}>
    <label
      className={ENTITY_TABLE_CHECKBOX_BODY_LABEL_CLASS}
      style={{ touchAction: 'manipulation' }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 cursor-pointer rounded border-[#d4d4d4] text-[#16a34a] accent-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 dark:border-[#404040]"
      />
    </label>
  </td>
);

export const EntityTableActionsHeader: React.FC<{ label?: string }> = ({
  label = 'פעולות',
}) => (
  <th className={ENTITY_TABLE_ACTIONS_HEAD_CLASS}>
    <span className="sr-only">{label}</span>
  </th>
);

export const EntityTableActionsCell: React.FC<EntityTableActionsCellProps> = ({
  children,
  onClick,
  className = '',
  contentClassName = '',
}) => (
  <td className={[ENTITY_TABLE_ACTIONS_BODY_CLASS, className].filter(Boolean).join(' ')} onClick={onClick}>
    <div className={['flex justify-center', contentClassName].filter(Boolean).join(' ')}>{children}</div>
  </td>
);

