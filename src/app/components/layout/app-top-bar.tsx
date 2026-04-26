import { useState } from 'react';
import { ChevronDown, MessageSquare, MoreHorizontal } from 'lucide-react';
import { useLocation } from 'react-router';
import { getNavItemForPath } from '../../app-navigation';

const DEFAULT_WORKSPACE = 'Tel Aviv - Runners';

export const AppTopBar: React.FC = () => {
  const location = useLocation();
  const currentItem = getNavItemForPath(location.pathname);
  const pageTitle = currentItem?.label ?? 'Sendi';
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <header
      dir="rtl"
      className="relative hidden h-14 shrink-0 items-center border-b border-app-nav-border bg-app-background px-5 text-app-text md:flex"
    >
      <button
        type="button"
        className="inline-flex h-8 max-w-[220px] items-center gap-2 rounded-[var(--app-radius-sm)] px-2.5 text-sm font-semibold text-app-text transition-colors hover:bg-app-nav-hover-bg"
        aria-label="בחירת סביבת עבודה"
      >
        <span className="truncate">{DEFAULT_WORKSPACE}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
      </button>

      <div className="pointer-events-none absolute inset-x-0 flex justify-center">
        <div className="max-w-[42vw] truncate text-sm font-semibold text-app-text">
          {pageTitle}
        </div>
      </div>

      <div className="relative mr-auto">
        <button
          type="button"
          onClick={() => setIsFeedbackOpen((value) => !value)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--app-radius-sm)] text-app-text-secondary transition-colors hover:bg-app-nav-hover-bg hover:text-app-text"
          aria-label="אפשרויות"
          aria-expanded={isFeedbackOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {isFeedbackOpen ? (
          <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[var(--app-radius-md)] border border-app-border bg-app-surface text-right shadow-[var(--app-shadow-panel)]">
            <button
              type="button"
              onClick={() => setIsFeedbackOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-app-text transition-colors hover:bg-app-surface-raised"
            >
              <MessageSquare className="h-4 w-4 text-app-text-secondary" />
              <span>שליחת פידבק</span>
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
