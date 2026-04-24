import { PanelRightOpen } from 'lucide-react';

export const MobileMenuNudge: React.FC = () => (
  <button
    type="button"
    onClick={() => (window as Window & { toggleMobileSidebar?: () => void }).toggleMobileSidebar?.()}
    aria-label="פתח תפריט"
    className="fixed right-0 top-1/2 z-[70] flex h-14 w-8 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-[#e5e5e5] bg-white/95 text-[#737373] shadow-lg backdrop-blur transition-colors hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717]/95 dark:hover:bg-[#262626] md:hidden"
  >
    <PanelRightOpen className="h-4 w-4" />
  </button>
);
