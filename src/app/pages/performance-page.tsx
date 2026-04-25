import React from 'react';
import { useDelivery } from '../context/delivery-context-value';
import { format as formatDate } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { PageToolbar } from '../components/common/page-toolbar';
import {
  ToolbarPeriodControl,
  type PeriodMode,
} from '../components/common/toolbar-period-control';
import { ModuleScaffold } from '../components/common/module-scaffold';

const matchesCourier = (
  delivery: any,
  courier: { id: string; name: string }
) =>
  delivery.courierId === courier.id ||
  delivery.runner_id === courier.id ||
  delivery.courierName === courier.name;

const matchesRestaurant = (
  delivery: any,
  restaurant: { id: string; name: string }
) =>
  delivery.restaurantId === restaurant.id ||
  delivery.rest_id === restaurant.id ||
  delivery.restaurantName === restaurant.name ||
  delivery.rest_name === restaurant.name;

export const PerformancePage: React.FC = () => {
  const { state } = useDelivery();
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>('current_month');
  const [monthAnchor, setMonthAnchor] = React.useState(new Date());
  const [customStartDate, setCustomStartDate] = React.useState(
    formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  );
  const [customEndDate, setCustomEndDate] = React.useState(formatDate(new Date(), 'yyyy-MM-dd'));

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

  const couriersInRangeCount = React.useMemo(() => {
    return state.couriers.filter((courier) => {
      const hasDelivery = deliveriesInRange.some((delivery) => matchesCourier(delivery, courier));
      if (hasDelivery) return true;

      return state.shifts.some((shift) => {
        const shiftDate = new Date(`${shift.date}T12:00:00`);
        if (shiftDate < dateRange.start || shiftDate > dateRange.end) return false;
        return shift.courierAssignments.some((assignment) => assignment.courierId === courier.id);
      });
    }).length;
  }, [dateRange.end, dateRange.start, deliveriesInRange, state.couriers, state.shifts]);

  const restaurantsInRangeCount = React.useMemo(() => {
    return state.restaurants.filter((restaurant) =>
      deliveriesInRange.some((delivery) => matchesRestaurant(delivery, restaurant))
    ).length;
  }, [deliveriesInRange, state.restaurants]);
  const deliveredCount = deliveriesInRange.filter((delivery) => delivery.status === 'delivered').length;
  const cancelledCount = deliveriesInRange.filter((delivery) => delivery.status === 'cancelled').length;
  const activeCount = deliveriesInRange.filter((delivery) =>
    delivery.status === 'pending' || delivery.status === 'assigned' || delivery.status === 'delivering'
  ).length;
  const completionRate = deliveriesInRange.length > 0
    ? Math.round((deliveredCount / deliveriesInRange.length) * 100)
    : 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f5f5f5] dark:bg-[#0a0a0a]">
      <div dir="rtl">
        <PageToolbar
          periodControl={
            <ToolbarPeriodControl
              periodMode={periodMode}
              setPeriodMode={setPeriodMode}
              monthAnchor={monthAnchor}
              setMonthAnchor={setMonthAnchor}
              customStartDate={customStartDate}
              setCustomStartDate={setCustomStartDate}
              customEndDate={customEndDate}
              setCustomEndDate={setCustomEndDate}
            />
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ModuleScaffold
          icon={<TrendingUp className="h-5 w-5" />}
          title="ביצועים"
          subtitle="מסך הביצועים צריך להפוך את הפעילות התפעולית לתמונה ברורה: איחורים, ניצול שליחים, מסעדות בעייתיות ועמידה בהתחייבויות."
          statusLabel="מחובר חלקית"
          statusTone="warning"
          metrics={[
            {
              label: 'משלוחים בטווח',
              value: deliveriesInRange.length.toLocaleString('he-IL'),
              helper: 'לפי פילטר התאריך',
              tone: 'info',
            },
            {
              label: 'שיעור מסירה',
              value: `${completionRate}%`,
              helper: `${deliveredCount.toLocaleString('he-IL')} נמסרו`,
              tone: completionRate >= 85 ? 'success' : 'warning',
            },
            {
              label: 'פעילים עכשיו',
              value: activeCount.toLocaleString('he-IL'),
              helper: 'ממתינים, שובצו או בדרך',
            },
            {
              label: 'בוטלו',
              value: cancelledCount.toLocaleString('he-IL'),
              helper: 'דורש סיבת ביטול בהמשך',
              tone: cancelledCount > 0 ? 'warning' : 'default',
            },
          ]}
          sections={[
            {
              title: 'מדדי מוצר שחייבים להיכנס',
              description: 'זה המסך שיגיד לחברת משלוחים איפה היא מרוויחה זמן ואיפה היא מפסידה.',
              items: [
                'עמידה בזמן התחייבות מרגע שיבוץ ועד לקוח.',
                'זמן המתנה במסעדה מול זמן הכנה.',
                'איחורים לפי מסעדה, שליח, אזור ושעה ביום.',
                'ניצול משמרות: כמה זמן שליח היה זמין מול עובד בפועל.',
              ],
            },
            {
              title: 'הנתונים שכבר קיימים בדמו',
              description: 'אפשר להתחיל לחבר את המסך הזה בלי לחכות לבקאנד מלא.',
              items: [
                `${couriersInRangeCount.toLocaleString('he-IL')} שליחים הופיעו בפעילות בטווח.`,
                `${restaurantsInRangeCount.toLocaleString('he-IL')} מסעדות יצרו משלוחים בטווח.`,
                'קיימים זמני יצירה, שיבוץ, איסוף ומסירה שאפשר להפוך למדדים.',
              ],
            },
          ]}
        />
      </div>
    </div>
  );
};
