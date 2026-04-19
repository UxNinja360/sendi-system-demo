import React, { useState, useEffect, useCallback } from 'react';
import { X, Columns, Download, Search } from 'lucide-react';
import { ColumnSelector } from './column-selector';
import { ExportDrawer, ExportConfig } from './export-drawer';

interface DeliveriesPanelProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialTab?: 'columns' | 'export';
  // Column props
  visibleColumns: Set<string>;
  setVisibleColumns: (cols: Set<string>) => void;
  // Export props
  onExport: (config: ExportConfig) => void;
  deliveryCount: number;
  selectedCount: number;
  groupCounts: { couriers: number; restaurants: number };
}

export const DeliveriesPanel: React.FC<DeliveriesPanelProps> = ({
  isOpen,
  setIsOpen,
  initialTab = 'columns',
  visibleColumns,
  setVisibleColumns,
  onExport,
  deliveryCount,
  selectedCount,
  groupCounts,
}) => {
  const [tab, setTab] = useState<'columns' | 'export'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) { setTab(initialTab); setSearchQuery(''); }
  }, [isOpen, initialTab]);

  useEffect(() => {
    setSearchQuery('');
  }, [tab]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, handleClose]);

  return (
    <div
      className={`flex flex-col shrink-0 h-full overflow-hidden bg-white dark:bg-[#0f0f0f] border-r border-[#e5e5e5] dark:border-[#262626] transition-[width] duration-300 ease-out ${
        isOpen ? 'w-[360px]' : 'w-0'
      }`}
    >
      <div className="min-w-[360px] flex flex-col h-full" style={{ direction: 'rtl' }}>
        {/* Header */}
        <div className="shrink-0 border-b border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#141414] px-3 pt-6 pb-3 space-y-2">
          {/* Row 1: Tabs */}
          <div className="flex gap-1 bg-[#f5f5f5] dark:bg-[#1a1a1a] p-1 rounded-xl">
            <button
              onClick={() => setTab('columns')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'columns'
                  ? 'bg-white dark:bg-[#0f0f0f] text-[#0d0d12] dark:text-[#fafafa] shadow-sm'
                  : 'text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }`}
            >
              <Columns className="w-4 h-4" />
              עמודות
              <span className="bg-[#9fe870]/20 text-[#4a8a20] dark:text-[#9fe870] text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">
                {visibleColumns.size}
              </span>
            </button>
            <button
              onClick={() => setTab('export')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'export'
                  ? 'bg-white dark:bg-[#0f0f0f] text-[#0d0d12] dark:text-[#fafafa] shadow-sm'
                  : 'text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }`}
            >
              <Download className="w-4 h-4" />
              ייצוא
            </button>
          </div>

          {/* Row 2: Search - columns tab only */}
          {tab === 'columns' && (
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="חפש עמודה..."
                className="w-full pr-9 pl-7 py-2 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg text-sm text-[#0d0d12] dark:text-[#fafafa] placeholder-[#a3a3a3] outline-none focus:ring-1 focus:ring-[#9fe870]/40 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute left-2 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-[#a3a3a3] hover:text-[#525252]" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 min-h-0">
          {tab === 'columns' ? (
            <ColumnSelector
              isEmbedded
              visibleColumns={visibleColumns}
              setVisibleColumns={setVisibleColumns}
              isOpen={true}
              setIsOpen={setIsOpen}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          ) : (
            <ExportDrawer
              isEmbedded
              isOpen={true}
              onClose={handleClose}
              onExport={onExport}
              visibleColumns={visibleColumns}
              deliveryCount={deliveryCount}
              selectedCount={selectedCount}
              groupCounts={groupCounts}
            />
          )}
        </div>
      </div>
    </div>
  );
};
