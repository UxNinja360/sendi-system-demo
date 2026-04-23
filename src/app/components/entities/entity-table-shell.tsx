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

type EntityTableShellProps = {
  ariaLabel: string;
  colgroup: React.ReactNode;
  headerRow: React.ReactNode;
  children: React.ReactNode;
};

type EntityTableCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  indeterminate?: boolean;
};

type EntityTableActionsCellProps = {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLTableCellElement>;
};

export const EntityTableShell: React.FC<EntityTableShellProps> = ({
  ariaLabel,
  colgroup,
  headerRow,
  children,
}) => (
  <div className="overflow-auto relative flex-1">
    <table className="w-full" role="grid" aria-label={ariaLabel}>
      {colgroup}
      <thead className={ENTITY_TABLE_HEAD_CLASS}>
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
}) => (
  <td className={ENTITY_TABLE_ACTIONS_BODY_CLASS} onClick={onClick}>
    <div className="flex justify-center">{children}</div>
  </td>
);
