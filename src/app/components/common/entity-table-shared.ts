import { TABLE_WIDTHS } from '../common/table-widths';

export const ENTITY_TABLE_WIDTHS = {
  checkbox: TABLE_WIDTHS.checkbox,
  actions: TABLE_WIDTHS.actions,
  xs: TABLE_WIDTHS.status,
  sm: TABLE_WIDTHS.compact,
  md: TABLE_WIDTHS.reference,
  lg: TABLE_WIDTHS.date,
  xl: TABLE_WIDTHS.name,
  name: TABLE_WIDTHS.entityName,
  long: TABLE_WIDTHS.long,
  address: TABLE_WIDTHS.address,
  phone: TABLE_WIDTHS.phone,
  email: TABLE_WIDTHS.email,
} as const;

export const ENTITY_TABLE_HEAD_CLASS =
  'sticky top-0 z-10 border-b border-[#e5e5e5] bg-[#fafafa] dark:border-[#262626] dark:bg-[#0a0a0a]';

export const ENTITY_TABLE_CHECKBOX_HEAD_CLASS = 'pr-4 pl-0';
export const ENTITY_TABLE_CHECKBOX_BODY_CLASS = 'pr-4 pl-0';
export const ENTITY_TABLE_CHECKBOX_HEAD_LABEL_CLASS =
  'flex min-h-[42px] cursor-pointer touch-manipulation items-center justify-start';
export const ENTITY_TABLE_CHECKBOX_BODY_LABEL_CLASS =
  'flex min-h-[42px] cursor-pointer touch-manipulation items-center justify-start';

export const ENTITY_TABLE_HEADER_CELL_BASE_CLASS =
  'group/col py-2.5 text-right transition-all';
export const ENTITY_TABLE_DATA_CELL_CLASS = 'pr-2 pl-2 py-2.5 text-right';
export const ENTITY_TABLE_ACTIONS_HEAD_CLASS = 'px-1 py-2.5 w-10 text-center';
export const ENTITY_TABLE_ACTIONS_BODY_CLASS = 'px-1 w-10 text-center';

export const ENTITY_TABLE_ROW_CLASS =
  'cursor-pointer border-b border-[#e5e5e5] bg-white transition-colors hover:bg-[#fafafa] dark:border-[#262626] dark:bg-[#171717] dark:hover:bg-[#0a0a0a]';
