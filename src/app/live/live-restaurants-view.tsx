import React, { useMemo, useState } from 'react';
import { Search, Store } from 'lucide-react';
import { useDelivery } from '../context/delivery-context-value';

export const LiveRestaurantsView: React.FC = () => {
  const { state } = useDelivery();
  const [searchQuery, setSearchQuery] = useState('');

  // Count active orders per active restaurant and sort busiest first.
  const restaurantsWithOrders = useMemo(() => {
    const activeRestaurants = state.restaurants.filter((restaurant) => restaurant.isActive);

    return activeRestaurants
      .map((restaurant) => {
        const activeOrders = state.deliveries.filter(
          (delivery) =>
            delivery.restaurantName === restaurant.name &&
            (delivery.status === 'pending' ||
              delivery.status === 'assigned' ||
              delivery.status === 'delivering')
        );

        return {
          ...restaurant,
          activeOrders: activeOrders.length,
          orders: activeOrders,
        };
      })
      .sort((left, right) => right.activeOrders - left.activeOrders);
  }, [state.restaurants, state.deliveries]);

  const filteredRestaurants = restaurantsWithOrders.filter(
    (restaurant) =>
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const emptyMessage = !state.isSystemOpen
    ? 'המערכת סגורה - הפעל את המערכת כדי לראות מסעדות'
    : restaurantsWithOrders.length === 0
      ? 'אין מסעדות פעילות - הפעל מסעדות דרך ניהול ישויות'
      : 'לא נמצאו מסעדות תואמות';

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#171717]">
      <div className="border-b border-[#e5e5e5] p-4 dark:border-[#262626]">
        <div className="flex items-center gap-2">
          <div className="group relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] transition-colors group-focus-within:text-[#0fcdd3]" size={16} />
            <input
              type="text"
              placeholder="חפש מסעדה..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-[#e5e5e5] bg-[#f5f5f5] py-2.5 pr-10 pl-4 text-sm text-[#0d0d12] transition-all placeholder:text-[#737373] focus:border-[#0fcdd3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0fcdd3] dark:border-[#262626] dark:bg-[#0a0a0a] dark:text-[#fafafa] dark:focus:bg-[#171717]"
            />
          </div>

          <div className="whitespace-nowrap rounded-lg border border-[#e5e5e5] bg-[#f5f5f5] px-3 py-2.5 text-xs font-bold text-[#666d80] dark:border-[#404040] dark:bg-[#262626] dark:text-[#d4d4d4]">
            {filteredRestaurants.length} מסעדות
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredRestaurants.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-[#737373] dark:text-[#a3a3a3]">
            <Store className="mb-3 h-12 w-12 opacity-30" />
            <p className="mb-2 text-sm font-medium">{emptyMessage}</p>
          </div>
        ) : (
          filteredRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="border-b border-[#e5e5e5] transition-colors hover:bg-[#fafafa] dark:border-[#262626] dark:hover:bg-[#262626]"
            >
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Store className="h-4 w-4 text-[#9333ea]" />
                      <h3 className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                        {restaurant.name}
                      </h3>
                    </div>

                    <p className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                      {restaurant.address}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-[10px] text-[#a3a3a3]">
                      <span>⭐ {restaurant.rating.toFixed(1)}</span>
                      <span>•</span>
                      <span>📊 {restaurant.totalOrders.toLocaleString('he-IL')} הזמנות</span>
                      <span>•</span>
                      <span>⏱️ ~{restaurant.averageDeliveryTime} דק׳</span>
                    </div>
                  </div>

                  <div className="rounded-full bg-[#9333ea]/10 px-2 py-1 text-xs font-bold text-[#9333ea] dark:bg-[#9333ea]/20 dark:text-[#c084fc]">
                    {restaurant.activeOrders} משלוחים
                  </div>
                </div>

                {restaurant.orders.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {restaurant.orders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-lg bg-[#f5f5f5] p-2.5 text-xs dark:bg-[#0a0a0a]"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-mono font-medium text-[#737373] dark:text-[#a3a3a3]">
                            #{order.orderNumber}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                              order.status === 'pending'
                                ? 'bg-orange-500'
                                : order.status === 'assigned'
                                  ? 'bg-yellow-500'
                                  : order.status === 'delivering'
                                    ? 'bg-indigo-500'
                                    : order.status === 'delivered'
                                      ? 'bg-green-500'
                                      : order.status === 'expired'
                                        ? 'bg-zinc-500'
                                        : 'bg-red-500'
                            }`}
                          >
                            {order.status === 'pending'
                              ? 'ממתין'
                              : order.status === 'assigned'
                                ? 'שובץ'
                                : order.status === 'delivering'
                                  ? 'נאסף'
                                  : order.status === 'delivered'
                                    ? 'נמסר'
                                    : order.status === 'expired'
                                      ? 'פג תוקף'
                                      : 'בוטל'}
                          </span>
                        </div>

                        <div className="mb-1 font-medium text-[#0d0d12] dark:text-[#fafafa]">
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

