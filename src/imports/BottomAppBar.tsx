import { Package, Users, Plus, Menu } from 'lucide-react';

interface BottomAppBarProps {
  activeTab: 'deliveries' | 'couriers';
  onTabChange: (tab: 'deliveries' | 'couriers') => void;
  onAddDelivery: () => void;
  onOpenMenu?: () => void;
}

export default function BottomAppBar({ activeTab, onTabChange, onAddDelivery, onOpenMenu }: BottomAppBarProps) {
  return (
    <div className="bg-white dark:bg-[#171717] border-t border-[#e5e5e5] dark:border-[#262626] shadow-2xl">
      <div className="flex items-center justify-around px-2 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {/* Tab 1: Deliveries */}
        <button
          onClick={() => onTabChange('deliveries')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all ${
            activeTab === 'deliveries'
              ? 'text-[#22c55e] bg-[#22c55e]/5'
              : 'text-[#737373] dark:text-[#a3a3a3]'
          }`}
        >
          <Package className={`w-5 h-5 transition-all ${activeTab === 'deliveries' ? 'scale-110' : 'scale-100'}`} />
          <span className="text-[10px] font-bold">משלוחים</span>
        </button>

        {/* Tab 2: Couriers */}
        <button
          onClick={() => onTabChange('couriers')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all ${
            activeTab === 'couriers'
              ? 'text-[#22c55e] bg-[#22c55e]/5'
              : 'text-[#737373] dark:text-[#a3a3a3]'
          }`}
        >
          <Users className={`w-5 h-5 transition-all ${activeTab === 'couriers' ? 'scale-110' : 'scale-100'}`} />
          <span className="text-[10px] font-bold">שליחים</span>
        </button>
      </div>
    </div>
  );
}