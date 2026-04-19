import React, { useMemo } from 'react';
import { useDelivery } from '../../../context/delivery.context';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Clock, 
  Package, 
  DollarSign,
  Store,
  MapPin,
  Target,
  Trophy,
  Activity,
  ChefHat,
  Zap,
  TrendingUpDown
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

export const RestaurantsStats: React.FC = () => {
  const { state } = useDelivery();

  // חישוב סטטיסטיקות כלליות
  const stats = useMemo(() => {
    const totalRestaurants = state.restaurants.length;
    const activeRestaurants = state.restaurants.filter(r => r.isActive).length;
    const inactiveRestaurants = totalRestaurants - activeRestaurants;
    
    // משלוחים
    const totalDeliveries = state.deliveries.length;
    const completedDeliveries = state.deliveries.filter(d => d.status === 'delivered').length;
    
    // ממוצעים
    const avgOrdersPerRestaurant = state.restaurants.reduce((sum, r) => sum + r.totalOrders, 0) / totalRestaurants || 0;
    
    // הכנסות
    const totalRevenue = state.deliveries
      .filter(d => d.status === 'delivered')
      .reduce((sum, d) => sum + d.price, 0);
    const avgRevenuePerRestaurant = totalRevenue / totalRestaurants || 0;

    // משלוחים פעילים
    const activeDeliveries = state.deliveries.filter(d => 
      d.status === 'assigned' || d.status === 'delivering'
    ).length;

    return {
      totalRestaurants,
      activeRestaurants,
      inactiveRestaurants,
      totalDeliveries,
      completedDeliveries,
      activeDeliveries,
      avgOrdersPerRestaurant,
      totalRevenue,
      avgRevenuePerRestaurant
    };
  }, [state.restaurants, state.deliveries]);

  // טופ 5 מסעדות לפי ביצועים
  const topRestaurants = useMemo(() => {
    return [...state.restaurants]
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 5)
      .map((restaurant, index) => {
        const restaurantDeliveries = state.deliveries.filter(d => d.restaurantId === restaurant.id);
        const completedDeliveries = restaurantDeliveries.filter(d => d.status === 'delivered');
        const revenue = completedDeliveries.reduce((sum, d) => sum + d.price, 0);
        const successRate = restaurantDeliveries.length > 0 
          ? (completedDeliveries.length / restaurantDeliveries.length) * 100 
          : 0;

        return {
          ...restaurant,
          rank: index + 1,
          revenue,
          successRate,
          completedDeliveries: completedDeliveries.length
        };
      });
  }, [state.restaurants, state.deliveries]);

  // התפלגות משלוחים לפי מסעדה
  const deliveryDistribution = useMemo(() => {
    return state.restaurants
      .map(restaurant => {
        const restaurantDeliveries = state.deliveries.filter(d => d.restaurantId === restaurant.id);
        return {
          name: restaurant.name,
          deliveries: restaurantDeliveries.length,
          completed: restaurantDeliveries.filter(d => d.status === 'delivered').length,
          active: restaurantDeliveries.filter(d => 
            d.status === 'assigned' || d.status === 'delivering'
          ).length,
          cancelled: restaurantDeliveries.filter(d => d.status === 'cancelled').length
        };
      })
      .filter(r => r.deliveries > 0)
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 8);
  }, [state.restaurants, state.deliveries]);

  // התפלגות סטטוסים
  const statusDistribution = useMemo(() => {
    return [
      { 
        name: 'פעילות', 
        value: state.restaurants.filter(r => r.isActive).length,
        color: '#9fe870'
      },
      { 
        name: 'לא פעילות', 
        value: state.restaurants.filter(r => !r.isActive).length,
        color: '#737373'
      },
    ].filter(item => item.value > 0);
  }, [state.restaurants]);

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
      const activeCount = dayDeliveries.filter(d => 
        d.status === 'assigned' || d.status === 'delivering'
      ).length;

      return {
        name: day,
        fullDate: targetDate.toLocaleDateString('he-IL'),
        completed,
        cancelled,
        active: activeCount,
        total: dayDeliveries.length
      };
    });
  }, [state.deliveries]);

  // התפלגות משלוחים לפי עיר
  const cityDistribution = useMemo(() => {
    const cityMap = new Map<string, number>();
    
    state.deliveries.forEach(delivery => {
      const restaurant = state.restaurants.find(r => r.id === delivery.restaurantId);
      if (restaurant) {
        const city = restaurant.address.split(', ')[1] || 'תל אביב';
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
      }
    });

    return Array.from(cityMap.entries())
      .map(([city, count]) => ({ name: city, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [state.deliveries, state.restaurants]);

  // התפלגות הכנסות לפי מסעדה
  const revenueDistribution = useMemo(() => {
    return state.restaurants
      .map(restaurant => {
        const restaurantDeliveries = state.deliveries.filter(
          d => d.restaurantId === restaurant.id && d.status === 'delivered'
        );
        const revenue = restaurantDeliveries.reduce((sum, d) => sum + d.price, 0);
        
        return {
          name: restaurant.name,
          revenue,
          orders: restaurantDeliveries.length
        };
      })
      .filter(r => r.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [state.restaurants, state.deliveries]);

  return (
    <div className="space-y-6">
      {/* כרטיסי סטטיסטיקות עיקריות */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* סך מסעדות */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-[#fef3f2] dark:bg-[#2d0a09] rounded-xl">
              <Store className="w-5 h-5 text-[#dc2626] dark:text-[#f87171]" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
            {stats.totalRestaurants}
          </div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3] mb-2">
            סך כל המסעדות
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#16a34a] dark:text-[#22c55e] font-medium">
              {stats.activeRestaurants} פעילות
            </span>
            <span className="text-[#737373] dark:text-[#a3a3a3]">•</span>
            <span className="text-[#737373] dark:text-[#a3a3a3]">
              {stats.inactiveRestaurants} לא פעילות
            </span>
          </div>
        </div>

        {/* סך משלוחים */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-[#f0fdf4] dark:bg-[#022c22] rounded-xl">
              <Package className="w-5 h-5 text-[#16a34a] dark:text-[#22c55e]" />
            </div>
            {stats.completedDeliveries > stats.totalDeliveries * 0.8 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-[#ecfae2] dark:bg-[#163300] rounded-full">
                <TrendingUp className="w-3 h-3 text-[#16a34a] dark:text-[#9fe870]" />
                <span className="text-xs font-medium text-[#16a34a] dark:text-[#9fe870]">גבוה</span>
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
            {stats.totalDeliveries.toLocaleString()}
          </div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3] mb-2">
            סך משלוחים
          </div>
          <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
            {stats.completedDeliveries.toLocaleString()} הושלמו • {stats.activeDeliveries} פעילים
          </div>
        </div>

        {/* ממוצע הזמנות למסעדה */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-[#fff4e6] dark:bg-[#331a00] rounded-xl">
              <ChefHat className="w-5 h-5 text-[#ffa94d] dark:text-[#ffa94d]" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
            {Math.round(stats.avgOrdersPerRestaurant)}
          </div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
            הזמנות ממוצע למסעדה
          </div>
        </div>

        {/* סך הכנסות */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-[#f0f9ff] dark:bg-[#001a33] rounded-xl">
              <DollarSign className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8]" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
            ₪{stats.totalRevenue.toLocaleString()}
          </div>
          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3] mb-2">
            סך הכנסות ממסעדות
          </div>
          <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
            ממוצע ₪{Math.round(stats.avgRevenuePerRestaurant).toLocaleString()} למסעדה
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
          
          <ResponsiveContainer width="100%" height={280} key="restaurants-performance-line-chart">
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
                סטטוס מסעדות
              </h3>
              <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">
                התפלגות פעילות נוכחית
              </p>
            </div>
            <div className="p-2 bg-[#fef3f2] dark:bg-[#2d0a09] rounded-lg">
              <Zap className="w-5 h-5 text-[#dc2626] dark:text-[#f87171]" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <ResponsiveContainer width="60%" height={220} key="restaurants-status-pie-chart">
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
                      {((item.value / stats.totalRestaurants) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* התפלגות משלוחים לפי מסעדה */}
      <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
              התפלגות משלוחים
            </h3>
            <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">
              משלוחים לפי מסעדה (8 המובילות)
            </p>
          </div>
          <div className="p-2 bg-[#fff4e6] dark:bg-[#331a00] rounded-lg">
            <Target className="w-5 h-5 text-[#ffa94d] dark:text-[#ffa94d]" />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320} key="restaurants-delivery-bar-chart">
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
            <Bar dataKey="cancelled" fill="#dc2626" radius={[8, 8, 0, 0]} name="בוטלו" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* התפלגות הכנסות */}
      <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
              התפלגות הכנסות
            </h3>
            <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">
              הכנסות לפי מסעדה (8 המובילות)
            </p>
          </div>
          <div className="p-2 bg-[#f0f9ff] dark:bg-[#001a33] rounded-lg">
            <TrendingUpDown className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8]" />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320} key="restaurants-revenue-bar-chart">
          <BarChart data={revenueDistribution} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" className="dark:stroke-[#262626]" />
            <XAxis 
              type="number"
              stroke="#737373"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              type="category"
              dataKey="name" 
              stroke="#737373"
              style={{ fontSize: '11px' }}
              width={120}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, #fff)',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                direction: 'rtl'
              }}
              formatter={(value: number) => `₪${value.toLocaleString()}`}
            />
            <Bar dataKey="revenue" fill="#0284c7" radius={[0, 8, 8, 0]} name="הכנסות (₪)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* טופ 5 מסעדות */}
      <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
              טבלת המובילות
            </h3>
            <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">
              5 המסעדות המובילות במשלוחים
            </p>
          </div>
          <div className="p-2 bg-[#fff4e6] dark:bg-[#331a00] rounded-lg">
            <Trophy className="w-5 h-5 text-[#ffa94d] dark:text-[#ffa94d]" />
          </div>
        </div>

        <div className="space-y-3">
          {topRestaurants.map((restaurant, index) => (
            <div 
              key={restaurant.id}
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
                      {restaurant.rank}
                    </span>
                  </div>
                )}
              </div>

              {/* שם ופרטים */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1 flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#16a34a] dark:text-[#22c55e]" />
                  {restaurant.name}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#666d80] dark:text-[#a3a3a3]">
                  <MapPin className="w-3 h-3" />
                  <span>{restaurant.address.split(', ')[1] || 'תל אביב'}</span>
                </div>
              </div>

              {/* סטטיסטיקות */}
              <div className="hidden sm:flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {restaurant.completedDeliveries}
                  </div>
                  <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
                    משלוחים
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-[#16a34a] dark:text-[#22c55e]">
                    {restaurant.successRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
                    הצלחה
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    ₪{restaurant.revenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">
                    הכנסות
                  </div>
                </div>
              </div>

              {/* סטטוס */}
              <div>
                {restaurant.isActive ? (
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-[#ecfae2] dark:bg-[#163300] rounded-full">
                    <Zap className="w-3 h-3 text-[#16a34a] dark:text-[#9fe870]" />
                    <span className="text-xs font-medium text-[#16a34a] dark:text-[#9fe870]">
                      פעיל
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-[#f5f5f5] dark:bg-[#262626] rounded-full">
                    <span className="text-xs font-medium text-[#737373] dark:text-[#a3a3a3]">
                      לא פעיל
                    </span>
                  </div>
                )}
              </div>

              {/* בייג'י הישג */}
              {index === 0 && (
                <div className="hidden lg:flex items-center gap-1 px-3 py-1.5 bg-[#fff4e6] dark:bg-[#331a00] rounded-full">
                  <Award className="w-4 h-4 text-[#ffa94d]" />
                  <span className="text-xs font-medium text-[#ffa94d]">
                    #1 המובילה
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* התפלגות לפי עיר */}
      {cityDistribution.length > 0 && (
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
                התפלגות גיאוגרפית
              </h3>
              <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mt-1">
                משלוחים לפי עיר
              </p>
            </div>
            <div className="p-2 bg-[#fef3f2] dark:bg-[#2d0a09] rounded-lg">
              <MapPin className="w-5 h-5 text-[#dc2626] dark:text-[#f87171]" />
            </div>
          </div>

          <div className="space-y-3">
            {cityDistribution.map((city, index) => {
              const percentage = (city.value / stats.totalDeliveries) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#dc2626] dark:text-[#f87171]" />
                      <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
                        {city.name}
                      </span>
                    </div>
                    <div className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                      {city.value.toLocaleString()} משלוחים ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[#f5f5f5] dark:bg-[#262626] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#dc2626] to-[#f87171] rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
