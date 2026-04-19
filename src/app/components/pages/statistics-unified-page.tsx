import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDelivery } from '../../context/delivery.context';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  Package, 
  Bike, 
  Store, 
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Calendar,
  MapPin,
  Download,
  Filter,
  BarChart3,
  Users,
  Percent,
  Zap,
  Shield,
  ChevronDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, getHours, getDay } from 'date-fns';
import * as XLSX from 'xlsx';

type TabType = 'overview' | 'segments' | 'comparison';
type SegmentType = 'courier' | 'restaurant' | 'area' | 'hour' | 'day' | 'payment';

export const StatisticsUnifiedPage: React.FC = () => {
  const { state } = useDelivery();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 7));
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [selectedSegment, setSelectedSegment] = useState<SegmentType>('courier');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'cancelled' | 'active'>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [restaurantFilter, setRestaurantFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'credit'>('all');
  
  // Dropdowns state
  const [statusOpen, setStatusOpen] = useState(false);
  const [courierOpen, setCourierOpen] = useState(false);
  const [restaurantOpen, setRestaurantOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  
  const statusRef = useRef<HTMLDivElement>(null);
  const courierRef = useRef<HTMLDivElement>(null);
  const restaurantRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
      if (courierRef.current && !courierRef.current.contains(e.target as Node)) {
        setCourierOpen(false);
      }
      if (restaurantRef.current && !restaurantRef.current.contains(e.target as Node)) {
        setRestaurantOpen(false);
      }
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) {
        setAreaOpen(false);
      }
      if (paymentRef.current && !paymentRef.current.contains(e.target as Node)) {
        setPaymentOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // חישוב טווח תאריכים
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: subDays(now, 7), end: now };
      case 'month':
        return { start: subDays(now, 30), end: now };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
    }
  }, [timeRange, customStartDate, customEndDate]);

  // סינון משלוחים
  const filteredDeliveries = useMemo(() => {
    return state.deliveries.filter(d => {
      const inDateRange = d.createdAt >= dateRange.start && d.createdAt <= dateRange.end;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'delivered' && d.status === 'delivered') ||
        (statusFilter === 'cancelled' && d.status === 'cancelled') ||
        (statusFilter === 'active' && (d.status === 'assigned' || d.status === 'delivering'));
      const matchesCourier = courierFilter === 'all' || d.courierId === courierFilter;
      const matchesRestaurant = restaurantFilter === 'all' || d.restaurantName === restaurantFilter;
      const matchesArea = areaFilter === 'all' || d.area === areaFilter;
      const matchesPayment = paymentFilter === 'all' || 
        (paymentFilter === 'cash' && d.is_cash) ||
        (paymentFilter === 'credit' && !d.is_cash);
      
      return inDateRange && matchesStatus && matchesCourier && matchesRestaurant && matchesArea && matchesPayment;
    });
  }, [state.deliveries, dateRange, statusFilter, courierFilter, restaurantFilter, areaFilter, paymentFilter]);

  // KPI Statistics
  const keyStats = useMemo(() => {
    const delivered = filteredDeliveries.filter(d => d.status === 'delivered');
    const cancelled = filteredDeliveries.filter(d => d.status === 'cancelled');
    const active = filteredDeliveries.filter(d => d.status === 'assigned' || d.status === 'delivering');
    
    const totalRevenue = delivered.reduce((sum, d) => sum + (d.price || 0), 0);
    const totalCourierPayment = delivered.reduce((sum, d) => sum + (d.courierPayment || 0), 0);
    const commission = totalRevenue - totalCourierPayment;
    
    const deliveredWithTime = delivered.filter(d => d.deliveredAt && d.createdAt);
    const avgDeliveryTime = deliveredWithTime.length > 0
      ? deliveredWithTime.reduce((sum, d) => {
          const time = (d.deliveredAt!.getTime() - d.createdAt.getTime()) / 1000 / 60;
          return sum + time;
        }, 0) / deliveredWithTime.length
      : 0;

    const lateDeliveries = delivered.filter(d => (d.minutes_late || 0) > 0);
    const onTimeRate = delivered.length > 0 
      ? ((delivered.length - lateDeliveries.length) / delivered.length * 100)
      : 100;

    // Previous period comparison
    const prevPeriodDays = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30;
    const prevStart = subDays(dateRange.start, prevPeriodDays);
    const prevEnd = subDays(dateRange.end, prevPeriodDays);
    const prevDeliveries = state.deliveries.filter(d => 
      d.createdAt >= prevStart && d.createdAt <= prevEnd && d.status === 'delivered'
    );
    const prevRevenue = prevDeliveries.reduce((sum, d) => sum + (d.price || 0), 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;
    const deliveriesChange = prevDeliveries.length > 0 ? ((delivered.length - prevDeliveries.length) / prevDeliveries.length * 100) : 0;

    return {
      total: filteredDeliveries.length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      active: active.length,
      pending: filteredDeliveries.filter(d => d.status === 'pending').length,
      revenue: totalRevenue,
      commission,
      courierPayment: totalCourierPayment,
      avgPrice: delivered.length > 0 ? totalRevenue / delivered.length : 0,
      successRate: filteredDeliveries.length > 0 ? (delivered.length / filteredDeliveries.length * 100) : 0,
      cancellationRate: filteredDeliveries.length > 0 ? (cancelled.length / filteredDeliveries.length * 100) : 0,
      avgDeliveryTime,
      onTimeRate,
      lateDeliveries: lateDeliveries.length,
      revenueChange,
      deliveriesChange,
    };
  }, [filteredDeliveries, state.deliveries, dateRange, timeRange]);

  // Trends data
  const trendsData = useMemo(() => {
    const days = timeRange === 'today' ? 24 : timeRange === 'week' ? 7 : 30;
    const data: Array<{
      date: string;
      total: number;
      delivered: number;
      cancelled: number;
      revenue: number;
    }> = [];

    if (timeRange === 'today') {
      // Hourly for today
      for (let i = 0; i < 24; i++) {
        const hourDeliveries = filteredDeliveries.filter(d => getHours(d.createdAt) === i);
        const delivered = hourDeliveries.filter(d => d.status === 'delivered');
        data.push({
          date: `${i}:00`,
          total: hourDeliveries.length,
          delivered: delivered.length,
          cancelled: hourDeliveries.filter(d => d.status === 'cancelled').length,
          revenue: delivered.reduce((sum, d) => sum + (d.price || 0), 0),
        });
      }
    } else {
      // Daily
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayDeliveries = filteredDeliveries.filter(d =>
          format(d.createdAt, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        );
        const delivered = dayDeliveries.filter(d => d.status === 'delivered');
        data.push({
          date: format(date, 'dd/MM'),
          total: dayDeliveries.length,
          delivered: delivered.length,
          cancelled: dayDeliveries.filter(d => d.status === 'cancelled').length,
          revenue: delivered.reduce((sum, d) => sum + (d.price || 0), 0),
        });
      }
    }

    return data;
  }, [filteredDeliveries, timeRange]);

  // Courier stats
  const courierStats = useMemo(() => {
    const stats = new Map<string, {
      id: string;
      name: string;
      total: number;
      delivered: number;
      cancelled: number;
      revenue: number;
      avgTime: number;
      onTimeRate: number;
      rating: number;
    }>();

    filteredDeliveries.forEach(d => {
      if (!d.courierId) return;
      
      const courier = state.couriers.find(c => c.id === d.courierId);
      if (!courier) return;

      const existing = stats.get(d.courierId) || {
        id: d.courierId,
        name: courier.name,
        total: 0,
        delivered: 0,
        cancelled: 0,
        revenue: 0,
        avgTime: 0,
        onTimeRate: 0,
        rating: courier.rating,
      };

      existing.total++;
      if (d.status === 'delivered') {
        existing.delivered++;
        existing.revenue += d.price || 0;
        if (d.deliveredAt && d.createdAt) {
          const time = (d.deliveredAt.getTime() - d.createdAt.getTime()) / 1000 / 60;
          existing.avgTime = (existing.avgTime * (existing.delivered - 1) + time) / existing.delivered;
        }
      } else if (d.status === 'cancelled') {
        existing.cancelled++;
      }

      stats.set(d.courierId, existing);
    });

    return Array.from(stats.values()).sort((a, b) => b.delivered - a.delivered).slice(0, 10);
  }, [filteredDeliveries, state.couriers]);

  // Restaurant stats
  const restaurantStats = useMemo(() => {
    const stats = new Map<string, {
      name: string;
      total: number;
      delivered: number;
      cancelled: number;
      revenue: number;
      avgPrice: number;
    }>();

    filteredDeliveries.forEach(d => {
      const existing = stats.get(d.restaurantName) || {
        name: d.restaurantName,
        total: 0,
        delivered: 0,
        cancelled: 0,
        revenue: 0,
        avgPrice: 0,
      };

      existing.total++;
      if (d.status === 'delivered') {
        existing.delivered++;
        existing.revenue += d.price || 0;
        existing.avgPrice = existing.revenue / existing.delivered;
      } else if (d.status === 'cancelled') {
        existing.cancelled++;
      }

      stats.set(d.restaurantName, existing);
    });

    return Array.from(stats.values()).sort((a, b) => b.delivered - a.delivered).slice(0, 10);
  }, [filteredDeliveries]);

  // Area stats
  const areaStats = useMemo(() => {
    const stats = new Map<string, {
      name: string;
      total: number;
      delivered: number;
      cancelled: number;
      revenue: number;
    }>();

    filteredDeliveries.forEach(d => {
      const existing = stats.get(d.area) || {
        name: d.area,
        total: 0,
        delivered: 0,
        cancelled: 0,
        revenue: 0,
      };

      existing.total++;
      if (d.status === 'delivered') {
        existing.delivered++;
        existing.revenue += d.price || 0;
      } else if (d.status === 'cancelled') {
        existing.cancelled++;
      }

      stats.set(d.area, existing);
    });

    return Array.from(stats.values()).sort((a, b) => b.delivered - a.delivered).slice(0, 10);
  }, [filteredDeliveries]);

  // Hourly distribution
  const hourlyDistribution = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      deliveries: 0,
      revenue: 0,
    }));

    filteredDeliveries.forEach(d => {
      const hour = getHours(d.createdAt);
      hours[hour].deliveries++;
      if (d.status === 'delivered') {
        hours[hour].revenue += d.price || 0;
      }
    });

    return hours.filter(h => h.deliveries > 0);
  }, [filteredDeliveries]);

  // Weekday distribution
  const weekdayDistribution = useMemo(() => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const stats = days.map((name, index) => ({
      day: name,
      deliveries: 0,
      revenue: 0,
    }));

    filteredDeliveries.forEach(d => {
      const day = getDay(d.createdAt);
      stats[day].deliveries++;
      if (d.status === 'delivered') {
        stats[day].revenue += d.price || 0;
      }
    });

    return stats;
  }, [filteredDeliveries]);

  // Payment distribution
  const paymentDistribution = useMemo(() => {
    const cash = filteredDeliveries.filter(d => d.is_cash && d.status === 'delivered');
    const credit = filteredDeliveries.filter(d => !d.is_cash && d.status === 'delivered');

    return [
      { name: 'מזומן', value: cash.length, revenue: cash.reduce((s, d) => s + (d.price || 0), 0), color: '#10b981' },
      { name: 'אשראי', value: credit.length, revenue: credit.reduce((s, d) => s + (d.price || 0), 0), color: '#3b82f6' },
    ].filter(item => item.value > 0);
  }, [filteredDeliveries]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    return [
      { name: 'ממתין', value: keyStats.pending, color: '#f97316' },
      { name: 'פעיל', value: keyStats.active, color: '#3b82f6' },
      { name: 'נמסר', value: keyStats.delivered, color: '#16a34a' },
      { name: 'בוטל', value: keyStats.cancelled, color: '#dc2626' },
    ].filter(item => item.value > 0);
  }, [keyStats]);

  // Get unique values for filters
  const uniqueCouriers = useMemo(() => state.couriers, [state.couriers]);
  const uniqueRestaurants = useMemo(() => 
    Array.from(new Set(state.deliveries.map(d => d.restaurantName))).sort(),
    [state.deliveries]
  );
  const uniqueAreas = useMemo(() => 
    Array.from(new Set(state.deliveries.map(d => d.area))).sort(),
    [state.deliveries]
  );

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['סטטיסטיקות משלוחים - דוח מקיף'],
      [''],
      ['טווח תאריכים', `${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`],
      ['תאריך יצירה', format(new Date(), 'dd/MM/yyyy HH:mm')],
      [''],
      ['מדד', 'ערך', 'שינוי מתקופה קודמת'],
      ['סה"כ משלוחים', keyStats.total, `${keyStats.deliveriesChange > 0 ? '+' : ''}${keyStats.deliveriesChange.toFixed(1)}%`],
      ['נמסרו', keyStats.delivered, ''],
      ['בוטלו', keyStats.cancelled, ''],
      ['פעילים', keyStats.active, ''],
      [''],
      ['סה"כ הכנסות', `₪${keyStats.revenue.toLocaleString()}`, `${keyStats.revenueChange > 0 ? '+' : ''}${keyStats.revenueChange.toFixed(1)}%`],
      ['עמלה נטו', `₪${keyStats.commission.toLocaleString()}`, ''],
      ['תשלום שליחים', `₪${keyStats.courierPayment.toLocaleString()}`, ''],
      ['מחיר ממוצע', `₪${keyStats.avgPrice.toFixed(2)}`, ''],
      [''],
      ['אחוז הצלחה', `${keyStats.successRate.toFixed(1)}%`, ''],
      ['אחוז ביטולים', `${keyStats.cancellationRate.toFixed(1)}%`, ''],
      ['אחוז בזמן', `${keyStats.onTimeRate.toFixed(1)}%`, ''],
      ['זמן משלוח ממוצע', `${keyStats.avgDeliveryTime.toFixed(1)} דקות`, ''],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'סיכום');

    // Couriers sheet
    const couriersData = [
      ['סטטיסטיקות שליחים'],
      [''],
      ['שליח', 'סה"כ', 'נמסרו', 'בוטלו', 'הכנסות', 'זמן ממוצע', 'דירוג'],
      ...courierStats.map(c => [
        c.name,
        c.total,
        c.delivered,
        c.cancelled,
        `₪${c.revenue.toLocaleString()}`,
        `${c.avgTime.toFixed(1)} דקות`,
        c.rating.toFixed(1),
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(couriersData);
    XLSX.utils.book_append_sheet(wb, ws2, 'שליחים');

    // Restaurants sheet
    const restaurantsData = [
      ['סטטיסטיקות מסעדות'],
      [''],
      ['מסעדה', 'סה"כ', 'נמסרו', 'בוטלו', 'הכנסות', 'מחיר ממוצע'],
      ...restaurantStats.map(r => [
        r.name,
        r.total,
        r.delivered,
        r.cancelled,
        `₪${r.revenue.toLocaleString()}`,
        `₪${r.avgPrice.toFixed(2)}`,
      ]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(restaurantsData);
    XLSX.utils.book_append_sheet(wb, ws3, 'מסעדות');

    // Areas sheet
    const areasData = [
      ['סטטיסטיקות אזורים'],
      [''],
      ['אזור', 'סה"כ', 'נמסרו', 'בוטלו', 'הכנסות'],
      ...areaStats.map(a => [
        a.name,
        a.total,
        a.delivered,
        a.cancelled,
        `₪${a.revenue.toLocaleString()}`,
      ]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(areasData);
    XLSX.utils.book_append_sheet(wb, ws4, 'אזורים');

    XLSX.writeFile(wb, `statistics_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
  };

  // Active filters count
  const activeFiltersCount = [
    statusFilter !== 'all',
    courierFilter !== 'all',
    restaurantFilter !== 'all',
    areaFilter !== 'all',
    paymentFilter !== 'all',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setStatusFilter('all');
    setCourierFilter('all');
    setRestaurantFilter('all');
    setAreaFilter('all');
    setPaymentFilter('all');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col">
      {/* Top bar */}
      <div className="bg-white dark:bg-[#171717] border-b border-[#e5e5e5] dark:border-[#1f1f1f] px-5 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (window as any).toggleMobileSidebar?.()}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">סטטיסטיקה</span>
        </div>
        <div className="flex items-center gap-2" />
      </div>

      <div className="flex-1 p-3 sm:p-4 md:p-6">
      <div className="max-w-[80rem] mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
                סטטיסטיקות ומדדים
              </h1>
              <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                ניתוח מקיף של ביצועים עם פילוחים ומגמות
              </p>
            </div>
            
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#9fe870] hover:bg-[#8ed65f] text-[#0d0d12] rounded-xl font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              ייצוא לאקסל
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-white dark:bg-[#171717] p-1.5 rounded-xl border border-[#e5e5e5] dark:border-[#262626]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#9fe870] text-[#0d0d12] shadow-sm'
                  : 'text-[#666d80] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline-block ml-2" />
              סקירה מהירה
            </button>
            <button
              onClick={() => setActiveTab('segments')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'segments'
                  ? 'bg-[#9fe870] text-[#0d0d12] shadow-sm'
                  : 'text-[#666d80] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }`}
            >
              <Filter className="w-4 h-4 inline-block ml-2" />
              פילוחים מתקדמים
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'comparison'
                  ? 'bg-[#9fe870] text-[#0d0d12] shadow-sm'
                  : 'text-[#666d80] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline-block ml-2" />
              השוואות
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Time Range */}
              <div className="flex gap-2 bg-[#f5f5f5] dark:bg-[#262626] p-1 rounded-lg">
                {(['today', 'week', 'month', 'custom'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      timeRange === range
                        ? 'bg-white dark:bg-[#404040] text-[#9fe870] shadow-sm'
                        : 'text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
                    }`}
                  >
                    {range === 'today' ? 'היום' : range === 'week' ? 'שבוע' : range === 'month' ? 'חודש' : 'טווח מותאם'}
                  </button>
                ))}
              </div>

              {/* Custom Date Range Inputs */}
              {timeRange === 'custom' && (
                <>
                  <div className="h-6 w-px bg-[#e5e5e5] dark:bg-[#262626]" />
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#737373] dark:text-[#a3a3a3]" />
                    <label className="text-xs text-[#737373] dark:text-[#a3a3a3]">מתאריך:</label>
                    <input
                      type="date"
                      value={format(customStartDate, 'yyyy-MM-dd')}
                      onChange={(e) => setCustomStartDate(new Date(e.target.value))}
                      className="px-2 py-1.5 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#9fe870]/30"
                    />
                    <label className="text-xs text-[#737373] dark:text-[#a3a3a3]">עד תאריך:</label>
                    <input
                      type="date"
                      value={format(customEndDate, 'yyyy-MM-dd')}
                      onChange={(e) => setCustomEndDate(new Date(e.target.value))}
                      className="px-2 py-1.5 bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#9fe870]/30"
                    />
                  </div>
                </>
              )}

              <div className="h-6 w-px bg-[#e5e5e5] dark:bg-[#262626]" />

              {/* Status Filter */}
              <div ref={statusRef} className="relative">
                <button
                  onClick={() => setStatusOpen(!statusOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    statusFilter !== 'all'
                      ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/5 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/40 dark:border-[#9fe870]/30'
                      : 'bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#9fe870] hover:shadow-md'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span>{statusFilter === 'all' ? 'כל הסטטוסים' : statusFilter === 'delivered' ? 'נמסרו' : statusFilter === 'cancelled' ? 'בוטלו' : 'פעילים'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
                </button>

                {statusOpen && (
                  <div className="absolute top-full mt-1 right-0 z-50 w-[200px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-2 space-y-1">
                      {[
                        { value: 'all' as const, label: 'כל הסטטוסים', icon: Activity, color: 'text-[#737373] dark:text-[#a3a3a3]' },
                        { value: 'delivered' as const, label: 'נמסרו', icon: CheckCircle2, color: 'text-green-500' },
                        { value: 'active' as const, label: 'פעילים', icon: Zap, color: 'text-blue-500' },
                        { value: 'cancelled' as const, label: 'בוטלו', icon: XCircle, color: 'text-red-500' },
                      ].map(({ value, label, icon: Icon, color }) => (
                        <button
                          key={value}
                          onClick={() => { setStatusFilter(value); setStatusOpen(false); }}
                          className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                            statusFilter === value
                              ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                              : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${color} shrink-0`} />
                          <span className="flex-1">{label}</span>
                          {statusFilter === value && <CheckCircle2 className="w-3.5 h-3.5 text-[#9fe870] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Courier Filter */}
              <div ref={courierRef} className="relative">
                <button
                  onClick={() => setCourierOpen(!courierOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    courierFilter !== 'all'
                      ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/5 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/40 dark:border-[#9fe870]/30'
                      : 'bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#9fe870] hover:shadow-md'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5 shrink-0" />
                  <span>{courierFilter === 'all' ? 'כל השליחים' : uniqueCouriers.find(c => c.id === courierFilter)?.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${courierOpen ? 'rotate-180' : ''}`} />
                </button>

                {courierOpen && (
                  <div className="absolute top-full mt-1 right-0 z-50 w-[200px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => { setCourierFilter('all'); setCourierOpen(false); }}
                        className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                          courierFilter === 'all'
                            ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                            : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                        }`}
                      >
                        <Bike className="w-4 h-4 text-[#737373] dark:text-[#a3a3a3] shrink-0" />
                        <span className="flex-1">כל השליחים</span>
                        {courierFilter === 'all' && <CheckCircle2 className="w-3.5 h-3.5 text-[#9fe870] shrink-0" />}
                      </button>
                      {uniqueCouriers.map(courier => (
                        <button
                          key={courier.id}
                          onClick={() => { setCourierFilter(courier.id); setCourierOpen(false); }}
                          className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                            courierFilter === courier.id
                              ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                              : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                          }`}
                        >
                          <Bike className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="flex-1">{courier.name}</span>
                          {courierFilter === courier.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#9fe870] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Restaurant Filter */}
              <div ref={restaurantRef} className="relative">
                <button
                  onClick={() => setRestaurantOpen(!restaurantOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    restaurantFilter !== 'all'
                      ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/5 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/40 dark:border-[#9fe870]/30'
                      : 'bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#9fe870] hover:shadow-md'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 shrink-0" />
                  <span>{restaurantFilter === 'all' ? 'כל המסעדות' : restaurantFilter}</span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${restaurantOpen ? 'rotate-180' : ''}`} />
                </button>

                {restaurantOpen && (
                  <div className="absolute top-full mt-1 right-0 z-50 w-[220px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => { setRestaurantFilter('all'); setRestaurantOpen(false); }}
                        className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                          restaurantFilter === 'all'
                            ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                            : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                        }`}
                      >
                        <Store className="w-4 h-4 text-[#737373] dark:text-[#a3a3a3] shrink-0" />
                        <span className="flex-1">כל המסעדות</span>
                        {restaurantFilter === 'all' && <CheckCircle2 className="w-3.5 h-3.5 text-[#9fe870] shrink-0" />}
                      </button>
                      {uniqueRestaurants.map(restaurant => (
                        <button
                          key={restaurant}
                          onClick={() => { setRestaurantFilter(restaurant); setRestaurantOpen(false); }}
                          className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                            restaurantFilter === restaurant
                              ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                              : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                          }`}
                        >
                          <Store className="w-4 h-4 text-orange-500 shrink-0" />
                          <span className="flex-1 truncate">{restaurant}</span>
                          {restaurantFilter === restaurant && <CheckCircle2 className="w-3.5 h-3.5 text-[#9fe870] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Area Filter */}
              <div ref={areaRef} className="relative">
                <button
                  onClick={() => setAreaOpen(!areaOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    areaFilter !== 'all'
                      ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/5 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/40 dark:border-[#9fe870]/30'
                      : 'bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#9fe870] hover:shadow-md'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{areaFilter === 'all' ? 'כל האזורים' : areaFilter}</span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${areaOpen ? 'rotate-180' : ''}`} />
                </button>

                {areaOpen && (
                  <div className="absolute top-full mt-1 right-0 z-50 w-[200px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => { setAreaFilter('all'); setAreaOpen(false); }}
                        className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                          areaFilter === 'all'
                            ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                            : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                        }`}
                      >
                        <MapPin className="w-4 h-4 text-[#737373] dark:text-[#a3a3a3] shrink-0" />
                        <span className="flex-1">כל האזורים</span>
                        {areaFilter === 'all' && <CheckCircle2 className="w-3.5 h-3.5 text-[#9fe870] shrink-0" />}
                      </button>
                      {uniqueAreas.map(area => (
                        <button
                          key={area}
                          onClick={() => { setAreaFilter(area); setAreaOpen(false); }}
                          className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                            areaFilter === area
                              ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                              : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                          }`}
                        >
                          <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                          <span className="flex-1">{area}</span>
                          {areaFilter === area && <CheckCircle2 className="w-3.5 h-3.5 text-[#9fe870] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Filter */}
              <div ref={paymentRef} className="relative">
                <button
                  onClick={() => setPaymentOpen(!paymentOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    paymentFilter !== 'all'
                      ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/5 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/40 dark:border-[#9fe870]/30'
                      : 'bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#9fe870] hover:shadow-md'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                  <span>{paymentFilter === 'all' ? 'כל התשלומים' : paymentFilter === 'cash' ? 'מזומן' : 'אשראי'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${paymentOpen ? 'rotate-180' : ''}`} />
                </button>

                {paymentOpen && (
                  <div className="absolute top-full mt-1 right-0 z-50 w-[180px] bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-2 space-y-1">
                      {[
                        { value: 'all' as const, label: 'כל התשלומים', color: 'text-[#737373] dark:text-[#a3a3a3]' },
                        { value: 'cash' as const, label: 'מזומן', color: 'text-green-500' },
                        { value: 'credit' as const, label: 'אשראי', color: 'text-blue-500' },
                      ].map(({ value, label, color }) => (
                        <button
                          key={value}
                          onClick={() => { setPaymentFilter(value); setPaymentOpen(false); }}
                          className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                            paymentFilter === value
                              ? 'bg-[#9fe870]/20 dark:bg-[#9fe870]/20 text-[#0d0d12] dark:text-[#fafafa] border border-[#9fe870]/50'
                              : 'hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa]'
                          }`}
                        >
                          <CreditCard className={`w-4 h-4 ${color} shrink-0`} />
                          <span className="flex-1">{label}</span>
                          {paymentFilter === value && <CheckCircle2 className="w-3.5 h-3.5 text-[#9fe870] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reset Filters */}
              {activeFiltersCount > 0 && (
                <>
                  <div className="h-6 w-px bg-[#e5e5e5] dark:bg-[#262626]" />
                  <button
                    onClick={resetFilters}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    איפוס ({activeFiltersCount})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              {keyStats.deliveriesChange !== 0 && (
                <div className={`flex items-center gap-1 text-xs font-medium ${keyStats.deliveriesChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {keyStats.deliveriesChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(keyStats.deliveriesChange).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
              {keyStats.total}
            </div>
            <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
              סה"כ משלוחים
            </div>
          </div>

          <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                {keyStats.successRate.toFixed(1)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
              {keyStats.delivered}
            </div>
            <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
              נמסרו בהצלחה
            </div>
          </div>

          <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              {keyStats.revenueChange !== 0 && (
                <div className={`flex items-center gap-1 text-xs font-medium ${keyStats.revenueChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {keyStats.revenueChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(keyStats.revenueChange).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
              ₪{keyStats.revenue.toLocaleString()}
            </div>
            <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
              סה"כ הכנסות
            </div>
          </div>

          <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
              ₪{keyStats.commission.toLocaleString()}
            </div>
            <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
              עמלה נטו
            </div>
          </div>

          <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                {keyStats.onTimeRate.toFixed(0)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
              {keyStats.avgDeliveryTime.toFixed(0)}'
            </div>
            <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
              זמן ממוצע
            </div>
          </div>

          <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                {keyStats.cancellationRate.toFixed(1)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
              {keyStats.cancelled}
            </div>
            <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
              בוטלו
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Trends */}
              <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4 sm:p-6">
                <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#9fe870]" />
                  מגמות משלוחים והכנסות
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" className="dark:stroke-[#262626]" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#666d80" 
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis yAxisId="left" stroke="#666d80" style={{ fontSize: '12px' }} />
                    <YAxis yAxisId="right" orientation="left" stroke="#666d80" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#171717', 
                        border: '1px solid #262626',
                        borderRadius: '8px',
                        color: '#fafafa'
                      }}
                    />
                    <Legend />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="revenue" 
                      fill="#9fe870" 
                      stroke="#9fe870"
                      fillOpacity={0.2}
                      name="הכנסות (₪)"
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="delivered" 
                      stroke="#16a34a" 
                      strokeWidth={2}
                      dot={{ fill: '#16a34a' }}
                      name="נמסרו"
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="cancelled" 
                      stroke="#dc2626" 
                      strokeWidth={2}
                      dot={{ fill: '#dc2626' }}
                      name="בוטלו"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Status & Payment Distribution */}
              <div className="grid grid-rows-2 gap-4">
                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4">
                  <h3 className="text-base font-bold text-[#0d0d12] dark:text-[#fafafa] mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#666d80]" />
                    פילוח סטטוסים
                  </h3>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`status-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#171717', 
                          border: '1px solid #262626',
                          borderRadius: '8px',
                          color: '#fafafa'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4">
                  <h3 className="text-base font-bold text-[#0d0d12] dark:text-[#fafafa] mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#666d80]" />
                    פילוח תשלומים
                  </h3>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={paymentDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {paymentDistribution.map((entry, index) => (
                          <Cell key={`payment-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#171717', 
                          border: '1px solid #262626',
                          borderRadius: '8px',
                          color: '#fafafa'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Top Couriers */}
              <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4 sm:p-6">
                <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4 flex items-center gap-2">
                  <Bike className="w-5 h-5 text-[#666d80] dark:text-[#a3a3a3]" />
                  שליחים מובילים
                </h3>
                <div className="space-y-3">
                  {courierStats.slice(0, 5).map((courier, index) => (
                    <div 
                      key={courier.id}
                      className="flex items-center justify-between p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#171717] transition-colors cursor-pointer"
                      onClick={() => setCourierFilter(courier.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#9fe870]/10 flex items-center justify-center text-sm font-bold text-[#16a34a] dark:text-[#22c55e]">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-[#0d0d12] dark:text-[#fafafa] text-sm">
                            {courier.name}
                          </div>
                          <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                            {courier.delivered} משלוחים
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#16a34a] dark:text-[#22c55e] text-sm">
                          ₪{courier.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Restaurants */}
              <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4 sm:p-6">
                <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4 flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#666d80] dark:text-[#a3a3a3]" />
                  מסעדות מובילות
                </h3>
                <div className="space-y-3">
                  {restaurantStats.slice(0, 5).map((restaurant, index) => (
                    <div 
                      key={restaurant.name}
                      className="flex items-center justify-between p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#171717] transition-colors cursor-pointer"
                      onClick={() => setRestaurantFilter(restaurant.name)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-sm font-bold text-orange-500">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-[#0d0d12] dark:text-[#fafafa] text-sm">
                            {restaurant.name}
                          </div>
                          <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                            {restaurant.delivered} משלוחים
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-500 text-sm">
                          ₪{restaurant.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Areas */}
              <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4 sm:p-6">
                <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#666d80] dark:text-[#a3a3a3]" />
                  אזורים פופולריים
                </h3>
                <div className="space-y-3">
                  {areaStats.slice(0, 5).map((area, index) => (
                    <div 
                      key={area.name}
                      className="flex items-center justify-between p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#171717] transition-colors cursor-pointer"
                      onClick={() => setAreaFilter(area.name)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-sm font-bold text-purple-500">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-[#0d0d12] dark:text-[#fafafa] text-sm">
                            {area.name}
                          </div>
                          <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                            {area.delivered} משלוחים
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-500 text-sm">
                          ₪{area.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'segments' && (
          <>
            {/* Segment Selector */}
            <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'courier' as const, label: 'שליחים', icon: Bike },
                  { value: 'restaurant' as const, label: 'מסעדות', icon: Store },
                  { value: 'area' as const, label: 'אזורים', icon: MapPin },
                  { value: 'hour' as const, label: 'שעות', icon: Clock },
                  { value: 'day' as const, label: 'ימים', icon: Calendar },
                  { value: 'payment' as const, label: 'תשלומים', icon: CreditCard },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedSegment(value)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedSegment === value
                        ? 'bg-[#9fe870] text-[#0d0d12] shadow-md'
                        : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#666d80] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Segment Content */}
            {selectedSegment === 'courier' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
                  <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
                    ביצועים לפי שליח
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={courierStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis type="number" stroke="#666d80" style={{ fontSize: '12px' }} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#666d80" 
                        style={{ fontSize: '11px' }}
                        width={100}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#171717', 
                          border: '1px solid #262626',
                          borderRadius: '8px',
                          color: '#fafafa'
                        }}
                      />
                      <Bar dataKey="delivered" fill="#3b82f6" radius={[0, 8, 8, 0]} name="נמסרו" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
                  <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
                    טבלת שליחים מפורטת
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e5e5e5] dark:border-[#262626]">
                          <th className="text-right py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">שליח</th>
                          <th className="text-center py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">נמסרו</th>
                          <th className="text-center py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">הכנסות</th>
                          <th className="text-center py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">דירוג</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courierStats.map((courier) => (
                          <tr key={courier.id} className="border-b border-[#e5e5e5] dark:border-[#262626] hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors">
                            <td className="py-3 px-2 text-[#0d0d12] dark:text-[#fafafa]">{courier.name}</td>
                            <td className="py-3 px-2 text-center text-[#666d80] dark:text-[#a3a3a3]">{courier.delivered}</td>
                            <td className="py-3 px-2 text-center font-medium text-green-600 dark:text-green-400">₪{courier.revenue.toLocaleString()}</td>
                            <td className="py-3 px-2 text-center">
                              <span className="inline-flex items-center gap-1 text-amber-500">
                                ★ {courier.rating.toFixed(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {selectedSegment === 'restaurant' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
                  <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
                    הכנסות לפי מסעדה
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={restaurantStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#666d80" 
                        style={{ fontSize: '10px' }}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis stroke="#666d80" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#171717', 
                          border: '1px solid #262626',
                          borderRadius: '8px',
                          color: '#fafafa'
                        }}
                      />
                      <Bar dataKey="revenue" fill="#f97316" radius={[8, 8, 0, 0]} name="הכנסות (₪)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
                  <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
                    טבלת מסעדות מפורטת
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e5e5e5] dark:border-[#262626]">
                          <th className="text-right py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">מסעדה</th>
                          <th className="text-center py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">משלוחים</th>
                          <th className="text-center py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">הכנסות</th>
                          <th className="text-center py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">ממוצע</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restaurantStats.map((restaurant) => (
                          <tr key={restaurant.name} className="border-b border-[#e5e5e5] dark:border-[#262626] hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors">
                            <td className="py-3 px-2 text-[#0d0d12] dark:text-[#fafafa]">{restaurant.name}</td>
                            <td className="py-3 px-2 text-center text-[#666d80] dark:text-[#a3a3a3]">{restaurant.delivered}</td>
                            <td className="py-3 px-2 text-center font-medium text-orange-600 dark:text-orange-400">₪{restaurant.revenue.toLocaleString()}</td>
                            <td className="py-3 px-2 text-center text-[#666d80] dark:text-[#a3a3a3]">₪{restaurant.avgPrice.toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {selectedSegment === 'area' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
                  <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
                    משלוחים לפי אזור
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={areaStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis type="number" stroke="#666d80" style={{ fontSize: '12px' }} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#666d80" 
                        style={{ fontSize: '12px' }}
                        width={80}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#171717', 
                          border: '1px solid #262626',
                          borderRadius: '8px',
                          color: '#fafafa'
                        }}
                      />
                      <Bar dataKey="delivered" fill="#a855f7" radius={[0, 8, 8, 0]} name="משלוחים" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
                  <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
                    טבלת אזורים מפורטת
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e5e5e5] dark:border-[#262626]">
                          <th className="text-right py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">אזור</th>
                          <th className="text-center py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">נמסרו</th>
                          <th className="text-center py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">בוטלו</th>
                          <th className="text-center py-3 px-2 font-bold text-[#0d0d12] dark:text-[#fafafa]">הכנסות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {areaStats.map((area) => (
                          <tr key={area.name} className="border-b border-[#e5e5e5] dark:border-[#262626] hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors">
                            <td className="py-3 px-2 text-[#0d0d12] dark:text-[#fafafa]">{area.name}</td>
                            <td className="py-3 px-2 text-center text-green-600 dark:text-green-400">{area.delivered}</td>
                            <td className="py-3 px-2 text-center text-red-600 dark:text-red-400">{area.cancelled}</td>
                            <td className="py-3 px-2 text-center font-medium text-purple-600 dark:text-purple-400">₪{area.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {selectedSegment === 'hour' && (
              <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
                <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
                  פילוח לפי שעות ביום
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#666d80" 
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke="#666d80" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#171717', 
                        border: '1px solid #262626',
                        borderRadius: '8px',
                        color: '#fafafa'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="deliveries" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      name="משלוחים"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {selectedSegment === 'day' && (
              <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
                <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
                  פילוח לפי ימים בשבוע
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={weekdayDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#666d80" 
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke="#666d80" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#171717', 
                        border: '1px solid #262626',
                        borderRadius: '8px',
                        color: '#fafafa'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="deliveries" fill="#9fe870" radius={[8, 8, 0, 0]} name="משלוחים" />
                    <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} name="הכנסות (₪)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {selectedSegment === 'payment' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
                  <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
                    פילוח אמצעי תשלום
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={paymentDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#171717', 
                          border: '1px solid #262626',
                          borderRadius: '8px',
                          color: '#fafafa'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
                  <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
                    פירוט תשלומים
                  </h3>
                  <div className="space-y-4">
                    {paymentDistribution.map((payment) => (
                      <div key={payment.name} className="p-4 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${payment.color}20` }}>
                              <CreditCard className="w-5 h-5" style={{ color: payment.color }} />
                            </div>
                            <span className="font-bold text-[#0d0d12] dark:text-[#fafafa]">{payment.name}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <div className="text-xs text-[#666d80] dark:text-[#a3a3a3] mb-1">משלוחים</div>
                            <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">{payment.value}</div>
                          </div>
                          <div>
                            <div className="text-xs text-[#666d80] dark:text-[#a3a3a3] mb-1">הכנסות</div>
                            <div className="text-2xl font-bold" style={{ color: payment.color }}>
                              ₪{payment.revenue.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'comparison' && (
          <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
            <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
              השוואת ביצועים - בפיתוח
            </h3>
            <p className="text-[#666d80] dark:text-[#a3a3a3]">
              תכונה זו תאפשר להשוות בין תקופות זמן שונות, שליחים, מסעדות ואזורים.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
