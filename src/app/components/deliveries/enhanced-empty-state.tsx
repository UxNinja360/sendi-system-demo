import React from 'react';
import { PackageOpen, Search, Filter, Sparkles } from 'lucide-react';

interface EnhancedEmptyStateProps {
  mode: 'no-data' | 'no-results' | 'filtered-empty';
  onClearFilters?: () => void;
  totalCount?: number;
}

export const EnhancedEmptyState: React.FC<EnhancedEmptyStateProps> = ({
  mode,
  onClearFilters,
  totalCount = 0,
}) => {
  if (mode === 'no-data') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-[#9fe870]/20 to-[#9fe870]/5 rounded-2xl flex items-center justify-center mb-6">
            <PackageOpen className="w-12 h-12 text-[#9fe870]" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[#9fe870] to-[#8ed960] rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">
          טרם נוצרו משלוחים
        </h3>
        <p className="text-sm text-[#737373] dark:text-[#a3a3a3] text-center max-w-md mb-6">
          כאשר יתווספו משלוחים למערכת, הם יופיעו כאן עם כל הפרטים והאפשרויות לניהול מתקדם
        </p>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#f5f5f5] dark:bg-[#171717] rounded-lg border border-[#e5e5e5] dark:border-[#262626]">
          <div className="w-2 h-2 bg-[#9fe870] rounded-full animate-pulse" />
          <span className="text-xs text-[#737373] dark:text-[#a3a3a3]">
            המערכת מוכנה לקבלת משלוחים חדשים
          </span>
        </div>
      </div>
    );
  }

  if (mode === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl flex items-center justify-center mb-6">
            <Search className="w-12 h-12 text-amber-500" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">
          לא נמצאו תוצאות
        </h3>
        <p className="text-sm text-[#737373] dark:text-[#a3a3a3] text-center max-w-md mb-4">
          החיפוש שלך לא הניב תוצאות. נסה מילות חיפוש אחרות או נקה את החיפוש
        </p>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/50">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            💡 טיפ: נסה לחפש לפי מספר הזמנה, שם לקוח, או שם מסעדה
          </span>
        </div>
      </div>
    );
  }

  // mode === 'filtered-empty'
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="relative">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl flex items-center justify-center mb-6">
          <Filter className="w-12 h-12 text-blue-500" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">
        אין משלוחים בסינון זה
      </h3>
      <p className="text-sm text-[#737373] dark:text-[#a3a3a3] text-center max-w-md mb-4">
        הפילטרים שבחרת מצמצמים יותר מדי את התוצאות
      </p>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/50">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
            📊 סה״כ משלוחים במערכת: {totalCount.toLocaleString()}
          </span>
        </div>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-[#9fe870] to-[#8ed960] text-[#0d0d12] rounded-xl text-sm font-medium hover:from-[#8ed960] hover:to-[#7dc850] transition-all shadow-lg shadow-[#9fe870]/30"
          >
            <Filter className="w-4 h-4" />
            נקה את כל הפילטרים
          </button>
        )}
      </div>
    </div>
  );
};
