import React, { useState, useMemo } from 'react';
import { Search, User, MapPin } from 'lucide-react';
import { useDelivery } from '../../../context/delivery.context';

export const LiveCustomersView: React.FC = () => {
  const { state } = useDelivery();
  const [searchQuery, setSearchQuery] = useState('');

  // חישוב משלוחים פעילים לכל לקוח
  const customersWithOrders = useMemo(() => {
    // איסוף כל הלקוחות מהמשלוחים הפעילים
    const activeDeliveries = state.deliveries.filter(
      d => d.status === 'pending' || d.status === 'assigned' || d.status === 'delivering'
    );

    // קיבוץ לפי לקוח
    const customerMap = new Map();
    
    activeDeliveries.forEach(delivery => {
      if (!customerMap.has(delivery.customerPhone)) {
        customerMap.set(delivery.customerPhone, {
          name: delivery.customerName,
          phone: delivery.customerPhone,
          address: delivery.address,
          orders: [],
        });
      }
      customerMap.get(delivery.customerPhone).orders.push(delivery);
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.orders.length - a.orders.length); // מיון לפי כמות הזמנות
  }, [state.deliveries]);

  const filteredCustomers = customersWithOrders.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#171717]">
      {/* Header with Search */}
      <div className="p-4 border-b border-[#e5e5e5] dark:border-[#262626]">
        <div className="flex items-center gap-2">
          <div className="relative group flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] dark:text-[#737373] group-focus-within:text-[#0fcdd3] transition-colors" size={16} />
            <input
              type="text"
              placeholder="חפש לקוח..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f5f5f5] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:bg-white dark:focus:bg-[#171717] focus:border-[#0fcdd3] focus:ring-1 focus:ring-[#0fcdd3] transition-all placeholder:text-[#737373] dark:placeholder:text-[#737373] text-[#0d0d12] dark:text-[#fafafa]"
            />
          </div>
          
          <div className="bg-[#f5f5f5] dark:bg-[#262626] text-[#666d80] dark:text-[#d4d4d4] px-3 py-2.5 rounded-lg text-xs font-bold border border-[#e5e5e5] dark:border-[#404040] whitespace-nowrap">
            {filteredCustomers.length} לקוחות
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="flex-1 overflow-y-auto">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#737373] dark:text-[#a3a3a3] p-8">
            <User className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">אין לקוחות עם משלוחים פעילים</p>
          </div>
        ) : (
          filteredCustomers.map((customer, idx) => (
            <div
              key={idx}
              className="border-b border-[#e5e5e5] dark:border-[#262626] hover:bg-[#fafafa] dark:hover:bg-[#262626] transition-colors"
            >
              {/* Customer Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-[#16a34a]" />
                      <h3 className="font-bold text-sm text-[#0d0d12] dark:text-[#fafafa]">
                        {customer.name}
                      </h3>
                    </div>
                    <p className="text-xs text-[#666d80] dark:text-[#a3a3a3] direction-ltr text-right">
                      {customer.phone}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-[#666d80] dark:text-[#a3a3a3] mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{customer.address}</span>
                    </div>
                  </div>
                  <div className="bg-[#16a34a]/10 text-[#16a34a] dark:bg-[#16a34a]/20 dark:text-[#4ade80] px-2 py-1 rounded-full text-xs font-bold">
                    {customer.orders.length} משלוחים
                  </div>
                </div>

                {/* Active Orders */}
                <div className="mt-3 space-y-2">
                  {customer.orders.map(order => (
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
                        {order.restaurantName}
                      </div>
                      <div className="text-[#666d80] dark:text-[#a3a3a3]">
                        ₪{order.price} • {order.estimatedTime} דקות
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};