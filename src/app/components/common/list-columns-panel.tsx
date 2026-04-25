import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { type ColumnCategory, ColumnSelector } from './column-selector';
import { ListSidePanelHeader } from './list-side-panel-header';

export type ListColumnsPanelProps = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  visibleColumns: Set<string>;
  setVisibleColumns: React.Dispatch<React.SetStateAction<Set<string>>>;
  categories?: ColumnCategory[];
  defaultVisibleColumns?: Iterable<string>;
  title?: string;
  description?: string;
  presetsKey?: string;
};

export const ListColumnsPanel: React.FC<ListColumnsPanelProps> = ({
  isOpen,
  setIsOpen,
  visibleColumns,
  setVisibleColumns,
  categories,
  defaultVisibleColumns,
  title = '\u05e2\u05de\u05d5\u05d3\u05d5\u05ea',
  description,
  presetsKey,
}) => {
  return (
    <>
      <ListSidePanelHeader
        icon={<SlidersHorizontal className="h-4 w-4" />}
        title={title}
        onClose={() => setIsOpen(false)}
      />
      <ColumnSelector
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        isEmbedded={true}
        categories={categories}
        defaultVisibleColumns={defaultVisibleColumns}
        title={title}
        description={description}
        presetsKey={presetsKey}
      />
    </>
  );
};
