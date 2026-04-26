import { Package, Users } from 'lucide-react';

interface BottomAppBarProps {
  activeTab: 'deliveries' | 'couriers';
  deliveriesCount?: number;
  couriersCount?: number;
  onTabChange: (tab: 'deliveries' | 'couriers') => void;
}

export default function BottomAppBar({
  activeTab,
  deliveriesCount = 0,
  couriersCount = 0,
  onTabChange,
}: BottomAppBarProps) {
  const tabs = [
    {
      key: 'deliveries' as const,
      label: 'משלוחים',
      count: deliveriesCount,
      icon: Package,
    },
    {
      key: 'couriers' as const,
      label: 'שליחים',
      count: couriersCount,
      icon: Users,
    },
  ];

  return (
    <div className="border-t border-[#e5e5e5] bg-white/95 shadow-2xl backdrop-blur dark:border-app-border dark:bg-app-surface/95">
      <div
        className="px-3 py-2"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f5f5f5] p-1 dark:bg-app-surface">
          {tabs.map(({ key, label, count, icon: Icon }) => {
            const isActive = activeTab === key;

            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                onClick={() => onTabChange(key)}
                className={`flex h-12 items-center justify-center gap-2 rounded-xl px-3 transition-all ${
                  isActive
                    ? 'bg-white text-[#16a34a] shadow-sm dark:bg-[#262626] dark:text-[#7bf1a8]'
                    : 'text-[#737373] dark:text-app-text-secondary'
                }`}
              >
                <Icon className={`h-4 w-4 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} />
                <span className="text-xs font-black">{label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
                  isActive
                    ? 'bg-[#16a34a]/10 text-[#16a34a] dark:text-[#7bf1a8]'
                    : 'bg-[#e5e5e5] text-[#737373] dark:bg-[#262626] dark:text-app-text-secondary'
                }`}>
                  {count.toLocaleString('he-IL')}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
