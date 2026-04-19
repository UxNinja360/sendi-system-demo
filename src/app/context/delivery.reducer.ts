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
        shiftTemplates: [...state.shiftTemplates, action.payload],
        weeklyShiftConfig: state.weeklyShiftConfig.map((config) =>
          config.isClosed || config.templateIds.includes(action.payload.id)
            ? config
            : { ...config, templateIds: [...config.templateIds, action.payload.id] }
        ),
      };

    case 'UPDATE_SHIFT_TEMPLATE': {
      const { templateId, updates } = action.payload;
      return {
        ...state,
        shiftTemplates: state.shiftTemplates.map((template) =>
          template.id === templateId ? { ...template, ...updates } : template
        ),
      };
    }

    case 'DELETE_SHIFT_TEMPLATE': {
      const { templateId, effectiveFromDate } = action.payload;
      const cutoffDate = effectiveFromDate ?? toDateKey(new Date());
      const removedAssignmentIds = new Set(
        state.shifts
          .filter((shift) => shift.templateId === templateId && shift.date >= cutoffDate)
          .flatMap((shift) => shift.courierAssignments.map((assignment) => assignment.id))
      );

      return {
        ...state,
        shiftTemplates: state.shiftTemplates.filter((template) => template.id !== templateId),
        weeklyShiftConfig: state.weeklyShiftConfig.map((config) => ({
          ...config,
          templateIds: config.templateIds.filter((id) => id !== templateId),
        })),
        shifts: state.shifts.filter((shift) => !(shift.templateId === templateId && shift.date >= cutoffDate)),
        couriers: state.couriers.map((courier) =>
          courier.currentShiftAssignmentId && removedAssignmentIds.has(courier.currentShiftAssignmentId)
            ? {
                ...courier,
                isOnShift: false,
                shiftEndedAt: new Date(),
                currentShiftAssignmentId: null,
              }
            : courier
        ),
      };
    }

    case 'MOVE_SHIFT_TEMPLATE': {
      const { templateId, direction } = action.payload;
      const currentIndex = state.shiftTemplates.findIndex((template) => template.id === templateId);
      if (currentIndex === -1) return state;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= state.shiftTemplates.length) return state;

      const nextTemplates = [...state.shiftTemplates];
      const [movedTemplate] = nextTemplates.splice(currentIndex, 1);
      nextTemplates.splice(targetIndex, 0, movedTemplate);

      return {
        ...state,
        shiftTemplates: nextTemplates,
      };
    }

    case 'SET_WEEKLY_SHIFT_DAY': {
      const nextWeeklyConfig = state.weeklyShiftConfig.some(
        (config) => config.dayOfWeek === action.payload.dayOfWeek
      )
        ? state.weeklyShiftConfig.map((config) =>
            config.dayOfWeek === action.payload.dayOfWeek ? action.payload : config
          )
        : [...state.weeklyShiftConfig, action.payload];

      return {
        ...state,
        weeklyShiftConfig: nextWeeklyConfig.sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      };
    }

    case 'ENSURE_WEEK_SHIFTS': {
      const result = materializeWeekShifts(
        state.shifts,
        state.shiftTemplates,
        state.weeklyShiftConfig,
        action.payload.startDate,
        action.payload.endDate
      );

      if (!result.changed) return state;

      const removedShiftAssignmentIds = new Set(
        state.shifts
          .filter((shift) => shift.templateId && isDateInRange(shift.date, action.payload.startDate, action.payload.endDate))
          .filter((shift) => !result.shifts.some((nextShift) => nextShift.id === shift.id))
          .flatMap((shift) => shift.courierAssignments.map((assignment) => assignment.id))
      );

      return {
        ...state,
        shifts: result.shifts,
        couriers:
          removedShiftAssignmentIds.size === 0
            ? state.couriers
            : state.couriers.map((courier) =>
                courier.currentShiftAssignmentId && removedShiftAssignmentIds.has(courier.currentShiftAssignmentId)
                  ? {
                      ...courier,
                      isOnShift: false,
                      shiftEndedAt: new Date(),
                      currentShiftAssignmentId: null,
                    }
                  : courier
              ),
      };
    }

    case 'ADD_DELIVERY': {
      // ✅ בדיקה 1: אם אין יתרת משלוחים - לא מוסיפים משלוח
      if (state.deliveryBalance <= 0) {
        console.warn('⛔ ניסיון להוסיף משלוח ללא יתרה - נדחה');
        return state;
      }

      // ✅ בדיקה 2: בדיקת מגבלת משלוחים לשעה למסעדה (לפי סוג המסעדה)
      const restaurant = state.restaurants.find(r => r.name === action.payload.restaurantName);
      
      if (!restaurant) {
        console.warn(`⛔ מסעדה ${action.payload.restaurantName} לא נמצאה - משלוח נדחה`);
        return state;
      }
      
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const restaurantDeliveriesInLastHour = state.deliveries.filter(d => 
        d.restaurantName === action.payload.restaurantName && 
        new Date(d.createdAt) >= oneHourAgo
      );
      
      const maxAllowed = restaurant.maxDeliveriesPerHour;
      
      if (restaurantDeliveriesInLastHour.length >= maxAllowed) {
        // מצא את המשלוח הישן ביותר מהשעה האחרונה
        const oldestDelivery = restaurantDeliveriesInLastHour.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];
        
        const oldestDeliveryTime = new Date(oldestDelivery.createdAt);
        const nextAvailableTime = new Date(oldestDeliveryTime.getTime() + 60 * 60 * 1000);
        const timeUntilNext = Math.ceil((nextAvailableTime.getTime() - Date.now()) / 1000 / 60);
        
        console.log(
          `ℹ️  ${action.payload.restaurantName} (${restaurant.type}): הגיע למקסימום (${maxAllowed}/${maxAllowed} בשעה האחרונה). ` +
          `משלוח חדש יתאפשר בעוד ${timeUntilNext} דקות ב-${nextAvailableTime.toLocaleTimeString('he-IL')}`
        );
        return state;
      }

      const preparationTime =
        typeof action.payload.preparationTime === 'number' && action.payload.preparationTime > 0
          ? action.payload.preparationTime
          : typeof action.payload.cook_time === 'number' && action.payload.cook_time > 0
            ? action.payload.cook_time
            : getRestaurantPreparationTime(restaurant);
      const createdAt = new Date(action.payload.createdAt ?? action.payload.creation_time ?? new Date());
      const maxDeliveryTime =
        typeof action.payload.maxDeliveryTime === 'number' && action.payload.maxDeliveryTime > 0
          ? action.payload.maxDeliveryTime
          : typeof action.payload.max_time_to_deliver === 'number' && action.payload.max_time_to_deliver > 0
            ? action.payload.max_time_to_deliver
            : getRestaurantMaxDeliveryTime(restaurant);
      const orderReadyTime =
        action.payload.orderReadyTime ??
        new Date(createdAt.getTime() + preparationTime * 60000);
      const normalizedDelivery = {
        ...action.payload,
        preparationTime,
        cook_time: preparationTime,
        origin_cook_time:
          typeof action.payload.origin_cook_time === 'number' && action.payload.origin_cook_time > 0
            ? action.payload.origin_cook_time
            : preparationTime,
        orderReadyTime,
        maxDeliveryTime,
        max_time_to_deliver: maxDeliveryTime,
        should_delivered_time:
          action.payload.should_delivered_time ??
          new Date(createdAt.getTime() + maxDeliveryTime * 60000),
      };

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
      const newCouriers = state.couriers.map(c => {
        if (c.id === courierId) {
          const newActiveDeliveryIds = [...c.activeDeliveryIds, deliveryId];
          const newStatus = getCourierStatusAfterLoadChange(c.status, newActiveDeliveryIds);
          return { 
            ...c, 
            activeDeliveryIds: newActiveDeliveryIds,
            status: newStatus as const
          };
        }
        return c;
      });

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

      const newCouriers = state.couriers.map(c => {
        if (c.id === delivery.courierId) {
          const newActiveDeliveryIds = c.activeDeliveryIds.filter(id => id !== deliveryId);
          const newStatus = getCourierStatusAfterLoadChange(c.status, newActiveDeliveryIds);
          return { ...c, activeDeliveryIds: newActiveDeliveryIds, status: newStatus as const };
        }
        return c;
      });

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
      const deliveriesAfterStatusUpdate = state.deliveries.map(d => {
        if (d.id === deliveryId) {
          const updated = { ...d, status };
          if (status === 'delivering') {
            // שעת הגעה בפועל למסעדה
            updated.arrivedAtRestaurantAt = now;
            updated.arrived_at_rest = now;
            updated.pickedUpAt = updated.pickedUpAt ?? now;
            updated.took_it_time = updated.took_it_time ?? now;
            updated.started_pickup = updated.started_pickup ?? updated.assignedAt ?? now;
          }
          return updated;
        }
        return d;
      });
      const shouldStartDropoffPhase =
        status === 'delivering' &&
        !!targetDelivery?.courierId &&
        !deliveriesAfterStatusUpdate.some(
          delivery =>
            delivery.id !== deliveryId &&
            delivery.courierId === targetDelivery.courierId &&
            delivery.status === 'assigned'
        ) &&
        !deliveriesAfterStatusUpdate.some(
          delivery =>
            delivery.courierId === targetDelivery.courierId &&
            delivery.status === 'delivering' &&
            !!delivery.started_dropoff
        );
      const nextDropoffDeliveryId =
        shouldStartDropoffPhase && targetDelivery?.courierId
          ? getNextDropoffDeliveryId(deliveriesAfterStatusUpdate, targetDelivery.courierId)
          : null;
      const newDeliveries = nextDropoffDeliveryId
        ? deliveriesAfterStatusUpdate.map((delivery) =>
            delivery.id === nextDropoffDeliveryId
              ? {
                  ...delivery,
                  started_dropoff: delivery.started_dropoff ?? now,
                }
              : delivery
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
      
      const deliveriesAfterCompletion = state.deliveries.map(d =>
        d.id === deliveryId
          ? { 
              ...d, 
              status: 'delivered' as DeliveryStatus, 
              started_dropoff: d.started_dropoff ?? d.pickedUpAt ?? now,
              deliveredAt: now,
              delivered_time: now,
              // שעת הגעה בפועל ללקוח
                arrived_at_client: now,
                arrivedAtCustomerAt: now,
              }
            : d
      );
      const nextDropoffDeliveryId =
        delivery.courierId &&
        !deliveriesAfterCompletion.some(
          item =>
            item.id !== deliveryId &&
            item.courierId === delivery.courierId &&
            item.status === 'delivering' &&
            !!item.started_dropoff
        )
          ? getNextDropoffDeliveryId(deliveriesAfterCompletion, delivery.courierId, [deliveryId])
          : null;
      const newDeliveries = nextDropoffDeliveryId
        ? deliveriesAfterCompletion.map((item) =>
            item.id === nextDropoffDeliveryId
              ? {
                  ...item,
                  started_dropoff: item.started_dropoff ?? now,
                }
              : item
          )
        : deliveriesAfterCompletion;

      const newCouriers = state.couriers.map(c => {
        if (c.id === delivery?.courierId) {
          // הסרת המשלוח מהמערך הפעיל
          const newActiveDeliveryIds = c.activeDeliveryIds.filter(id => id !== deliveryId);
          const newStatus = getCourierStatusAfterLoadChange(c.status, newActiveDeliveryIds);
          
          return {
            ...c,
            activeDeliveryIds: newActiveDeliveryIds,
            status: newStatus as const,
            totalDeliveries: c.totalDeliveries + 1
          };
        }
        return c;
      });

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
      
      const deliveriesAfterCancellation = state.deliveries.map(d =>
        d.id === deliveryId
          ? { 
              ...d, 
              status: 'cancelled' as DeliveryStatus, 
              cancelledAt: new Date(),
              cancelledAfterPickup: cancelledAfterPickup
             }
           : d
      );
      const nextDropoffDeliveryId =
        cancelledAfterPickup &&
        delivery?.courierId &&
        !deliveriesAfterCancellation.some(
          item =>
            item.id !== deliveryId &&
            item.courierId === delivery.courierId &&
            item.status === 'delivering' &&
            !!item.started_dropoff
        )
          ? getNextDropoffDeliveryId(deliveriesAfterCancellation, delivery.courierId, [deliveryId])
          : null;
      const newDeliveries = nextDropoffDeliveryId
        ? deliveriesAfterCancellation.map((item) =>
            item.id === nextDropoffDeliveryId
              ? {
                  ...item,
                  started_dropoff: item.started_dropoff ?? new Date(),
                }
              : item
          )
        : deliveriesAfterCancellation;

      const newCouriers = state.couriers.map(c => {
        if (c.id === delivery?.courierId) {
          // הסרת המשלוח מהמערך הפעיל
          const newActiveDeliveryIds = c.activeDeliveryIds.filter(id => id !== deliveryId);
          const newStatus = getCourierStatusAfterLoadChange(c.status, newActiveDeliveryIds);
          
          return {
            ...c,
            activeDeliveryIds: newActiveDeliveryIds,
            status: newStatus as const
          };
        }
        return c;
      });

      return {
        ...state,
        deliveries: newDeliveries,
        couriers: newCouriers,
        // ✅ החזרה ליתרה אם הביטול היה מוקדם (לפני שהשליח אסף)
        deliveryBalance: shouldRefund ? state.deliveryBalance + 1 : state.deliveryBalance,
        stats: calculateStats(newDeliveries),
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
        ? state.shifts.map((shift) => {
            const nextAssignments = shift.courierAssignments.map((assignment) =>
              assignment.id === courier.currentShiftAssignmentId && !assignment.endedAt
                ? { ...assignment, endedAt: now }
                : assignment
            );

            return nextAssignments === shift.courierAssignments
              ? shift
              : {
                  ...shift,
                  courierAssignments: nextAssignments,
                  status: getShiftStatusFromAssignments(nextAssignments),
                };
          })
        : state.shifts;

      const newCouriers = state.couriers.map(c =>
        c.id === courierId
          ? {
              ...c,
              status,
              isOnShift: status === 'offline' ? false : c.isOnShift,
              shiftEndedAt: status === 'offline' && c.isOnShift ? now : c.shiftEndedAt,
              currentShiftAssignmentId: status === 'offline' ? null : c.currentShiftAssignmentId,
            }
          : c
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
      const emergencyTemplate =
        state.shiftTemplates.find(
          (template) =>
            template.name === EMERGENCY_SHIFT_NAME &&
            (template.activeStartDate ?? '0000-01-01') <= todayKey &&
            (template.activeEndDate ?? '9999-12-31') >= todayKey
        ) ?? null;
      const emergencyTemplateId = emergencyTemplate?.id ?? `template-emergency-${weekStartKey}`;
      const nextShiftTemplates = emergencyTemplate
        ? state.shiftTemplates
        : [
            ...state.shiftTemplates,
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

      const existingEmergencyShift =
        state.shifts.find(
          (shift) =>
            shift.date === todayKey &&
            (shift.templateId === emergencyTemplateId || shift.name === EMERGENCY_SHIFT_NAME)
        ) ?? null;

      const assignedSlotIds = new Set(existingEmergencyShift?.courierAssignments.map((assignment) => assignment.slotId) ?? []);
      const emergencySlotNumbers = [...assignedSlotIds]
        .map((slotId) => {
          const match = slotId.match(/slot-emergency-(\d+)/);
          return match ? Number(match[1]) : null;
        })
        .filter((value): value is number => value !== null);
      const nextEmergencySlotNumber = emergencySlotNumbers.length > 0 ? Math.max(...emergencySlotNumbers) + 1 : 1;

      const newSlot = {
        id: `slot-emergency-${nextEmergencySlotNumber}-${Date.now()}-${courierId}`,
        label: `${EMERGENCY_SHIFT_NAME} ${nextEmergencySlotNumber}`,
      };
      const existingEmergencyTemplateSlots = emergencyTemplate?.slots ?? [];
      const hydratedEmergencySlots = [...existingEmergencyTemplateSlots];

      assignedSlotIds.forEach((slotId) => {
        if (hydratedEmergencySlots.some((slot) => slot.id === slotId)) return;
        const match = slotId.match(/slot-emergency-(\d+)/);
        const slotNumber = match ? Number(match[1]) : hydratedEmergencySlots.length + 1;
        hydratedEmergencySlots.push({
          id: slotId,
          label: `${EMERGENCY_SHIFT_NAME} ${slotNumber}`,
        });
      });

      const nextEmergencyTemplateSlots = [...hydratedEmergencySlots, newSlot];

      const assignmentId = `shift-assignment-${Date.now()}-${courierId}-${newSlot.id}`;
      const activeAssignmentIdsToClose = new Set<string>();

      const nextShiftsBase = state.shifts.map((shift) => {
        const nextAssignments = shift.courierAssignments.map((assignment) => {
          if (assignment.courierId !== courierId || !assignment.startedAt || assignment.endedAt) {
            return assignment;
          }

          activeAssignmentIdsToClose.add(assignment.id);
          return {
            ...assignment,
            endedAt: now,
          };
        });

        return nextAssignments === shift.courierAssignments
          ? shift
          : {
              ...shift,
              courierAssignments: nextAssignments,
              status: getShiftStatusFromAssignments(nextAssignments),
            };
      });

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

      const nextShifts = existingEmergencyShift
        ? nextShiftsBase.map((shift) => (shift.id === existingEmergencyShift.id ? nextEmergencyShift : shift))
        : [...nextShiftsBase, nextEmergencyShift].sort((a, b) =>
            a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
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
        couriers: state.couriers.map((item) =>
          item.id === courierId
            ? {
                ...item,
                isOnShift: true,
                shiftStartedAt: now,
                shiftEndedAt: null,
                currentShiftAssignmentId: assignmentId,
              }
            : activeAssignmentIdsToClose.has(item.currentShiftAssignmentId ?? '')
              ? {
                  ...item,
                  isOnShift: false,
                  shiftEndedAt: now,
                  currentShiftAssignmentId: null,
                }
              : item
        ),
      };
    }

    case 'END_COURIER_SHIFT': {
      const { courierId } = action.payload;
      const now = new Date();
      const courier = state.couriers.find((item) => item.id === courierId);

      return {
        ...state,
        shifts: courier?.currentShiftAssignmentId
          ? state.shifts.map((shift) => {
              const nextAssignments = shift.courierAssignments.map((assignment) =>
                assignment.id === courier.currentShiftAssignmentId && !assignment.endedAt
                  ? {
                      ...assignment,
                      startedAt: assignment.startedAt ?? now,
                      endedAt: now,
                    }
                  : assignment
              );

              return nextAssignments === shift.courierAssignments
                ? shift
                : {
                    ...shift,
                    courierAssignments: nextAssignments,
                    status: getShiftStatusFromAssignments(nextAssignments),
                  };
            })
          : state.shifts,
        couriers: state.couriers.map((courier) =>
          courier.id === courierId
            ? {
                ...courier,
                isOnShift: false,
                shiftEndedAt: now,
                currentShiftAssignmentId: null,
              }
            : courier
        ),
      };
    }

    case 'CREATE_SHIFT': {
      return {
        ...state,
        shifts: [...state.shifts, action.payload],
      };
    }

    case 'UPDATE_SHIFT': {
      const { shiftId, updates } = action.payload;
      return {
        ...state,
        shifts: state.shifts.map((shift) =>
          shift.id === shiftId
            ? {
                ...shift,
                ...updates,
              }
            : shift
        ),
      };
    }

    case 'DELETE_SHIFT': {
      const { shiftId } = action.payload;
      const deletedShift = state.shifts.find((shift) => shift.id === shiftId);
      const deletedAssignmentIds = new Set(
        deletedShift?.courierAssignments.map((assignment) => assignment.id) ?? []
      );

      return {
        ...state,
        shifts: state.shifts.filter((shift) => shift.id !== shiftId),
        couriers: state.couriers.map((courier) =>
          courier.currentShiftAssignmentId &&
          deletedAssignmentIds.has(courier.currentShiftAssignmentId)
            ? {
                ...courier,
                isOnShift: false,
                shiftEndedAt: new Date(),
                currentShiftAssignmentId: null,
              }
            : courier
        ),
      };
    }

    case 'ASSIGN_COURIER_TO_SHIFT': {
      const { shiftId, courierId, slotId } = action.payload;
      if (!canAssignCourierToShift(state, shiftId, courierId)) {
        return state;
      }

      const removedAssignmentIds: string[] = [];

      return {
        ...state,
        shifts: state.shifts.map((shift) => {
          if (shift.id !== shiftId) return shift;
          const nextAssignmentsBase = shift.courierAssignments.filter((assignment) => {
            const shouldRemove = assignment.slotId === slotId && !assignment.endedAt;
            if (shouldRemove) {
              removedAssignmentIds.push(assignment.id);
            }
            return !shouldRemove;
          });
          const nextAssignments = [
            ...nextAssignmentsBase,
            {
              id: `shift-assignment-${Date.now()}-${courierId}-${slotId}`,
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
        }),
        couriers:
          removedAssignmentIds.length === 0
            ? state.couriers
            : state.couriers.map((courier) =>
                courier.currentShiftAssignmentId && removedAssignmentIds.includes(courier.currentShiftAssignmentId)
                  ? {
                      ...courier,
                      isOnShift: false,
                      shiftEndedAt: new Date(),
                      currentShiftAssignmentId: null,
                    }
                  : courier
              ),
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

      return {
        ...state,
        shifts: state.shifts.map((shift) => {
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
        couriers: state.couriers.map((courier) =>
          courier.currentShiftAssignmentId === assignmentId
            ? {
                ...courier,
                isOnShift: false,
                shiftEndedAt: new Date(),
                currentShiftAssignmentId: null,
              }
            : courier
        ),
      };
    }

    case 'START_SHIFT_ASSIGNMENT': {
      const { shiftId, assignmentId } = action.payload;
      const now = new Date();
      const targetShift = state.shifts.find((shift) => shift.id === shiftId);
      const assignment = targetShift?.courierAssignments.find((item) => item.id === assignmentId);
      const courier = assignment
        ? state.couriers.find((item) => item.id === assignment.courierId)
        : null;
      if (!targetShift || !assignment || !courier || courier.status === 'offline') return state;

      return {
        ...state,
        shifts: state.shifts.map((shift) => {
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
        couriers: state.couriers.map((courier) =>
          courier.id === assignment.courierId
            ? {
                ...courier,
                isOnShift: true,
                shiftStartedAt: now,
                shiftEndedAt: null,
                currentShiftAssignmentId: assignmentId,
              }
            : courier
        ),
      };
    }

    case 'END_SHIFT_ASSIGNMENT': {
      const { shiftId, assignmentId } = action.payload;
      const now = new Date();
      const targetShift = state.shifts.find((shift) => shift.id === shiftId);
      const assignment = targetShift?.courierAssignments.find((item) => item.id === assignmentId);
      if (!targetShift || !assignment) return state;

      return {
        ...state,
        shifts: state.shifts.map((shift) => {
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
        couriers: state.couriers.map((courier) =>
          courier.id === assignment.courierId
            ? {
                ...courier,
                isOnShift: false,
                shiftEndedAt: now,
                currentShiftAssignmentId: null,
              }
            : courier
        ),
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
      const newRestaurants = state.restaurants.map(r =>
        r.id === restaurantId ? { ...r, isActive: !r.isActive } : r
      );

      return {
        ...state,
        restaurants: newRestaurants,
      };
    }

    case 'UPDATE_RESTAURANT': {
      const { restaurantId, updates } = action.payload;
      return {
        ...state,
        restaurants: state.restaurants.map((restaurant) =>
          restaurant.id === restaurantId
            ? {
                ...restaurant,
                ...updates,
                defaultPreparationTime:
                  typeof updates.defaultPreparationTime === 'number' && updates.defaultPreparationTime > 0
                    ? updates.defaultPreparationTime
                    : restaurant.defaultPreparationTime,
                maxDeliveryTime:
                  typeof updates.maxDeliveryTime === 'number' && updates.maxDeliveryTime > 0
                    ? updates.maxDeliveryTime
                    : restaurant.maxDeliveryTime,
              }
            : restaurant
        ),
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
      const newDeliveries = state.deliveries.map(d => 
        d.id === deliveryId 
          ? { ...d, orderPriority: newPriority }
          : d
      );
      
      return {
        ...state,
        deliveries: newDeliveries,
      };
    }

    case 'RESET_SYSTEM':
        return action.payload;

    default:
      return state;
  }
};
