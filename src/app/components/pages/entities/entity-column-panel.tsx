import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Columns3, Search, X } from 'lucide-react';

export interface EntityColumnOption {
  id: string;
  label: string;
}

export interface EntityColumnCategory {
  id: string;
  label: string;
  columns: EntityColumnOption[];
}

interface EntityColumnPanelProps {
  title: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  categories: EntityColumnCategory[];
  visibleColumns: Set<string>;
  setVisibleColumns: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const EntityColumnPanel: React.FC<EntityColumnPanelProps> = ({
  title,
  isOpen,
  setIsOpen,
  categories,
  visibleColumns,
  setVisibleColumns,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen, setIsOpen]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const needle = searchQuery.trim().toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        columns: category.columns.filter((column) => column.label.toLowerCase().includes(needle)),
      }))
      .filter((category) => category.columns.length > 0);
  }, [categories, searchQuery]);

  const toggleColumn = (columnId: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        if (next.size <= 1) return prev;
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  const toggleCategory = (category: EntityColumnCategory) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      const allSelected = category.columns.every((column) => next.has(column.id));

      if (allSelected) {
        category.columns.forEach((column) => {
          if (next.size > 1) next.delete(column.id);
        });
      } else {
        category.columns.forEach((column) => next.add(column.id));
      }

      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" dir="rtl">
      <aside
        ref={panelRef}
        className="absolute left-0 top-0 flex h-full w-[340px] max-w-[92vw] flex-col border-r border-[#262626] bg-[#111111] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#222222] px-4 py-3">
          <div className="flex items-center gap-2">
            <Columns3 className="h-4 w-4 text-[#9fe870]" />
            <span className="text-sm font-semibold text-[#fafafa]">{title}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#a3a3a3] transition-colors hover:bg-[#1a1a1a] hover:text-[#fafafa]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[#222222] px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="חפש עמודה..."
              className="h-10 w-full rounded-xl border border-[#2a2a2a] bg-[#0b0b0b] pl-10 pr-10 text-sm text-[#fafafa] outline-none transition-all placeholder:text-[#737373] focus:border-[#3a5327] focus:ring-2 focus:ring-[#9fe870]/15"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-[#737373] transition-colors hover:bg-[#171717] hover:text-[#fafafa]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[#222222] px-4 py-3 text-xs">
          <span className="text-[#9ca3af]">עמודות פעילות</span>
          <span className="inline-flex min-w-[32px] items-center justify-center rounded-full border border-[#2d3b21] px-2 py-0.5 font-semibold text-[#9fe870]">
            {visibleColumns.size}
          </span>
        </div>

        <div className="flex-1 overflow-auto px-3 py-3">
          <div className="space-y-4">
            {filteredCategories.map((category) => {
              const selectedCount = category.columns.filter((column) => visibleColumns.has(column.id)).length;

              return (
                <section key={category.id} className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d]">
                  <div className="flex items-center justify-between border-b border-[#1f1f1f] px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#fafafa]">{category.label}</span>
                      <span className="text-[11px] text-[#737373]">{selectedCount}/{category.columns.length}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="rounded-lg border border-[#2a2a2a] px-2 py-1 text-[11px] font-medium text-[#a3a3a3] transition-colors hover:bg-[#171717] hover:text-[#fafafa]"
                    >
                      {selectedCount === category.columns.length ? 'נקה' : 'בחר הכול'}
                    </button>
                  </div>
                  <div className="space-y-1 p-2">
                    {category.columns.map((column) => {
                      const selected = visibleColumns.has(column.id);
                      return (
                        <button
                          key={column.id}
                          type="button"
                          onClick={() => toggleColumn(column.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-right transition-all ${
                            selected
                              ? 'bg-[#141414] text-[#fafafa]'
                              : 'text-[#a3a3a3] hover:bg-[#141414] hover:text-[#fafafa]'
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              selected
                                ? 'border-[#9fe870] bg-[#9fe870]'
                                : 'border-[#3a3a3a] bg-[#111111]'
                            }`}
                          >
                            {selected && <Check className="h-2.5 w-2.5 text-[#0d0d12]" />}
                          </div>
                          <span className="flex-1 text-[13px]">{column.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {filteredCategories.length === 0 && (
              <div className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] px-4 py-10 text-center">
                <p className="text-sm text-[#737373]">לא נמצאו עמודות מתאימות</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
