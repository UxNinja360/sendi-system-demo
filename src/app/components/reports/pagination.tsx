import React from 'react';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) return null;
  
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      // הצג את כל העמודים
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // הצג עמודים עם נקודות
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#0d0d12]">
      {/* סיכום */}
      <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">
        מציג {startItem}-{endItem} מתוך {totalItems} פריטים
      </div>
      
      {/* כפתורי ניווט */}
      <div className="flex items-center gap-1">
        {/* עמוד ראשון */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="עמוד ראשון"
        >
          <ChevronsRight className="w-4 h-4 text-[#0d0d12] dark:text-[#fafafa]" />
        </button>
        
        {/* עמוד קודם */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="עמוד קודם"
        >
          <ChevronRight className="w-4 h-4 text-[#0d0d12] dark:text-[#fafafa]" />
        </button>
        
        {/* מספרי עמודים */}
        <div className="flex items-center gap-1 mx-2">
          {getPageNumbers().map((page, idx) => (
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-[#737373] dark:text-[#a3a3a3]">...</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-[#22c55e] text-white'
                    : 'hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] text-[#0d0d12] dark:text-[#fafafa]'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>
        
        {/* עמוד הבא */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="עמוד הבא"
        >
          <ChevronLeft className="w-4 h-4 text-[#0d0d12] dark:text-[#fafafa]" />
        </button>
        
        {/* עמוד אחרון */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="עמוד אחרון"
        >
          <ChevronsLeft className="w-4 h-4 text-[#0d0d12] dark:text-[#fafafa]" />
        </button>
      </div>
    </div>
  );
};
