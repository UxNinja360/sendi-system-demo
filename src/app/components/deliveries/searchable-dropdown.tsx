import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  subtitle?: string;
}

interface SearchableDropdownProps {
  options: Option[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placeholder: string;
  label: string;
  emptyMessage?: string;
  icon?: React.ReactNode;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  selectedId,
  onSelect,
  placeholder,
  label,
  emptyMessage = 'לא נמצאו תוצאות',
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // סגירת dropdown בלחיצה מחוץ לאלמנט
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // פוקוס על שדה החיפוש כשנפתח
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // סינון אפשרויות לפי חיפוש
  const filteredOptions = searchQuery
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  // מציאת האפשרות שנבחרה
  const selectedOption = options.find(opt => opt.id === selectedId);

  const handleSelect = (id: string | null) => {
    onSelect(id);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* כפתור פתיחה */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-[#0a0a0a] border rounded-lg text-sm font-medium transition-all ${
          isOpen
            ? 'border-[#16a34a] dark:border-[#22c55e] ring-2 ring-[#16a34a]/20 dark:ring-[#22c55e]/20'
            : 'border-[#e5e5e5] dark:border-[#262626] hover:border-[#16a34a] dark:hover:border-[#22c55e]'
        }`}
      >
        {icon && <span className="text-[#16a34a] dark:text-[#22c55e]">{icon}</span>}
        <span className="flex-1 text-right truncate">
          {selectedOption ? (
            <span className="text-[#0d0d12] dark:text-[#fafafa]">{selectedOption.label}</span>
          ) : (
            <span className="text-[#737373] dark:text-[#a3a3a3]">{placeholder}</span>
          )}
        </span>
        {selectedId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(null);
            }}
            className="p-0.5 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 text-[#737373] dark:text-[#a3a3a3]" />
          </button>
        )}
        <ChevronDown
          className={`w-4 h-4 text-[#737373] dark:text-[#a3a3a3] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg shadow-xl z-50 max-h-80 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* שדה חיפוש */}
          <div className="p-2 border-b border-[#e5e5e5] dark:border-[#262626] sticky top-0 bg-white dark:bg-[#171717]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] dark:text-[#a3a3a3]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`חפש ${label}...`}
                className="w-full pr-9 pl-3 py-2 bg-[#f5f5f5] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-sm text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#737373] dark:placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#16a34a] dark:focus:ring-[#22c55e] focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#e5e5e5] dark:hover:bg-[#262626] rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-[#737373] dark:text-[#a3a3a3]" />
                </button>
              )}
            </div>
          </div>

          {/* אפשרות "הכל" */}
          <div className="p-1 border-b border-[#e5e5e5] dark:border-[#262626]">
            <button
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-right transition-colors ${
                !selectedId
                  ? 'bg-[#dcfce7] dark:bg-[#14532d] text-[#166534] dark:text-[#86efac] font-medium'
                  : 'text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
              }`}
            >
              {!selectedId && <Check className="w-4 h-4 text-[#16a34a] dark:text-[#22c55e]" />}
              <span className={!selectedId ? '' : 'mr-6'}>הכל</span>
            </button>
          </div>

          {/* רשימת אפשרויות */}
          <div className="overflow-y-auto max-h-60">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-[#737373] dark:text-[#a3a3a3]">
                {emptyMessage}
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelect(option.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-right transition-colors ${
                      selectedId === option.id
                        ? 'bg-[#dcfce7] dark:bg-[#14532d] text-[#166534] dark:text-[#86efac] font-medium'
                        : 'text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                    }`}
                  >
                    {selectedId === option.id && (
                      <Check className="w-4 h-4 text-[#16a34a] dark:text-[#22c55e]" />
                    )}
                    <div className={`flex-1 ${selectedId === option.id ? '' : 'mr-6'}`}>
                      <div className="font-medium">{option.label}</div>
                      {option.subtitle && (
                        <div className="text-xs text-[#737373] dark:text-[#a3a3a3] mt-0.5">
                          {option.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
