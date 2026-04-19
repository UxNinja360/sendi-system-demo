import React from 'react';
import { MapPin, Navigation, Package } from 'lucide-react';
import { useDelivery } from '../context/delivery.context';

interface SimpleMapPlaceholderProps {
  height?: string;
}

export const SimpleMapPlaceholder: React.FC<SimpleMapPlaceholderProps> = ({ 
  height = '600px' 
}) => {
  const { state } = useDelivery();
  const gridId = React.useId(); // מזהה ייחודי לפאטרן הרשת

  const availableCouriers = state.couriers.filter(c => c.status === 'available');
  const busyCouriers = state.couriers.filter(c => c.status === 'busy');
  const pendingDeliveries = state.deliveries.filter(d => d.status === 'pending');
  const activeDeliveries = state.deliveries.filter(d => 
    d.status === 'assigned' || d.status === 'delivering'
  );

  return (
    <div 
      className="relative bg-gradient-to-br from-green-50 to-blue-50 dark:from-[#0a0a0a] dark:to-[#1a1a1a] rounded-xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden"
      style={{ height }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%">
          <pattern id={`grid-${gridId}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
          </pattern>
          <rect width="100%" height="100%" fill={`url(#grid-${gridId})`} />
        </svg>
      </div>

      {/* Map Title */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-[#171717] rounded-lg border border-[#e5e5e5] dark:border-[#262626] px-6 py-3 shadow-lg z-10">
        <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          מפת משלוחים בזמן אמת
        </h3>
      </div>

      {/* Couriers Floating */}
      <div className="absolute top-24 right-12 bg-white dark:bg-[#171717] rounded-lg border border-[#e5e5e5] dark:border-[#262626] p-4 shadow-lg animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
            <Navigation className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
              {availableCouriers.length} שליחים זמינים
            </div>
            <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
              מוכנים לקבלת משלוחים
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-52 right-24 bg-white dark:bg-[#171717] rounded-lg border border-[#e5e5e5] dark:border-[#262626] p-4 shadow-lg" style={{ animationDelay: '0.5s' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
            <Navigation className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
              {busyCouriers.length} שליחים פעילים
            </div>
            <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
              ביצוע משלוחים
            </div>
          </div>
        </div>
      </div>

      {/* Deliveries Floating */}
      <div className="absolute bottom-32 left-16 bg-white dark:bg-[#171717] rounded-lg border border-[#e5e5e5] dark:border-[#262626] p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
              {activeDeliveries.length} משלוחים בדרך
            </div>
            <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
              נמצאים בביצוע
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-52 left-32 bg-white dark:bg-[#171717] rounded-lg border border-[#e5e5e5] dark:border-[#262626] p-4 shadow-lg animate-pulse" style={{ animationDelay: '1s' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
              {pendingDeliveries.length} ממתינים לשיבוץ
            </div>
            <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
              דורשים תשומת לב
            </div>
          </div>
        </div>
      </div>

      {/* Center Area - Tel Aviv */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-32 h-32 rounded-full bg-green-500/20 dark:bg-green-500/10 flex items-center justify-center animate-ping" style={{ animationDuration: '3s' }}>
          <div className="w-20 h-20 rounded-full bg-green-500/30 dark:bg-green-500/20 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-green-500/50 dark:bg-green-500/30 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white dark:bg-[#171717] rounded-lg border border-[#e5e5e5] dark:border-[#262626] p-3 shadow-lg">
        <div className="text-xs font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">מקרא</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-[#737373] dark:text-[#a3a3a3]">שליח זמין</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
            <span className="text-[#737373] dark:text-[#a3a3a3]">שליח עסוק</span>
          </div>
          <div className="h-px bg-[#e5e5e5] dark:bg-[#262626] my-1"></div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-[#737373] dark:text-[#a3a3a3]">משלוח בדרך</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-[#737373] dark:text-[#a3a3a3]">ממתין לשיבוץ</span>
          </div>
        </div>
      </div>

      {/* Info Badge */}
      <div className="absolute top-20 left-4 bg-blue-500/10 dark:bg-blue-900/20 rounded-lg border border-blue-500/20 px-4 py-2 max-w-xs">
        <p className="text-xs text-blue-600 dark:text-blue-400">
          💡 <strong>טיפ:</strong> השתמש במפה זו כדי לראות היכן נמצאים כל השליחים והמשלוחים ולקבל החלטות חכמות על שיבוץ
        </p>
      </div>
    </div>
  );
};
