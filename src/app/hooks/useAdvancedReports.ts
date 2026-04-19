import { useDelivery } from '../context/delivery.context';
import { format } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function useAdvancedReports() {
  const { state } = useDelivery();

  const generateRestaurantSummaryReport = (filteredDeliveries: any[]) => {
    const restaurantMap = new Map<string, { name: string; count: number; total: number }>();
    
    filteredDeliveries.forEach(d => {
      if (d.status === 'delivered') {
        const existing = restaurantMap.get(d.restaurantName) || { name: d.restaurantName, count: 0, total: 0 };
        existing.count++;
        existing.total += d.restaurantPrice || d.price;
        restaurantMap.set(d.restaurantName, existing);
      }
    });

    const data = Array.from(restaurantMap.values())
      .sort((a, b) => b.total - a.total)
      .map(r => ({
        'שם מסעדה': r.name,
        'כמות משלוחים': r.count,
        'סכום לתשלום': `₪${r.total.toFixed(2)}`
      }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'מסכם מסעדות');
    XLSX.writeFile(wb, `דוח_מסכם_מסעדות_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('דוח מסכם מסעדות יוצא בהצלחה!');
  };

  const generateRestaurantByAreaReport = (restaurantName: string, filteredDeliveries: any[]) => {
    const areaMap = new Map<string, { count: number; total: number }>();
    
    filteredDeliveries
      .filter(d => d.restaurantName === restaurantName && d.status === 'delivered')
      .forEach(d => {
        const existing = areaMap.get(d.area) || { count: 0, total: 0 };
        existing.count++;
        existing.total += d.restaurantPrice || d.price;
        areaMap.set(d.area, existing);
      });

    const data = Array.from(areaMap.entries()).map(([area, stats]) => ({
      'אזור': area,
      'כמות משלוחים': stats.count,
      'סכום': `₪${stats.total.toFixed(2)}`
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, restaurantName.substring(0, 30));
    XLSX.writeFile(wb, `דוח_פר_מסעדה_${restaurantName}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success(`דוח פר מסעדה - ${restaurantName} יוצא בהצלחה!`);
  };

  const generateProfitLossReport = (filteredDeliveries: any[], dateRange: string) => {
    const delivered = filteredDeliveries.filter(d => d.status === 'delivered');
    const totalDeliveries = delivered.length;
    const totalRevenue = delivered.reduce((sum, d) => sum + d.price, 0);
    const totalExpenses = delivered.reduce((sum, d) => sum + (d.courierPayment || d.price * 0.4), 0);
    const totalProfit = totalRevenue - totalExpenses;
    const avgProfitPerDelivery = totalDeliveries > 0 ? totalProfit / totalDeliveries : 0;
    
    const daysInRange = dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 30;
    const avgExpensePerDay = totalExpenses / daysInRange;
    const avgRevenuePerDay = totalRevenue / daysInRange;

    const data = [{
      'סך משלוחים': totalDeliveries,
      'סך הכנסות': `₪${totalRevenue.toFixed(2)}`,
      'סך הוצאות': `₪${totalExpenses.toFixed(2)}`,
      'סך רווחים': `₪${totalProfit.toFixed(2)}`,
      'רווחיות למשלוח ממוצעת': `₪${avgProfitPerDelivery.toFixed(2)}`,
      'סך הוצאה ממוצעת ליום': `₪${avgExpensePerDay.toFixed(2)}`,
      'סך הכנסה ממוצעת ליום': `₪${avgRevenuePerDay.toFixed(2)}`
    }];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'רווח והפסד');
    XLSX.writeFile(wb, `דוח_רווח_והפסד_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('דוח רווח והפסד יוצא בהצלחה!');
  };

  const generateCourierSummaryReport = (filteredDeliveries: any[]) => {
    const courierMap = new Map<string, { name: string; deliveries: number; hours: number; payment: number }>();
    
    filteredDeliveries.forEach(d => {
      if (d.courierId && d.status === 'delivered') {
        const courier = state.couriers.find(c => c.id === d.courierId);
        if (courier) {
          const existing = courierMap.get(courier.id) || { name: courier.name, deliveries: 0, hours: 0, payment: 0 };
          existing.deliveries++;
          existing.payment += d.courierPayment || d.price * 0.4;
          existing.hours += 0.5;
          courierMap.set(courier.id, existing);
        }
      }
    });

    const data = Array.from(courierMap.values())
      .sort((a, b) => b.deliveries - a.deliveries)
      .map(c => ({
        'שם שליח': c.name,
        'כמות משלוחים': c.deliveries,
        'כמות שעות (משוער)': c.hours.toFixed(1),
        'סכום לתשלום': `₪${c.payment.toFixed(2)}`
      }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'סיכום שליחים');
    XLSX.writeFile(wb, `דוח_סיכום_שליחים_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('דוח סיכום שליחים יוצא בהצלחה!');
  };

  const generateCourierByAreaReport = (courierId: string, filteredDeliveries: any[]) => {
    const courier = state.couriers.find(c => c.id === courierId);
    if (!courier) return;

    const areaMap = new Map<string, { count: number; payment: number }>();
    
    filteredDeliveries
      .filter(d => d.courierId === courierId && d.status === 'delivered')
      .forEach(d => {
        const existing = areaMap.get(d.area) || { count: 0, payment: 0 };
        existing.count++;
        existing.payment += d.courierPayment || d.price * 0.4;
        areaMap.set(d.area, existing);
      });

    const data = Array.from(areaMap.entries()).map(([area, stats]) => ({
      'אזור': area,
      'כמות משלוחים': stats.count,
      'סכום לתשלום': `₪${stats.payment.toFixed(2)}`
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, courier.name.substring(0, 30));
    XLSX.writeFile(wb, `דוח_פר_שליח_${courier.name}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success(`דוח פר שליח - ${courier.name} יוצא בהצלחה!`);
  };

  const generateRestaurantPerformanceReport = (filteredDeliveries: any[]) => {
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

    const data = Array.from(restaurantMap.values())
      .sort((a, b) => b.count - a.count)
      .map(r => ({
        'שם מסעדה': r.name,
        'כמות משלוחים': r.count,
        'מרחק ממוצע (ק\"מ)': r.distances.length > 0 ? (r.distances.reduce((a, b) => a + b, 0) / r.distances.length).toFixed(1) : '0',
        'רווחיות (מרחק/מחיר)': r.totalRevenue > 0 ? (r.totalDistance / r.totalRevenue).toFixed(3) : '0'
      }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'ביצועים מסעדות');
    XLSX.writeFile(wb, `דוח_ביצועים_מסעדות_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('דוח ביצועים מסעדות יוצא בהצלחה!');
  };

  const generateCourierPerformanceReport = (filteredDeliveries: any[]) => {
    const courierMap = new Map<string, {
      name: string;
      deliveries: number;
      hours: number;
    }>();

    filteredDeliveries.forEach(d => {
      if (d.courierId && d.status === 'delivered') {
        const courier = state.couriers.find(c => c.id === d.courierId);
        if (courier) {
          const existing = courierMap.get(courier.id) || { name: courier.name, deliveries: 0, hours: 0 };
          existing.deliveries++;
          existing.hours += 0.5;
          courierMap.set(courier.id, existing);
        }
      }
    });

    const data = Array.from(courierMap.values())
      .sort((a, b) => b.deliveries - a.deliveries)
      .map(c => ({
        'שם שליח': c.name,
        'כמות משלוחים': c.deliveries,
        'סך שעות עבודה': c.hours.toFixed(1),
        'משלוחים לשעה': (c.deliveries / c.hours).toFixed(2)
      }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'ביצועים שליחים');
    XLSX.writeFile(wb, `דוח_ביצועים_שליחים_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('דוח ביצועים שליחים יוצא בהצלחה!');
  };

  const generateDispatcherPerformanceReport = (filteredDeliveries: any[]) => {
    const data = [{
      'שם מצוות': 'כללי',
      'כמות משלוחים': filteredDeliveries.length,
      'זמן ציוות ממוצע (דק)': '5',
      'רווחיות ממוצעת': '₪15.00'
    }];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'ביצועים מצוותים');
    XLSX.writeFile(wb, `דוח_ביצועים_מצוותים_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('דוח ביצועים מצוותים יוצא בהצלחה!');
  };

  const generateOverallPerformanceReport = (filteredDeliveries: any[], dateRange: string) => {
    const delivered = filteredDeliveries.filter(d => d.status === 'delivered');
    const daysInRange = dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 30;
    
    const avgDeliveriesPerDay = delivered.length / daysInRange;
    const totalRevenue = delivered.reduce((sum, d) => sum + d.price, 0);
    const totalExpenses = delivered.reduce((sum, d) => sum + (d.courierPayment || d.price * 0.4), 0);
    const avgRevenuePerDay = totalRevenue / daysInRange;
    const avgExpensePerDay = totalExpenses / daysInRange;
    const avgProfit = delivered.length > 0 ? (totalRevenue - totalExpenses) / delivered.length : 0;

    const data = [{
      'כמות משלוחים ממוצעת ליום': avgDeliveriesPerDay.toFixed(1),
      'סך הוצאה ממוצעת ליום': `₪${avgExpensePerDay.toFixed(2)}`,
      'סך הכנסה ממוצעת ליום': `₪${avgRevenuePerDay.toFixed(2)}`,
      'רווחיות ממוצעת למשלוח': `₪${avgProfit.toFixed(2)}`
    }];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'מסכם ביצועים');
    XLSX.writeFile(wb, `דוח_מסכם_ביצועים_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('דוח מסכם ביצועים יוצא בהצלחה!');
  };

  const generateCustomerFeedbackReport = (filteredDeliveries: any[]) => {
    const feedbackDeliveries = filteredDeliveries.filter(d => d.customerRating || d.customerFeedback);
    
    const data = feedbackDeliveries.map(d => {
      const courier = state.couriers.find(c => c.id === d.courierId);
      
      return {
        'שם לקוח': d.customerName,
        'דירוג': d.customerRating || '-',
        'שם שליח': courier?.name || '-',
        'שם מסעדה': d.restaurantName,
        'הערות': d.customerFeedback || '-'
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'תגובות לקוחות');
    XLSX.writeFile(wb, `דוח_תגובות_לקוחות_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('דוח תגובות לקוחות יוצא בהצלחה!');
  };

  const handleMonthEndClose = (filteredDeliveries: any[], dateRange: string) => {
    toast.loading('מייצא את כל הדוחות...');
    
    setTimeout(() => {
      generateRestaurantSummaryReport(filteredDeliveries);
      setTimeout(() => generateProfitLossReport(filteredDeliveries, dateRange), 300);
      setTimeout(() => generateCourierSummaryReport(filteredDeliveries), 600);
      setTimeout(() => generateOverallPerformanceReport(filteredDeliveries, dateRange), 900);
      
      setTimeout(() => {
        toast.dismiss();
        toast.success('כל הדוחות יוצאו בהצלחה! 🎉');
      }, 1200);
    }, 500);
  };

  return {
    generateRestaurantSummaryReport,
    generateRestaurantByAreaReport,
    generateProfitLossReport,
    generateCourierSummaryReport,
    generateCourierByAreaReport,
    generateRestaurantPerformanceReport,
    generateCourierPerformanceReport,
    generateDispatcherPerformanceReport,
    generateOverallPerformanceReport,
    generateCustomerFeedbackReport,
    handleMonthEndClose
  };
}