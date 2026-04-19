import React from 'react';

export const GenericSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen p-6 bg-[#fafafa] dark:bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="h-8 w-48 skeleton mb-6"></div>

        {/* Content Cards */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6"
            >
              <div className="space-y-4">
                <div className="h-5 w-40 skeleton"></div>
                <div className="space-y-2">
                  <div className="h-4 w-full skeleton"></div>
                  <div className="h-4 w-full skeleton"></div>
                  <div className="h-4 w-3/4 skeleton"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
