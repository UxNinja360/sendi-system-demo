import React from 'react';

export const EntitiesSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen p-6 bg-[#fafafa] dark:bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        {/* Header with Search and Button */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="h-10 w-64 skeleton rounded-xl"></div>
          <div className="h-10 w-32 skeleton rounded-xl"></div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-4 p-4 border-b border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#0a0a0a]">
            <div className="h-4 w-20 skeleton"></div>
            <div className="h-4 w-24 skeleton"></div>
            <div className="h-4 w-16 skeleton"></div>
            <div className="h-4 w-20 skeleton"></div>
          </div>

          {/* Table Rows */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-4 p-4 border-b border-[#e5e5e5] dark:border-[#262626] last:border-b-0"
            >
              <div className="h-4 w-32 skeleton"></div>
              <div className="h-4 w-28 skeleton"></div>
              <div className="h-6 w-16 skeleton rounded-full"></div>
              <div className="flex gap-2">
                <div className="h-8 w-8 skeleton rounded-lg"></div>
                <div className="h-8 w-8 skeleton rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between mt-6">
          <div className="h-4 w-32 skeleton"></div>
          <div className="flex gap-2">
            <div className="h-10 w-10 skeleton rounded-lg"></div>
            <div className="h-10 w-10 skeleton rounded-lg"></div>
            <div className="h-10 w-10 skeleton rounded-lg"></div>
            <div className="h-10 w-10 skeleton rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
