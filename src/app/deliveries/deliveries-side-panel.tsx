import React from 'react';
import { Download } from 'lucide-react';
import { ExportDrawer } from './export-drawer';
import { ListColumnsPanel } from '../components/common/list-columns-panel';
import { ListSidePanel } from '../components/common/list-side-panel';
import { ListSidePanelHeader } from '../components/common/list-side-panel-header';

type DeliveriesSidePanelProps = {
  exportOpen: boolean;
  columnsOpen: boolean;
  onCloseExport: () => void;
  onCloseColumns: () => void;
  setColumnsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onExport: (config: Parameters<React.ComponentProps<typeof ExportDrawer>['onExport']>[0]) => void;
  visibleColumns: Set<string>;
  setVisibleColumns: React.Dispatch<React.SetStateAction<Set<string>>>;
  deliveryCount: number;
  selectedCount: number;
  groupCounts: React.ComponentProps<typeof ExportDrawer>['groupCounts'];
  columnCategories?: React.ComponentProps<typeof ListColumnsPanel>['categories'];
  defaultVisibleColumns?: Iterable<string>;
};

export const DeliveriesSidePanel: React.FC<DeliveriesSidePanelProps> = ({
  exportOpen,
  columnsOpen,
  onCloseExport,
  onCloseColumns,
  setColumnsOpen,
  onExport,
  visibleColumns,
  setVisibleColumns,
  deliveryCount,
  selectedCount,
  groupCounts,
  columnCategories,
  defaultVisibleColumns,
}) => {
  return (
    <ListSidePanel isOpen={exportOpen || columnsOpen}>
      {exportOpen && (
        <>
          <ListSidePanelHeader
            icon={<Download className="h-4 w-4" />}
            title="ייצוא"
            onClose={onCloseExport}
          />
          <ExportDrawer
            isOpen={exportOpen}
            isEmbedded={true}
            onClose={onCloseExport}
            onExport={onExport}
            visibleColumns={visibleColumns}
            deliveryCount={deliveryCount}
            selectedCount={selectedCount}
            groupCounts={groupCounts}
          />
        </>
      )}

      {columnsOpen && (
        <ListColumnsPanel
          isOpen={columnsOpen}
          setIsOpen={setColumnsOpen}
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          categories={columnCategories}
          defaultVisibleColumns={defaultVisibleColumns}
          title="עמודות משלוחים"
          description="בחר אילו פרטים יופיעו בטבלת המשלוחים"
          presetsKey="deliveries-column-presets-v2"
        />
      )}
    </ListSidePanel>
  );
};

