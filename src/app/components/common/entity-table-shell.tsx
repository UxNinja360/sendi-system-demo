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
}) => (
  <div
    ref={scrollContainerRef}
    className={['overflow-auto relative flex-1', wrapperClassName].filter(Boolean).join(' ')}
    onMouseDown={onMouseDown}
    onMouseMove={onMouseMove}
    onMouseUp={onMouseUp}
    onMouseLeave={onMouseLeave}
    style={style}
  >
    <table className={tableClassName} role="grid" aria-label={ariaLabel}>
      {colgroup}
      <thead className={theadClassName}>
        {headerRow}
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

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

