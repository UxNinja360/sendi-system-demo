import React from 'react';
import { PackageOpen } from 'lucide-react';

import {
  EntityEmptyState,
  EntityNoResultsState,
} from '../components/common/entity-empty-state';

interface EnhancedEmptyStateProps {
  mode: 'no-data' | 'no-results' | 'filtered-empty';
  onClearFilters?: () => void;
  totalCount?: number;
}

const TEXT = {
  noDataTitle:
    '\u05d8\u05e8\u05dd \u05e0\u05d5\u05e6\u05e8\u05d5 \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
  noDataDescription:
    '\u05db\u05d0\u05e9\u05e8 \u05d9\u05ea\u05d5\u05d5\u05e1\u05e4\u05d5 \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05dc\u05de\u05e2\u05e8\u05db\u05ea, \u05d4\u05dd \u05d9\u05d5\u05e4\u05d9\u05e2\u05d5 \u05db\u05d0\u05df \u05e2\u05dd \u05db\u05dc \u05d4\u05e4\u05e8\u05d8\u05d9\u05dd \u05d5\u05d4\u05d0\u05e4\u05e9\u05e8\u05d5\u05d9\u05d5\u05ea \u05dc\u05e0\u05d9\u05d4\u05d5\u05dc \u05de\u05ea\u05e7\u05d3\u05dd',
  noDataFooter:
    '\u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05de\u05d5\u05db\u05e0\u05d4 \u05dc\u05e7\u05d1\u05dc\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05d7\u05d3\u05e9\u05d9\u05dd',
  noResultsDescription:
    '\u05d4\u05d7\u05d9\u05e4\u05d5\u05e9 \u05dc\u05d0 \u05d4\u05e0\u05d9\u05d1 \u05ea\u05d5\u05e6\u05d0\u05d5\u05ea. \u05e0\u05e1\u05d4 \u05de\u05d9\u05dc\u05d5\u05ea \u05d7\u05d9\u05e4\u05d5\u05e9 \u05d0\u05d7\u05e8\u05d5\u05ea \u05d0\u05d5 \u05e0\u05e7\u05d4 \u05d0\u05ea \u05d4\u05d7\u05d9\u05e4\u05d5\u05e9.',
  filteredTitle:
    '\u05d0\u05d9\u05df \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05d1\u05e1\u05d9\u05e0\u05d5\u05df \u05d6\u05d4',
  filteredDescription:
    '\u05d4\u05e4\u05d9\u05dc\u05d8\u05e8\u05d9\u05dd \u05e9\u05d1\u05d7\u05e8\u05ea \u05de\u05e6\u05de\u05e6\u05de\u05d9\u05dd \u05d9\u05d5\u05ea\u05e8 \u05de\u05d3\u05d9 \u05d0\u05ea \u05d4\u05ea\u05d5\u05e6\u05d0\u05d5\u05ea.',
  totalPrefix:
    '\u05e1\u05d4"\u05db \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05d1\u05de\u05e2\u05e8\u05db\u05ea',
} as const;

export const EnhancedEmptyState: React.FC<EnhancedEmptyStateProps> = ({
  mode,
  onClearFilters,
  totalCount = 0,
}) => {
  if (mode === 'no-data') {
    return (
      <EntityEmptyState
        icon={<PackageOpen className="h-12 w-12 text-[#9fe870]" />}
        title={TEXT.noDataTitle}
        description={TEXT.noDataDescription}
        footerText={TEXT.noDataFooter}
      />
    );
  }

  if (mode === 'no-results') {
    return (
      <EntityNoResultsState
        description={TEXT.noResultsDescription}
        onClearAll={onClearFilters}
      />
    );
  }

  return (
    <EntityNoResultsState
      title={TEXT.filteredTitle}
      description={`${TEXT.filteredDescription} ${TEXT.totalPrefix}: ${totalCount.toLocaleString(
        'he-IL',
      )}`}
      onClearAll={onClearFilters}
    />
  );
};
