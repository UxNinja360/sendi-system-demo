import React from 'react';

import {
  ListColumnsPanel,
  type ListColumnsPanelProps,
} from './list-columns-panel';
import { ListSidePanel } from './list-side-panel';

type EntityListSidePanelProps = {
  exportOpen: boolean;
  columnsOpen: boolean;
  exportPanel?: React.ReactNode;
  columnsPanel?: Omit<ListColumnsPanelProps, 'isOpen'>;
};

export const EntityListSidePanel: React.FC<EntityListSidePanelProps> = ({
  exportOpen,
  columnsOpen,
  exportPanel,
  columnsPanel,
}) => (
  <ListSidePanel isOpen={exportOpen || columnsOpen}>
    {exportOpen ? exportPanel : null}
    {columnsOpen && columnsPanel ? (
      <ListColumnsPanel {...columnsPanel} isOpen={columnsOpen} />
    ) : null}
  </ListSidePanel>
);
