import React from 'react';
import { useNavigate } from 'react-router';
import { Activity, CheckCircle, ClipboardList, Clock, Menu, Store, TrendingUp, Users, XCircle } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDelivery } from '../../context/delivery.context';

const openStatuses = ['pending', 'assigned', 'delivering'] as const;
const ago = (date: Date) => {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes <= 0) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דק׳`;
  return `לפני ${Math.round(minutes / 60)} ש׳`;
};

export const Dashboard: React.FC = () => {
  const { state } = useDelivery();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = React.useState<'hour' | 'today' | 'week'>('hour');
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeDeliveries = state.deliveries.filter((d) => openStatuses.includes(d.status)).length;
  const pending = state.deliveries.filter((d) => d.status === 'pending').length;
  const assigned = state.deliveries.filter((d) => d.status === 'assigned').length;
  const pickingUp = state.deliveries.filter((d) => d.status === 'delivering').length;
  const delivering = state.deliveries.filter((d) => d.status === 'delivering').length;

  const activeCouriers = state.couriers.filter((c) => c.status !== 'offline');
  const totalCouriers = activeCouriers.length;
  const busyCouriers = activeCouriers.filter((c) => c.status === 'busy').length;
  // "פנוי" = במשמרת פעילה + אין משלוח פעיל
  const freeCouriers = state.couriers.filter((c) => c.isOnShift && c.status === 'available').length;
  const couriersOnShift = state.couriers.filter((c) => c.isOnShift).length;
  const couriersInFieldNow = state.couriers.filter((courier) =>
    state.deliveries.some((delivery) => delivery.courierId === courier.id && openStatuses.includes(delivery.status))
  ).length;

  const activeRestaurantsNow = state.restaurants.filter((restaurant) =>
    state.deliveries.some((delivery) => delivery.restaurantId === restaurant.id && openStatuses.includes(delivery.status))
  ).length;
  const activeRestaurants = state.restaurants.filter((restaurant) => restaurant.isActive).length;
  const totalRestaurants = state.restaurants.length;
  const courierDeliveryRatioValue =
    activeDeliveries > 0
      ? `${couriersOnShift}:${activeDeliveries}`
      : `${couriersOnShift}:0`;
  const deliveriesPerOnShiftCourier =
    couriersOnShift > 0 ? (activeDeliveries / couriersOnShift).toFixed(1) : '0.0';
  const freeOnShiftCouriers = state.couriers.filter((c) => c.isOnShift && c.status === 'available').length;

  const averageDeliveryTime = (() => {
    const delivered = state.deliveries.filter((d) => d.status === 'delivered' && d.deliveredAt);
    if (delivered.length === 0) return 0;
    const totalMinutes = delivered.reduce((sum, delivery) => {
      const created = new Date(delivery.createdAt).getTime();
      const done = new Date(delivery.deliveredAt!).getTime();
      return sum + (done - created) / 1000 / 60;
    }, 0);
    return Math.round(totalMinutes / delivered.length);
  })();

  const todayDateString = new Date().toDateString();
  const averagePickupTimeToday = (() => {
    const pickedUpTodayDeliveries = state.deliveries.filter(
      (d) => d.pickedUpAt && new Date(d.pickedUpAt).toDateString() === todayDateString
    );
    if (pickedUpTodayDeliveries.length === 0) return 0;
    const totalMinutes = pickedUpTodayDeliveries.reduce((sum, delivery) => {
      const created = new Date(delivery.createdAt).getTime();
      const pickedUp = new Date(delivery.pickedUpAt!).getTime();
      return sum + (pickedUp - created) / 1000 / 60;
    }, 0);
    return Math.round(totalMinutes / pickedUpTodayDeliveries.length);
  })();
  const completedToday = state.deliveries.filter(
    (d) => d.status === 'delivered' && d.deliveredAt && new Date(d.deliveredAt).toDateString() === todayDateString
  ).length;
  const cancelledToday = state.deliveries.filter(
    (d) => d.status === 'cancelled' && d.cancelledAt && new Date(d.cancelledAt).toDateString() === todayDateString
  ).length;
  const totalToday = completedToday + cancelledToday;
  const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const waitMinutes = (createdAt: string) => Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);

  const busyRestaurantsNow = state.restaurants
    .map((restaurant) => {
      const openCount = state.deliveries.filter(
        (delivery) => delivery.restaurantId === restaurant.id && openStatuses.includes(delivery.status)
      ).length;
      return { restaurant, openCount };
    })
    .filter(({ openCount }) => openCount >= 6)
    .sort((a, b) => b.openCount - a.openCount)
    .slice(0, 5);

  const dashboardEvents = (() => {
    const events: { id: string; type: 'late' | 'cancelled' | 'completed'; title: string; details: string; time: Date }[] = [];

    state.deliveries
      .filter((d) => d.status === 'cancelled')
      .slice(-3)
      .forEach((d) => {
        const restaurant = state.restaurants.find((r) => r.id === d.restaurantId);
        events.push({
          id: `cancel-${d.id}`,
          type: 'cancelled',
          title: 'משלוח בוטל',
          details: restaurant?.name ?? 'מסעדה',
          time: new Date(d.cancelledAt || d.createdAt),
        });
      });

    state.deliveries
      .filter((d) => d.status === 'delivered' && d.deliveredAt)
      .sort((a, b) => new Date(b.deliveredAt!).getTime() - new Date(a.deliveredAt!).getTime())
      .slice(0, 3)
      .forEach((d) => {
        const restaurant = state.restaurants.find((r) => r.id === d.restaurantId);
        events.push({
          id: `done-${d.id}`,
          type: 'completed',
          title: 'משלוח נמסר',
          details: restaurant?.name ?? 'מסעדה',
          time: new Date(d.deliveredAt!),
        });
      });

    state.deliveries
      .filter((d) => ['pending', 'assigned'].includes(d.status))
      .filter((d) => waitMinutes(d.createdAt) > 25)
      .forEach((d) => {
        const restaurant = state.restaurants.find((r) => r.id === d.restaurantId);
        events.push({
          id: `late-${d.id}`,
          type: 'late',
          title: 'משלוח מתעכב',
          details: `${restaurant?.name ?? 'מסעדה'} · ${waitMinutes(d.createdAt)} דק׳ המתנה`,
          time: new Date(d.createdAt),
        });
      });

    return events.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8);
  })();

  const getChartData = React.useMemo(() => {
    const now = new Date();
    if (selectedPeriod === 'hour') {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      return Array.from({ length: 12 }, (_, i) => {
        const start = new Date(oneHourAgo.getTime() + i * 5 * 60 * 1000);
        const end = new Date(start.getTime() + 5 * 60 * 1000);
        const label = start.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        return {
          name: label,
          displayName: label,
          completed: state.deliveries.filter((d) => d.deliveredAt && new Date(d.deliveredAt) >= start && new Date(d.deliveredAt) < end).length,
          cancelled: state.deliveries.filter((d) => d.cancelledAt && new Date(d.cancelledAt) >= start && new Date(d.cancelledAt) < end).length,
        };
      });
    }
    if (selectedPeriod === 'today') {
      return Array.from({ length: now.getHours() + 1 }, (_, hour) => ({
        name: `${`${hour}`.padStart(2, '0')}:00`,
        displayName: `${`${hour}`.padStart(2, '0')}:00`,
        completed: state.deliveries.filter((d) => d.deliveredAt && new Date(d.deliveredAt).toDateString() === todayDateString && new Date(d.deliveredAt).getHours() === hour).length,
        cancelled: state.deliveries.filter((d) => d.cancelledAt && new Date(d.cancelledAt).toDateString() === todayDateString && new Date(d.cancelledAt).getHours() === hour).length,
      }));
    }
    const days = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return days.map((day, index) => {
      const targetDate = new Date(startOfWeek);
      targetDate.setDate(startOfWeek.getDate() + index);
      return {
        name: day,
        displayName: day,
        completed: state.deliveries.filter((d) => d.deliveredAt && new Date(d.deliveredAt).toDateString() === targetDate.toDateString()).length,
        cancelled: state.deliveries.filter((d) => d.cancelledAt && new Date(d.cancelledAt).toDateString() === targetDate.toDateString()).length,
      };
    });
  }, [selectedPeriod, state.deliveries]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] flex flex-col">
      <div className="bg-white dark:bg-[#171717] border-b border-[#e5e5e5] dark:border-[#1f1f1f] px-5 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (window as Window & { toggleMobileSidebar?: () => void }).toggleMobileSidebar?.()}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">דשבורד</span>
        </div>
        <div className="text-[11px] text-[#888] dark:text-[#8b8b8b]">{currentTime.toLocaleString('he-IL')}</div>
      </div>

      <div className="flex-1 py-6">
        <div className="w-full max-w-[90rem] mx-auto px-4 md:px-6 space-y-4 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {(() => {
              const filledBar = Math.min(20, Math.round((activeDeliveries / Math.max(activeDeliveries + 4, 10)) * 20));
              return (
                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5 flex flex-col cursor-pointer hover:border-[#c0c0c0] dark:hover:border-[#3a3a3a] transition-all" onClick={() => navigate('/live')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#888] dark:text-[#a3a3a3] uppercase tracking-wide">משלוחים פעילים</span>
                    <ClipboardList size={15} className="text-[#a3a3a3] dark:text-[#525252]" />
                  </div>
                  <div className="mt-2 text-[2.5rem] font-light leading-none text-[#0d0d12] dark:text-[#fafafa] tracking-tight">{activeDeliveries}</div>
                  <div className="mt-3 flex items-center gap-[3px]">
                    {Array.from({ length: 20 }, (_, i) => <div key={i} className={`flex-1 h-[3px] rounded-full transition-colors ${i < filledBar ? 'bg-blue-500' : 'bg-[#e5e5e5] dark:bg-[#2a2a2a]'}`} />)}
                  </div>
                  <div className="mt-4 space-y-2.5 flex-1">
                    {[
                      { dot: 'bg-orange-400', label: 'ממתינים לשיוך', value: pending },
                      { dot: 'bg-yellow-400', label: 'בדרך למסעדה', value: assigned + pickingUp },
                      { dot: 'bg-blue-400', label: 'בדרך ללקוח', value: delivering },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs text-[#666d80] dark:text-[#a3a3a3]"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`} />{row.label}</span>
                        <span className="text-xs font-semibold text-[#0d0d12] dark:text-[#fafafa]">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); navigate('/live'); }} className="mt-4 pt-3 border-t border-[#f0f0f0] dark:border-[#262626] text-xs text-[#9fe870] hover:text-[#8dd960] font-medium text-right transition-colors">צפה בכל המשלוחים ←</button>
                </div>
              );
            })()}

              {(() => {
                const filledBar = totalRestaurants > 0 ? Math.round((activeRestaurantsNow / totalRestaurants) * 20) : 0;
                return (
                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5 flex flex-col cursor-pointer hover:border-[#c0c0c0] dark:hover:border-[#3a3a3a] transition-all" onClick={() => navigate('/restaurants')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#888] dark:text-[#a3a3a3] uppercase tracking-wide">מסעדות פעילות</span>
                    <Store size={15} className="text-[#a3a3a3] dark:text-[#525252]" />
                  </div>
                  <div className="mt-2 text-[2.5rem] font-light leading-none text-[#0d0d12] dark:text-[#fafafa] tracking-tight">{activeRestaurantsNow}</div>
                  <div className="mt-3 flex items-center gap-[3px]">
                    {Array.from({ length: 20 }, (_, i) => <div key={i} className={`flex-1 h-[3px] rounded-full transition-colors ${i < filledBar ? 'bg-orange-400' : 'bg-[#e5e5e5] dark:bg-[#2a2a2a]'}`} />)}
                  </div>
                    <div className="mt-4 space-y-2.5 flex-1">
                      {[
                        { dot: 'bg-green-400', label: 'מחוברות', value: activeRestaurants },
                        { dot: 'bg-red-400', label: 'עמוסות (6+ משלוחים)', value: busyRestaurantsNow.length },
                      ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs text-[#666d80] dark:text-[#a3a3a3]"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`} />{row.label}</span>
                        <span className="text-xs font-semibold text-[#0d0d12] dark:text-[#fafafa]">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); navigate('/restaurants'); }} className="mt-4 pt-3 border-t border-[#f0f0f0] dark:border-[#262626] text-xs text-[#9fe870] hover:text-[#8dd960] font-medium text-right transition-colors">צפה בכל המסעדות ←</button>
                </div>
              );
            })()}

              {(() => {
                const deliveriesPerCourierValue = Number(deliveriesPerOnShiftCourier);
                const filledBar = Math.min(20, Math.round(deliveriesPerCourierValue * 4));
                return (
                  <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5 flex flex-col cursor-pointer hover:border-[#c0c0c0] dark:hover:border-[#3a3a3a] transition-all" onClick={() => navigate('/couriers')}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#888] dark:text-[#a3a3a3] uppercase tracking-wide">משלוחים לשליח</span>
                      <Users size={15} className="text-[#a3a3a3] dark:text-[#525252]" />
                    </div>
                    <div className="mt-2 text-[2.5rem] font-light leading-none text-[#0d0d12] dark:text-[#fafafa] tracking-tight">{deliveriesPerOnShiftCourier}</div>
                    <div className="mt-3 flex items-center gap-[3px]">
                      {Array.from({ length: 20 }, (_, i) => <div key={i} className={`flex-1 h-[3px] rounded-full transition-colors ${i < filledBar ? 'bg-green-500' : 'bg-[#e5e5e5] dark:bg-[#2a2a2a]'}`} />)}
                    </div>
                  <div className="mt-4 space-y-2.5 flex-1">
                    {[
                      { dot: 'bg-blue-400', label: 'עסוקים', value: busyCouriers },
                      { dot: 'bg-purple-400', label: 'במשמרת', value: couriersOnShift },
                      { dot: 'bg-green-400', label: 'מחוברים', value: totalCouriers },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs text-[#666d80] dark:text-[#a3a3a3]"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`} />{row.label}</span>
                        <span className="text-xs font-semibold text-[#0d0d12] dark:text-[#fafafa]">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); navigate('/couriers'); }} className="mt-4 pt-3 border-t border-[#f0f0f0] dark:border-[#262626] text-xs text-[#9fe870] hover:text-[#8dd960] font-medium text-right transition-colors">צפה בכל השליחים ←</button>
                </div>
              );
            })()}

            {(() => {
              const filledBar = Math.round((completionRate / 100) * 20);
              const isGood = completionRate >= 85;
              return (
                <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5 flex flex-col cursor-pointer hover:border-[#c0c0c0] dark:hover:border-[#3a3a3a] transition-all" onClick={() => navigate('/reports')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#888] dark:text-[#a3a3a3] uppercase tracking-wide">ביצועי היום</span>
                    <TrendingUp size={15} className="text-[#a3a3a3] dark:text-[#525252]" />
                  </div>
                  <div className="mt-2 text-[2.5rem] font-light leading-none text-[#0d0d12] dark:text-[#fafafa] tracking-tight">
                    {totalToday > 0 ? `${completionRate}%` : '—'}
                  </div>
                  <div className="mt-3 flex items-center gap-[3px]">
                    {Array.from({ length: 20 }, (_, i) => (
                      <div key={i} className={`flex-1 h-[3px] rounded-full transition-colors ${i < filledBar ? (isGood ? 'bg-emerald-500' : 'bg-orange-400') : 'bg-[#e5e5e5] dark:bg-[#2a2a2a]'}`} />
                    ))}
                  </div>
                  <div className="mt-4 space-y-2.5 flex-1">
                    {[
                      { dot: 'bg-emerald-400', label: 'הושלמו', value: completedToday },
                      { dot: 'bg-red-400', label: 'בוטלו', value: cancelledToday },
                      { dot: 'bg-cyan-400', label: 'זמן איסוף ממוצע', value: averagePickupTimeToday > 0 ? `${averagePickupTimeToday} דק׳` : '—' },
                      { dot: 'bg-yellow-400', label: 'זמן ממוצע', value: averageDeliveryTime > 0 ? `${averageDeliveryTime} דק׳` : '—' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs text-[#666d80] dark:text-[#a3a3a3]"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`} />{row.label}</span>
                        <span className="text-xs font-semibold text-[#0d0d12] dark:text-[#fafafa]">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); navigate('/reports'); }} className="mt-4 pt-3 border-t border-[#f0f0f0] dark:border-[#262626] text-xs text-[#9fe870] hover:text-[#8dd960] font-medium text-right transition-colors">צפה בדוחות ←</button>
                </div>
              );
            })()}
          </div>

          <div>
            <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-[#0d0d12] dark:text-[#fafafa]">פעילות היום</h2>
                  <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">תקציר קצר למעלה, מגמה למטה.</p>
                </div>
                <div className="inline-flex rounded-xl bg-[#f5f5f5] dark:bg-[#111111] p-1">
                  {(['hour', 'today', 'week'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${selectedPeriod === period ? 'bg-[#0d0d12] dark:bg-[#fafafa] text-white dark:text-[#0d0d12]' : 'text-[#666d80] dark:text-[#a3a3a3]'}`}
                    >
                      {period === 'hour' ? 'שעה' : period === 'today' ? 'היום' : 'שבוע'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl p-4">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={getChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" stroke="transparent" tick={{ fill: '#666d80', fontSize: 12 }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis stroke="transparent" tick={{ fill: '#666d80', fontSize: 12 }} axisLine={false} tickLine={false} width={40} dx={-5} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: 'none', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Line type="natural" dataKey="completed" stroke="#9fe870" strokeWidth={3} dot={false} activeDot={{ r: 7, fill: '#9fe870', stroke: '#fff', strokeWidth: 3 }} />
                    <Line type="natural" dataKey="cancelled" stroke="#ea0b0b" strokeWidth={3} dot={false} activeDot={{ r: 7, fill: '#ea0b0b', stroke: '#fff', strokeWidth: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-[#e5e5e5] dark:border-[#404040]">
                  <div className="flex items-center gap-2"><div className="w-8 h-0.5 bg-[#9fe870] rounded-full" /><span className="text-xs md:text-sm text-[#666d80] dark:text-[#a3a3a3]">משלוחים שנמסרו</span></div>
                  <div className="flex items-center gap-2"><div className="w-8 h-0.5 bg-[#ea0b0b] rounded-full" /><span className="text-xs md:text-sm text-[#666d80] dark:text-[#a3a3a3]">משלוחים שבוטלו</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

