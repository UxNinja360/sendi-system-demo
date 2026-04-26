import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen p-6 bg-[#fafafa] dark:bg-app-surface">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2.5 w-2.5 rounded-full skeleton"></div>
          <div className="h-5 w-48 skeleton"></div>
        </div>

        {/* Active Deliveries Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-app-surface h-[103px] rounded-2xl border border-[#e5e5e5] dark:border-app-border p-4"
            >
              <div className="flex items-center justify-between h-full">
                <div className="flex flex-col gap-2 w-full">
                  <div className="h-3.5 w-16 skeleton"></div>
                  <div className="h-8 w-12 skeleton"></div>
                  <div className="h-2.5 w-20 skeleton"></div>
                </div>
                <div className="size-11 rounded-full skeleton flex-shrink-0"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Resources Cards Skeleton */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-app-surface h-[103px] rounded-2xl border border-[#e5e5e5] dark:border-app-border p-4"
            >
              <div className="flex items-center justify-between h-full">
                <div className="flex flex-col gap-2 w-full">
                  <div className="h-3.5 w-16 skeleton"></div>
                  <div className="h-8 w-12 skeleton"></div>
                  <div className="h-2.5 w-28 skeleton"></div>
                </div>
                <div className="size-11 rounded-full skeleton flex-shrink-0"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Daily Stats Card Skeleton */}
        <div className="bg-white dark:bg-app-surface rounded-2xl border border-[#e5e5e5] dark:border-app-border p-4 md:p-6 mb-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-2">
                <div className="h-4 w-36 skeleton"></div>
                <div className="h-9 w-20 skeleton"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 skeleton"></div>
                <div className="h-7 w-28 skeleton"></div>
              </div>
            </div>
            <div className="h-12 w-full skeleton"></div>
            <div className="flex flex-wrap gap-4 pt-2 border-t border-[#e5e5e5] dark:border-app-border">
              <div className="h-3 w-32 skeleton"></div>
              <div className="h-3 w-28 skeleton"></div>
              <div className="h-3 w-24 skeleton"></div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="h-5 w-32 skeleton mb-3"></div>
        <div className="bg-white dark:bg-app-surface rounded-2xl border border-[#e5e5e5] dark:border-app-border p-4 md:p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-28 skeleton"></div>
                <div className="h-9 w-24 skeleton"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-16 rounded-lg skeleton"></div>
                <div className="h-9 w-16 rounded-lg skeleton"></div>
                <div className="h-9 w-16 rounded-lg skeleton"></div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full skeleton"></div>
                <div className="space-y-1">
                  <div className="h-2.5 w-12 skeleton"></div>
                  <div className="h-6 w-16 skeleton"></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full skeleton"></div>
                <div className="space-y-1">
                  <div className="h-2.5 w-12 skeleton"></div>
                  <div className="h-6 w-16 skeleton"></div>
                </div>
              </div>
            </div>
            <div className="mt-2 bg-[#fafafa] dark:bg-app-surface rounded-xl p-4">
              <div className="h-[300px] md:h-[400px] w-full skeleton"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
