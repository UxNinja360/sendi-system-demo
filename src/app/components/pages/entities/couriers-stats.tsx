import React, { useMemo } from 'react';
import { useDelivery } from '../../../context/delivery.context';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Clock, 
  Package, 
  DollarSign,
  Star,
  Zap,
  Target,
  Trophy,
  Activity,
  Users
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

export const CouriersStats: React.FC = () => {
  const { state } = useDelivery();

  // חישוב סטטיסטיקות כלליות
  const stats = useMemo(() => {
    const totalCouriers = state.couriers.length;
    const activeCouriers = state.couriers.filter(c => c.status !== 'offline').length;
    const availableCouriers = state.couriers.filter(c => c.status === 'available').length;
    const busyCouriers = state.couriers.filter(c => c.status === 'busy').length;
    
    // משלוחים
    const totalDeliveries = state.deliveries.length;
    const completedDeliveries = state.deliveries.filter(d => d.status === 'delivered').length;
    const activeDeliveries = state.deliveries.filter(d => 
      d.status === 'assigned' || d.status === 'delivering'
    ).length;

    // ממוצעים
    const avgRating = state.couriers.reduce((sum, c) => sum + c.rating, 0) / totalCouriers || 0;
    const avgDeliveriesPerCourier = state.couriers.reduce((sum, c) => sum + c.totalDeliveries, 0) / totalCouriers || 0;
    
    // הכנסות
    const totalRevenue = state.deliveries
      .filter(d => d.status === 'delivered')
      .reduce((sum, d) => sum + d.price, 0);
    const avgRevenuePerCourier = totalRevenue / totalCouriers || 0;

    return {
      totalCouriers,
      activeCouriers,
      availableCouriers,
      busyCouriers,
      totalDeliveries,
      completedDeliveries,
      activeDeliveries,
      avgRating,
      avgDeliveriesPerCourier,
      totalRevenue,
      avgRevenuePerCourier
    };
  }, [state.couriers, state.deliveries]);

  // טופ 5 שליחים לפי ביצועים
  const topCouriers = useMemo(() => {
    return [...state.couriers]
      .sort((a, b) => b.totalDeliveries - a.totalDeliveries)
      .slice(0, 5)
      .map((courier, index) => {
        const courierDeliveries = state.deliveries.filter(d => d.courierId === courier.id);
        const completedDeliveries = courierDeliveries.filter(d => d.status === 'delivered');
        const revenue = completedDeliveries.reduce((sum, d) => sum + d.price, 0);
        const successRate = courierDeliveries.length > 0 
          ? (completedDeliveries.length / courierDeliveries.length) * 100 
          : 0;

        return {
          ...courier,
          rank: index + 1,
          revenue,
          successRate,
          completedDeliveries: completedDeliveries.length
        };
      });
  }, [state.couriers, state.deliveries]);

  // התפלגות דירוגים
  const ratingDistribution = useMemo(() => {
    const ranges = [
      { name: '5.0', min: 5.0, max: 5.0, count: 0 },
      { name: '4.5-4.9', min: 4.5, max: 4.9, count: 0 },
      { name: '4.0-4.4', min: 4.0, max: 4.4, count: 0 },
      { name: '3.5-3.9', min: 3.5, max: 3.9, count: 0 },
      { name: '3.0-3.4', min: 3.0, max: 3.4, count: 0 },
      { name: 'מתחת ל-3.0', min: 0, max: 2.9, count: 0 },
    ];

    state.couriers.forEach(courier => {
      const range = ranges.find(r => courier.rating >= r.min && courier.rating <= r.max);
      if (range) range.count++;
    });

    return ranges.filter(r => r.count > 0);
  }, [state.couriers]);

  // התפלגות סטטוסים
  const statusDistribution = useMemo(() => {
    return [
      { 
        name: 'זמינים', 
        value: state.couriers.filter(c => c.status === 'available').length,
        color: '#9fe870'
      },
      { 
        name: 'תפוסים', 
        value: state.couriers.filter(c => c.status === 'busy').length,
        color: '#ffa94d'
      },
      { 
        name: 'לא מחוברים', 
        value: state.couriers.filter(c => c.status === 'offline').length,
        color: '#737373'
      },
    ].filter(item => item.value > 0);
  }, [state.couriers]);

  // נתונים לגרף ביצועים לאורך זמן (7 ימים אחרונים)
  const performanceData = useMemo(() => {
    const days = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    const now = new Date();
    
    return days.map((day, index) => {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - (6 - index));
      
      const dayDeliveries = state.deliveries.filter(d => {
        const deliveryDate = new Date(d.createdAt);
        return deliveryDate.toDateString() === targetDate.toDateString();
      });

      const completed = dayDeliveries.filter(d => d.status === 'delivered').length;
      const cancelled = dayDeliveries.filter(d => d.status === 'cancelled').length;
      const avgTime = dayDeliveries.length > 0 ? Math.floor(Math.random() * 30) + 20 : 0; // זמן ממוצע (דמה)

      return {
        name: day,
        fullDate: targetDate.toLocaleDateString('he-IL'),
        completed,
        cancelled,
        avgTime,
        total: dayDeliveries.length
      };
    });
  }, [state.deliveries]);

  // התפלגות משלוחים בין שליחים
  const deliveryDistribution = useMemo(() => {
    return state.couriers
      .map(courier => {
        const courierDeliveries = state.deliveries.filter(d => d.courierId === courier.id);
        return {
          name: courier.name,
          deliveries: courierDeliveries.length,
          completed: courierDeliveries.filter(d => d.status === 'delivered').length,
          active: courierDeliveries.filter(d => 
            d.status === 'assigned' || d.status === 'delivering'
          ).length
        };
      })
      .filter(c => c.deliveries > 0)
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 8);
  }, [state.couriers, state.deliveries]);

  return (
    <div className="space-y-6">
      {/* כרטיסי סטטיסטיקות עיקריות */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* סך שליחים */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-[#f0f9ff] dark:bg-[#001a33] rounded-xl">
              <Users className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8]" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
            {stats.totalCouriers}
          </div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3] mb-2">
            סך כל השליחים
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#16a34a] dark:text-[#22c55e] font-medium">
              {stats.activeCouriers} פעילים
            </span>
            <span className="text-[#737373] dark:text-[#a3a3a3]">•</span>
            <span className="text-[#737373] dark:text-[#a3a3a3]">
              {stats.totalCouriers - stats.activeCouriers} לא מחוברים
            </span>
          </div>
        </div>

        {/* ממוצע דירוג */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-[#fff4e6] dark:bg-[#331a00] rounded-xl">
              <Star className="w-5 h-5 text-[#ffa94d] dark:text-[#ffa94d] fill-[#ffa94d]" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
            {stats.avgRating.toFixed(2)}
          </div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3] mb-2">
            ממוצע דירוג כללי
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < Math.floor(stats.avgRating) 
                    ? 'text-[#ffa94d] fill-[#ffa94d]' 
                    : 'text-[#e5e5e5] dark:text-[#404040]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ממוצע משלוחים לשליח */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-[#f0fdf4] dark:bg-[#022c22] rounded-xl">
              <Package className="w-5 h-5 text-[#16a34a] dark:text-[#22c55e]" />
            </div>
            {stats.avgDeliveriesPerCourier > 50 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-[#ecfae2] dark:bg-[#163300] rounded-full">
                <TrendingUp className="w-3 h-3 text-[#16a34a] dark:text-[#9fe870]" />
                <span className="text-xs font-medium text-[#16a34a] dark:text-[#9fe870]">גבוה</span>
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
            {Math.round(stats.avgDeliveriesPerCourier)}
          </div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
            משלוחים ממוצע לשליח
          </div>
        </div>

        {/* סך הכנסות */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-[#fef3f2] dark:bg-[#2d0a09] rounded-xl">
              <DollarSign className="w-5 h-5 text-[#dc2626] dark:text-[#f87171]" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
            ₪{stats.totalRevenue.toLocaleString()}
          </div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3] mb-2">
            סך הכנסות משליחים
          </div>
          <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
            ממוצע ₪{Math.round(stats.avgRevenuePerCourier)} לשליח
          </div>
        </div>
      </div>

      {/* גרפים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* גרף ביצועים שבועי */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
                ביצועים שבועיים
              </h3>
              <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">
                משלוחים בשבעת הימים האחרונים
              </p>
            </div>
            <div className="p-2 bg-[#f0fdf4] dark:bg-[#022c22] rounded-lg">
              <Activity className="w-5 h-5 text-[#16a34a] dark:text-[#22c55e]" />
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={280} key="couriers-performance-line-chart">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" className="dark:stroke-[#262626]" />
              <XAxis 
                dataKey="name" 
                stroke="#737373"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#737373"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  direction: 'rtl'
                }}
                labelStyle={{ color: '#0d0d12', fontWeight: 'bold' }}
              />
              <Legend 
                wrapperStyle={{ 
                  direction: 'rtl',
                  fontSize: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#16a34a" 
                strokeWidth={2}
                name="הושלמו"
                dot={{ fill: '#16a34a', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="cancelled" 
                stroke="#dc2626" 
                strokeWidth={2}
                name="בוטלו"
                dot={{ fill: '#dc2626', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* התפלגות סטטוסים */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
                סטטוס שליחים
              </h3>
              <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">
                התפלגות זמינות נוכחית
              </p>
            </div>
            <div className="p-2 bg-[#f0f9ff] dark:bg-[#001a33] rounded-lg">
              <Zap className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8]" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <ResponsiveContainer width="60%" height={220} key="couriers-status-pie-chart">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    direction: 'rtl'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex-1 space-y-3">
              {statusDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-[#0d0d12] dark:text-[#fafafa]">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                      {item.value}
                    </div>
                    <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
                      {((item.value / stats.totalCouriers) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* התפלגות משלוחים */}
      <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
              התפלגות עומס
            </h3>
            <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">
              משלוחים לפי שליח (8 המובילים)
            </p>
          </div>
          <div className="p-2 bg-[#fef3f2] dark:bg-[#2d0a09] rounded-lg">
            <Target className="w-5 h-5 text-[#dc2626] dark:text-[#f87171]" />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320} key="couriers-delivery-bar-chart">
          <BarChart data={deliveryDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" className="dark:stroke-[#262626]" />
            <XAxis 
              dataKey="name" 
              stroke="#737373"
              style={{ fontSize: '11px' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#737373"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, #fff)',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                direction: 'rtl'
              }}
            />
            <Legend 
              wrapperStyle={{ 
                direction: 'rtl',
                fontSize: '12px'
              }}
            />
            <Bar dataKey="completed" fill="#16a34a" radius={[8, 8, 0, 0]} name="הושלמו" />
            <Bar dataKey="active" fill="#ffa94d" radius={[8, 8, 0, 0]} name="פעילים" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* טופ 5 שליחים */}
      <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
              טבלת המובילים
            </h3>
            <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">
              5 השליחים המובילים במשלוחים
            </p>
          </div>
          <div className="p-2 bg-[#fff4e6] dark:bg-[#331a00] rounded-lg">
            <Trophy className="w-5 h-5 text-[#ffa94d] dark:text-[#ffa94d]" />
          </div>
        </div>

        <div className="space-y-3">
          {topCouriers.map((courier, index) => (
            <div 
              key={courier.id}
              className="flex items-center gap-4 p-4 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl hover:bg-[#f5f5f5] dark:hover:bg-[#171717] transition-colors"
            >
              {/* מדליה/דירוג */}
              <div className="flex-shrink-0">
                {index === 0 && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ffed4e] flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-[#b8860b]" />
                  </div>
                )}
                {index === 1 && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c0c0c0] to-[#e8e8e8] flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-[#696969]" />
                  </div>
                )}
                {index === 2 && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#cd7f32] to-[#e6a664] flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-[#8b4513]" />
                  </div>
                )}
                {index > 2 && (
                  <div className="w-10 h-10 rounded-full bg-[#e5e5e5] dark:bg-[#262626] flex items-center justify-center">
                    <span className="text-lg font-bold text-[#737373] dark:text-[#a3a3a3]">
                      {courier.rank}
                    </span>
                  </div>
                )}
              </div>

              {/* שם ודירוג */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
                  {courier.name}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-[#ffa94d] fill-[#ffa94d]" />
                  <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                    {courier.rating.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* סטטיסטיקות */}
              <div className="hidden sm:flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {courier.completedDeliveries}
                  </div>
                  <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
                    משלוחים
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-[#16a34a] dark:text-[#22c55e]">
                    {courier.successRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
                    הצלחה
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    ₪{courier.revenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
                    הכנסות
                  </div>
                </div>
              </div>

              {/* בייגי הישג */}
              {index === 0 && (
                <div className="hidden lg:flex items-center gap-1 px-3 py-1.5 bg-[#fff4e6] dark:bg-[#331a00] rounded-full">
                  <Award className="w-4 h-4 text-[#ffa94d]" />
                  <span className="text-xs font-medium text-[#ffa94d]">
                    #1 המוביל
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* התפלגות דירוגים */}
      <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
              התפלגות דירוגים
            </h3>
            <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">
              כמה שליחים בכל רמת דירוג
            </p>
          </div>
          <div className="p-2 bg-[#fff4e6] dark:bg-[#331a00] rounded-lg">
            <Star className="w-5 h-5 text-[#ffa94d]" />
          </div>
        </div>

        <div className="space-y-3">
          {ratingDistribution.map((range, index) => {
            const percentage = (range.count / stats.totalCouriers) * 100;
            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-[#ffa94d] fill-[#ffa94d]" />
                    <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
                      {range.name}
                    </span>
                  </div>
                  <div className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                    {range.count} שליחים ({percentage.toFixed(0)}%)
                  </div>
                </div>
                <div className="w-full h-2 bg-[#f5f5f5] dark:bg-[#262626] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#ffa94d] to-[#ff8c1a] rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
