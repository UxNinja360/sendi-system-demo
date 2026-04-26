import React from 'react';
import { useNavigate } from 'react-router';
import { Home, ArrowRight } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-background p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-[#9fe870] mb-2">404</h1>
          <h2 className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-3">
            העמוד לא נמצא
          </h2>
          <p className="text-[#666d80] dark:text-[#a3a3a3]">
            מצטערים, העמוד שחיפשת לא קיים במערכת
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#9fe870] hover:bg-[#7ed357] text-[#0d0d12] font-medium rounded-xl transition-colors"
          >
            <Home size={20} />
            חזרה לדשבורד
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-app-surface border border-[#e5e5e5] dark:border-app-border hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa] font-medium rounded-xl transition-colors"
          >
            <ArrowRight size={20} />
            חזור אחורה
          </button>
        </div>
      </div>
    </div>
  );
};
