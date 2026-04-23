import { Menu, Package, Users } from 'lucide-react';

interface BottomAppBarProps {
  activeTab: 'deliveries' | 'couriers';
  onTabChange: (tab: 'deliveries' | 'couriers') => void;
  onOpenMenu?: () => void;
}

export default function BottomAppBar({
  activeTab,
  onTabChange,
  onOpenMenu,
}: BottomAppBarProps) {
  return (
    <div className="border-t border-[#e5e5e5] bg-white shadow-2xl dark:border-[#262626] dark:bg-[#171717]">
      <div
        className="flex items-center gap-2 px-3 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {onOpenMenu ? (
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#232323]"
            aria-label="פתח תפריט"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}

        <div className="flex min-w-0 flex-1 items-center justify-around gap-2">
          <button
            type="button"
            onClick={() => onTabChange('deliveries')}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition-all ${
              activeTab === 'deliveries'
                ? 'bg-[#22c55e]/5 text-[#22c55e]'
                : 'text-[#737373] dark:text-[#a3a3a3]'
            }`}
          >
            <Package
              className={`h-5 w-5 transition-all ${
                activeTab === 'deliveries' ? 'scale-110' : 'scale-100'
              }`}
            />
            <span className="text-[10px] font-bold">משלוחים</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('couriers')}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition-all ${
              activeTab === 'couriers'
                ? 'bg-[#22c55e]/5 text-[#22c55e]'
                : 'text-[#737373] dark:text-[#a3a3a3]'
            }`}
          >
            <Users
              className={`h-5 w-5 transition-all ${
                activeTab === 'couriers' ? 'scale-110' : 'scale-100'
              }`}
            />
            <span className="text-[10px] font-bold">שליחים</span>
          </button>
        </div>
      </div>
    </div>
  );
}

