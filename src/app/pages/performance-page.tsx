import React from 'react';
import { useDelivery } from '../context/delivery.context';
import { format as formatDate } from 'date-fns';
import { PageToolbar } from '../components/common/page-toolbar';
import {
  ToolbarPeriodControl,
  type PeriodMode,
} from '../components/common/toolbar-period-control';

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

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] flex flex-col">
      <div dir="rtl">
        <PageToolbar
          title="ביצועים"
          onToggleMobileSidebar={() => (window as any).toggleMobileSidebar?.()}
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
          summary={`${deliveriesInRange.length} משלוחים • ${couriersInRangeCount} שליחים • ${restaurantsInRangeCount} מסעדות`}
        />
      </div>

      <div className="flex-1" />
    </div>
  );
};
