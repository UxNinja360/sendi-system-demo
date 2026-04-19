import React from 'react';

export const BusinessSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen dark:bg-[#0a0a0a] p-4 md:p-8 bg-[#fafafa] animate-pulse">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Tabs Skeleton */}
        <div className="flex gap-2 border-b border-[#e5e5e5] dark:border-[#262626] pb-2">
          <div className="h-10 w-32 bg-[#e5e5e5] dark:bg-[#262626] rounded-lg"></div>
          <div className="h-10 w-32 bg-[#e5e5e5] dark:bg-[#262626] rounded-lg"></div>
          <div className="h-10 w-32 bg-[#e5e5e5] dark:bg-[#262626] rounded-lg"></div>
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="h-6 w-48 bg-[#e5e5e5] dark:bg-[#262626] rounded"></div>
            <div className="h-4 w-96 bg-[#e5e5e5] dark:bg-[#262626] rounded"></div>
          </div>

          {/* Table/List Items */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl">
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-40 bg-[#e5e5e5] dark:bg-[#262626] rounded"></div>
                  <div className="h-4 w-60 bg-[#e5e5e5] dark:bg-[#262626] rounded"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-24 bg-[#e5e5e5] dark:bg-[#262626] rounded-lg"></div>
                  <div className="h-10 w-10 bg-[#e5e5e5] dark:bg-[#262626] rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <div className="h-12 w-40 bg-[#e5e5e5] dark:bg-[#262626] rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
