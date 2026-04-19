import React from 'react';

interface TabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

const labels: Record<string, string> = {
  restaurants: 'מסעדות',
  couriers: 'שליחים',
  customers: 'לקוחות',
  managers: 'מנהלים',
  deliveries: 'משלוחים',
  reports: 'דוחות',
  performance: 'ביצועים',
  purchase: 'רכישות',
  pricing: 'תמחור',
  zones: 'אזורי משלוח',
  payouts: 'תשלומים',
  hours: 'שעות פעילות',
  shipments: 'רכישת משלוחים',
  'distance-pricing': 'תמחור מרחק',
  business: 'מסעדות',
  users: 'משתמשים',
  integrations: 'אינטגרציות',
  backup: 'גיבוי',
};

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange }) => {
  return (
    <div className="flex gap-1 border-b border-[#e5e5e5] dark:border-[#262626]">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            active === tab
              ? 'text-[#16a34a] dark:text-[#22c55e]'
              : 'text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
          }`}
        >
          {labels[tab] || tab}
          {active === tab && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#16a34a] dark:bg-[#22c55e]" />
          )}
        </button>
      ))}
    </div>
  );
};