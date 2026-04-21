import {
  DayOfWeek,
  DeliveryAction,
  Delivery,
  DeliveryState,
  DeliveryStatus,
  Restaurant,
  ShiftTemplate,
  WeeklyShiftDayConfig,
  WorkShift,
} from '../types/delivery.types';

const getCourierStatusAfterLoadChange = (
  courierStatus: 'available' | 'busy' | 'offline',
  activeDeliveryIds: string[]
) => {
  if (courierStatus === 'offline') return 'offline' as const;
  return activeDeliveryIds.length >= 1 ? 'busy' as const : 'available' as const;
};

const getDeliveryRoutePriorityTime = (delivery: Delivery) => {
  const candidate =
    delivery.estimatedArrivalAtCustomer ??
    delivery.should_delivered_time ??
    delivery.assignedAt ??
    delivery.pickedUpAt ??
    delivery.createdAt;

  return candidate instanceof Date ? candidate.getTime() : new Date(candidate).getTime();
};

const getNextDropoffDeliveryId = (
  deliveries: Delivery[],
  courierId: string,
  excludedDeliveryIds: string[] = []
) => {
  const excludedIds = new Set(excludedDeliveryIds);

  const nextDelivery = deliveries
    .filter(
      (delivery) =>
        delivery.courierId === courierId &&
        delivery.status === 'delivering' &&
        !delivery.started_dropoff &&
        !excludedIds.has(delivery.id)
    )
    .sort((left, right) => {
      const priorityDelta = getDeliveryRoutePriorityTime(left) - getDeliveryRoutePriorityTime(right);
      if (priorityDelta !== 0) return priorityDelta;

      const pickupDelta =
        (left.pickedUpAt?.getTime() ?? left.assignedAt?.getTime() ?? left.createdAt.getTime()) -
        (right.pickedUpAt?.getTime() ?? right.assignedAt?.getTime() ?? right.createdAt.getTime());
      if (pickupDelta !== 0) return pickupDelta;

      return left.orderNumber.localeCompare(right.orderNumber, 'he');
    })[0];

  return nextDelivery?.id ?? null;
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

const updateCourierActiveDeliveries = (
  couriers: DeliveryState['couriers'],
  courierId: string,
  transformActiveDeliveryIds: (activeDeliveryIds: string[]) => string[]
) =>
  couriers.map((courier) => {
    if (courier.id !== courierId) return courier;

    const activeDeliveryIds = transformActiveDeliveryIds(courier.activeDeliveryIds);
    return {
      ...courier,
      activeDeliveryIds,
      status: getCourierStatusAfterLoadChange(courier.status, activeDeliveryIds),
    };
  });

const withStartedDropoffForNextDelivery = (
  deliveries: Delivery[],
  courierId: string | null | undefined,
  now: Date,
  excludedDeliveryIds: string[] = []
) => {
  if (!courierId) return deliveries;

  const nextDropoffDeliveryId = getNextDropoffDeliveryId(deliveries, courierId, excludedDeliveryIds);
  if (!nextDropoffDeliveryId) return deliveries;

  return deliveries.map((delivery) =>
    delivery.id === nextDropoffDeliveryId
      ? {
          ...delivery,
          started_dropoff: delivery.started_dropoff ?? now,
        }
      : delivery
  );
};

const updateDeliveriesForStatusChange = (
  deliveries: Delivery[],
  deliveryId: string,
  status: DeliveryStatus,
  now: Date
) =>
  deliveries.map((delivery) => {
    if (delivery.id !== deliveryId) return delivery;

    const updated = { ...delivery, status };
    if (status === 'delivering') {
      updated.arrivedAtRestaurantAt = now;
      updated.arrived_at_rest = now;
      updated.pickedUpAt = updated.pickedUpAt ?? now;
      updated.took_it_time = updated.took_it_time ?? now;
      updated.started_pickup = updated.started_pickup ?? updated.assignedAt ?? now;
    }

    return updated;
  });

const shouldStartDropoffForCourier = (
  deliveries: Delivery[],
  courierId: string | null | undefined,
  currentDeliveryId: string
) => {
  if (!courierId) return false;

  const hasAssignedDeliveries = deliveries.some(
    (delivery) =>
      delivery.id !== currentDeliveryId &&
      delivery.courierId === courierId &&
      delivery.status === 'assigned'
  );

  const hasActiveDropoff = deliveries.some(
    (delivery) =>
      delivery.courierId === courierId &&
      delivery.status === 'delivering' &&
      !!delivery.started_dropoff
  );

  return !hasAssignedDeliveries && !hasActiveDropoff;
};

const shouldStartNextDropoffAfterCompletion = (
  deliveries: Delivery[],
  courierId: string | null | undefined,
  currentDeliveryId: string
) => {
  if (!courierId) return false;

  return !deliveries.some(
    (delivery) =>
      delivery.id !== currentDeliveryId &&
      delivery.courierId === courierId &&
      delivery.status === 'delivering' &&
      !!delivery.started_dropoff
  );
};

const updateDeliveriesForCompletion = (
  deliveries: Delivery[],
  deliveryId: string,
  now: Date
) =>
  deliveries.map((delivery) =>
    delivery.id === deliveryId
      ? {
          ...delivery,
          status: 'delivered' as DeliveryStatus,
          started_dropoff: delivery.started_dropoff ?? delivery.pickedUpAt ?? now,
          deliveredAt: now,
          delivered_time: now,
          arrived_at_client: now,
          arrivedAtCustomerAt: now,
        }
      : delivery
  );

const updateDeliveriesForCancellation = (
  deliveries: Delivery[],
  deliveryId: string,
  cancelledAfterPickup: boolean,
  now: Date
) =>
  deliveries.map((delivery) =>
    delivery.id === deliveryId
      ? {
          ...delivery,
          status: 'cancelled' as DeliveryStatus,
          cancelledAt: now,
          cancelledAfterPickup,
        }
      : delivery
  );

const updateCourierAfterCompletedDelivery = (
  couriers: DeliveryState['couriers'],
  courierId: string | null | undefined,
  deliveryId: string
) => {
  if (!courierId) return couriers;

  return updateCourierActiveDeliveries(couriers, courierId, (activeDeliveryIds) =>
    activeDeliveryIds.filter((id) => id !== deliveryId)
  ).map((courier) =>
    courier.id === courierId
      ? {
          ...courier,
          totalDeliveries: courier.totalDeliveries + 1,
        }
      : courier
  );
};

const updateCourierAfterCancelledDelivery = (
  couriers: DeliveryState['couriers'],
  courierId: string | null | undefined,
  deliveryId: string
) => {
  if (!courierId) return couriers;

  return updateCourierActiveDeliveries(couriers, courierId, (activeDeliveryIds) =>
    activeDeliveryIds.filter((id) => id !== deliveryId)
  );
};

const endShiftAssignmentsForOfflineCourier = (
  shifts: DeliveryState['shifts'],
  currentShiftAssignmentId: string | null | undefined,
  now: Date
) => {
  if (!currentShiftAssignmentId) return shifts;

  return shifts.map((shift) => {
    let didChange = false;
    const nextAssignments = shift.courierAssignments.map((assignment) => {
      if (assignment.id === currentShiftAssignmentId && !assignment.endedAt) {
        didChange = true;
        return { ...assignment, endedAt: now };
      }

      return assignment;
    });

    return didChange
      ? {
          ...shift,
          courierAssignments: nextAssignments,
          status: getShiftStatusFromAssignments(nextAssignments),
        }
      : shift;
  });
};

const updateCourierStatusState = (
  couriers: DeliveryState['couriers'],
  courierId: string,
  status: DeliveryState['couriers'][number]['status'],
  now: Date
) =>
  couriers.map((courier) =>
    courier.id === courierId
      ? {
          ...courier,
          status,
          isOnShift: status === 'offline' ? false : courier.isOnShift,
          shiftEndedAt: status === 'offline' && courier.isOnShift ? now : courier.shiftEndedAt,
          currentShiftAssignmentId:
            status === 'offline' ? null : courier.currentShiftAssignmentId,
        }
      : courier
  );

const resolveEmergencyTemplateState = (
  shiftTemplates: DeliveryState['shiftTemplates'],
  todayKey: string,
  weekStartKey: string,
  weekEndKey: string
) => {
  const emergencyTemplate =
    shiftTemplates.find(
      (template) =>
        template.name === EMERGENCY_SHIFT_NAME &&
        (template.activeStartDate ?? '0000-01-01') <= todayKey &&
        (template.activeEndDate ?? '9999-12-31') >= todayKey
    ) ?? null;

  const emergencyTemplateId = emergencyTemplate?.id ?? `template-emergency-${weekStartKey}`;
  const nextShiftTemplates = emergencyTemplate
    ? shiftTemplates
    : [
        ...shiftTemplates,
        {
          id: emergencyTemplateId,
          name: EMERGENCY_SHIFT_NAME,
          type: 'full' as const,
          startTime: '00:00',
          endTime: '23:59',
          slots: [],
          requiredCouriers: 0,
          activeStartDate: weekStartKey,
          activeEndDate: weekEndKey,
        },
      ];

  return {
    emergencyTemplate,
    emergencyTemplateId,
    nextShiftTemplates,
  };
};

const buildEmergencySlotState = (
  emergencyTemplate: DeliveryState['shiftTemplates'][number] | null,
  existingEmergencyShift: DeliveryState['shifts'][number] | null,
  courierId: string
) => {
  const assignedSlotIds = new Set(
    existingEmergencyShift?.courierAssignments.map((assignment) => assignment.slotId) ?? []
  );
  const emergencySlotNumbers = [...assignedSlotIds]
    .map((slotId) => {
      const match = slotId.match(/slot-emergency-(\d+)/);
      return match ? Number(match[1]) : null;
    })
    .filter((value): value is number => value !== null);
  const nextEmergencySlotNumber =
    emergencySlotNumbers.length > 0 ? Math.max(...emergencySlotNumbers) + 1 : 1;

  const newSlot = {
    id: `slot-emergency-${nextEmergencySlotNumber}-${Date.now()}-${courierId}`,
    label: `${EMERGENCY_SHIFT_NAME} ${nextEmergencySlotNumber}`,
  };

  const hydratedEmergencySlots = [...(emergencyTemplate?.slots ?? [])];
  assignedSlotIds.forEach((slotId) => {
    if (hydratedEmergencySlots.some((slot) => slot.id === slotId)) return;

    const match = slotId.match(/slot-emergency-(\d+)/);
    const slotNumber = match ? Number(match[1]) : hydratedEmergencySlots.length + 1;
    hydratedEmergencySlots.push({
      id: slotId,
      label: `${EMERGENCY_SHIFT_NAME} ${slotNumber}`,
    });
  });

  return {
    assignedSlotIds,
    newSlot,
    nextEmergencyTemplateSlots: [...hydratedEmergencySlots, newSlot],
  };
};

const closeActiveCourierAssignmentsForShiftStart = (
  shifts: DeliveryState['shifts'],
  courierId: string,
  now: Date
) => {
  const activeAssignmentIdsToClose = new Set<string>();

  const nextShiftsBase = shifts.map((shift) => {
    let didChange = false;
    const nextAssignments = shift.courierAssignments.map((assignment) => {
      if (assignment.courierId !== courierId || !assignment.startedAt || assignment.endedAt) {
        return assignment;
      }

      didChange = true;
      activeAssignmentIdsToClose.add(assignment.id);
      return {
        ...assignment,
        endedAt: now,
      };
    });

    return didChange
      ? {
          ...shift,
          courierAssignments: nextAssignments,
          status: getShiftStatusFromAssignments(nextAssignments),
        }
      : shift;
  });

  return {
    nextShiftsBase,
    activeAssignmentIdsToClose,
  };
};

const upsertEmergencyShift = (
  shifts: DeliveryState['shifts'],
  existingEmergencyShift: DeliveryState['shifts'][number] | null,
  nextEmergencyShift: DeliveryState['shifts'][number]
) =>
  existingEmergencyShift
    ? shifts.map((shift) => (shift.id === existingEmergencyShift.id ? nextEmergencyShift : shift))
    : [...shifts, nextEmergencyShift].sort((a, b) =>
        a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
      );

const updateCouriersForStartedShift = (
  couriers: DeliveryState['couriers'],
  courierId: string,
  assignmentId: string,
  activeAssignmentIdsToClose: Set<string>,
  now: Date
) =>
  couriers.map((courier) =>
    courier.id === courierId
      ? {
          ...courier,
          isOnShift: true,
          shiftStartedAt: now,
          shiftEndedAt: null,
          currentShiftAssignmentId: assignmentId,
        }
      : activeAssignmentIdsToClose.has(courier.currentShiftAssignmentId ?? '')
        ? {
            ...courier,
            isOnShift: false,
            shiftEndedAt: now,
            currentShiftAssignmentId: null,
          }
        : courier
  );

const endCourierShiftAssignments = (
  shifts: DeliveryState['shifts'],
  currentShiftAssignmentId: string | null | undefined,
  now: Date
) => {
  if (!currentShiftAssignmentId) return shifts;

  return shifts.map((shift) => {
    let didChange = false;
    const nextAssignments = shift.courierAssignments.map((assignment) => {
      if (assignment.id === currentShiftAssignmentId && !assignment.endedAt) {
        didChange = true;
        return {
          ...assignment,
          startedAt: assignment.startedAt ?? now,
          endedAt: now,
        };
      }

      return assignment;
    });

    return didChange
      ? {
          ...shift,
          courierAssignments: nextAssignments,
          status: getShiftStatusFromAssignments(nextAssignments),
        }
      : shift;
  });
};

const updateCourierAfterShiftEnd = (
  couriers: DeliveryState['couriers'],
  courierId: string,
  now: Date
) =>
  couriers.map((courier) =>
    courier.id === courierId
      ? {
          ...courier,
          isOnShift: false,
          shiftEndedAt: now,
          currentShiftAssignmentId: null,
        }
      : courier
  );

const removeShiftAndResetCouriers = (
  shifts: DeliveryState['shifts'],
  couriers: DeliveryState['couriers'],
  shiftId: string,
  now: Date
) => {
  const deletedShift = shifts.find((shift) => shift.id === shiftId);
  const deletedAssignmentIds = new Set(
    deletedShift?.courierAssignments.map((assignment) => assignment.id) ?? []
  );

  return {
    shifts: shifts.filter((shift) => shift.id !== shiftId),
    couriers: couriers.map((courier) =>
      courier.currentShiftAssignmentId &&
      deletedAssignmentIds.has(courier.currentShiftAssignmentId)
        ? {
            ...courier,
            isOnShift: false,
            shiftEndedAt: now,
            currentShiftAssignmentId: null,
          }
        : courier
    ),
  };
};

const resetCouriersForRemovedAssignments = (
  couriers: DeliveryState['couriers'],
  assignmentIds: Set<string>,
  now: Date
) => {
  if (assignmentIds.size === 0) return couriers;

  return couriers.map((courier) =>
    courier.currentShiftAssignmentId && assignmentIds.has(courier.currentShiftAssignmentId)
      ? {
          ...courier,
          isOnShift: false,
          shiftEndedAt: now,
          currentShiftAssignmentId: null,
        }
      : courier
  );
};

const createShiftTemplateState = (
  shiftTemplates: DeliveryState['shiftTemplates'],
  weeklyShiftConfig: DeliveryState['weeklyShiftConfig'],
  template: ShiftTemplate
) => ({
  shiftTemplates: [...shiftTemplates, template],
  weeklyShiftConfig: weeklyShiftConfig.map((config) =>
    config.isClosed || config.templateIds.includes(template.id)
      ? config
      : { ...config, templateIds: [...config.templateIds, template.id] }
  ),
});

const updateShiftTemplateState = (
  shiftTemplates: DeliveryState['shiftTemplates'],
  templateId: string,
  updates: Partial<Omit<ShiftTemplate, 'id'>>
) =>
  shiftTemplates.map((template) =>
    template.id === templateId ? { ...template, ...updates } : template
  );

const deleteShiftTemplateState = (
  state: DeliveryState,
  templateId: string,
  cutoffDate: string,
  now: Date
) => {
  const removedAssignmentIds = new Set(
    state.shifts
      .filter((shift) => shift.templateId === templateId && shift.date >= cutoffDate)
      .flatMap((shift) => shift.courierAssignments.map((assignment) => assignment.id))
  );

  return {
    shiftTemplates: state.shiftTemplates.filter((template) => template.id !== templateId),
    weeklyShiftConfig: state.weeklyShiftConfig.map((config) => ({
      ...config,
      templateIds: config.templateIds.filter((id) => id !== templateId),
    })),
    shifts: state.shifts.filter(
      (shift) => !(shift.templateId === templateId && shift.date >= cutoffDate)
    ),
    couriers: resetCouriersForRemovedAssignments(state.couriers, removedAssignmentIds, now),
  };
};

const moveShiftTemplateState = (
  shiftTemplates: DeliveryState['shiftTemplates'],
  templateId: string,
  direction: 'up' | 'down'
) => {
  const currentIndex = shiftTemplates.findIndex((template) => template.id === templateId);
  if (currentIndex === -1) return shiftTemplates;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= shiftTemplates.length) return shiftTemplates;

  const nextTemplates = [...shiftTemplates];
  const [movedTemplate] = nextTemplates.splice(currentIndex, 1);
  nextTemplates.splice(targetIndex, 0, movedTemplate);

  return nextTemplates;
};

const setWeeklyShiftDayState = (
  weeklyShiftConfig: DeliveryState['weeklyShiftConfig'],
  nextDayConfig: WeeklyShiftDayConfig
) => {
  const nextWeeklyConfig = weeklyShiftConfig.some(
    (config) => config.dayOfWeek === nextDayConfig.dayOfWeek
  )
    ? weeklyShiftConfig.map((config) =>
        config.dayOfWeek === nextDayConfig.dayOfWeek ? nextDayConfig : config
      )
    : [...weeklyShiftConfig, nextDayConfig];

  return nextWeeklyConfig.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
};

const ensureWeekShiftsState = (
  state: DeliveryState,
  startDate: string,
  endDate: string,
  now: Date
) => {
  const result = materializeWeekShifts(
    state.shifts,
    state.shiftTemplates,
    state.weeklyShiftConfig,
    startDate,
    endDate
  );

  if (!result.changed) return null;

  const removedShiftAssignmentIds = new Set(
    state.shifts
      .filter((shift) => shift.templateId && isDateInRange(shift.date, startDate, endDate))
      .filter((shift) => !result.shifts.some((nextShift) => nextShift.id === shift.id))
      .flatMap((shift) => shift.courierAssignments.map((assignment) => assignment.id))
  );

  return {
    shifts: result.shifts,
    couriers: resetCouriersForRemovedAssignments(
      state.couriers,
      removedShiftAssignmentIds,
      now
    ),
  };
};

const createShiftState = (
  shifts: DeliveryState['shifts'],
  shift: WorkShift
) => [...shifts, shift];

const updateShiftState = (
  shifts: DeliveryState['shifts'],
  shiftId: string,
  updates: Partial<Omit<WorkShift, 'id' | 'courierAssignments' | 'createdAt'>>
) =>
  shifts.map((shift) =>
    shift.id === shiftId
      ? {
          ...shift,
          ...updates,
        }
      : shift
  );

const assignCourierToShiftState = (
  shifts: DeliveryState['shifts'],
  couriers: DeliveryState['couriers'],
  shiftId: string,
  courierId: string,
  slotId: string,
  now: Date
) => {
  const removedAssignmentIds = new Set<string>();

  const nextShifts = shifts.map((shift) => {
    if (shift.id !== shiftId) return shift;

    const nextAssignmentsBase = shift.courierAssignments.filter((assignment) => {
      const shouldRemove = assignment.slotId === slotId && !assignment.endedAt;
      if (shouldRemove) {
        removedAssignmentIds.add(assignment.id);
      }
      return !shouldRemove;
    });

    const nextAssignments = [
      ...nextAssignmentsBase,
      {
        id: `shift-assignment-${now.getTime()}-${courierId}-${slotId}`,
        courierId,
        slotId,
        startedAt: null,
        endedAt: null,
      },
    ];

    return {
      ...shift,
      courierAssignments: nextAssignments,
      status: getShiftStatusFromAssignments(nextAssignments),
    };
  });

  const nextCouriers =
    removedAssignmentIds.size === 0
      ? couriers
      : couriers.map((courier) =>
          courier.currentShiftAssignmentId &&
          removedAssignmentIds.has(courier.currentShiftAssignmentId)
            ? {
                ...courier,
                isOnShift: false,
                shiftEndedAt: now,
                currentShiftAssignmentId: null,
              }
            : courier
        );

  return {
    shifts: nextShifts,
    couriers: nextCouriers,
  };
};

const removeCourierFromShiftState = (
  shifts: DeliveryState['shifts'],
  couriers: DeliveryState['couriers'],
  shiftId: string,
  assignmentId: string,
  now: Date
) => ({
  shifts: shifts.map((shift) => {
    if (shift.id !== shiftId) return shift;

    const nextAssignments = shift.courierAssignments.filter(
      (assignment) => assignment.id !== assignmentId
    );

    return {
      ...shift,
      courierAssignments: nextAssignments,
      status: getShiftStatusFromAssignments(nextAssignments),
    };
  }),
  couriers: couriers.map((courier) =>
    courier.currentShiftAssignmentId === assignmentId
      ? {
          ...courier,
          isOnShift: false,
          shiftEndedAt: now,
          currentShiftAssignmentId: null,
        }
      : courier
  ),
});

const startShiftAssignmentState = (
  shifts: DeliveryState['shifts'],
  couriers: DeliveryState['couriers'],
  shiftId: string,
  assignmentId: string,
  now: Date
) => {
  const targetShift = shifts.find((shift) => shift.id === shiftId);
  const assignment = targetShift?.courierAssignments.find((item) => item.id === assignmentId);
  const courier = assignment
    ? couriers.find((item) => item.id === assignment.courierId)
    : null;

  if (!targetShift || !assignment || !courier || courier.status === 'offline') {
    return null;
  }

  return {
    shifts: shifts.map((shift) => {
      const nextAssignments = shift.courierAssignments.map((item) => {
        if (item.courierId !== assignment.courierId) return item;

        if (shift.id === shiftId && item.id === assignmentId) {
          return {
            ...item,
            startedAt: item.startedAt ?? now,
            endedAt: null,
          };
        }

        if (item.startedAt && !item.endedAt) {
          return {
            ...item,
            endedAt: now,
          };
        }

        return item;
      });

      return {
        ...shift,
        courierAssignments: nextAssignments,
        status: getShiftStatusFromAssignments(nextAssignments),
      };
    }),
    couriers: couriers.map((item) =>
      item.id === assignment.courierId
        ? {
            ...item,
            isOnShift: true,
            shiftStartedAt: now,
            shiftEndedAt: null,
            currentShiftAssignmentId: assignmentId,
          }
        : item
    ),
  };
};

const endShiftAssignmentState = (
  shifts: DeliveryState['shifts'],
  couriers: DeliveryState['couriers'],
  shiftId: string,
  assignmentId: string,
  now: Date
) => {
  const targetShift = shifts.find((shift) => shift.id === shiftId);
  const assignment = targetShift?.courierAssignments.find((item) => item.id === assignmentId);

  if (!targetShift || !assignment) {
    return null;
  }

  return {
    shifts: shifts.map((shift) => {
      if (shift.id !== shiftId) return shift;

      const nextAssignments = shift.courierAssignments.map((item) =>
        item.id === assignmentId
          ? {
              ...item,
              startedAt: item.startedAt ?? now,
              endedAt: now,
            }
          : item
      );

      return {
        ...shift,
        courierAssignments: nextAssignments,
        status: getShiftStatusFromAssignments(nextAssignments),
      };
    }),
    couriers: couriers.map((item) =>
      item.id === assignment.courierId
        ? {
            ...item,
            isOnShift: false,
            shiftEndedAt: now,
            currentShiftAssignmentId: null,
          }
        : item
    ),
  };
};

const removeCourierState = (
  shifts: DeliveryState['shifts'],
  couriers: DeliveryState['couriers'],
  courierId: string
) => {
  const courier = couriers.find((item) => item.id === courierId);
  if (courier && courier.activeDeliveryIds.length > 0) {
    return null;
  }

  return {
    shifts: shifts.map((shift) => {
      const nextAssignments = shift.courierAssignments.filter(
        (assignment) => assignment.courierId !== courierId
      );

      return nextAssignments.length === shift.courierAssignments.length
        ? shift
        : {
            ...shift,
            courierAssignments: nextAssignments,
            status: getShiftStatusFromAssignments(nextAssignments),
          };
    }),
    couriers: couriers.filter((item) => item.id !== courierId),
  };
};

const toggleRestaurantState = (
  restaurants: DeliveryState['restaurants'],
  restaurantId: string
) =>
  restaurants.map((restaurant) =>
    restaurant.id === restaurantId
      ? { ...restaurant, isActive: !restaurant.isActive }
      : restaurant
  );

const updateRestaurantState = (
  restaurants: DeliveryState['restaurants'],
  restaurantId: string,
  updates: Partial<DeliveryState['restaurants'][number]>
) =>
  restaurants.map((restaurant) =>
    restaurant.id === restaurantId
      ? {
          ...restaurant,
          ...updates,
          defaultPreparationTime:
            typeof updates.defaultPreparationTime === 'number' &&
            updates.defaultPreparationTime > 0
              ? updates.defaultPreparationTime
              : restaurant.defaultPreparationTime,
          maxDeliveryTime:
            typeof updates.maxDeliveryTime === 'number' &&
            updates.maxDeliveryTime > 0
              ? updates.maxDeliveryTime
              : restaurant.maxDeliveryTime,
        }
      : restaurant
  );

const removeRestaurantState = (
  deliveries: DeliveryState['deliveries'],
  restaurants: DeliveryState['restaurants'],
  restaurantId: string
) => {
  const hasActiveDeliveries = deliveries.some(
    (delivery) =>
      delivery.restaurantId === restaurantId &&
      delivery.status !== 'delivered' &&
      delivery.status !== 'cancelled'
  );

  if (hasActiveDeliveries) {
    return null;
  }

  return restaurants.filter((restaurant) => restaurant.id !== restaurantId);
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const EMERGENCY_SHIFT_NAME = '\u05d1\u05dc\u05ea"\u05dd';

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
};

const isDateInRange = (date: string, startDate: string, endDate: string) => date >= startDate && date <= endDate;
const isTemplateActiveOnDate = (
  template: ShiftTemplate,
  date: string,
) => {
  const activeStartDate = template.activeStartDate ?? '0000-01-01';
  const activeEndDate = template.activeEndDate ?? '9999-12-31';
  return date >= activeStartDate && date <= activeEndDate;
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const getShiftWindow = (shift: WorkShift) => {
  const start = timeToMinutes(shift.startTime);
  let end = timeToMinutes(shift.endTime);
  if (end <= start) {
    end += 24 * 60;
  }
  return { start, end };
};

const shiftsOverlap = (left: WorkShift, right: WorkShift) => {
  if (left.date !== right.date) return false;
  const leftWindow = getShiftWindow(left);
  const rightWindow = getShiftWindow(right);
  return leftWindow.start < rightWindow.end && rightWindow.start < leftWindow.end;
};

const canAssignCourierToShift = (state: DeliveryState, shiftId: string, courierId: string) => {
  const shift = state.shifts.find((item) => item.id === shiftId);
  const courier = state.couriers.find((item) => item.id === courierId);
  if (!shift || !courier) return false;
  // מניעת כפל: אם השליח כבר משובץ באותה משמרת ועדיין לא סיים — חסום
  if (shift.courierAssignments.some((assignment) => assignment.courierId === courierId && !assignment.endedAt)) return false;

  // מניעת חפיפה: שליח לא יכול להיות בשתי משמרות חופפות, אלא אם סיים את הקודמת
  return !state.shifts.some((candidate) => {
    if (candidate.id === shift.id) return false;
    if (!shiftsOverlap(candidate, shift)) return false;
    return candidate.courierAssignments.some((assignment) => assignment.courierId === courierId && !assignment.endedAt);
  });
};

const materializeWeekShifts = (
  existingShifts: WorkShift[],
  shiftTemplates: ShiftTemplate[],
  weeklyShiftConfig: WeeklyShiftDayConfig[],
  startDate: string,
  endDate: string
) => {
  const emergencyTemplateIds = new Set(
    shiftTemplates
      .filter((template) => template.name === EMERGENCY_SHIFT_NAME)
      .map((template) => template.id)
  );
  const templateMap = new Map(
    shiftTemplates
      .filter((template) => template.name !== EMERGENCY_SHIFT_NAME)
      .map((template) => [template.id, template])
  );
  const configMap = new Map(weeklyShiftConfig.map((config) => [config.dayOfWeek, config]));

  const desiredKeys = new Set<string>();
  let changed = false;
  const materialized: WorkShift[] = [];

  const cursor = parseDateKey(startDate);
  const end = parseDateKey(endDate);

  while (cursor <= end) {
    const dayKey = toDateKey(cursor);
    const dayOfWeek = cursor.getDay() as DayOfWeek;
    const config = configMap.get(dayOfWeek);

    if (config && !config.isClosed) {
      config.templateIds.forEach((templateId) => {
        if (emergencyTemplateIds.has(templateId)) return;
        const template = templateMap.get(templateId);
        if (!template) return;
        if (!isTemplateActiveOnDate(template, dayKey)) return;
        const validSlotIds = new Set(template.slots.map((slot) => slot.id));
        const existingShift = existingShifts.find((shift) => shift.templateId === templateId && shift.date === dayKey);
        const filteredAssignments =
          existingShift?.courierAssignments.filter((assignment) => validSlotIds.has(assignment.slotId)) ?? [];
        const shiftKey = `${dayKey}:${templateId}`;
        desiredKeys.add(shiftKey);
        if (existingShift) {
          const mergedShift: WorkShift =
            existingShift.name !== template.name ||
            existingShift.startTime !== template.startTime ||
            existingShift.endTime !== template.endTime ||
            existingShift.type !== template.type ||
            existingShift.requiredCouriers !== template.slots.length ||
            filteredAssignments.length !== existingShift.courierAssignments.length
              ? {
                  ...existingShift,
                  name: template.name,
                  startTime: template.startTime,
                  endTime: template.endTime,
                  requiredCouriers: template.slots.length,
                  courierAssignments: filteredAssignments,
                  status: getShiftStatusFromAssignments(filteredAssignments),
                  type: template.type,
                }
              : existingShift;

          if (mergedShift !== existingShift) {
            changed = true;
          }
          materialized.push(mergedShift);
        } else {
          changed = true;
          materialized.push({
            id: `shift-${dayKey}-${templateId}`,
            templateId,
            name: template.name,
            date: dayKey,
            startTime: template.startTime,
            endTime: template.endTime,
            requiredCouriers: template.slots.length,
            type: template.type,
            status: 'planned',
            courierAssignments: [],
            createdAt: new Date(),
          });
        }
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  const removedTemplateShiftIds = existingShifts
    .filter(
      (shift) =>
        shift.templateId &&
        !emergencyTemplateIds.has(shift.templateId) &&
        shift.name !== EMERGENCY_SHIFT_NAME &&
        isDateInRange(shift.date, startDate, endDate)
    )
    .filter((shift) => !desiredKeys.has(`${shift.date}:${shift.templateId}`))
    .map((shift) => shift.id);

  if (removedTemplateShiftIds.length > 0) {
    changed = true;
  }

  const nextShifts = existingShifts
    .filter((shift) => {
      if (shift.templateId && emergencyTemplateIds.has(shift.templateId)) return true;
      if (shift.name === EMERGENCY_SHIFT_NAME) return true;
      if (!shift.templateId) return true;
      if (!isDateInRange(shift.date, startDate, endDate)) return true;
      return desiredKeys.has(`${shift.date}:${shift.templateId}`);
    })
    .map((shift) => {
      if (!shift.templateId || !isDateInRange(shift.date, startDate, endDate)) return shift;
      return materialized.find((item) => item.id === shift.id) ?? shift;
    });

  materialized.forEach((shift) => {
    if (!nextShifts.some((item) => item.id === shift.id)) {
      nextShifts.push(shift);
    }
  });

  nextShifts.sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));

  return {
    shifts: changed ? nextShifts : existingShifts,
    changed,
  };
};

// מחשב סטטיסטיקות
const calculateStats = (deliveries: Delivery[]) => {
  const now = new Date();
  const hourStart = new Date(now.getTime() - 60 * 60 * 1000); // שעה אחורה
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const calculatePeriod = (startDate: Date) => {
    const periodDeliveries = deliveries.filter(d => d.createdAt >= startDate);
    const delivered = periodDeliveries.filter(d => d.status === 'delivered').length;
    const cancelled = periodDeliveries.filter(d => d.status === 'cancelled').length;
    const revenue = periodDeliveries
      .filter(d => d.status === 'delivered')
      .reduce((sum, d) => sum + d.price, 0);

    return {
      total: periodDeliveries.length,
      delivered,
      cancelled,
      revenue,
    };
  };

  return {
    hour: calculatePeriod(hourStart),
    today: calculatePeriod(todayStart),
    week: calculatePeriod(weekStart),
    month: calculatePeriod(monthStart),
    year: calculatePeriod(yearStart),
  };
};

const getRestaurantPreparationTime = (restaurant: Restaurant) =>
  typeof restaurant.defaultPreparationTime === 'number' && restaurant.defaultPreparationTime > 0
    ? restaurant.defaultPreparationTime
    : 15;

const getRestaurantMaxDeliveryTime = (restaurant: Restaurant) =>
  typeof restaurant.maxDeliveryTime === 'number' && restaurant.maxDeliveryTime > 0
    ? restaurant.maxDeliveryTime
    : 60;

const getRecentRestaurantDeliveries = (
  deliveries: Delivery[],
  restaurantName: string,
  referenceTime = new Date()
) => {
  const oneHourAgo = new Date(referenceTime.getTime() - 60 * 60 * 1000);

  return deliveries.filter(
    (delivery) =>
      delivery.restaurantName === restaurantName &&
      new Date(delivery.createdAt) >= oneHourAgo
  );
};

const getRestaurantCapacityDelayMinutes = (
  recentDeliveries: Delivery[],
  referenceTime = new Date()
) => {
  if (recentDeliveries.length === 0) return null;

  const oldestDelivery = [...recentDeliveries].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )[0];

  const nextAvailableTime = new Date(new Date(oldestDelivery.createdAt).getTime() + 60 * 60 * 1000);
  return Math.ceil((nextAvailableTime.getTime() - referenceTime.getTime()) / 1000 / 60);
};

const normalizeIncomingDelivery = (payload: Delivery, restaurant: Restaurant) => {
  const preparationTime =
    typeof payload.preparationTime === 'number' && payload.preparationTime > 0
      ? payload.preparationTime
      : typeof payload.cook_time === 'number' && payload.cook_time > 0
        ? payload.cook_time
        : getRestaurantPreparationTime(restaurant);
  const createdAt = new Date(payload.createdAt ?? payload.creation_time ?? new Date());
  const maxDeliveryTime =
    typeof payload.maxDeliveryTime === 'number' && payload.maxDeliveryTime > 0
      ? payload.maxDeliveryTime
      : typeof payload.max_time_to_deliver === 'number' && payload.max_time_to_deliver > 0
        ? payload.max_time_to_deliver
        : getRestaurantMaxDeliveryTime(restaurant);
  const orderReadyTime =
    payload.orderReadyTime ??
    new Date(createdAt.getTime() + preparationTime * 60000);

  return {
    ...payload,
    preparationTime,
    cook_time: preparationTime,
    origin_cook_time:
      typeof payload.origin_cook_time === 'number' && payload.origin_cook_time > 0
        ? payload.origin_cook_time
        : preparationTime,
    orderReadyTime,
    maxDeliveryTime,
    max_time_to_deliver: maxDeliveryTime,
    should_delivered_time:
      payload.should_delivered_time ??
      new Date(createdAt.getTime() + maxDeliveryTime * 60000),
  };
};

const getRestaurantByName = (restaurants: Restaurant[], restaurantName: string) =>
  restaurants.find((restaurant) => restaurant.name === restaurantName);

const buildStateAfterAddingDelivery = (
  state: DeliveryState,
  delivery: Delivery,
  restaurant: Restaurant,
  recentRestaurantDeliveries: Delivery[],
  maxAllowed: number
) => {
  const deliveries = [...state.deliveries, delivery];
  const deliveryBalance = state.deliveryBalance - 1;

  console.log(
    `Added delivery for ${restaurant.name} (${restaurant.type}), remaining balance: ${deliveryBalance}, hourly load: ${recentRestaurantDeliveries.length + 1}/${maxAllowed}`
  );

  return {
    ...state,
    deliveries,
    deliveryBalance,
    stats: calculateStats(deliveries),
  };
};

const reorderDeliveriesByPriority = (
  deliveries: Delivery[],
  deliveryId: string,
  newPriority: number
) =>
  deliveries.map((delivery) =>
    delivery.id === deliveryId
      ? { ...delivery, orderPriority: newPriority }
      : delivery
  );

const appendActivityLogEntry = (
  activityLogs: DeliveryState['activityLogs'],
  entry: DeliveryState['activityLogs'][number]
) => [entry, ...activityLogs].slice(0, 500);

export const deliveryReducer = (state: DeliveryState, action: DeliveryAction): DeliveryState => {
  switch (action.type) {
    case 'TOGGLE_SYSTEM':
      return {
        ...state,
        isSystemOpen: !state.isSystemOpen,
      };

    case 'TOGGLE_AUTO_ASSIGN':
      return {
        ...state,
        autoAssignEnabled: !state.autoAssignEnabled,
      };

    case 'SET_TIME_MULTIPLIER':
      console.log(`⏱️ שינוי מכפיל זמן ל-${action.payload}x`);
      return {
        ...state,
        timeMultiplier: action.payload,
      };

    case 'CREATE_SHIFT_TEMPLATE':
      return {
        ...state,
        ...createShiftTemplateState(
          state.shiftTemplates,
          state.weeklyShiftConfig,
          action.payload
        ),
      };

    case 'UPDATE_SHIFT_TEMPLATE': {
      const { templateId, updates } = action.payload;
      return {
        ...state,
        shiftTemplates: updateShiftTemplateState(state.shiftTemplates, templateId, updates),
      };
    }

    case 'DELETE_SHIFT_TEMPLATE': {
      const { templateId, effectiveFromDate } = action.payload;
      const cutoffDate = effectiveFromDate ?? toDateKey(new Date());
      const now = new Date();

      return {
        ...state,
        ...deleteShiftTemplateState(state, templateId, cutoffDate, now),
      };
    }

    case 'MOVE_SHIFT_TEMPLATE': {
      const { templateId, direction } = action.payload;
      const nextTemplates = moveShiftTemplateState(
        state.shiftTemplates,
        templateId,
        direction
      );
      if (nextTemplates === state.shiftTemplates) return state;

      return {
        ...state,
        shiftTemplates: nextTemplates,
      };
    }

    case 'SET_WEEKLY_SHIFT_DAY': {
      return {
        ...state,
        weeklyShiftConfig: setWeeklyShiftDayState(
          state.weeklyShiftConfig,
          action.payload
        ),
      };
    }

    case 'ENSURE_WEEK_SHIFTS': {
      const nextState = ensureWeekShiftsState(
        state,
        action.payload.startDate,
        action.payload.endDate,
        new Date()
      );
      if (!nextState) return state;

      return {
        ...state,
        ...nextState,
      };
    }

    case 'ADD_DELIVERY': {
      // ✅ בדיקה 1: אם אין יתרת משלוחים - לא מוסיפים משלוח
      if (state.deliveryBalance <= 0) {
        console.warn('⛔ ניסיון להוסיף משלוח ללא יתרה - נדחה');
        return state;
      }

      // ✅ בדיקה 2: בדיקת מגבלת משלוחים לשעה למסעדה (לפי סוג המסעדה)
      const restaurant = getRestaurantByName(state.restaurants, action.payload.restaurantName);
      
      if (!restaurant) {
        console.warn(`⛔ מסעדה ${action.payload.restaurantName} לא נמצאה - משלוח נדחה`);
        return state;
      }
      
      const restaurantDeliveriesInLastHour = getRecentRestaurantDeliveries(
        state.deliveries,
        action.payload.restaurantName
      );
      
      const maxAllowed = restaurant.maxDeliveriesPerHour;
      
      if (restaurantDeliveriesInLastHour.length >= maxAllowed) {
        // מצא את המשלוח הישן ביותר מהשעה האחרונה
        const oldestDelivery = restaurantDeliveriesInLastHour.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];
        
        const oldestDeliveryTime = new Date(oldestDelivery.createdAt);
        const nextAvailableTime = new Date(oldestDeliveryTime.getTime() + 60 * 60 * 1000);
        const timeUntilNext =
          getRestaurantCapacityDelayMinutes(restaurantDeliveriesInLastHour, new Date()) ?? 0;
        
        console.log(
          `ℹ️  ${action.payload.restaurantName} (${restaurant.type}): הגיע למקסימום (${maxAllowed}/${maxAllowed} בשעה האחרונה). ` +
          `משלוח חדש יתאפשר בעוד ${timeUntilNext} דקות ב-${nextAvailableTime.toLocaleTimeString('he-IL')}`
        );
        return state;
      }

      const normalizedDelivery = normalizeIncomingDelivery(action.payload, restaurant);
      return buildStateAfterAddingDelivery(
        state,
        normalizedDelivery,
        restaurant,
        restaurantDeliveriesInLastHour,
        maxAllowed
      );

      const newDeliveries = [...state.deliveries, normalizedDelivery];
      const newBalance = state.deliveryBalance - 1;
      
      console.log(`✅ משלוח נוסף: ${action.payload.restaurantName} (${restaurant.type}), יתרה נותרת: ${newBalance}, משלוחים בשעה האחרונה: ${restaurantDeliveriesInLastHour.length + 1}/${maxAllowed}`);

      return {
        ...state,
        deliveries: newDeliveries,
        deliveryBalance: newBalance,
        stats: calculateStats(newDeliveries),
      };
    }

    case 'ASSIGN_COURIER': {
      const {
        deliveryId,
        courierId,
        runner_at_assigning_latitude,
        runner_at_assigning_longitude,
      } = action.payload;
      const courier = state.couriers.find(c => c.id === courierId);
      if (!courier || courier.status === 'offline' || !courier.isOnShift) {
        return state;
      }
      const now = new Date();
      const activeCourierDeliveries = state.deliveries.filter(
        delivery =>
          delivery.courierId === courierId &&
          delivery.id !== deliveryId &&
          delivery.status !== 'delivered' &&
          delivery.status !== 'cancelled'
      );
      const newDeliveries = state.deliveries.map(d => {
        if (d.id === deliveryId) {
          const pickupStartAnchor = activeCourierDeliveries.reduce<Date | null>((latest, delivery) => {
            const candidate =
              delivery.started_dropoff ??
              delivery.pickedUpAt ??
              delivery.arrivedAtRestaurantAt ??
              delivery.estimatedArrivalAtRestaurant ??
              delivery.started_pickup ??
              delivery.assignedAt;
            if (!candidate) return latest;
            if (!latest || candidate.getTime() > latest.getTime()) return candidate;
            return latest;
          }, null);
          const startedPickupAt =
            pickupStartAnchor && pickupStartAnchor.getTime() > now.getTime()
              ? new Date(pickupStartAnchor)
              : now;
          // עדכון זמן הגעה משוער למסעדה: 5-15 דקות מעכשיו
          const estimatedRestaurantTime = new Date(startedPickupAt.getTime() + (5 + Math.random() * 10) * 60000);
          // עדכון זמן הגעה משוער ללקוח: 20-40 דקות מעכשיו
          const estimatedCustomerTime = new Date(estimatedRestaurantTime.getTime() + (20 + Math.random() * 20) * 60000);
          
          return {
            ...d, 
            courierId, 
            status: 'assigned' as DeliveryStatus, 
            assignedAt: now,
            coupled_time: now,
            started_pickup: null,
            started_dropoff: null,
            runner_at_assigning_latitude,
            runner_at_assigning_longitude,
            estimatedArrivalAtRestaurant: estimatedRestaurantTime,
            estimatedArrivalAtCustomer: estimatedCustomerTime,
          };
        }
        return d;
      });
      const newCouriers = updateCourierActiveDeliveries(
        state.couriers,
        courierId,
        (activeDeliveryIds) => [...activeDeliveryIds, deliveryId]
      );

      return {
        ...state,
        deliveries: newDeliveries,
        couriers: newCouriers,
        stats: calculateStats(newDeliveries),
      };
    }

    case 'UNASSIGN_COURIER': {
      const deliveryId = action.payload;
      const delivery = state.deliveries.find(d => d.id === deliveryId);
      if (!delivery) return state;

      const newDeliveries = state.deliveries.map(d =>
        d.id === deliveryId
          ? {
              ...d,
              courierId: null,
              status: 'pending' as DeliveryStatus,
              assignedAt: null,
              coupled_time: null,
              started_pickup: null,
              started_dropoff: null,
              estimatedArrivalAtRestaurant: null,
              estimatedArrivalAtCustomer: null,
            }
          : d
      );

      const newCouriers = delivery.courierId
        ? updateCourierActiveDeliveries(
            state.couriers,
            delivery.courierId,
            (activeDeliveryIds) => activeDeliveryIds.filter((id) => id !== deliveryId)
          )
        : state.couriers;

      return {
        ...state,
        deliveries: newDeliveries,
        couriers: newCouriers,
        stats: calculateStats(newDeliveries),
      };
    }

    case 'UPDATE_STATUS': {
      const { deliveryId, status } = action.payload;
      const now = new Date();
      const targetDelivery = state.deliveries.find(d => d.id === deliveryId);
      const deliveriesAfterStatusUpdate = updateDeliveriesForStatusChange(
        state.deliveries,
        deliveryId,
        status,
        now
      );
      const newDeliveries =
        status === 'delivering' &&
        shouldStartDropoffForCourier(
          deliveriesAfterStatusUpdate,
          targetDelivery?.courierId,
          deliveryId
        )
          ? withStartedDropoffForNextDelivery(
              deliveriesAfterStatusUpdate,
              targetDelivery?.courierId,
              now
            )
          : deliveriesAfterStatusUpdate;

      return {
        ...state,
        deliveries: newDeliveries,
        stats: calculateStats(newDeliveries),
      };

    }

    case 'UPDATE_DELIVERY': {
      const { deliveryId, updates } = action.payload;
      const newDeliveries = state.deliveries.map(d =>
        d.id === deliveryId ? { ...d, ...updates } : d
      );

      return {
        ...state,
        deliveries: newDeliveries,
        stats: calculateStats(newDeliveries),
      };
    }

    case 'COMPLETE_DELIVERY': {
      const deliveryId = action.payload;
      const delivery = state.deliveries.find(d => d.id === deliveryId);
      if (!delivery || delivery.status === 'delivered') {
        return state;
      }
      const now = new Date();

      const deliveriesAfterCompletion = updateDeliveriesForCompletion(
        state.deliveries,
        deliveryId,
        now
      );
      const newDeliveries = shouldStartNextDropoffAfterCompletion(
        deliveriesAfterCompletion,
        delivery.courierId,
        deliveryId
      )
        ? withStartedDropoffForNextDelivery(
            deliveriesAfterCompletion,
            delivery.courierId,
            now,
            [deliveryId]
          )
        : deliveriesAfterCompletion;

      const newCouriers = updateCourierAfterCompletedDelivery(
        state.couriers,
        delivery.courierId,
        deliveryId
      );

      return {
        ...state,
        deliveries: newDeliveries,
        couriers: newCouriers,
        stats: calculateStats(newDeliveries),
      };

    }

    case 'CANCEL_DELIVERY': {
      const deliveryId = action.payload;
      const delivery = state.deliveries.find(d => d.id === deliveryId);
      
      // בדיקה האם הביטול קרה אחרי שהשליח כבר אסף את ההזמנה
      const cancelledAfterPickup = delivery?.status === 'delivering';

      // ✅ החזרה ליתרה: אם הביטול קרה לפני delivering (כלומר pending או assigned)
      // במצב delivering השליח כבר בדרך עם ההזמנה, אז לא מחזירים
      const shouldRefund = delivery && ['pending', 'assigned'].includes(delivery.status);
      const cancelledAt = new Date();
      const deliveriesAfterCancellationNext = updateDeliveriesForCancellation(
        state.deliveries,
        deliveryId,
        cancelledAfterPickup,
        cancelledAt
      );
      const nextDeliveries =
        cancelledAfterPickup &&
        shouldStartNextDropoffAfterCompletion(
          deliveriesAfterCancellationNext,
          delivery?.courierId,
          deliveryId
        )
          ? withStartedDropoffForNextDelivery(
              deliveriesAfterCancellationNext,
              delivery?.courierId,
              cancelledAt,
              [deliveryId]
            )
          : deliveriesAfterCancellationNext;
      const nextCouriers = updateCourierAfterCancelledDelivery(
        state.couriers,
        delivery?.courierId,
        deliveryId
      );

      return {
        ...state,
        deliveries: nextDeliveries,
        couriers: nextCouriers,
        deliveryBalance: shouldRefund ? state.deliveryBalance + 1 : state.deliveryBalance,
        stats: calculateStats(nextDeliveries),
      };
    }

    case 'DELETE_DELIVERY': {
      const deliveryId = action.payload;
      // מחק את המשלוח מהרשימה - ללא עדכון סטטיסטיקות כביטול
      const newDeliveries = state.deliveries.filter(d => d.id !== deliveryId);

      return {
        ...state,
        deliveries: newDeliveries,
        stats: calculateStats(newDeliveries),
      };
    }

    case 'UPDATE_COURIER_STATUS': {
      const { courierId, status } = action.payload;
      const now = new Date();
      const courier = state.couriers.find((item) => item.id === courierId);
      const shouldForceEndAssignment =
        status === 'offline' &&
        courier?.currentShiftAssignmentId;

      const newShifts = shouldForceEndAssignment
        ? endShiftAssignmentsForOfflineCourier(
            state.shifts,
            courier.currentShiftAssignmentId,
            now
          )
        : state.shifts;

      const newCouriers = updateCourierStatusState(
        state.couriers,
        courierId,
        status,
        now
      );

      return {
        ...state,
        shifts: newShifts,
        couriers: newCouriers,
      };
    }

    case 'START_COURIER_SHIFT': {
        const { courierId } = action.payload;
        const courier = state.couriers.find((item) => item.id === courierId);
        if (!courier || courier.status === 'offline') return state;

      const now = new Date();
      const todayKey = toDateKey(now);
      const weekStart = startOfWeek(now);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekStartKey = toDateKey(weekStart);
      const weekEndKey = toDateKey(weekEnd);
      const { emergencyTemplate, emergencyTemplateId, nextShiftTemplates } =
        resolveEmergencyTemplateState(
          state.shiftTemplates,
          todayKey,
          weekStartKey,
          weekEndKey
        );

      const existingEmergencyShift =
        state.shifts.find(
          (shift) =>
            shift.date === todayKey &&
            (shift.templateId === emergencyTemplateId || shift.name === EMERGENCY_SHIFT_NAME)
        ) ?? null;

      const { assignedSlotIds, newSlot, nextEmergencyTemplateSlots } = buildEmergencySlotState(
        emergencyTemplate,
        existingEmergencyShift,
        courierId
      );

      const assignmentId = `shift-assignment-${Date.now()}-${courierId}-${newSlot.id}`;
      const { nextShiftsBase, activeAssignmentIdsToClose } =
        closeActiveCourierAssignmentsForShiftStart(state.shifts, courierId, now);

      const nextEmergencyShift = existingEmergencyShift
        ? {
            ...existingEmergencyShift,
            templateId: emergencyTemplateId,
            startTime: existingEmergencyShift.startTime || '00:00',
            endTime: existingEmergencyShift.endTime || '23:59',
            requiredCouriers: Math.max(existingEmergencyShift.requiredCouriers, assignedSlotIds.size + 1),
            courierAssignments: [
              ...existingEmergencyShift.courierAssignments,
              {
                id: assignmentId,
                courierId,
                slotId: newSlot.id,
                startedAt: now,
                endedAt: null,
              },
            ],
            status: 'active' as const,
          }
        : {
            id: `shift-${todayKey}-emergency`,
            templateId: emergencyTemplateId,
            name: EMERGENCY_SHIFT_NAME,
            date: todayKey,
            startTime: '00:00',
            endTime: '23:59',
            requiredCouriers: 1,
            type: 'full' as const,
            status: 'active' as const,
            courierAssignments: [
              {
                id: assignmentId,
                courierId,
                slotId: newSlot.id,
                startedAt: now,
                endedAt: null,
              },
            ],
            createdAt: now,
          };

      const nextShifts = upsertEmergencyShift(
        nextShiftsBase,
        existingEmergencyShift,
        nextEmergencyShift
      );
      const finalizedShiftTemplates = nextShiftTemplates.map((template) =>
        template.id === emergencyTemplateId
          ? {
              ...template,
              slots: nextEmergencyTemplateSlots,
              requiredCouriers: nextEmergencyTemplateSlots.length,
              activeStartDate: weekStartKey,
              activeEndDate: weekEndKey,
            }
          : template
      );

      return {
        ...state,
        shiftTemplates: finalizedShiftTemplates,
        shifts: nextShifts,
        couriers: updateCouriersForStartedShift(
          state.couriers,
          courierId,
          assignmentId,
          activeAssignmentIdsToClose,
          now
        ),
      };
    }

    case 'END_COURIER_SHIFT': {
      const { courierId } = action.payload;
      const now = new Date();
      const courier = state.couriers.find((item) => item.id === courierId);

      return {
        ...state,
        shifts: endCourierShiftAssignments(
          state.shifts,
          courier?.currentShiftAssignmentId,
          now
        ),
        couriers: updateCourierAfterShiftEnd(state.couriers, courierId, now),
      };
    }

    case 'CREATE_SHIFT': {
      return {
        ...state,
        shifts: createShiftState(state.shifts, action.payload),
      };
    }

    case 'UPDATE_SHIFT': {
      const { shiftId, updates } = action.payload;
      return {
        ...state,
        shifts: updateShiftState(state.shifts, shiftId, updates),
      };
    }

    case 'DELETE_SHIFT': {
      const { shiftId } = action.payload;
      const { shifts, couriers } = removeShiftAndResetCouriers(
        state.shifts,
        state.couriers,
        shiftId,
        new Date()
      );

      return {
        ...state,
        shifts,
        couriers,
      };
    }

    case 'ASSIGN_COURIER_TO_SHIFT': {
      const { shiftId, courierId, slotId } = action.payload;
      if (!canAssignCourierToShift(state, shiftId, courierId)) {
        return state;
      }

      const { shifts, couriers } = assignCourierToShiftState(
        state.shifts,
        state.couriers,
        shiftId,
        courierId,
        slotId,
        new Date()
      );

      return {
        ...state,
        shifts,
        couriers,
      };
    }

    case 'AUTO_ASSIGN_SHIFT': {
      const { shiftId } = action.payload;
      const targetShift = state.shifts.find((shift) => shift.id === shiftId);
      if (!targetShift) return state;

      const activeAssignmentsCount = targetShift.courierAssignments.filter((assignment) => !assignment.endedAt).length;
      const missingSlots = Math.max(targetShift.requiredCouriers - activeAssignmentsCount, 0);
      if (missingSlots === 0) return state;

      const availableCouriers = state.couriers
        .filter((courier) => canAssignCourierToShift(state, shiftId, courier.id))
        .sort((left, right) => {
          const activeShiftDiff = Number(left.isOnShift) - Number(right.isOnShift);
          if (activeShiftDiff !== 0) return activeShiftDiff;
          return left.name.localeCompare(right.name, 'he');
        })
        .slice(0, missingSlots);

      if (availableCouriers.length === 0) return state;

      return {
        ...state,
        shifts: state.shifts.map((shift) => {
          if (shift.id !== shiftId) return shift;

          const nextAssignments = [
            ...shift.courierAssignments,
            ...availableCouriers.map((courier, index) => ({
              id: `shift-assignment-${Date.now()}-${index}-${courier.id}`,
              courierId: courier.id,
              slotId: `auto-slot-${index}`,
              startedAt: null,
              endedAt: null,
            })),
          ];

          return {
            ...shift,
            courierAssignments: nextAssignments,
            status: getShiftStatusFromAssignments(nextAssignments),
          };
        }),
      };
    }

    case 'REMOVE_COURIER_FROM_SHIFT': {
      const { shiftId, assignmentId } = action.payload;
      const { shifts, couriers } = removeCourierFromShiftState(
        state.shifts,
        state.couriers,
        shiftId,
        assignmentId,
        new Date()
      );

      return {
        ...state,
        shifts,
        couriers,
      };
    }

    case 'START_SHIFT_ASSIGNMENT': {
      const { shiftId, assignmentId } = action.payload;
      const now = new Date();
      const nextState = startShiftAssignmentState(
        state.shifts,
        state.couriers,
        shiftId,
        assignmentId,
        now
      );

      if (!nextState) return state;

      return {
        ...state,
        shifts: nextState.shifts,
        couriers: nextState.couriers,
      };
    }

    case 'END_SHIFT_ASSIGNMENT': {
      const { shiftId, assignmentId } = action.payload;
      const now = new Date();
      const nextState = endShiftAssignmentState(
        state.shifts,
        state.couriers,
        shiftId,
        assignmentId,
        now
      );

      if (!nextState) return state;

      return {
        ...state,
        shifts: nextState.shifts,
        couriers: nextState.couriers,
      };
    }

    case 'ADD_COURIER': {
      return {
        ...state,
        couriers: [...state.couriers, action.payload],
      };
    }

    case 'REMOVE_COURIER': {
      const courierId = action.payload;
      const nextState = removeCourierState(state.shifts, state.couriers, courierId);
      if (!nextState) return state;

      return {
        ...state,
        shifts: nextState.shifts,
        couriers: nextState.couriers,
      };
      // בדיקה אם לשליח יש משלוחים פעילים
      const courier = state.couriers.find(c => c.id === courierId);
      if (courier && courier.activeDeliveryIds.length > 0) {
        // אם יש משלוחים פעילים, לא מורידים את השליח
        console.warn('לא ניתן להסיר שליח עם משלוחים פעילים');
        return state;
      }
      
      return {
        ...state,
        shifts: state.shifts.map((shift) => {
          const nextAssignments = shift.courierAssignments.filter(
            (assignment) => assignment.courierId !== courierId
          );

          return nextAssignments.length === shift.courierAssignments.length
            ? shift
            : {
                ...shift,
                courierAssignments: nextAssignments,
                status: getShiftStatusFromAssignments(nextAssignments),
              };
        }),
        couriers: state.couriers.filter(c => c.id !== courierId),
      };
    }

    case 'TOGGLE_RESTAURANT': {
      const restaurantId = action.payload;

      return {
        ...state,
        restaurants: toggleRestaurantState(state.restaurants, restaurantId),
      };
    }

    case 'UPDATE_RESTAURANT': {
      const { restaurantId, updates } = action.payload;
      return {
        ...state,
        restaurants: updateRestaurantState(state.restaurants, restaurantId, updates),
      };
    }

    case 'ADD_RESTAURANT': {
      return {
        ...state,
        restaurants: [...state.restaurants, action.payload],
      };
    }

    case 'REMOVE_RESTAURANT': {
      const restaurantId = action.payload;
      const nextRestaurants = removeRestaurantState(
        state.deliveries,
        state.restaurants,
        restaurantId
      );

      if (!nextRestaurants) return state;

      return {
        ...state,
        restaurants: nextRestaurants,
      };

      const hasActiveDeliveries = state.deliveries.some(d =>
        d.restaurantId === restaurantId &&
        d.status !== 'delivered' &&
        d.status !== 'cancelled'
      );

      if (hasActiveDeliveries) {
        console.warn('לא ניתן להסיר מסעדה עם משלוחים פעילים');
        return state;
      }

      return {
        ...state,
        restaurants: state.restaurants.filter(r => r.id !== restaurantId),
      };
    }

    case 'SET_RESTAURANTS': {
      return {
        ...state,
        restaurants: action.payload,
      };
    }

    case 'ADD_DELIVERY_BALANCE': {
      return {
        ...state,
        deliveryBalance: state.deliveryBalance + action.payload,
      };
    }

    case 'REORDER_DELIVERY': {
      const { deliveryId, newPriority } = action.payload;

      return {
        ...state,
        deliveries: reorderDeliveriesByPriority(
          state.deliveries,
          deliveryId,
          newPriority
        ),
      };
    }

    case 'ADD_ACTIVITY_LOG':
      return {
        ...state,
        activityLogs: appendActivityLogEntry(state.activityLogs, action.payload),
      };

    case 'CLEAR_ACTIVITY_LOGS':
      return {
        ...state,
        activityLogs: [],
      };

    case 'RESET_SYSTEM':
          return action.payload;

    default:
      return state;
  }
};
