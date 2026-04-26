import React, { useState } from 'react';
import { Grid3x3, List } from 'lucide-react';

import { useDelivery } from '../context/delivery-context-value';
import { PageToolbar } from '../components/common/page-toolbar';
import { ToolbarSearchControl } from '../components/common/toolbar-search-control';

export const CustomersScreen: React.FC = () => {
  const { state } = useDelivery();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');

  const filteredCustomers = state.customers.filter(
    customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.address.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-app-background" dir="rtl">
      <PageToolbar
        actions={
          <>
            <ToolbarSearchControl
              searchOpen={searchOpen}
              onSearchOpenChange={setSearchOpen}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              placeholder="חפש לקוח, טלפון או כתובת..."
              widthClass="w-64"
            />
            <div className="flex items-center gap-2 rounded-lg bg-[#f5f5f5] p-1 dark:bg-[#262626]">
              <button
                onClick={() => setViewMode('cards')}
                className={`rounded p-2 transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#0d0d12] shadow-sm dark:bg-[#404040] dark:text-[#fafafa]'
                    : 'text-[#737373] hover:text-[#0d0d12] dark:text-[#a3a3a3] dark:hover:text-[#fafafa]'
                }`}
                title="תצוגת כרטיסיות"
              >
                <Grid3x3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-[#0d0d12] shadow-sm dark:bg-[#404040] dark:text-[#fafafa]'
                    : 'text-[#737373] hover:text-[#0d0d12] dark:text-[#a3a3a3] dark:hover:text-[#fafafa]'
                }`}
                title="תצוגת רשימה"
              >
                <List size={18} />
              </button>
            </div>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full max-w-7xl flex-col px-3 py-3 sm:px-4 sm:py-4 md:px-8 md:py-8">
          {viewMode === 'cards' ? (
            filteredCustomers.length > 0 ? (
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    className="cursor-pointer rounded-2xl border border-[#e5e5e5] bg-white p-4 transition-all hover:shadow-lg dark:border-app-border dark:bg-app-surface"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="mb-1 text-base font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                          {customer.name}
                        </h3>
                        <p className="direction-ltr text-right text-sm text-[#666d80] dark:text-[#a3a3a3]">
                          {customer.phone}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          customer.status === 'active'
                            ? 'bg-[#ecfae2] text-[#0d0d12] dark:bg-[#163300] dark:text-[#9fe870]'
                            : 'bg-[#f5f5f5] text-[#737373] dark:bg-[#262626] dark:text-[#a3a3a3]'
                        }`}
                      >
                        {customer.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </div>

                    <div className="mb-3 border-b border-[#e5e5e5] pb-3 dark:border-app-border">
                      <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                        {customer.address}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="mb-1 text-xs text-[#666d80] dark:text-[#a3a3a3]">
                          סך הזמנות
                        </p>
                        <p className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                          {customer.totalOrders.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-[#666d80] dark:text-[#a3a3a3]">
                          ממוצע
                        </p>
                        <p className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                          ₪{customer.averageOrderValue}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-[#666d80] dark:text-[#a3a3a3]">
                          אחרונה
                        </p>
                        <p className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                          {formatDate(customer.lastOrderDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#e5e5e5] bg-white p-8 text-center text-[#737373] dark:border-app-border dark:bg-app-surface dark:text-[#a3a3a3]">
                לא נמצאו תוצאות לחיפוש "{searchQuery}"
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-[#e5e5e5] bg-white overflow-hidden dark:border-app-border dark:bg-app-surface">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[#e5e5e5] bg-[#fafafa] dark:border-app-border dark:bg-app-surface">
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
                    {filteredCustomers.map(customer => (
                      <tr
                        key={customer.id}
                        className="cursor-pointer border-b border-[#e5e5e5] transition-colors last:border-b-0 hover:bg-[#fafafa] dark:border-app-border dark:hover:bg-app-surface-raised"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
                          {customer.name}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              customer.status === 'active'
                                ? 'bg-[#ecfae2] text-[#0d0d12] dark:bg-[#163300] dark:text-[#9fe870]'
                                : 'bg-[#f5f5f5] text-[#737373] dark:bg-[#262626] dark:text-[#a3a3a3]'
                            }`}
                          >
                            {customer.status === 'active' ? 'פעיל' : 'לא פעיל'}
                          </span>
                        </td>
                        <td className="direction-ltr px-4 py-3 text-right text-sm text-[#0d0d12] dark:text-[#fafafa]">
                          {customer.phone}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#0d0d12] dark:text-[#fafafa]">
                          {customer.address}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#0d0d12] dark:text-[#fafafa]">
                          {customer.totalOrders.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#0d0d12] dark:text-[#fafafa]">
                          ₪{customer.averageOrderValue}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#666d80] dark:text-[#a3a3a3]">
                          {formatDate(customer.lastOrderDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-[#737373] dark:text-[#a3a3a3]">
                  לא נמצאו תוצאות לחיפוש "{searchQuery}"
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
