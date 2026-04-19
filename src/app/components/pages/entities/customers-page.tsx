import React, { useState } from 'react';
import { Search, Plus, Grid3x3, List } from 'lucide-react';
import { useDelivery } from '../../../context/delivery.context';

export const CustomersPage: React.FC = () => {
  const { state } = useDelivery();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');

  const filteredCustomers = state.customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // פונקציה להצגת תאריך בעברית
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'היום';
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  };

  return (
    <div className="min-h-screen dark:bg-[#0a0a0a] p-3 sm:p-4 md:p-8 bg-[#fafafa]">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Tab Navigation removed */}
        
        {/* Header with Search and Add Button */}
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center mb-6">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] dark:text-[#a3a3a3]" />
          <input
            type="text"
            placeholder="חפש לקוח, טלפון או כתובת..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#737373] dark:placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:focus:ring-[#9fe870]"
          />
        </div>

        {/* Add Customer Button */}
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#9fe870] hover:bg-[#8fd65f] text-[#0d0d12] rounded-lg font-medium transition-colors whitespace-nowrap">
          <Plus size={20} />
          <span>הוסף לקוח</span>
        </button>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-[#f5f5f5] dark:bg-[#262626] p-1 rounded-lg">
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'cards'
                ? 'bg-white dark:bg-[#404040] text-[#0d0d12] dark:text-[#fafafa] shadow-sm'
                : 'text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
            }`}
            title="תצוגת כרטיסיות"
          >
            <Grid3x3 size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-[#404040] text-[#0d0d12] dark:text-[#fafafa] shadow-sm'
                : 'text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
            }`}
            title="תצוגת רשימה"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-[#0d0d12] dark:text-[#fafafa] mb-1">
                    {customer.name}
                  </h3>
                  <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] direction-ltr text-right">
                    {customer.phone}
                  </p>
                </div>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  customer.status === 'active' 
                    ? 'bg-[#ecfae2] dark:bg-[#163300] text-[#0d0d12] dark:text-[#9fe870]'
                    : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#737373] dark:text-[#a3a3a3]'
                }`}>
                  {customer.status === 'active' ? 'פעיל' : 'לא פעיל'}
                </span>
              </div>

              {/* Address */}
              <div className="mb-3 pb-3 border-b border-[#e5e5e5] dark:border-[#262626]">
                <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                  {customer.address}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-[#666d80] dark:text-[#a3a3a3] mb-1">סך הזמנות</p>
                  <p className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                    {customer.totalOrders.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#666d80] dark:text-[#a3a3a3] mb-1">ממוצע</p>
                  <p className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                    ₪{customer.averageOrderValue}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#666d80] dark:text-[#a3a3a3] mb-1">אחרונה</p>
                  <p className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                    {formatDate(customer.lastOrderDate)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#fafafa] dark:bg-[#0a0a0a] border-b border-[#e5e5e5] dark:border-[#262626]">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-normal text-[#666d80] dark:text-[#a3a3a3]">שם לקוח</th>
                  <th className="px-4 py-3 text-right text-sm font-normal text-[#666d80] dark:text-[#a3a3a3]">סטטוס</th>
                  <th className="px-4 py-3 text-right text-sm font-normal text-[#666d80] dark:text-[#a3a3a3]">טלפון</th>
                  <th className="px-4 py-3 text-right text-sm font-normal text-[#666d80] dark:text-[#a3a3a3]">כתובת</th>
                  <th className="px-4 py-3 text-right text-sm font-normal text-[#666d80] dark:text-[#a3a3a3]">סך הזמנות</th>
                  <th className="px-4 py-3 text-right text-sm font-normal text-[#666d80] dark:text-[#a3a3a3]">ממוצע הזמנה</th>
                  <th className="px-4 py-3 text-right text-sm font-normal text-[#666d80] dark:text-[#a3a3a3]">הזמנה אחרונה</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id}
                    className="border-b border-[#e5e5e5] dark:border-[#262626] last:border-b-0 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-[#0d0d12] dark:text-[#fafafa] font-medium">{customer.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        customer.status === 'active' 
                          ? 'bg-[#ecfae2] dark:bg-[#163300] text-[#0d0d12] dark:text-[#9fe870]'
                          : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#737373] dark:text-[#a3a3a3]'
                      }`}>
                        {customer.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#0d0d12] dark:text-[#fafafa] direction-ltr text-right">{customer.phone}</td>
                    <td className="px-4 py-3 text-sm text-[#0d0d12] dark:text-[#fafafa]">{customer.address}</td>
                    <td className="px-4 py-3 text-sm text-[#0d0d12] dark:text-[#fafafa]">{customer.totalOrders.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[#0d0d12] dark:text-[#fafafa]">₪{customer.averageOrderValue}</td>
                    <td className="px-4 py-3 text-sm text-[#666d80] dark:text-[#a3a3a3]">{formatDate(customer.lastOrderDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* No Results */}
          {filteredCustomers.length === 0 && (
            <div className="p-8 text-center text-[#737373] dark:text-[#a3a3a3]">
              לא נמצאו תוצאות לחיפוש "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* No Results for Cards View */}
      {viewMode === 'cards' && filteredCustomers.length === 0 && (
        <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl p-8 text-center text-[#737373] dark:text-[#a3a3a3]">
          לא נמצאו תוצאות לחיפוש "{searchQuery}"
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">
        מציג {filteredCustomers.length} מתוך {state.customers.length} לקוחות
      </div>
      </div>
    </div>
  );
};