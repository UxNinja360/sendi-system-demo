import type {
  CourierShiftAssignment,
  DeliveryState,
  WorkShift,
} from '../types/delivery.types';

const STALE_SHIFT_GRACE_MS = 10 * 60 * 1000;
const EARLY_SHIFT_START_GRACE_MS = 4 * 60 * 60 * 1000;

type ActiveShiftCandidate = {
  assignment: CourierShiftAssignment;
  shift: WorkShift;
  startedAt: Date;
};

const getValidDate = (value: Date | string | number | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const addMinutes = (date: Date, minutes: number) => {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
};

const getShiftBounds = (shift: WorkShift) => {
  const date = parseDateKey(shift.date);
  const startMinutes = timeToMinutes(shift.startTime);
  let endMinutes = timeToMinutes(shift.endTime);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return {
    start: addMinutes(date, startMinutes),
    end: addMinutes(date, endMinutes),
  };
};

const getShiftStatusFromAssignments = (
  assignments: Array<{ startedAt: Date | null; endedAt: Date | null }>
) => {
  if (assignments.some((assignment) => assignment.startedAt && !assignment.endedAt)) {
    return 'active' as const;
  }

  if (assignments.length > 0 && assignments.every((assignment) => assignment.endedAt)) {
    return 'completed' as const;
  }

  return 'planned' as const;
};

const isLiveAssignmentStillValid = (
  shift: WorkShift,
  assignment: CourierShiftAssignment,
  state: DeliveryState,
  now: Date
) => {
  const courier = state.couriers.find((item) => item.id === assignment.courierId);
  const startedAt = getValidDate(assignment.startedAt);
  const endedAt = getValidDate(assignment.endedAt);

  if (!courier || courier.status === 'offline' || !startedAt || endedAt) {
    return false;
  }

  const bounds = getShiftBounds(shift);
  const nowMs = now.getTime();

  if (startedAt.getTime() > nowMs + STALE_SHIFT_GRACE_MS) {
    return false;
  }

  if (nowMs > bounds.end.getTime() + STALE_SHIFT_GRACE_MS) {
    return false;
  }

  if (nowMs < bounds.start.getTime() - EARLY_SHIFT_START_GRACE_MS) {
    return false;
  }

  return true;
};

const getAssignmentCloseTime = (shift: WorkShift, now: Date) => {
  const { end } = getShiftBounds(shift);
  return end.getTime() < now.getTime() ? end : now;
};

const pickActiveAssignments = (state: DeliveryState, now: Date) => {
  const activeByCourier = new Map<string, ActiveShiftCandidate>();

  state.shifts.forEach((shift) => {
    shift.courierAssignments.forEach((assignment) => {
      if (!assignment.startedAt || assignment.endedAt) return;
      if (!isLiveAssignmentStillValid(shift, assignment, state, now)) return;

      const startedAt = getValidDate(assignment.startedAt);
      if (!startedAt) return;

      const existing = activeByCourier.get(assignment.courierId);
      if (!existing) {
        activeByCourier.set(assignment.courierId, { assignment, shift, startedAt });
        return;
      }

      const courier = state.couriers.find((item) => item.id === assignment.courierId);
      const currentAssignmentId = courier?.currentShiftAssignmentId;
      const shouldPreferCurrent =
        assignment.id === currentAssignmentId &&
        existing.assignment.id !== currentAssignmentId;
      const shouldPreferLatest = startedAt.getTime() > existing.startedAt.getTime();

      if (shouldPreferCurrent || shouldPreferLatest) {
        activeByCourier.set(assignment.courierId, { assignment, shift, startedAt });
      }
    });
  });

  return activeByCourier;
};

export const sanitizeLoadedDeliveryState = (
  state: DeliveryState,
  now: Date = new Date()
): DeliveryState => {
  const activeByCourier = pickActiveAssignments(state, now);
  const activeAssignmentIds = new Set(
    Array.from(activeByCourier.values()).map(({ assignment }) => assignment.id)
  );

  const shifts = state.shifts.map((shift) => {
    let changed = false;
    const courierAssignments = shift.courierAssignments.map((assignment) => {
      if (!assignment.startedAt || assignment.endedAt || activeAssignmentIds.has(assignment.id)) {
        return assignment;
      }

      changed = true;
      return {
        ...assignment,
        endedAt: getAssignmentCloseTime(shift, now),
      };
    });

    if (!changed) return shift;

    return {
      ...shift,
      courierAssignments,
      status: getShiftStatusFromAssignments(courierAssignments),
    };
  });

  const liveDeliveryIdsByCourier = new Map<string, string[]>();
  state.deliveries.forEach((delivery) => {
    if (
      !delivery.courierId ||
      (delivery.status !== 'assigned' && delivery.status !== 'delivering')
    ) {
      return;
    }

    const deliveryIds = liveDeliveryIdsByCourier.get(delivery.courierId) ?? [];
    deliveryIds.push(delivery.id);
    liveDeliveryIdsByCourier.set(delivery.courierId, deliveryIds);
  });

  const couriers = state.couriers.map((courier) => {
    const activeCandidate = activeByCourier.get(courier.id);
    const activeDeliveryIds = Array.from(new Set(liveDeliveryIdsByCourier.get(courier.id) ?? []));
    const status =
      courier.status === 'offline'
        ? 'offline'
        : activeDeliveryIds.length > 0
          ? 'busy'
          : 'available';

    if (activeCandidate) {
      return {
        ...courier,
        status,
        isOnShift: true,
        shiftStartedAt: activeCandidate.startedAt,
        shiftEndedAt: null,
        currentShiftAssignmentId: activeCandidate.assignment.id,
        activeDeliveryIds,
      };
    }

    return {
      ...courier,
      status,
      isOnShift: false,
      shiftEndedAt: courier.isOnShift ? now : courier.shiftEndedAt,
      currentShiftAssignmentId: null,
      activeDeliveryIds,
    };
  });

  return {
    ...state,
    shifts,
    couriers,
  };
};
