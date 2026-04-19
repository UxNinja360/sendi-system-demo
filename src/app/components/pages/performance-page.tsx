import React from 'react';
import { useDelivery } from '../../context/delivery.context';
import { Menu, TrendingUp, Wallet, BarChart3, Calendar, Store, Clock, Activity } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { getWorkedMinutesWithinRange, formatWorkedDuration } from '../../utils/shift-work';
import { PeriodToolbar, PeriodMode } from '../ui/period-toolbar';

type AnalyticsView = 'overview' | 'couriers' | 'restaurants' | 'profitability';

const MONEY = (n: number) => `₪${n.toLocaleString('he-IL')}`;

const buildShiftBounds = (dateKey: string, startTime: string, endTime: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const start = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
  const end = new Date(year, month - 1, day, endHour, endMinute, 0, 0);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
};

export const PerformancePage: React.FC = () => {
  const { state } = useDelivery();
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>('current_month');
  const [monthAnchor, setMonthAnchor] = React.useState(new Date());
  const [customStartDate, setCustomStartDate] = React.useState(formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = React.useState(formatDate(new Date(), 'yyyy-MM-dd'));
  const [analyticsView, setAnalyticsView] = React.useState<AnalyticsView>('overview');

  const dateRange = React.useMemo(() => {
    if (periodMode === 'custom_range') {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    const anchor = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    return {
      start: new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0),
      end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }, [customEndDate, customStartDate, monthAnchor, periodMode]);

  const deliveriesInRange = React.useMemo(() => {
    return state.deliveries.filter((delivery) => {
      const createdAt = new Date(delivery.createdAt);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });
  }, [dateRange.end, dateRange.start, state.deliveries]);

  const courierReports = React.useMemo(() => {
    return state.couriers.map((courier) => {
      const deliveries = deliveriesInRange.filter((delivery) =>
        delivery.courierId === courier.id ||
        delivery.runner_id === courier.id ||
        delivery.courierName === courier.name
      );
      const assignments = state.shifts.flatMap((shift) => {
        const relevant = shift.courierAssignments.filter((assignment) => assignment.courierId === courier.id);
        if (relevant.length === 0) return [];
        const { start, end } = buildShiftBounds(shift.date, shift.startTime, shift.endTime);
        if (end < dateRange.start || start > dateRange.end) return [];
        return relevant.map((assignment) => ({ shift, assignment }));
      });
      const workedMinutes = assignments.reduce(
        (sum, item) => sum + getWorkedMinutesWithinRange(item.assignment, dateRange.start, dateRange.end),
        0,
      );
      return {
        courier,
        deliveries,
        assignments,
        workedMinutes,
        deliveredCount: deliveries.filter((d) => d.status === 'delivered').length,
        cancelledCount: deliveries.filter((d) => d.status === 'cancelled').length,
        revenue: deliveries.reduce((sum, d) => sum + (d.price || 0), 0),
      };
    }).filter((report) => report.deliveries.length > 0 || report.assignments.length > 0);
  }, [dateRange.end, dateRange.start, deliveriesInRange, state.couriers, state.shifts]);

  const restaurantReports = React.useMemo(() => {
    return state.restaurants.map((restaurant) => {
      const deliveries = deliveriesInRange.filter((delivery) =>
        delivery.restaurantId === restaurant.id ||
        delivery.rest_id === restaurant.id ||
        delivery.restaurantName === restaurant.name ||
        delivery.rest_name === restaurant.name
      );
      return {
        restaurant,
        deliveries,
        deliveredCount: deliveries.filter((d) => d.status === 'delivered').length,
        cancelledCount: deliveries.filter((d) => d.status === 'cancelled').length,
        revenue: deliveries.reduce((sum, d) => sum + (d.price || 0), 0),
        commission: deliveries.reduce((sum, d) => sum + (d.commissionAmount || 0), 0),
      };
    }).filter((report) => report.deliveries.length > 0);
  }, [deliveriesInRange, state.restaurants]);

  const deliveredInRange = React.useMemo(
    () => deliveriesInRange.filter((delivery) => delivery.status === 'delivered'),
    [deliveriesInRange]
  );
  const cancelledInRange = React.useMemo(
    () => deliveriesInRange.filter((delivery) => delivery.status === 'cancelled'),
    [deliveriesInRange]
  );
  const totalRevenue = React.useMemo(
    () => deliveredInRange.reduce((sum, delivery) => sum + (delivery.price || 0), 0),
    [deliveredInRange]
  );
  const totalCourierPay = React.useMemo(
    () => deliveredInRange.reduce((sum, delivery) => sum + (delivery.runner_price ?? delivery.courierPayment ?? 0), 0),
    [deliveredInRange]
  );
  const totalCommission = React.useMemo(
    () => deliveredInRange.reduce((sum, delivery) => sum + (delivery.commissionAmount || 0), 0),
    [deliveredInRange]
  );
  const grossProfit = totalRevenue - totalCourierPay;
  const avgOrderValue = deliveredInRange.length > 0 ? totalRevenue / deliveredInRange.length : 0;
  const daysCovered = React.useMemo(() => {
    const diff = dateRange.end.getTime() - dateRange.start.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [dateRange.end, dateRange.start]);

  const hoursInRange = daysCovered * 24;
  const ordersPerHour = hoursInRange > 0 ? deliveriesInRange.length / hoursInRange : 0;

  const openStatuses = ['pending', 'assigned', 'delivering'];

  const restaurantLiveStats = React.useMemo(() => {
    return state.restaurants.reduce<Record<string, number>>((acc, restaurant) => {
      acc[restaurant.id] = state.deliveries.filter(
        (d) =>
          openStatuses.includes(d.status) &&
          (d.restaurantId === restaurant.id ||
            d.rest_id === restaurant.id ||
            d.restaurantName === restaurant.name ||
            d.rest_name === restaurant.name)
      ).length;
      return acc;
    }, {});
  }, [state.deliveries, state.restaurants]);

  const restaurantTableData = React.useMemo(() => {
    return restaurantReports
      .map((report) => ({
        ...report,
        openNow: restaurantLiveStats[report.restaurant.id] ?? 0,
        perHour: hoursInRange > 0 ? report.deliveries.length / hoursInRange : 0,
      }))
      .sort((a, b) => b.deliveries.length - a.deliveries.length);
  }, [restaurantReports, restaurantLiveStats, hoursInRange]);

  const topCouriers = React.useMemo(
    () => [...courierReports].sort((a, b) => b.deliveredCount - a.deliveredCount || b.revenue - a.revenue).slice(0, 5),
    [courierReports]
  );
  const topRestaurants = React.useMemo(
    () => [...restaurantReports].sort((a, b) => b.revenue - a.revenue || b.deliveredCount - a.deliveredCount).slice(0, 5),
    [restaurantReports]
  );
  const weakestRestaurants = React.useMemo(
    () => [...restaurantReports].sort((a, b) => b.cancelledCount - a.cancelledCount || a.deliveredCount - b.deliveredCount).slice(0, 5),
    [restaurantReports]
  );

  const kpiCards = [
    {
      title: 'הכנסות שנמסרו',
      value: MONEY(totalRevenue),
      note: `${deliveredInRange.length} משלוחים נמסרו`,
      icon: Wallet,
      tint: 'bg-[#ecfccb] text-[#365314]',
    },
    {
      title: 'רווח גולמי',
      value: MONEY(grossProfit),
      note: `עמלות ${MONEY(totalCommission)} • שליחים ${MONEY(totalCourierPay)}`,
      icon: TrendingUp,
      tint: 'bg-[#dbeafe] text-[#1d4ed8]',
    },
    {
      title: 'אחוז הצלחה',
      value: `${deliveriesInRange.length ? Math.round((deliveredInRange.length / deliveriesInRange.length) * 100) : 0}%`,
      note: `${cancelledInRange.length} משלוחים בוטלו`,
      icon: BarChart3,
      tint: 'bg-[#fef3c7] text-[#92400e]',
    },
    {
      title: 'הזמנות לשעה',
      value: ordersPerHour.toFixed(2),
      note: `${(deliveredInRange.length / daysCovered).toFixed(1)} ממוצע ליום • ${daysCovered} ימים`,
      icon: Clock,
      tint: 'bg-[#ede9fe] text-[#6d28d9]',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] flex flex-col">
      <div className="bg-white dark:bg-[#171717] border-b border-[#e5e5e5] dark:border-[#1f1f1f] px-5 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (window as any).toggleMobileSidebar?.()}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">ביצועים</span>
        </div>
        <div className="flex items-center gap-2" />
      </div>

      <PeriodToolbar
        periodMode={periodMode}
        setPeriodMode={setPeriodMode}
        monthAnchor={monthAnchor}
        setMonthAnchor={setMonthAnchor}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />
      <div className="shrink-0 px-4 py-1 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
        <span className="text-xs text-[#a3a3a3] dark:text-[#737373]">
          {deliveriesInRange.length} משלוחים • {courierReports.length} שליחים • {restaurantReports.length} מסעדות
        </span>
      </div>

      <div className="flex flex-col items-center">
      <div className="w-full max-w-[90rem] px-5 py-5">

        <section className="mt-5 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  ['overview', 'סקירה'],
                  ['couriers', 'שליחים'],
                  ['restaurants', 'מסעדות'],
                  ['profitability', 'רווחיות'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setAnalyticsView(id as AnalyticsView)}
                    className={`h-9 px-3 text-sm rounded-[4px] border transition-colors ${
                      analyticsView === id
                        ? 'bg-[#0d0d12] dark:bg-[#fafafa] border-[#0d0d12] dark:border-[#fafafa] text-white dark:text-[#0d0d12]'
                        : 'bg-[#fafafa] dark:bg-[#111111] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {kpiCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-[#666d80] dark:text-[#a3a3a3]">{card.title}</div>
                        <div className="mt-2 text-2xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{card.value}</div>
                      </div>
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${card.tint}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-[#737373] dark:text-[#a3a3a3]">{card.note}</div>
                  </div>
                );
              })}
            </div>

            {analyticsView === 'overview' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 rounded-xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden">
                  <div className="px-4 py-3 bg-[#fafafa] dark:bg-[#111111] border-b border-[#e5e5e5] dark:border-[#262626]">
                    <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">מסעדות מובילות לפי הכנסות</div>
                  </div>
                  <div className="divide-y divide-[#e5e5e5] dark:divide-[#262626]">
                    {topRestaurants.length === 0 ? (
                      <div className="px-4 py-8 text-sm text-[#737373] dark:text-[#a3a3a3]">אין נתונים להצגה בטווח שנבחר.</div>
                    ) : topRestaurants.map((report, index) => (
                      <div key={report.restaurant.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{index + 1}. {report.restaurant.name}</div>
                          <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">{report.deliveredCount} נמסרו • {report.cancelledCount} בוטלו</div>
                        </div>
                        <div className="text-sm font-semibold text-[#166534] dark:text-[#4ade80]">{MONEY(report.revenue)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] p-4 bg-[#fafafa] dark:bg-[#111111]">
                  <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">תקציר מהיר</div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#737373] dark:text-[#a3a3a3]">ממוצע להזמנה</span>
                      <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{MONEY(avgOrderValue)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#737373] dark:text-[#a3a3a3]">עמלות שנצברו</span>
                      <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{MONEY(totalCommission)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#737373] dark:text-[#a3a3a3]">תשלום שליחים</span>
                      <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{MONEY(totalCourierPay)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#737373] dark:text-[#a3a3a3]">ימי פעילות בטווח</span>
                      <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{daysCovered}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analyticsView === 'couriers' && (
              <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden">
                <div className="px-4 py-3 bg-[#fafafa] dark:bg-[#111111] border-b border-[#e5e5e5] dark:border-[#262626]">
                  <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">שליחים מובילים</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#fafafa] dark:bg-[#0f0f0f]">
                      <tr className="text-right text-[#666d80] dark:text-[#a3a3a3]">
                        <th className="px-4 py-3 font-medium">שליח</th>
                        <th className="px-4 py-3 font-medium">משמרות</th>
                        <th className="px-4 py-3 font-medium">שעות עבודה</th>
                        <th className="px-4 py-3 font-medium">נמסרו</th>
                        <th className="px-4 py-3 font-medium">בוטלו</th>
                        <th className="px-4 py-3 font-medium">הכנסות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#262626]">
                      {topCouriers.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-[#737373] dark:text-[#a3a3a3]">אין נתוני שליחים להצגה.</td></tr>
                      ) : topCouriers.map((report) => (
                        <tr key={report.courier.id}>
                          <td className="px-4 py-3 font-medium text-[#0d0d12] dark:text-[#fafafa]">{report.courier.name}</td>
                          <td className="px-4 py-3">{report.assignments.length}</td>
                          <td className="px-4 py-3">{formatWorkedDuration(report.workedMinutes)}</td>
                          <td className="px-4 py-3 text-[#166534] dark:text-[#4ade80] font-medium">{report.deliveredCount}</td>
                          <td className="px-4 py-3 text-[#dc2626] dark:text-[#f87171] font-medium">{report.cancelledCount}</td>
                          <td className="px-4 py-3 font-semibold">{MONEY(report.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {analyticsView === 'restaurants' && (
              <div className="flex flex-col gap-4">
                {/* Summary strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'סה״כ הזמנות', value: deliveriesInRange.length, icon: Activity, color: 'text-[#6d28d9]', bg: 'bg-[#ede9fe]' },
                    { label: 'הזמנות לשעה', value: ordersPerHour.toFixed(2), icon: Clock, color: 'text-[#0891b2]', bg: 'bg-[#e0f9ff]' },
                    { label: 'מסעדות פעילות', value: restaurantReports.length, icon: Store, color: 'text-[#d97706]', bg: 'bg-[#fef3c7]' },
                    { label: 'פתוחות עכשיו', value: Object.values(restaurantLiveStats).reduce((s, n) => s + n, 0), icon: Activity, color: 'text-[#dc2626]', bg: 'bg-[#fee2e2]' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111] p-4 flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${item.bg} dark:bg-opacity-20`}>
                          <Icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <div>
                          <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">{item.label}</div>
                          <div className="text-lg font-semibold text-[#0d0d12] dark:text-[#fafafa]">{item.value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Full restaurant table */}
                <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden">
                  <div className="px-4 py-3 bg-[#fafafa] dark:bg-[#111111] border-b border-[#e5e5e5] dark:border-[#262626] flex items-center justify-between">
                    <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">פירוט מסעדות</div>
                    <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">ממוין לפי סה״כ הזמנות</div>
                  </div>
                  <div className="overflow-x-auto">
                    {restaurantTableData.length === 0 ? (
                      <div className="px-4 py-10 text-sm text-center text-[#737373] dark:text-[#a3a3a3]">אין נתוני מסעדות בתקופה שנבחרה.</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-[#fafafa] dark:bg-[#0f0f0f] border-b border-[#e5e5e5] dark:border-[#262626]">
                          <tr className="text-right text-xs text-[#666d80] dark:text-[#a3a3a3]">
                            <th className="px-4 py-3 font-medium">מסעדה</th>
                            <th className="px-4 py-3 font-medium text-center">סה״כ</th>
                            <th className="px-4 py-3 font-medium text-center">נמסרו</th>
                            <th className="px-4 py-3 font-medium text-center">בוטלו</th>
                            <th className="px-4 py-3 font-medium text-center">לשעה</th>
                            <th className="px-4 py-3 font-medium text-center">פתוחות עכשיו</th>
                            <th className="px-4 py-3 font-medium text-left">הכנסות</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#262626]">
                          {restaurantTableData.map((report) => {
                            const successRate = report.deliveries.length > 0
                              ? Math.round((report.deliveredCount / report.deliveries.length) * 100)
                              : 0;
                            return (
                              <tr key={report.restaurant.id} className="hover:bg-[#fafafa] dark:hover:bg-[#111111] transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-[#0d0d12] dark:text-[#fafafa]">{report.restaurant.name}</div>
                                  <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">{successRate}% הצלחה</div>
                                </td>
                                <td className="px-4 py-3 text-center font-semibold text-[#0d0d12] dark:text-[#fafafa]">{report.deliveries.length}</td>
                                <td className="px-4 py-3 text-center font-medium text-[#166534] dark:text-[#4ade80]">{report.deliveredCount}</td>
                                <td className="px-4 py-3 text-center font-medium text-[#dc2626] dark:text-[#f87171]">{report.cancelledCount}</td>
                                <td className="px-4 py-3 text-center text-[#737373] dark:text-[#a3a3a3]">{report.perHour.toFixed(2)}</td>
                                <td className="px-4 py-3 text-center">
                                  {report.openNow > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#fee2e2] dark:bg-[#3a1414] text-[#dc2626] dark:text-[#f87171]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
                                      {report.openNow}
                                    </span>
                                  ) : (
                                    <span className="text-[#d4d4d4] dark:text-[#404040]">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-left font-semibold text-[#166534] dark:text-[#4ade80]">{MONEY(report.revenue)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-[#fafafa] dark:bg-[#111111] border-t border-[#e5e5e5] dark:border-[#262626]">
                          <tr className="text-xs font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                            <td className="px-4 py-3 text-[#737373] dark:text-[#a3a3a3]">סה״כ</td>
                            <td className="px-4 py-3 text-center">{deliveriesInRange.length}</td>
                            <td className="px-4 py-3 text-center text-[#166534] dark:text-[#4ade80]">{deliveredInRange.length}</td>
                            <td className="px-4 py-3 text-center text-[#dc2626] dark:text-[#f87171]">{cancelledInRange.length}</td>
                            <td className="px-4 py-3 text-center">{ordersPerHour.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center">{Object.values(restaurantLiveStats).reduce((s, n) => s + n, 0)}</td>
                            <td className="px-4 py-3 text-left text-[#166534] dark:text-[#4ade80]">{MONEY(totalRevenue)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {analyticsView === 'profitability' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] p-4 bg-[#fafafa] dark:bg-[#111111]">
                  <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">הכנסה ממוצעת ליום</div>
                  <div className="mt-2 text-2xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{MONEY(totalRevenue / daysCovered)}</div>
                </div>
                <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] p-4 bg-[#fafafa] dark:bg-[#111111]">
                  <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">תשלום ממוצע לשליח</div>
                  <div className="mt-2 text-2xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{deliveredInRange.length ? MONEY(totalCourierPay / deliveredInRange.length) : '-'}</div>
                </div>
                <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] p-4 bg-[#fafafa] dark:bg-[#111111]">
                  <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">רווח גולמי להזמנה</div>
                  <div className="mt-2 text-2xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{deliveredInRange.length ? MONEY(grossProfit / deliveredInRange.length) : '-'}</div>
                </div>
                <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] p-4 bg-[#fafafa] dark:bg-[#111111]">
                  <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">עמלה ממוצעת להזמנה</div>
                  <div className="mt-2 text-2xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{deliveredInRange.length ? MONEY(totalCommission / deliveredInRange.length) : '-'}</div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
};
