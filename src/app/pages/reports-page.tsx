import React from 'react';

export const ReportsPage: React.FC = () => (
  <main
    className="flex min-h-full items-center justify-center px-6 text-center"
    dir="rtl"
  >
    <h1
      className="inline-flex max-w-full flex-wrap items-baseline justify-center gap-x-1 gap-y-2 text-5xl font-semibold text-app-text sm:text-6xl lg:text-7xl"
      aria-label="חושבים על זה..."
    >
      <span>חושבים על זה</span>
      <span className="reports-thinking-dots" aria-hidden="true" dir="rtl">
        <span className="reports-thinking-dots__dot">.</span>
        <span className="reports-thinking-dots__dot">.</span>
        <span className="reports-thinking-dots__dot">.</span>
      </span>
    </h1>
  </main>
);
