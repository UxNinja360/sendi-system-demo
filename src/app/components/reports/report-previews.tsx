import React, { useState } from 'react';
import { FileSpreadsheet, Settings } from 'lucide-react';
import { Delivery } from '../../types/delivery.types';
import { ReportColumnConfig } from '../pages/reports-page';
import { Pagination } from './pagination';

interface ReportPreviewsProps {
  reportType: string;
  filteredDeliveries: Delivery[];
  state: any;
  dateRange: string;
  selectedRestaurants?: string[];
  selectedCouriers?: string[];
  visibleColumns?: Set<string>;
  onColumnVisibilityChange?: (columns: Set<string>) => void;
  availableColumns?: ReportColumnConfig[];
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
}

export const ReportPreviews: React.FC<ReportPreviewsProps> = ({ 
  reportType, 
  filteredDeliveries, 
  state,
  dateRange,
  selectedRestaurants = [],
  selectedCouriers = [],
  visibleColumns = new Set(),
  onColumnVisibilityChange,
  availableColumns = [],
  currentPage = 1,
  itemsPerPage = 20,
  onPageChange
}) => {
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  const toggleColumn = (key: string) => {
    if (onColumnVisibilityChange) {
      const newColumns = new Set(visibleColumns);
      if (newColumns.has(key)) {
        newColumns.delete(key);
      } else {
        newColumns.add(key);
      }
      onColumnVisibilityChange(newColumns);
    }
  };
  
  const selectAllColumns = () => {
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(new Set(availableColumns.map(c => c.key)));
    }
  };
  
  const clearAllColumns = () => {
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(new Set());
    }
  };
  
  const resetToDefault = () => {
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(new Set(availableColumns.filter(c => c.defaultVisible).map(c => c.key)));
    }
  };
  
  // מסנן את העמודות הנראות
  const activeColumns = availableColumns.filter(col => visibleColumns.has(col.key));
  
  // profit-loss
  if (reportType === 'profit-loss') {
    const delivered = filteredDeliveries.filter(d => d.status === 'delivered');
    const totalDeliveries = delivered.length;
    const totalRevenue = delivered.reduce((sum, d) => sum + d.price, 0);
    const totalExpenses = delivered.reduce((sum, d) => sum + (d.courierPayment || d.price * 0.4), 0);
    const totalProfit = totalRevenue - totalExpenses;
    const avgProfitPerDelivery = totalDeliveries > 0 ? totalProfit / totalDeliveries : 0;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {totalDeliveries}
          </div>
          <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">סך משלוחים</div>
        </div>
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            ₪{totalRevenue.toFixed(2)}
          </div>
          <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">סך הכנסות</div>
        </div>
        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
            ₪{totalExpenses.toFixed(2)}
          </div>
          <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">סך הוצאות</div>
        </div>
        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            ₪{totalProfit.toFixed(2)}
          </div>
          <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">סך רווחים</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
            ₪{avgProfitPerDelivery.toFixed(2)}
          </div>
          <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">רווחיות ממוצעת</div>
        </div>
      </div>
    );
  }

  // restaurant-performance
  if (reportType === 'restaurant-performance') {
    const restaurantMap = new Map<string, {
      name: string;
      count: number;
      distances: number[];
      totalRevenue: number;
      totalDistance: number;
    }>();

    filteredDeliveries.forEach(d => {
      if (d.status === 'delivered') {
        const existing = restaurantMap.get(d.restaurantName) || {
          name: d.restaurantName,
          count: 0,
          distances: [],
          totalRevenue: 0,
          totalDistance: 0
        };

        existing.count++;
        existing.totalRevenue += d.price;
        if (d.deliveryDistance) {
          existing.distances.push(d.deliveryDistance);
          existing.totalDistance += d.deliveryDistance;
        }

        restaurantMap.set(d.restaurantName, existing);
      }
    });

    const allData = Array.from(restaurantMap.values()).sort((a, b) => b.count - a.count);
    
    // חישוב pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = allData.slice(startIndex, endIndex);

    return (
      <div>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#fafafa] dark:bg-[#0a0a0a] border-b border-[#e5e5e5] dark:border-[#262626]">
            <tr>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">שם מסעדה</th>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">כמות משלוחים</th>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">מרחק ממוצע</th>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">רווחיות</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((r, idx) => (
              <tr key={idx} className="border-b border-[#e5e5e5] dark:border-[#262626] last:border-b-0 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors">
                <td className="px-4 py-3 text-[#0d0d12] dark:text-[#fafafa] font-medium">{r.name}</td>
                <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-medium">{r.count}</td>
                <td className="px-4 py-3 text-purple-600 dark:text-purple-400">
                  {r.distances.length > 0 ? `${(r.distances.reduce((a, b) => a + b, 0) / r.distances.length).toFixed(1)} ק"מ` : '-'}
                </td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">
                  {r.totalRevenue > 0 ? (r.totalDistance / r.totalRevenue).toFixed(3) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {onPageChange && (
          <Pagination
            currentPage={currentPage}
            totalItems={allData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
          />
        )}
      </div>
    );
  }

  // courier-performance
  if (reportType === 'courier-performance') {
    const courierMap = new Map<string, {
      name: string;
      deliveries: number;
      hours: number;
    }>();

    filteredDeliveries.forEach(d => {
      if (d.courierId && d.status === 'delivered') {
        const courier = state.couriers.find((c: any) => c.id === d.courierId);
        if (courier) {
          const existing = courierMap.get(courier.id) || { name: courier.name, deliveries: 0, hours: 0 };
          existing.deliveries++;
          existing.hours += 0.5;
          courierMap.set(courier.id, existing);
        }
      }
    });

    const allData = Array.from(courierMap.values()).sort((a, b) => b.deliveries - a.deliveries);
    
    // חישוב pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = allData.slice(startIndex, endIndex);

    return (
      <div>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#fafafa] dark:bg-[#0a0a0a] border-b border-[#e5e5e5] dark:border-[#262626]">
            <tr>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">שם שליח</th>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">כמות משלוחים</th>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">סך שעות</th>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">משלוחים לשעה</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((c, idx) => (
              <tr key={idx} className="border-b border-[#e5e5e5] dark:border-[#262626] last:border-b-0 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors">
                <td className="px-4 py-3 text-[#0d0d12] dark:text-[#fafafa] font-medium">{c.name}</td>
                <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-medium">{c.deliveries}</td>
                <td className="px-4 py-3 text-purple-600 dark:text-purple-400">{c.hours.toFixed(1)}</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">{(c.deliveries / c.hours).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {onPageChange && (
          <Pagination
            currentPage={currentPage}
            totalItems={allData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
          />
        )}
      </div>
    );
  }

  // customer-feedback
  if (reportType === 'customer-feedback') {
    const allData = filteredDeliveries
      .filter(d => d.customerRating || d.customerFeedback);

    // חישוב pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = allData.slice(startIndex, endIndex);

    return (
      <div>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#fafafa] dark:bg-[#0a0a0a] border-b border-[#e5e5e5] dark:border-[#262626]">
            <tr>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">שם לקוח</th>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">דירוג</th>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">שם שליח</th>
              <th className="text-right px-4 py-3 font-normal text-[#666d80] dark:text-[#a3a3a3]">הערות</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((d, idx) => {
              const courier = state.couriers.find((c: any) => c.id === d.courierId);
              return (
                <tr key={idx} className="border-b border-[#e5e5e5] dark:border-[#262626] last:border-b-0 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors">
                  <td className="px-4 py-3 text-[#0d0d12] dark:text-[#fafafa] font-medium">{d.customerName}</td>
                  <td className="px-4 py-3 text-yellow-600 dark:text-yellow-400 font-medium">⭐ {d.customerRating || '-'}</td>
                  <td className="px-4 py-3 text-blue-600 dark:text-blue-400">{courier?.name || '-'}</td>
                  <td className="px-4 py-3 text-[#0d0d12] dark:text-[#fafafa] max-w-xs truncate">{d.customerFeedback || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {onPageChange && (
          <Pagination
            currentPage={currentPage}
            totalItems={allData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
          />
        )}
      </div>
    );
  }

  // performance-summary
  if (reportType === 'performance-summary') {
    const delivered = filteredDeliveries.filter(d => d.status === 'delivered');
    const daysInRange = dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 30;
    
    const avgDeliveriesPerDay = delivered.length / daysInRange;
    const totalRevenue = delivered.reduce((sum, d) => sum + d.price, 0);
    const avgRevenuePerDay = totalRevenue / daysInRange;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {avgDeliveriesPerDay.toFixed(1)}
          </div>
          <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">משלוחים ממוצעים ליום</div>
        </div>
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            ₪{avgRevenuePerDay.toFixed(2)}
          </div>
          <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">הכנסה ממוצעת ליום</div>
        </div>
        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            ₪{(totalRevenue / delivered.length || 0).toFixed(2)}
          </div>
          <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">ממוצע למשלוח</div>
        </div>
      </div>
    );
  }

  // restaurant-detailed, courier-detailed, team-performance
  if (reportType === 'restaurant-detailed' || reportType === 'courier-detailed' || reportType === 'team-performance') {
    return (
      <div className="text-center py-12">
        <FileSpreadsheet className="w-16 h-16 text-[#16a34a] dark:text-[#22c55e] mx-auto mb-4" />
        <p className="text-lg font-medium text-[#0d0d12] dark:text-[#fafafa] mb-2">
          דוח מפורט - לחץ על "ייצא" לקבלת הדוח המלא
        </p>
        <p className="text-sm text-[#737373] dark:text-[#a3a3a3]">
          הדוח הזה יופק כקובץ Excel עם כל הפרטים
        </p>
      </div>
    );
  }

  return null;
};
