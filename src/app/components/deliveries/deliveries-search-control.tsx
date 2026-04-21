import React from 'react';
import { Search, X } from 'lucide-react';

interface DeliveriesSearchControlProps {
  searchOpen: boolean;
  setSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

export const DeliveriesSearchControl: React.FC<DeliveriesSearchControlProps> = ({
  searchOpen,
  setSearchOpen,
  searchQuery,
  setSearchQuery,
}) => (
  <div className="hidden relative flex items-center">
    {searchOpen ? (
      <div className="flex items-center gap-1">
        <div className="relative">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a3a3a3] pointer-events-none" />
          <input
            autoFocus
            type="text"
            placeholder="חפש משלוח..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-48 h-9 pr-8 pl-6 bg-[#f5f5f5] dark:bg-[#262626] border border-transparent focus:border-[#9fe870]/50 rounded-[4px] text-sm text-[#0d0d12] dark:text-[#fafafa] placeholder-[#a3a3a3] outline-none transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[#e5e5e5] dark:hover:bg-[#262626] transition-colors">
              <X className="w-3 h-3 text-[#a3a3a3]" />
            </button>
          )}
        </div>
        <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="p-1 rounded hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors">
          <X className="w-3.5 h-3.5 text-[#a3a3a3]" />
        </button>
      </div>
    ) : (
      <button
        onClick={() => setSearchOpen(true)}
        className={`flex items-center justify-center w-9 h-9 rounded-[4px] border text-sm font-medium transition-colors ${
          searchQuery
            ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
            : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
        }`}
      >
        <Search className="w-4 h-4" />
      </button>
    )}
  </div>
);
