import type React from 'react';
import { toast } from 'sonner';
import { Courier } from '../types/delivery.types';
import { buildShiftBounds, compareShiftDateTime, toLocalDateKey } from './live-couriers-view-utils';

type Dispatch = (action: {
  type:
    | 'END_SHIFT_ASSIGNMENT'
    | 'START_SHIFT_ASSIGNMENT'
    | 'END_COURIER_SHIFT'
    | 'START_COURIER_SHIFT'
    | 'UPDATE_COURIER_STATUS';
  payload: Record<string, unknown>;
}) => void;

type CourierWithRouteStops = Courier & {
  routeStops: Array<{ isPreview?: boolean }>;
};

type UseLiveCouriersViewActionsParams = {
  assignmentMode: boolean;
  couriersWithOrders: CourierWithRouteStops[];
  expandedCourierIds: Set<string>;
  selectedCourierId?: string | null;
  stateCouriers: Courier[];
  shifts: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    courierAssignments: Array<{
      id: string;
      courierId: string;
      startedAt?: Date | null;
      endedAt?: Date | null;
    }>;
  }>;
  dispatch: Dispatch;
  closeCourierMenu: () => void;
  setExpandedCourierIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onCourierClick?: (courierId: string) => void;
  onCourierExpand?: (courierId: string | null) => void;
  onClearCourierSelection?: () => void;
};

export const useLiveCouriersViewActions = ({
  assignmentMode,
  couriersWithOrders,
  expandedCourierIds,
  selectedCourierId,
  stateCouriers,
  shifts,
  dispatch,
  closeCourierMenu,
  setExpandedCourierIds,
  onCourierClick,
  onCourierExpand,
  onClearCourierSelection,
}: UseLiveCouriersViewActionsParams) => {
  const handleCourierClick = (courierId: string) => {
    if (assignmentMode) {
      onCourierClick?.(courierId);
      return;
    }

    const courier = couriersWithOrders.find((item) => item.id === courierId);
    if (!courier || courier.routeStops.filter((stop) => !stop.isPreview).length === 0) return;

    const isCurrentlyExpanded = expandedCourierIds.has(courierId);
    const isCurrentlySelected = selectedCourierId === courierId;
    const nextExpandedCourierIds = new Set(expandedCourierIds);

    if (isCurrentlyExpanded || isCurrentlySelected) {
      nextExpandedCourierIds.delete(courierId);
      setExpandedCourierIds(nextExpandedCourierIds);
      if (isCurrentlySelected) {
        onClearCourierSelection?.();
      }
      onCourierExpand?.(null);
      return;
    }

    nextExpandedCourierIds.add(courierId);
    setExpandedCourierIds(nextExpandedCourierIds);
    onCourierExpand?.(courierId);
  };

  const toggleCourierShift = (courierId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const courier = stateCouriers.find((item) => item.id === courierId);
    if (!courier) return;

    if (courier.status === 'offline') {
      toast.error('שליח לא מחובר לא יכול להתחיל משמרת.');
      return;
    }

    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const courierAssignments = shifts.flatMap((shift) =>
      shift.courierAssignments
        .filter((assignment) => assignment.courierId === courierId)
        .map((assignment) => {
          const bounds = buildShiftBounds(shift.date, shift.startTime, shift.endTime);
          const isCurrentWindow = now >= bounds.start && now <= bounds.end;
          const distanceFromStart = Math.abs(bounds.start.getTime() - now.getTime());

          return {
            shiftId: shift.id,
            assignment,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            bounds,
            isCurrentWindow,
            distanceFromStart,
          };
        })
    );

    const activeAssignment =
      courierAssignments.find(({ assignment }) => assignment.startedAt && !assignment.endedAt) ??
      courierAssignments.find(
        ({ assignment }) =>
          assignment.id === courier.currentShiftAssignmentId && assignment.startedAt && !assignment.endedAt
      );

    const nextPlannedAssignmentToday = [...courierAssignments]
      .filter(({ assignment, date }) => !assignment.startedAt && !assignment.endedAt && date === todayKey)
      .sort((left, right) => {
        if (left.isCurrentWindow !== right.isCurrentWindow) {
          return left.isCurrentWindow ? -1 : 1;
        }

        const leftFuture = left.bounds.start.getTime() >= now.getTime();
        const rightFuture = right.bounds.start.getTime() >= now.getTime();
        if (leftFuture !== rightFuture) {
          return leftFuture ? -1 : 1;
        }

        if (left.distanceFromStart !== right.distanceFromStart) {
          return left.distanceFromStart - right.distanceFromStart;
        }

        return compareShiftDateTime(left, right);
      })[0];

    if (courier.isOnShift && activeAssignment) {
      dispatch({
        type: 'END_SHIFT_ASSIGNMENT',
        payload: { shiftId: activeAssignment.shiftId, assignmentId: activeAssignment.assignment.id },
      });
    } else if (!courier.isOnShift && nextPlannedAssignmentToday) {
      dispatch({
        type: 'START_SHIFT_ASSIGNMENT',
        payload: { shiftId: nextPlannedAssignmentToday.shiftId, assignmentId: nextPlannedAssignmentToday.assignment.id },
      });
    } else {
      dispatch({
        type: courier.isOnShift ? 'END_COURIER_SHIFT' : 'START_COURIER_SHIFT',
        payload: { courierId },
      });
    }

    closeCourierMenu();
  };

  const toggleCourierStatus = (courierId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const courier = stateCouriers.find((item) => item.id === courierId);
    if (!courier) return;

    dispatch({
      type: 'UPDATE_COURIER_STATUS',
      payload: {
        courierId,
        status: courier.status === 'offline' ? 'available' : 'offline',
      },
    });

    closeCourierMenu();
  };

  const handleCourierClickWithMenuClose = (courierId: string) => {
    closeCourierMenu();
    handleCourierClick(courierId);
  };

  return {
    handleCourierClick,
    handleCourierClickWithMenuClose,
    toggleCourierShift,
    toggleCourierStatus,
  };
};

