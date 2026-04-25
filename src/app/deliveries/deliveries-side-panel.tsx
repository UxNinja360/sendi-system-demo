import React from 'react';
import { Download } from 'lucide-react';
import { ExportDrawer } from './export-drawer';
import { EntityListSidePanel } from '../components/common/entity-list-side-panel';
import { ListSidePanelHeader } from '../components/common/list-side-panel-header';
import { type ColumnCategory } from '../components/common/column-selector';

type DeliveriesSidePanelProps = {
  exportOpen: boolean;
  columnsOpen: boolean;
  onCloseExport: () => void;
  setColumnsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onExport: (config: Parameters<React.ComponentProps<typeof ExportDrawer>['onExport']>[0]) => void;
  visibleColumns: Set<string>;
  setVisibleColumns: React.Dispatch<React.SetStateAction<Set<string>>>;
  deliveryCount: number;
  selectedCount: number;
  groupCounts: React.ComponentProps<typeof ExportDrawer>['groupCounts'];
  columnCategories?: ColumnCategory[];
  defaultVisibleColumns?: Iterable<string>;
};

export const DeliveriesSidePanel: React.FC<DeliveriesSidePanelProps> = ({
  exportOpen,
  columnsOpen,
  onCloseExport,
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
    <EntityListSidePanel
      exportOpen={exportOpen}
      columnsOpen={columnsOpen}
      exportPanel={
        <>
          <ListSidePanelHeader
            icon={<Download className="h-4 w-4" />}
            title={'\u05d9\u05d9\u05e6\u05d5\u05d0'}
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
      }
      columnsPanel={{
        setIsOpen: setColumnsOpen,
        visibleColumns,
        setVisibleColumns,
        categories: columnCategories,
        defaultVisibleColumns,
        title: '\u05e2\u05de\u05d5\u05d3\u05d5\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
        description:
          '\u05d1\u05d7\u05e8 \u05d0\u05d9\u05dc\u05d5 \u05e4\u05e8\u05d8\u05d9\u05dd \u05d9\u05d5\u05e4\u05d9\u05e2\u05d5 \u05d1\u05d8\u05d1\u05dc\u05ea \u05d4\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
        presetsKey: 'deliveries-column-presets-v2',
      }}
    />
  );
};

