import { useParams, useNavigate } from 'react-router';
import { useDelivery } from '../../context/delivery.context';
import { 
  ArrowRight, Bike, MapPin, Phone, Clock, TrendingUp,
  Package, CheckCircle2, DollarSign, Star, Activity,
  Award, Trophy, Zap, Target, Calendar, Filter, Search, Power,
  TrendingDown, Users, Timer, Flame, Crown, Shield, Trash2
} from 'lucide-react';
import { formatDistanceToNow, format, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, subDays, subWeeks, differenceInMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import CountUp from 'react-countup';
import { formatWorkedDuration, getAssignmentWorkedMinutes, getWorkedMinutesWithinRange } from '../../utils/shift-work';
import { toast } from 'sonner';

// מערכת הישגים ותגים
const padDatePart = (value: number) => value.toString().padStart(2, '0');
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const achievementsList = [
  { 
    id: 'speed_king', 
    name: 'מלך המהירות', 
    icon: Zap, 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-100 dark:bg-yellow-500/20',
    condition: (avgTime: number, allAvgTimes: number[]) => avgTime <= Math.min(...allAvgTimes)
  },
  { 
    id: 'reliable', 
    name: 'אמין ביותר', 
    icon: Shield, 
    color: 'text-blue-500', 
    bg: 'bg-blue-100 dark:bg-blue-500/20',
    condition: (completionRate: number) => completionRate >= 98
  },
  { 
    id: 'top_performer', 
    name: 'מבצע מצטיין', 
    icon: Trophy, 
    color: 'text-purple-500', 
    bg: 'bg-purple-100 dark:bg-purple-500/20',
    condition: (rating: number) => rating >= 4.8
  },
  { 
    id: 'volume_master', 
    name: 'שיא כמויות', 
    icon: Crown, 
    color: 'text-orange-500', 
    bg: 'bg-orange-100 dark:bg-orange-500/20',
    condition: (totalDeliveries: number, allTotals: number[]) => totalDeliveries >= Math.max(...allTotals)
  },
  { 
    id: 'on_fire', 
    name: 'לוהט', 
    icon: Flame, 
    color: 'text-red-500', 
    bg: 'bg-red-100 dark:bg-red-500/20',
    condition: (todayCount: number) => todayCount >= 15
  },
];

export function CourierDetailsPage() {
  const { courierId } = useParams<{ courierId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useDelivery();
  const [filterStatus, setFilterStatus] = useState<'all' | 'delivered' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  const courier = state.couriers.find(c => c.id === courierId);
  
  // מציאת משלוחים של השליח
  const courierDeliveries = state.deliveries.filter(d => d.courierId === courierId);
  const activeDeliveries = courierDeliveries.filter(d => 
    d.status !== 'delivered' && d.status !== 'cancelled'
  );
  const completedDeliveries = courierDeliveries.filter(d => d.status === 'delivered');
  const cancelledDeliveries = courierDeliveries.filter(d => d.status === 'cancelled');

  // חישוב סטטיסטיקות
  const totalEarnings = completedDeliveries.reduce((sum, d) => sum + d.price, 0);
  const averageDeliveryTime = completedDeliveries.length > 0 
    ? Math.round(completedDeliveries.reduce((sum, d) => sum + d.estimatedTime, 0) / completedDeliveries.length)
    : 0;
  
  const completionRate = courierDeliveries.length > 0
    ? Math.round((completedDeliveries.length / courierDeliveries.length) * 100)
    : 0;

  // משלוחים היום
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDeliveries = courierDeliveries.filter(d => 
    d.createdAt >= today && d.status === 'delivered'
  );

  // סטטיסטיקות של כל השליחים (לדירוג יחסי)
  const allCouriersStats = useMemo(() => {
    return state.couriers.map(c => {
      const deliveries = state.deliveries.filter(d => d.courierId === c.id);
      const completed = deliveries.filter(d => d.status === 'delivered');
      const avgTime = completed.length > 0
        ? completed.reduce((sum, d) => sum + d.estimatedTime, 0) / completed.length
        : 0;
      return {
        id: c.id,
        name: c.name,
        totalDeliveries: completed.length,
        avgTime,
        rating: c.rating,
        earnings: completed.reduce((sum, d) => sum + d.price, 0)
      };
    });
  }, [state.couriers, state.deliveries]);

  // דירוג השליח
  const courierRanking = useMemo(() => {
    const sorted = [...allCouriersStats].sort((a, b) => b.totalDeliveries - a.totalDeliveries);
    const rank = sorted.findIndex(c => c.id === courierId) + 1;
    return {
      rank,
      total: sorted.length,
      percentage: Math.round(((sorted.length - rank + 1) / sorted.length) * 100)
    };
  }, [allCouriersStats, courierId]);

  // הישגים שהשליח זכה בהם
  const earnedAchievements = useMemo(() => {
    const allAvgTimes = allCouriersStats.map(s => s.avgTime).filter(t => t > 0);
    const allTotals = allCouriersStats.map(s => s.totalDeliveries);
    
    return achievementsList.filter(achievement => {
      switch (achievement.id) {
        case 'speed_king':
          return achievement.condition(averageDeliveryTime, allAvgTimes);
        case 'reliable':
          return achievement.condition(completionRate);
        case 'top_performer':
          return achievement.condition(courier?.rating || 0);
        case 'volume_master':
          return achievement.condition(completedDeliveries.length, allTotals);
        case 'on_fire':
          return achievement.condition(todayDeliveries.length);
        default:
          return false;
      }
    });
  }, [averageDeliveryTime, completionRate, courier?.rating, completedDeliveries.length, todayDeliveries.length, allCouriersStats]);

  // נתונים לגרף ביצועים לאורך זמן
  const performanceData = useMemo(() => {
    const days: { [key: string]: { date: string; deliveries: number; earnings: number; avgTime: number } } = {};
    
    const startDate = timeRange === 'week' ? subWeeks(new Date(), 1) :
                      timeRange === 'month' ? subWeeks(new Date(), 4) :
                      subWeeks(new Date(), 12);
    
    const relevantDeliveries = completedDeliveries.filter(d => d.deliveredAt && d.deliveredAt >= startDate);
    
    relevantDeliveries.forEach(delivery => {
      if (!delivery.deliveredAt) return;
      const dateKey = format(delivery.deliveredAt, 'yyyy-MM-dd');
      
      if (!days[dateKey]) {
        days[dateKey] = {
          date: format(delivery.deliveredAt, 'd/M', { locale: he }),
          deliveries: 0,
          earnings: 0,
          avgTime: 0
        };
      }
      
      days[dateKey].deliveries += 1;
      days[dateKey].earnings += delivery.price;
      days[dateKey].avgTime += delivery.estimatedTime;
    });
    
    // חישוב ממוצע זמן
    Object.values(days).forEach(day => {
      day.avgTime = day.deliveries > 0 ? Math.round(day.avgTime / day.deliveries) : 0;
    });
    
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [completedDeliveries, timeRange]);

  // סינון משלוחים
  const filteredDeliveries = useMemo(() => {
    let filtered = courierDeliveries;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(d => d.status === filterStatus);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(d => 
        d.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.restaurantName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [courierDeliveries, filterStatus, searchQuery]);

  if (!courier) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Bike className="w-16 h-16 text-[#e5e5e5] dark:text-[#404040] mb-4" />
        <h2 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">
          שליח לא נמצא
        </h2>
        <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mb-4">
          השליח שחיפשת אינו קיים במערכת
        </p>
        <button
          onClick={() => navigate('/couriers')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0fcdd3] text-white rounded-lg hover:bg-[#0ab8c5] transition-colors"
        >
          <ArrowRight size={16} />
          <span>חזרה לשליחים</span>
        </button>
      </div>
    );
  }

  const statusConfig = {
    available: {
      label: 'זמין',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-500/20'
    },
    busy: {
      label: 'עסוק',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-500/20'
    },
    offline: {
      label: 'לא פעיל',
      color: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-500/20'
    }
  };

  const config = statusConfig[courier.status];
  const isCourierAvailable = courier.status !== 'offline';

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  weekStart.setHours(0, 0, 0, 0);

  const shiftAssignments = useMemo(
    () =>
      state.shifts.flatMap((shift) =>
        shift.courierAssignments
          .filter((assignment) => assignment.courierId === courierId)
          .map((assignment) => ({
            ...assignment,
            shiftDate: shift.date,
          }))
      ),
    [state.shifts, courierId]
  );

  const todayWorkedMinutes = useMemo(
    () =>
      shiftAssignments
        .reduce((sum, assignment) => sum + getWorkedMinutesWithinRange(assignment, todayStart, tomorrowStart), 0),
    [shiftAssignments, todayStart, tomorrowStart]
  );

  const weekWorkedMinutes = useMemo(
    () =>
      shiftAssignments
        .reduce((sum, assignment) => sum + getWorkedMinutesWithinRange(assignment, weekStart, now), 0),
    [shiftAssignments, now, weekStart]
  );

  const attendanceDateFormatter = useMemo(
    () => new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }),
    []
  );

  const monthlyAttendanceHeatmap = useMemo(() => {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const days = monthDays.map((date) => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const workedMinutes = shiftAssignments.reduce(
        (sum, assignment) => sum + getWorkedMinutesWithinRange(assignment, dayStart, dayEnd),
        0
      );

      return {
        key: format(date, 'yyyy-MM-dd'),
        date,
        workedMinutes,
      };
    });

    const maxWorkedMinutes = days.reduce((max, day) => Math.max(max, day.workedMinutes), 0);
    const activeDays = days.filter((day) => day.workedMinutes > 0).length;
    const totalWorkedMinutes = days.reduce((sum, day) => sum + day.workedMinutes, 0);
    const peakDay = days.reduce<typeof days[number] | null>(
      (best, day) => (!best || day.workedMinutes > best.workedMinutes ? day : best),
      null
    );

    const getIntensity = (workedMinutes: number): 0 | 1 | 2 | 3 | 4 => {
      if (workedMinutes <= 0 || maxWorkedMinutes === 0) return 0;
      const ratio = workedMinutes / maxWorkedMinutes;
      if (ratio < 0.25) return 1;
      if (ratio < 0.5) return 2;
      if (ratio < 0.75) return 3;
      return 4;
    };

    const weeks: Array<Array<(typeof days)[number] & { intensity: 0 | 1 | 2 | 3 | 4 }>> = [];
    const leadingEmpty = monthStart.getDay();

    for (let index = 0; index < leadingEmpty; index += 1) {
      if (!weeks[0]) weeks[0] = [];
      weeks[0].push({
        key: `empty-start-${index}`,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - (leadingEmpty - index)),
        workedMinutes: 0,
        intensity: 0,
      });
    }

    days.forEach((day) => {
      const weekIndex = Math.floor((leadingEmpty + day.date.getDate() - 1) / 7);
      if (!weeks[weekIndex]) weeks[weekIndex] = [];
      weeks[weekIndex].push({
        ...day,
        intensity: getIntensity(day.workedMinutes),
      });
    });

    weeks.forEach((week, weekIndex) => {
      while (week.length < 7) {
        week.push({
          key: `empty-end-${weekIndex}-${week.length}`,
          date: new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + (week.length + 1)),
          workedMinutes: 0,
          intensity: 0,
        });
      }
    });

    return {
      monthLabel: format(monthStart, 'LLLL yyyy', { locale: he }),
      weeks,
      activeDays,
      totalWorkedMinutes,
      maxWorkedMinutes,
      peakDay,
    };
  }, [now, shiftAssignments]);

  const getAttendanceCellTone = (intensity: 0 | 1 | 2 | 3 | 4, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return 'bg-transparent border-transparent';
    if (intensity === 0) return 'bg-[#f5f5f5] border-[#ececec] dark:bg-[#111111] dark:border-[#1f1f1f]';
    if (intensity === 1) return 'bg-[#e9f9de] border-[#d8f1c8] dark:bg-[#17301a] dark:border-[#234626]';
    if (intensity === 2) return 'bg-[#cdefb2] border-[#bfe6a2] dark:bg-[#204823] dark:border-[#2c6230]';
    if (intensity === 3) return 'bg-[#9fe870] border-[#94da67] dark:bg-[#2f6a2a] dark:border-[#3c8435]';
    return 'bg-[#5cbf4a] border-[#54ae44] dark:bg-[#4a9d3d] dark:border-[#5ab54b]';
  };

  const handleAvailabilityToggle = () => {
    dispatch({
      type: 'UPDATE_COURIER_STATUS',
      payload: {
        courierId: courier.id,
        status: isCourierAvailable ? 'offline' : 'available',
      },
    });
  };

  const handleDeleteCourier = () => {
    if (courier.activeDeliveryIds.length > 0) {
      toast.error('\u05d0\u05d9 \u05d0\u05e4\u05e9\u05e8 \u05dc\u05de\u05d7\u05d5\u05e7 \u05e9\u05dc\u05d9\u05d7 \u05e2\u05dd \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05e4\u05e2\u05d9\u05dc\u05d9\u05dd.');
      return;
    }

    if (!window.confirm(`\u05dc\u05de\u05d7\u05d5\u05e7 \u05d0\u05ea ${courier.name}?`)) {
      return;
    }

    dispatch({ type: 'REMOVE_COURIER', payload: courier.id });
    toast.success(`\u05d4\u05e9\u05dc\u05d9\u05d7 ${courier.name} \u05e0\u05de\u05d7\u05e7.`);
    navigate('/couriers');
  };

  return (
    <div className="flex flex-col h-full bg-[#fafafa] dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-white dark:bg-[#171717] border-b border-[#e5e5e5] dark:border-[#262626]">
        <div className="p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/couriers')}
              className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-lg transition-colors"
            >
              <ArrowRight size={20} className="text-[#666d80] dark:text-[#d4d4d4]" />
            </button>
            
            {/* תמונת פרופיל */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0fcdd3] to-[#0ab8c5] flex items-center justify-center text-white text-2xl font-bold">
                {courier.name.charAt(0)}
              </div>
              <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white dark:border-[#171717] ${
                courier.status === 'available' ? 'bg-green-500' :
                courier.status === 'busy' ? 'bg-orange-500' :
                'bg-gray-500'
              }`} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                  {courier.name}
                </h1>
                {earnedAchievements.length > 0 && (
                  <div className="flex items-center gap-1">
                    {earnedAchievements.slice(0, 3).map(achievement => {
                      const Icon = achievement.icon;
                      return (
                        <div 
                          key={achievement.id}
                          className={`p-1.5 rounded-lg ${achievement.bg}`}
                          title={achievement.name}
                        >
                          <Icon size={14} className={achievement.color} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {courier.rating}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[#666d80] dark:text-[#a3a3a3]">
                  <Trophy size={14} />
                  <span className="text-sm">דירוג #{courierRanking.rank} מתוך {courierRanking.total}</span>
                </div>
              </div>
            </div>

            <div className="text-center px-4 border-r border-[#e5e5e5] dark:border-[#262626]">
              <div className="text-xs text-[#666d80] dark:text-[#a3a3a3] mb-1">משלוחים פעילים</div>
              <div className="text-3xl font-bold text-[#0fcdd3]">
                {activeDeliveries.length}
              </div>
            </div>

            <div className="text-center px-4">
              <div className="text-xs text-[#666d80] dark:text-[#a3a3a3] mb-1">היום</div>
              <div className="text-3xl font-bold text-[#16a34a] dark:text-[#22c55e]">
                {todayDeliveries.length}
              </div>
            </div>

            <button
              onClick={handleAvailabilityToggle}
              className={`mr-2 inline-flex items-center gap-2 rounded-[4px] px-3 py-2 text-sm font-medium transition-colors ${
                isCourierAvailable
                  ? 'bg-[#262626] text-white hover:bg-[#171717] dark:bg-[#fafafa] dark:text-[#0d0d12] dark:hover:bg-[#e5e5e5]'
                  : 'bg-[#9fe870] text-[#0d0d12] hover:bg-[#8ddf59]'
              }`}
            >
              <Power size={15} />
              <span>{isCourierAvailable ? '\u05d4\u05e4\u05d5\u05da \u05dc\u05dc\u05d0 \u05d6\u05de\u05d9\u05df' : '\u05d4\u05e4\u05d5\u05da \u05dc\u05d6\u05de\u05d9\u05df'}</span>
            </button>

            <button
              onClick={handleDeleteCourier}
              className="inline-flex items-center gap-2 rounded-[4px] border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 size={15} />
              <span>{'\u05de\u05d7\u05e7 \u05e9\u05dc\u05d9\u05d7'}</span>
            </button>
          </div>
        </div>

        {/* הישגים ותגים */}
        {earnedAchievements.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Award size={16} className="text-[#666d80] dark:text-[#a3a3a3]" />
              <span className="text-sm font-bold text-[#666d80] dark:text-[#a3a3a3]">הישגים:</span>
              {earnedAchievements.map(achievement => {
                const Icon = achievement.icon;
                return (
                  <div 
                    key={achievement.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${achievement.bg}`}
                  >
                    <Icon size={14} className={achievement.color} />
                    <span className={`text-xs font-bold ${achievement.color}`}>
                      {achievement.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                  <Package size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">סה"כ משלוחים</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    <CountUp end={courierDeliveries.length} duration={1.5} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                  <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">הושלמו</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    <CountUp end={completedDeliveries.length} duration={1.5} />
                    <span className="text-sm text-green-600 dark:text-green-400 mr-2">
                      ({completionRate}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                  <DollarSign size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">הכנסות</div>
                  <div className="text-2xl font-bold text-[#16a34a] dark:text-[#22c55e]">
                    ₪<CountUp end={totalEarnings} duration={1.5} separator="," />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
                  <Timer size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">זמן ממוצע</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    <CountUp end={averageDeliveryTime} duration={1.5} />
                    <span className="text-sm"> דק'</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg">
                  <Clock size={20} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">שעות עבודה</div>
                  <div className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {formatWorkedDuration(todayWorkedMinutes)}
                  </div>
                  <div className="text-[11px] text-[#666d80] dark:text-[#a3a3a3]">
                    השבוע: {formatWorkedDuration(weekWorkedMinutes)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* דירוג יחסי */}
          <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] flex items-center gap-2">
                <Users size={20} />
                דירוג יחסי
              </h2>
              <div className="flex items-center gap-2">
                <Trophy className="text-yellow-500" size={20} />
                <span className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                  #{courierRanking.rank}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">מיקום בקבוצה</span>
                  <span className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    Top {courierRanking.percentage}%
                  </span>
                </div>
                <div className="h-2 bg-[#e5e5e5] dark:bg-[#262626] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#0fcdd3] to-[#0ab8c5] rounded-full transition-all duration-1000"
                    style={{ width: `${courierRanking.percentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3] mb-1">משלוחים</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    #{allCouriersStats.sort((a, b) => b.totalDeliveries - a.totalDeliveries).findIndex(c => c.id === courierId) + 1}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3] mb-1">מהירות</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    #{allCouriersStats.filter(c => c.avgTime > 0).sort((a, b) => a.avgTime - b.avgTime).findIndex(c => c.id === courierId) + 1}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3] mb-1">דירוג</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    #{allCouriersStats.sort((a, b) => b.rating - a.rating).findIndex(c => c.id === courierId) + 1}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* גרף ביצועים לאורך זמן */}
          <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] flex items-center gap-2">
                <TrendingUp size={20} />
                ביצועים לאורך זמן
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimeRange('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    timeRange === 'week'
                      ? 'bg-[#0fcdd3] text-white'
                      : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#666d80] dark:text-[#a3a3a3] hover:bg-[#e5e5e5] dark:hover:bg-[#404040]'
                  }`}
                >
                  שבוע
                </button>
                <button
                  onClick={() => setTimeRange('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    timeRange === 'month'
                      ? 'bg-[#0fcdd3] text-white'
                      : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#666d80] dark:text-[#a3a3a3] hover:bg-[#e5e5e5] dark:hover:bg-[#404040]'
                  }`}
                >
                  חודש
                </button>
                <button
                  onClick={() => setTimeRange('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    timeRange === 'all'
                      ? 'bg-[#0fcdd3] text-white'
                      : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#666d80] dark:text-[#a3a3a3] hover:bg-[#e5e5e5] dark:hover:bg-[#404040]'
                  }`}
                >
                  הכל
                </button>
              </div>
            </div>

            <div className="mb-6 rounded-[4px] border border-[#ececec] bg-[#fafafa] p-4 dark:border-[#262626] dark:bg-[#111111]">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#0d0d12] dark:text-[#fafafa] flex items-center gap-2">
                    <Calendar size={18} />
                    <span>{'\u0043\u006f\u006e\u0074\u0072\u0069\u0062\u0075\u0074\u0069\u006f\u006e \u0048\u0065\u0061\u0074\u006d\u0061\u0070 \u05e9\u05dc \u05e0\u05d5\u05db\u05d7\u05d5\u05ea \u05d7\u05d5\u05d3\u05e9\u05d9\u05ea'}</span>
                  </h3>
                  <div className="mt-1 text-xs text-[#666d80] dark:text-[#a3a3a3]">
                    {monthlyAttendanceHeatmap.monthLabel}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[#8b93a6] dark:text-[#737373]">{'\u05d9\u05de\u05d9\u05dd \u05e4\u05e2\u05d9\u05dc\u05d9\u05dd'}</div>
                  <div className="mt-1 text-lg font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                    {monthlyAttendanceHeatmap.activeDays.toLocaleString('he-IL')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <div className="text-[11px] text-[#8b93a6] dark:text-[#737373]">{'\u05e1\u05d4\u05f4\u05db \u05e9\u05e2\u05d5\u05ea \u05d4\u05d7\u05d5\u05d3\u05e9'}</div>
                  <div className="mt-1 text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                    {formatWorkedDuration(monthlyAttendanceHeatmap.totalWorkedMinutes)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#8b93a6] dark:text-[#737373]">{'\u05e9\u05d9\u05d0 \u05d9\u05d5\u05de\u05d9'}</div>
                  <div className="mt-1 text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                    {formatWorkedDuration(monthlyAttendanceHeatmap.maxWorkedMinutes)}
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <div className="text-[11px] text-[#8b93a6] dark:text-[#737373]">{'\u05d9\u05d5\u05dd \u05e9\u05d9\u05d0'}</div>
                  <div className="mt-1 text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                    {monthlyAttendanceHeatmap.peakDay
                      ? attendanceDateFormatter.format(monthlyAttendanceHeatmap.peakDay.date)
                      : '\u05d0\u05d9\u05df \u05e2\u05d3\u05d9\u05d9\u05df \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {monthlyAttendanceHeatmap.weeks.map((week, weekIndex) => (
                  <div key={`attendance-week-${weekIndex}`} className="grid grid-cols-7 gap-2">
                    {week.map((day) => {
                      const isCurrentMonth = day.date.getMonth() === now.getMonth();
                      const isToday = day.key === toDateKey(now);
                      return (
                        <div
                          key={day.key}
                          title={
                            isCurrentMonth
                              ? `${attendanceDateFormatter.format(day.date)}\n${formatWorkedDuration(day.workedMinutes)}`
                              : ''
                          }
                          className={`h-12 rounded-[4px] border transition-colors ${getAttendanceCellTone(day.intensity, isCurrentMonth)} ${isToday ? 'ring-1 ring-[#0d0d12]/20 dark:ring-[#fafafa]/25' : ''}`}
                        >
                          <div className="flex h-full flex-col justify-between px-2 py-1.5">
                            <span className={`text-[11px] font-medium ${isCurrentMonth ? 'text-[#0d0d12] dark:text-[#fafafa]' : 'text-[#a3a3a3] dark:text-[#404040]'}`}>
                              {day.date.getDate()}
                            </span>
                            <span className={`text-[10px] ${isCurrentMonth ? 'text-[#4b5563] dark:text-[#d4d4d4]' : 'text-transparent'}`}>
                              {isCurrentMonth && day.workedMinutes > 0 ? formatWorkedDuration(day.workedMinutes) : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {performanceData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" key="courier-performance-chart">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#666d80"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#666d80"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="deliveries" 
                      stroke="#0fcdd3" 
                      strokeWidth={2}
                      name="משלוחים"
                      dot={{ fill: '#0fcdd3', r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="#16a34a" 
                      strokeWidth={2}
                      name="הכנסות (₪)"
                      dot={{ fill: '#16a34a', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-[#666d80] dark:text-[#a3a3a3]">
                אין נתונים להצגה
              </div>
            )}
          </div>

          {/* Courier Info */}
          <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-6">
            <h2 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
              פרטי שליח
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">טלפון</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {courier.phone}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Star size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">דירוג</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {courier.rating} ⭐
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">סטטוס</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {config.label}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">משלוחים מבוטלים</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {cancelledDeliveries.length} ({courierDeliveries.length > 0 ? Math.round((cancelledDeliveries.length / courierDeliveries.length) * 100) : 0}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* היסטוריית משלוחים מלאה */}
          <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] flex items-center gap-2">
                <Package size={20} />
                היסטוריית משלוחים
                <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                  ({filteredDeliveries.length})
                </span>
              </h2>
            </div>

            {/* סינונים וחיפוש */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666d80] dark:text-[#a3a3a3]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חיפוש לפי מספר הזמנה, לקוח או מסעדה..."
                  className="w-full pr-10 pl-4 py-2 bg-[#f5f5f5] dark:bg-[#262626] border border-[#e5e5e5] dark:border-[#404040] rounded-lg text-sm text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#a3a3a3]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-[#0fcdd3] text-white'
                      : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#666d80] dark:text-[#a3a3a3]'
                  }`}
                >
                  הכל
                </button>
                <button
                  onClick={() => setFilterStatus('delivered')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                    filterStatus === 'delivered'
                      ? 'bg-green-500 text-white'
                      : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#666d80] dark:text-[#a3a3a3]'
                  }`}
                >
                  נמסרו
                </button>
                <button
                  onClick={() => setFilterStatus('cancelled')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                    filterStatus === 'cancelled'
                      ? 'bg-red-500 text-white'
                      : 'bg-[#f5f5f5] dark:bg-[#262626] text-[#666d80] dark:text-[#a3a3a3]'
                  }`}
                >
                  בוטלו
                </button>
              </div>
            </div>

            {/* רשימת משלוחים */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredDeliveries.map((delivery) => {
                const restaurant = state.restaurants.find(r => r.name === delivery.restaurantName);
                return (
                  <button
                    key={delivery.id}
                    onClick={() => navigate(`/delivery/${delivery.id}`)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-lg transition-colors text-right border border-transparent hover:border-[#0fcdd3]"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        delivery.status === 'delivered' ? 'bg-green-100 dark:bg-green-500/20' :
                        delivery.status === 'cancelled' ? 'bg-red-100 dark:bg-red-500/20' :
                        'bg-blue-100 dark:bg-blue-500/20'
                      }`}>
                        <Package size={16} className={
                          delivery.status === 'delivered' ? 'text-green-600 dark:text-green-400' :
                          delivery.status === 'cancelled' ? 'text-red-600 dark:text-red-400' :
                          'text-blue-600 dark:text-blue-400'
                        } />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                            {delivery.orderNumber}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            delivery.status === 'delivered' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' :
                            delivery.status === 'cancelled' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                            'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          }`}>
                            {delivery.status === 'delivered' ? 'נמסר' :
                             delivery.status === 'cancelled' ? 'בוטל' : 'פעיל'}
                          </span>
                        </div>
                        <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                          {restaurant?.name} → {delivery.customerName}
                        </div>
                        <div className="text-xs text-[#666d80] dark:text-[#a3a3a3] mt-1">
                          {delivery.address}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <div className="text-sm font-bold text-[#16a34a] dark:text-[#22c55e]">
                          ₪{delivery.price}
                        </div>
                        <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                          {delivery.estimatedTime} דק'
                        </div>
                      </div>
                      <div className="text-xs text-[#666d80] dark:text-[#a3a3a3] text-left">
                        {formatDistanceToNow(delivery.createdAt, { addSuffix: true, locale: he })}
                      </div>
                      <ArrowRight size={16} className="text-[#666d80] dark:text-[#a3a3a3] rotate-180" />
                    </div>
                  </button>
                );
              })}
              {filteredDeliveries.length === 0 && (
                <div className="text-center py-12 text-[#666d80] dark:text-[#a3a3a3]">
                  {searchQuery ? 'לא נמצאו תוצאות לחיפוש' : 'אין משלוחים עדיין'}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
