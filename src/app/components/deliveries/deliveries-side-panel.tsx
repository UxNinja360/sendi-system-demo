import React from 'react';
import { Download, SlidersHorizontal } from 'lucide-react';
import { ExportDrawer } from './export-drawer';
import { ColumnSelector } from './column-selector';
import { EntitySidePanel } from '../pages/entities/entity-side-panel';
import { EntitySidePanelHeader } from '../pages/entities/entity-side-panel-header';

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
}) => {
  return (
    <EntitySidePanel isOpen={exportOpen || columnsOpen}>
      {exportOpen && (
        <>
          <EntitySidePanelHeader
            icon={<Download className="w-4 h-4" />}
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
        <>
          <EntitySidePanelHeader
            icon={<SlidersHorizontal className="w-4 h-4" />}
            title="עמודות"
            onClose={onCloseColumns}
          />
          <ColumnSelector
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            isOpen={columnsOpen}
            setIsOpen={setColumnsOpen}
            isEmbedded={true}
          />
        </>
      )}
    </EntitySidePanel>
  );
};
