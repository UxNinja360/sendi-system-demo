import React from 'react';

export const FinanceSkeleton: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-[#fafafa] dark:bg-app-surface">
      {/* Tabs Skeleton */}
      <div className="px-8 pt-8">
        <div className="flex gap-2 border-b border-[#e5e5e5] dark:border-app-border">
          <div className="h-10 w-24 skeleton mb-[-2px]"></div>
          <div className="h-10 w-24 skeleton mb-[-2px]"></div>
          <div className="h-10 w-24 skeleton mb-[-2px]"></div>
          <div className="h-10 w-24 skeleton mb-[-2px]"></div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Top Cards Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Balance Card - 2 columns */}
            <div className="md:col-span-2 bg-white dark:bg-app-surface rounded-2xl border border-[#e5e5e5] dark:border-app-border overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-3">
                    <div className="h-4 w-40 skeleton"></div>
                    <div className="h-9 w-32 skeleton"></div>
                  </div>
                  <div className="size-11 rounded-full skeleton"></div>
                </div>
              </div>
              <div className="h-10 w-full bg-[#fafafa] dark:bg-app-surface border-t border-[#e5e5e5] dark:border-app-border"></div>
            </div>

            {/* Monthly Usage Card - 1 column */}
            <div className="bg-white dark:bg-app-surface rounded-2xl border border-[#e5e5e5] dark:border-app-border p-5">
              <div className="flex flex-col items-center space-y-3">
                <div className="size-9 rounded-full skeleton"></div>
                <div className="h-3 w-24 skeleton"></div>
                <div className="h-8 w-20 skeleton"></div>
              </div>
            </div>
          </div>

          {/* Purchase Section */}
          <div className="bg-white dark:bg-app-surface rounded-2xl border border-[#e5e5e5] dark:border-app-border p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="h-6 w-48 skeleton"></div>
                <div className="size-10 rounded-full skeleton"></div>
              </div>

              {/* Amount Display */}
              <div className="text-center space-y-2">
                <div className="h-4 w-32 skeleton mx-auto"></div>
                <div className="h-16 w-48 skeleton mx-auto"></div>
              </div>

              {/* Slider */}
              <div className="space-y-3">
                <div className="h-2 w-full skeleton rounded-full"></div>
                <div className="flex justify-between">
                  <div className="h-3 w-16 skeleton"></div>
                  <div className="h-3 w-20 skeleton"></div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <div className="h-10 w-10 skeleton rounded-lg"></div>
                <div className="h-10 w-10 skeleton rounded-lg"></div>
                <div className="h-10 w-10 skeleton rounded-lg"></div>
              </div>

              {/* Price Display */}
              <div className="bg-[#fafafa] dark:bg-app-surface rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-24 skeleton"></div>
                  <div className="h-4 w-20 skeleton"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-32 skeleton"></div>
                  <div className="h-4 w-16 skeleton"></div>
                </div>
                <div className="h-px w-full bg-[#e5e5e5] dark:bg-[#262626]"></div>
                <div className="flex justify-between">
                  <div className="h-5 w-20 skeleton"></div>
                  <div className="h-6 w-28 skeleton"></div>
                </div>
              </div>

              {/* Checkout Button */}
              <div className="h-12 w-full skeleton rounded-xl"></div>
            </div>
          </div>

          {/* Packages Grid */}
          <div>
            <div className="h-6 w-40 skeleton mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-app-surface rounded-2xl border border-[#e5e5e5] dark:border-app-border p-6"
                >
                  <div className="space-y-4">
                    <div className="h-5 w-24 skeleton"></div>
                    <div className="h-10 w-32 skeleton"></div>
                    <div className="space-y-2">
                      <div className="h-3 w-full skeleton"></div>
                      <div className="h-3 w-full skeleton"></div>
                      <div className="h-3 w-3/4 skeleton"></div>
                    </div>
                    <div className="h-10 w-full skeleton rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};