import React, { useState, useMemo } from 'react';
import { Search, Store, Package } from 'lucide-react';
import { useDelivery } from '../../../context/delivery.context';

export const LiveRestaurantsView: React.FC = () => {
  const { state } = useDelivery();
  const [searchQuery, setSearchQuery] = useState('');

  // חישוב משלוחים פעילים לכל מסעדה
  const restaurantsWithOrders = useMemo(() => {
    // קודם כל, נמצא את כל המסעדות הפעילות
    const activeRestaurants = state.restaurants.filter(r => r.isActive);
    
    return activeRestaurants
      .map(restaurant => {
        const activeOrders = state.deliveries.filter(
          d => d.restaurantName === restaurant.name && 
          (d.status === 'pending' || d.status === 'assigned' || d.status === 'delivering')
        );
        
        return {
          ...restaurant,
          activeOrders: activeOrders.length,
          orders: activeOrders,
        };
      })
      .sort((a, b) => b.activeOrders - a.activeOrders); // מיון לפי כמות הזמנות
  }, [state.restaurants, state.deliveries]);

  const filteredRestaurants = restaurantsWithOrders.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // הודעת עזרה - בהתאם למצב
  const emptyMessage = !state.isSystemOpen 
    ? 'המערכת סגורה - הפעל את המערכת כדי לראות מסעדות'
    : restaurantsWithOrders.length === 0
    ? 'אין מסעדות פעילות - הפעל מסעדות דרך ניהול ישויות'
    : 'לא נמצאו מסעדות תואמות';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#171717]">
      {/* Header with Search */}
      <div className="p-4 border-b border-[#e5e5e5] dark:border-[#262626]">
        <div className="flex items-center gap-2">
          <div className="relative group flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] dark:text-[#737373] group-focus-within:text-[#0fcdd3] transition-colors" size={16} />
            <input
              type="text"
              placeholder="חפש מסעדה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f5f5f5] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:bg-white dark:focus:bg-[#171717] focus:border-[#0fcdd3] focus:ring-1 focus:ring-[#0fcdd3] transition-all placeholder:text-[#737373] dark:placeholder:text-[#737373] text-[#0d0d12] dark:text-[#fafafa]"
            />
          </div>
          
          <div className="bg-[#f5f5f5] dark:bg-[#262626] text-[#666d80] dark:text-[#d4d4d4] px-3 py-2.5 rounded-lg text-xs font-bold border border-[#e5e5e5] dark:border-[#404040] whitespace-nowrap">
            {filteredRestaurants.length} מסעדות
          </div>
        </div>
      </div>

      {/* Restaurants List */}
      <div className="flex-1 overflow-y-auto">
        {filteredRestaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#737373] dark:text-[#a3a3a3] p-8">
            <Store className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium mb-2">{emptyMessage}</p>
          </div>
        ) : (
          filteredRestaurants.map(restaurant => (
            <div
              key={restaurant.id}
              className="border-b border-[#e5e5e5] dark:border-[#262626] hover:bg-[#fafafa] dark:hover:bg-[#262626] transition-colors"
            >
              {/* Restaurant Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Store className="w-4 h-4 text-[#9333ea]" />
                      <h3 className="font-bold text-sm text-[#0d0d12] dark:text-[#fafafa]">
                        {restaurant.name}
                      </h3>
                    </div>
                    <p className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                      {restaurant.address}
                    </p>
                    {/* Restaurant Stats */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[#a3a3a3]">
                      <span>⭐ {restaurant.rating.toFixed(1)}</span>
                      <span>•</span>
                      <span>📊 {restaurant.totalOrders.toLocaleString('he-IL')} הזמנות</span>
                      <span>•</span>
                      <span>⏱️ ~{restaurant.averageDeliveryTime} דק׳</span>
                    </div>
                  </div>
                  <div className="bg-[#9333ea]/10 text-[#9333ea] dark:bg-[#9333ea]/20 dark:text-[#c084fc] px-2 py-1 rounded-full text-xs font-bold">
                    {restaurant.activeOrders} משלוחים
                  </div>
                </div>

                {/* Active Orders */}
                {restaurant.orders.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {restaurant.orders.map(order => (
                      <div
                        key={order.id}
                        className="bg-[#f5f5f5] dark:bg-[#0a0a0a] rounded-lg p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-medium text-[#737373] dark:text-[#a3a3a3]">
                            #{order.orderNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'pending' ? 'bg-orange-500 text-white' :
                            order.status === 'assigned' ? 'bg-yellow-500 text-white' :
                            order.status === 'delivering' ? 'bg-indigo-500 text-white' :
                            order.status === 'delivering' ? 'bg-indigo-500 text-white' :
                            order.status === 'delivered' ? 'bg-green-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {order.status === 'pending' ? 'ממתין' :
                             order.status === 'assigned' ? 'שובץ' :
                             order.status === 'delivering' ? 'נאסף' :
                             order.status === 'delivering' ? 'נאסף' :
                             order.status === 'delivered' ? 'נמסר' : 'בוטל'}
                          </span>
                        </div>
                        <div className="text-[#0d0d12] dark:text-[#fafafa] font-medium mb-1">
                          {order.customerName}
                        </div>
                        <div className="text-[#666d80] dark:text-[#a3a3a3]">
                          {order.address}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-[#666d80] dark:text-[#a3a3a3]">
                    אין הזמנות פעילות
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};