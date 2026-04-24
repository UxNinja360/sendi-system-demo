// סטטוסים של משלוח
export type DeliveryStatus =
  | 'pending'      // ממתין לצוותים
  | 'assigned'     // שובץ לשליח
  | 'delivering'   // בדרך ללקוח
  | 'delivered'    // נמסר
  | 'cancelled';   // בוטל

// סטטוסים של שליח
export type CourierStatus = 'available' | 'busy' | 'offline';
export type CourierVehicleType = 'אופנוע' | 'רכב' | 'קורקינט';
export type CourierEmploymentType = 'שעתי' | 'פר משלוח';
export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'full';
export type ShiftStatus = 'planned' | 'active' | 'completed';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// מסעדה
export interface Restaurant {
  id: string;
  name: string;
  chainId: string;
  type: string; // סוג מטבח (פיצה, המבורגר, סושי וכו')
  phone: string;
  address: string;
  city: string;
  street: string;
  lat: number; // קו רוחב (WGS84)
  lng: number; // קו אורך (WGS84)
  rating: number; // דירוג 4.0-5.0
  isActive: boolean; // האם המסעדה פעילה
  totalOrders: number;
  averageDeliveryTime: number; // זמן משלוח ממוצע בדקות
  defaultPreparationTime: number; // זמן הכנה ברירת מחדל בדקות
  maxDeliveryTime: number; // זמן מקסימלי למשלוח בדקות
  deliveryRate: number; // כמה משלוחים
  deliveryInterval: number; // תוך כמה דקות
  maxDeliveriesPerHour: number; // מקסימום משלוחים בשעה
}

// ========================================
// 📦 DELIVERY - Architecture Components
// ========================================

// 1. ⚙️ Core Entity - ה-ID Card של המשלוח
export interface DeliveryCore {
  id: string; // מזהה סנדי
  api_short_order_id?: string; // המזהה הקצר לתצוגה
  api_str_order_id?: string; // מזהה חיצוני ארוך
  status: DeliveryStatus; // המצב הנוכחי ב-State Machine
  priority?: number; // עדיפות
  
  // דגלים (Flags)
  is_api?: boolean;
  is_started?: boolean;
  is_approved?: boolean;
  is_requires_approval?: boolean;
  close_order?: boolean;
  
  comment?: string;
  pack_num?: string;
}

// 2. 🏪 Origin / Spawner - איפה המשימה מתחילה
export interface DeliveryOrigin {
  // מזהים
  rest_id?: string;
  branch_id?: string;
  rest_name: string;
  
  // מיקום איסוף
  rest_city?: string;
  rest_street?: string;
  rest_building?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  
  // הכנה
  cook_type?: string;
  cook_time?: number;
  origin_cook_time?: number;
  
  // סטטוס איסוף מול מסעדה
  order_ready?: boolean;
  reported_order_is_ready?: boolean;
  rest_approve?: boolean;
  rest_waits_for_cook_time?: boolean;
  rest_last_eta?: Date | null;
  rest_approved_eta?: Date | null;
  
  // תוספות קריטיות
  is_drinks_exist?: boolean;
  is_sauces_exist?: boolean;
}

// 3. 🎯 Target / Client - לאן ועם מי
export interface DeliveryTarget {
  // זיהוי לקוח
  client_id?: string;
  client_name: string;
  client_phone: string;
  
  // מיקום מסירה
  client_full_address: string;
  client_city?: string;
  client_street?: string;
  client_building?: string;
  client_entry?: string;
  client_floor?: string;
  client_apartment?: string;
  zipcode?: string;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  
  // הנחיות מסירה
  client_comment?: string;
  wrong_address?: boolean;
  client_agree_to_place?: boolean;
  
  // אימות
  signature_url?: string;
}

// 4. 🚴 Actor / Runner - השליח שמשויך למשימה
export interface DeliveryActor {
  // מזהי שליח
  runner_id: string | null; // השליח הנוכחי
  pending_runner_id?: string;
  shift_runner_id?: string;
  arrived_at_rest_runner_id?: string;
  
  // מאפיינים
  vehicle_type?: string;
  algo_runner?: boolean; // האם שויך ע"י אלגוריתם
  coupled_by?: string;
  
  // מיקום בעת השיוך
  runner_at_assigning_latitude?: number;
  runner_at_assigning_longitude?: number;
  is_orbit_start?: boolean;
  
  // אזור לוגי
  area: string;
  area_id?: string;
  delivery_area_id?: string;
  main_polygon_name?: string;
}

// 5. ⏱️ Timeline / Events - ציר הזמן
export interface DeliveryTimeline {
  creation_time: Date;
  delivery_date?: Date;
  push_time?: Date;
  
  // זמני צוותים ותהליך
  coupled_time?: Date | null; // זמן צוות
  started_pickup?: Date | null;
  arrived_at_rest?: Date | null;
  took_it_time?: Date | null;
  started_dropoff?: Date | null;
  arrived_at_client?: Date | null;
  delivered_time?: Date | null;
}

// 6. 📊 Mechanics & SLA - המתמטיקה והביצועים
export interface DeliveryMechanics {
  // חישובי יעד
  should_delivered_time?: Date | null;
  max_time_to_deliver?: number;
  min_time_to_suplly?: number;
  max_time_to_suplly?: number;
  
  // חריגות בפועל
  minutes_late?: number;
  pickup_deviation?: number;
  dropoff_deviation?: number;
  delay_reason?: string;
  delay_duration?: number;
  
  // מרחק וסטטוס
  delivery_distance?: number; // מרחק משלוח בק"מ
  duration_to_client?: number;
  eta_after_pickup?: number;
  suplly_status?: string;
}

// 7. 💰 Economy / Finances - הכלכלה
export interface DeliveryEconomy {
  // עמלות
  rest_price?: number; // חיוב מסעדה
  rest_polygon_price?: number;
  
  // תשלום לשליח
  runner_price?: number;
  runner_tip?: number;
  
  // גבייה מהלקוח
  sum_cash?: number;
  is_cash?: boolean;
}

// 8. 📡 Meta & Feedback - מטא ופידבק חיצוני
export interface DeliveryMeta {
  // אינטגרציות
  api_type?: string;
  api_source?: string;
  source_platform?: string;
  website_id?: string;
  comax_id?: string;
  parent_mishloha_order_id?: string;
  associated_api_order_id?: string;
  associated_short_api_order_id?: string;
  
  // תקשורת
  sms_status?: string;
  sms_code?: string;
  tracker_viewed?: boolean;
  
  // פידבק
  runner_took_comment?: string;
  runner_delivered_comment?: string;
  client_runner_rank?: number;
  client_remark?: string;
  feedback_status?: string;
  feedback_first_answer?: string;
  feedback_second_answer?: string;
  feedback_third_answer?: string;
}

// ========================================
// 📦 DELIVERY - Main Interface (Composed)
// ========================================

// משלוח - מורכב מכל 8 הרכיבים
export interface Delivery extends 
  DeliveryCore,
  DeliveryOrigin,
  DeliveryTarget,
  DeliveryActor,
  DeliveryTimeline,
  DeliveryMechanics,
  DeliveryEconomy,
  DeliveryMeta {
  
  // Legacy/Compatibility fields (for backward compatibility)
  orderNumber: string; // מיפוי ל-api_short_order_id
  restaurantId?: string; // מיפוי ל-rest_id
  restaurantName: string; // מיפוי ל-rest_name
  restaurantAddress?: string; // מיפוי לכתובת מסעדה מורכבת
  restaurantCity?: string; // מיפוי ל-rest_city
  restaurantStreet?: string; // מיפוי ל-rest_street
  branchName?: string; // מיפוי ל-branch_id
  customerName: string; // מיפוי ל-client_name
  customerPhone: string; // מיפוי ל-client_phone
  address: string; // מיפוי ל-client_full_address
  customerCity?: string; // מיפוי ל-client_city
  customerStreet?: string; // מיפוי ל-client_street
  customerBuilding?: string; // מיפוי ל-client_building
  price: number; // מיפוי ל-sum_cash או rest_price
  restaurantPrice?: number; // מיפוי ל-rest_price
  commissionAmount?: number; // חישוב מהפרש
  courierPayment?: number; // מיפוי ל-runner_price
  courierId: string | null; // מיפוי ל-runner_id
  courierName?: string; // שם השליח
  courierEmploymentType?: CourierEmploymentType;
  courierRating?: number; // מיפוי ל-client_runner_rank
  createdAt: Date; // מיפוי ל-creation_time
  assignedAt: Date | null; // מיפוי ל-coupled_time
  pickupBatchId?: string | null;
  pickedUpAt: Date | null; // מיפוי ל-took_it_time
  deliveredAt: Date | null; // מיפוי ל-delivered_time
  arrivedAtRestaurantAt: Date | null; // מיפוי ל-arrived_at_rest
  arrivedAtCustomerAt: Date | null; // מיפוי ל-arrived_at_client
  estimatedTime: number; // זמן משוער
  estimatedArrivalAtRestaurant: Date | null; // ETA למסעדה
  estimatedArrivalAtCustomer: Date | null; // ETA ללקוח
  orderReadyTime?: Date | null; // מיפוי ל-rest_last_eta
  reportedOrderIsReady?: boolean; // מיפוי ל-reported_order_is_ready
  preparationTime?: number; // מיפוי ל-cook_time
  maxDeliveryTime?: number; // מיפוי ל-max_time_to_deliver
  cancelledAt?: Date | null;
  cancelledAfterPickup?: boolean;
  orderPriority?: number; // מיפוי ל-priority
  customerRating?: number; // מיפוי ל-client_runner_rank
  customerFeedback?: string; // מיפוי ל-client_remark
  customerFeedbackQuestion1?: string; // מיפוי ל-feedback_first_answer
  customerFeedbackQuestion2?: string; // מיפוי ל-feedback_second_answer
  customerFeedbackQuestion3?: string; // מיפוי ל-feedback_third_answer
  deliveryNotes?: string; // מיפוי ל-comment
  orderNotes?: string; // מיפוי ל-client_comment
}

// שליח
export interface Courier {
  id: string;
  name: string;
  phone: string;
  vehicleType: CourierVehicleType;
  employmentType: CourierEmploymentType;
  status: CourierStatus;
  isOnShift: boolean;
  shiftStartedAt: Date | null;
  shiftEndedAt: Date | null;
  currentShiftAssignmentId: string | null;
  activeDeliveryIds: string[]; // מערך של משלוחים פעילים (עד 2)
  totalDeliveries: number;
  rating: number;
}

export interface CourierShiftAssignment {
  id: string;
  courierId: string;
  slotId: string;
  startedAt: Date | null;
  endedAt: Date | null;
}

export interface ShiftSlotTemplate {
  id: string;
  label: string;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  slots: ShiftSlotTemplate[];
  requiredCouriers: number;
  colorTone?: string;
  activeStartDate?: string;
  activeEndDate?: string;
}

export interface WeeklyShiftDayConfig {
  dayOfWeek: DayOfWeek;
  isClosed: boolean;
  templateIds: string[];
}

export interface WorkShift {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredCouriers: number;
  type: ShiftType;
  templateId: string | null;
  status: ShiftStatus;
  courierAssignments: CourierShiftAssignment[];
  createdAt: Date;
}

// לקוח
export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalOrders: number;
  lastOrderDate: Date | null;
  averageOrderValue: number;
  status: 'active' | 'inactive';
}

// State של המערכת
export interface DeliveryState {
  isSystemOpen: boolean;
  autoAssignEnabled: boolean;
  timeMultiplier: number; // מכפיל זמן - x1 = זמן אמת, x2 = כפול מהר יותר
  deliveries: Delivery[];
  couriers: Courier[];
  shiftTemplates: ShiftTemplate[];
  weeklyShiftConfig: WeeklyShiftDayConfig[];
  shifts: WorkShift[];
  restaurants: Restaurant[];
  customers: Customer[];
  courierRoutePlans: Record<string, string[]>;
  activityLogs: ActivityLogEntry[];
  deliveryBalance: number; // יתרת משלוחים זמינוים
  stats: {
    hour: {
      total: number;
      delivered: number;
      cancelled: number;
      revenue: number;
    };
    today: {
      total: number;
      delivered: number;
      cancelled: number;
      revenue: number;
    };
    week: {
      total: number;
      delivered: number;
      cancelled: number;
      revenue: number;
    };
    month: {
      total: number;
      delivered: number;
      cancelled: number;
      revenue: number;
    };
    year: {
      total: number;
      delivered: number;
      cancelled: number;
      revenue: number;
    };
  };
}

export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  title: string;
  description?: string;
  actionType: string;
  category: 'navigation' | 'system' | 'delivery' | 'courier' | 'restaurant' | 'settings' | 'shift' | 'general';
}

// Actions
export type DeliveryAction =
  | { type: 'TOGGLE_SYSTEM' }
  | { type: 'TOGGLE_AUTO_ASSIGN' }
  | { type: 'SET_TIME_MULTIPLIER'; payload: number } // שינוי מכפיל הזמן
  | { type: 'ADD_DELIVERY'; payload: Delivery }
  | { type: 'ADD_COURIER'; payload: Courier }
  | { type: 'REMOVE_COURIER'; payload: string } // courierId
  | { type: 'CREATE_SHIFT_TEMPLATE'; payload: ShiftTemplate }
  | { type: 'UPDATE_SHIFT_TEMPLATE'; payload: { templateId: string; updates: Partial<Omit<ShiftTemplate, 'id'>> } }
  | { type: 'DELETE_SHIFT_TEMPLATE'; payload: { templateId: string; effectiveFromDate?: string } }
  | { type: 'MOVE_SHIFT_TEMPLATE'; payload: { templateId: string; direction: 'up' | 'down' } }
  | { type: 'SET_WEEKLY_SHIFT_DAY'; payload: WeeklyShiftDayConfig }
  | { type: 'ENSURE_WEEK_SHIFTS'; payload: { startDate: string; endDate: string } }
  | { type: 'CREATE_SHIFT'; payload: WorkShift }
  | { type: 'UPDATE_SHIFT'; payload: { shiftId: string; updates: Partial<Omit<WorkShift, 'id' | 'courierAssignments' | 'createdAt'>> } }
  | { type: 'DELETE_SHIFT'; payload: { shiftId: string } }
  | { type: 'ASSIGN_COURIER_TO_SHIFT'; payload: { shiftId: string; courierId: string; slotId: string } }
  | { type: 'AUTO_ASSIGN_SHIFT'; payload: { shiftId: string } }
  | { type: 'REMOVE_COURIER_FROM_SHIFT'; payload: { shiftId: string; assignmentId: string } }
  | { type: 'START_SHIFT_ASSIGNMENT'; payload: { shiftId: string; assignmentId: string } }
  | { type: 'END_SHIFT_ASSIGNMENT'; payload: { shiftId: string; assignmentId: string } }
  | {
      type: 'ASSIGN_COURIER';
      payload: {
        deliveryId: string;
        courierId: string;
        pickupBatchId?: string;
        runner_at_assigning_latitude?: number;
        runner_at_assigning_longitude?: number;
      };
    }
  | { type: 'UPDATE_STATUS'; payload: { deliveryId: string; status: DeliveryStatus } }
  | { type: 'UPDATE_DELIVERY'; payload: { deliveryId: string; updates: Partial<Delivery> } } // עדכון משלוח כללי
  | { type: 'CANCEL_DELIVERY'; payload: string }
  | { type: 'UNASSIGN_COURIER'; payload: string }
  | { type: 'DELETE_DELIVERY'; payload: string } // deliveryId - מחיקה ללא ביטול
  | { type: 'UPDATE_COURIER_STATUS'; payload: { courierId: string; status: CourierStatus } }
  | { type: 'START_COURIER_SHIFT'; payload: { courierId: string } }
  | { type: 'END_COURIER_SHIFT'; payload: { courierId: string } }
  | { type: 'ADD_RESTAURANT'; payload: Restaurant } // הוספת מסעדה חדשה
  | { type: 'TOGGLE_RESTAURANT'; payload: string } // restaurantId - הפעלה/כיבוי מסעדה
  | { type: 'UPDATE_RESTAURANT'; payload: { restaurantId: string; updates: Partial<Omit<Restaurant, 'id'>> } }
  | { type: 'SET_RESTAURANTS'; payload: Restaurant[] } // עדכון מלא של רשימת המסעדות
  | { type: 'COMPLETE_DELIVERY'; payload: string }
  | { type: 'ADD_DELIVERY_BALANCE'; payload: number } // הוספת יתרת משלוחים
  | { type: 'REORDER_DELIVERY'; payload: { deliveryId: string; newPriority: number } } // שינוי סדר משלוח בתוך שליח
  | { type: 'SET_COURIER_ROUTE_PLANS'; payload: Record<string, string[]> }
  | { type: 'SET_COURIER_ROUTE_PLAN'; payload: { courierId: string; stopIds: string[] } }
  | { type: 'CLEAR_COURIER_ROUTE_PLAN'; payload: string }
  | { type: 'ADD_ACTIVITY_LOG'; payload: ActivityLogEntry }
  | { type: 'CLEAR_ACTIVITY_LOGS' }
  | { type: 'RESET_SYSTEM'; payload: DeliveryState };
