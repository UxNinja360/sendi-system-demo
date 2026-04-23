import { Delivery, Courier } from '../types/delivery.types';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { getRestaurantChainId } from '../utils/restaurant-branding';

// === Column Definition ===
export interface ColumnDef {
  id: string;
  label: string;
  sortable?: boolean;
  type: 'text' | 'number' | 'boolean' | 'date' | 'money' | 'coord' | 'custom';
  getValue: (d: Delivery, extra?: { courier?: Courier | null; timeRemaining?: number | null; formatTime?: (s: number) => string }) => string;
}

// Helper formatters
const fmtDate = (d: Date | null | undefined) => d ? format(d, 'dd/MM HH:mm', { locale: he }) : '-';
const fmtBool = (v: boolean | undefined | null) => v === true ? '✅' : v === false ? '❌' : '-';
const fmtNum = (v: number | undefined | null, suffix?: string) => v != null ? `${v}${suffix || ''}` : '-';
const fmtMoney = (v: number | undefined | null) => v != null ? `₪` : '-';
const fmtCoord = (v: number | undefined | null) => v != null ? v.toFixed(5) : '-';
const fmtStr = (v: string | undefined | null) => v || '-';
const fmtCoordPair = (lat: number | undefined | null, lng: number | undefined | null) =>
  lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : '-';

// === ALL COLUMN DEFINITIONS — merged (new + legacy, no duplicates) ===
export const ALL_COLUMNS: ColumnDef[] = [
  // ===== ⚙️ ליבה =====
  { id: 'id', label: 'מזהה סנדי', sortable: true, type: 'text', getValue: d => d.id },
  { id: 'api_short_order_id', label: 'מזהה API קצר', sortable: true, type: 'text', getValue: d => fmtStr(d.api_short_order_id) },
  { id: 'api_str_order_id', label: 'מזהה API ארוך', sortable: true, type: 'text', getValue: d => fmtStr(d.api_str_order_id) },
  { id: 'orderNumber', label: 'מספר הזמנה', sortable: true, type: 'custom', getValue: d => d.orderNumber },
  { id: 'status', label: 'סטטוס', sortable: true, type: 'custom', getValue: d => d.status },
  { id: 'priority', label: 'עדיפות', sortable: true, type: 'number', getValue: d => fmtNum(d.priority ?? d.orderPriority) },
  { id: 'is_api', label: 'מ-API', sortable: true, type: 'boolean', getValue: d => fmtBool(d.is_api) },
  { id: 'is_started', label: 'התחיל', sortable: true, type: 'boolean', getValue: d => fmtBool(d.is_started) },
  { id: 'is_approved', label: 'אושר', sortable: true, type: 'boolean', getValue: d => fmtBool(d.is_approved) },
  { id: 'is_requires_approval', label: 'דורש אישור', sortable: true, type: 'boolean', getValue: d => fmtBool(d.is_requires_approval) },
  { id: 'close_order', label: 'סגורה', sortable: true, type: 'boolean', getValue: d => fmtBool(d.close_order) },
  { id: 'comment', label: 'הערת מערכת', sortable: true, type: 'text', getValue: d => fmtStr(d.comment || d.deliveryNotes) },
  { id: 'pack_num', label: 'מס׳ חבילה', sortable: true, type: 'text', getValue: d => fmtStr(d.pack_num) },

  // ===== 🏪 מסעדה =====
  { id: 'rest_id', label: 'מזהה מסעדה', sortable: true, type: 'text', getValue: d => fmtStr(d.rest_id || d.restaurantId) },
  { id: 'branch_id', label: 'מזהה סניף', sortable: true, type: 'text', getValue: d => fmtStr(d.branch_id) },
  { id: 'rest_name', label: 'שם מסעדה', sortable: true, type: 'text', getValue: d => d.rest_name || d.restaurantName },
  { id: 'restaurant_chain_id', label: 'מזהה רשת', sortable: true, type: 'text', getValue: d => getRestaurantChainId(d.rest_name || d.restaurantName) },
  { id: 'branchName', label: 'סניף', sortable: true, type: 'text', getValue: d => fmtStr(d.branchName) },
  { id: 'rest_city', label: 'עיר מסעדה', sortable: true, type: 'text', getValue: d => fmtStr(d.rest_city || d.restaurantCity) },
  { id: 'rest_street', label: 'רחוב מסעדה', sortable: true, type: 'text', getValue: d => fmtStr(d.rest_street || d.restaurantStreet) },
  { id: 'rest_building', label: 'בניין מסעדה', sortable: true, type: 'text', getValue: d => fmtStr(d.rest_building) },
  { id: 'restaurantAddress', label: 'כתובת מסעדה מלאה', sortable: true, type: 'text', getValue: d => fmtStr(d.restaurantAddress) },
  { id: 'pickup_latitude', label: 'רוחב איסוף', sortable: true, type: 'coord', getValue: d => fmtCoord(d.pickup_latitude) },
  { id: 'pickup_longitude', label: 'אורך איסוף', sortable: true, type: 'coord', getValue: d => fmtCoord(d.pickup_longitude) },
  { id: 'cook_type', label: 'סוג בישול', sortable: true, type: 'text', getValue: d => fmtStr(d.cook_type) },
  { id: 'cook_time', label: 'זמן הכנה', sortable: true, type: 'number', getValue: d => fmtNum(d.cook_time ?? d.preparationTime, ' דק׳') },
  { id: 'order_ready', label: 'מוכנה', sortable: true, type: 'boolean', getValue: d => fmtBool(d.order_ready) },
  { id: 'reported_order_is_ready', label: 'דווח מוכנה', sortable: true, type: 'boolean', getValue: d => fmtBool(d.reported_order_is_ready ?? d.reportedOrderIsReady) },
  { id: 'rest_approve', label: 'מסעדה אישרה', sortable: true, type: 'boolean', getValue: d => fmtBool(d.rest_approve) },
  { id: 'rest_waits_for_cook_time', label: 'מחכה להכנה', sortable: true, type: 'boolean', getValue: d => fmtBool(d.rest_waits_for_cook_time) },
  { id: 'rest_last_eta', label: 'ETA אחרון מהמסעדה', sortable: true, type: 'date', getValue: d => fmtDate(d.rest_last_eta || d.orderReadyTime) },
  { id: 'rest_approved_eta', label: 'ETA מאושר', sortable: true, type: 'date', getValue: d => fmtDate(d.rest_approved_eta) },
  { id: 'is_drinks_exist', label: 'משקאות', sortable: true, type: 'boolean', getValue: d => fmtBool(d.is_drinks_exist) },
  { id: 'is_sauces_exist', label: 'רטבים', sortable: true, type: 'boolean', getValue: d => fmtBool(d.is_sauces_exist) },

  // ===== 🎯 לקוח =====
  { id: 'client_id', label: 'מזהה לקוח', sortable: true, type: 'text', getValue: d => fmtStr(d.client_id) },
  { id: 'client_name', label: 'שם לקוח', sortable: true, type: 'text', getValue: d => d.client_name || d.customerName },
  { id: 'client_phone', label: 'טלפון לקוח', sortable: true, type: 'text', getValue: d => d.client_phone || d.customerPhone },
  { id: 'client_full_address', label: 'כתובת לקוח מלאה', sortable: true, type: 'text', getValue: d => d.client_full_address || d.address },
  { id: 'client_city', label: 'עיר לקוח', sortable: true, type: 'text', getValue: d => fmtStr(d.client_city || d.customerCity) },
  { id: 'client_street', label: 'רחוב לקוח', sortable: true, type: 'text', getValue: d => fmtStr(d.client_street || d.customerStreet) },
  { id: 'client_building', label: 'בניין לקוח', sortable: true, type: 'text', getValue: d => fmtStr(d.client_building || d.customerBuilding) },
  { id: 'client_entry', label: 'כניסה', sortable: true, type: 'text', getValue: d => fmtStr(d.client_entry) },
  { id: 'client_floor', label: 'קומה', sortable: true, type: 'text', getValue: d => fmtStr(d.client_floor) },
  { id: 'client_apartment', label: 'דירה', sortable: true, type: 'text', getValue: d => fmtStr(d.client_apartment) },
  { id: 'zipcode', label: 'מיקוד', sortable: true, type: 'text', getValue: d => fmtStr(d.zipcode) },
  { id: 'dropoff_latitude', label: 'רוחב מסירה', sortable: true, type: 'coord', getValue: d => fmtCoord(d.dropoff_latitude) },
  { id: 'dropoff_longitude', label: 'אורך מסירה', sortable: true, type: 'coord', getValue: d => fmtCoord(d.dropoff_longitude) },
  { id: 'client_comment', label: 'הערת לקוח', sortable: true, type: 'text', getValue: d => fmtStr(d.client_comment || d.orderNotes) },
  { id: 'wrong_address', label: 'כתובת שגויה', sortable: true, type: 'boolean', getValue: d => fmtBool(d.wrong_address) },
  { id: 'client_agree_to_place', label: 'הסכים להניח', sortable: true, type: 'boolean', getValue: d => fmtBool(d.client_agree_to_place) },
  { id: 'signature_url', label: 'חתימה', sortable: true, type: 'text', getValue: d => d.signature_url ? 'יש' : '-' },

  // ===== 🚴 שליח =====
  { id: 'runner_id', label: 'מזהה שליח', sortable: true, type: 'text', getValue: d => fmtStr(d.runner_id || d.courierId) },
  { id: 'courier', label: 'שם שליח', sortable: true, type: 'custom', getValue: (d, extra) => extra?.courier?.name || d.courierName || '-' },
  { id: 'pending_runner_id', label: 'שליח ממתין', sortable: true, type: 'text', getValue: d => fmtStr(d.pending_runner_id) },
  { id: 'shift_runner_id', label: 'שליח משמרת', sortable: true, type: 'text', getValue: d => fmtStr(d.shift_runner_id) },
  { id: 'arrived_at_rest_runner_id', label: 'שליח הגיע למסעדה', sortable: true, type: 'text', getValue: d => fmtStr(d.arrived_at_rest_runner_id) },
  { id: 'runner_assigning_coords', label: 'נ.צ שיוך', sortable: false, type: 'text', getValue: d => fmtCoordPair(d.runner_at_assigning_latitude, d.runner_at_assigning_longitude) },
  { id: 'area', label: '\u05d0\u05d6\u05d5\u05e8', sortable: true, type: 'text', getValue: d => d.area },
  { id: 'area_id', label: 'מזהה אזור', sortable: true, type: 'text', getValue: d => fmtStr(d.area_id) },
  { id: 'delivery_area_id', label: 'מזהה אזור משלוח', sortable: true, type: 'text', getValue: d => fmtStr(d.delivery_area_id) },
  { id: 'main_polygon_name', label: 'פוליגון', sortable: true, type: 'text', getValue: d => fmtStr(d.main_polygon_name) },
  { id: 'courierEmploymentType', label: 'שיטת העסקה', sortable: true, type: 'text', getValue: d => fmtStr(d.courierEmploymentType) },

  // ===== ⏱️ ציר זמן =====
  { id: 'creation_time', label: 'זמן יצירה', sortable: true, type: 'date', getValue: d => fmtDate(d.creation_time || d.createdAt) },
  { id: 'push_time', label: 'זמן דחיפה', sortable: true, type: 'date', getValue: d => fmtDate(d.push_time) },
  { id: 'coupled_time', label: 'זמן שיוך לשליח', sortable: true, type: 'date', getValue: d => fmtDate(d.coupled_time || d.assignedAt) },
  { id: 'started_pickup', label: 'התחיל איסוף', sortable: true, type: 'date', getValue: d => fmtDate(d.started_pickup) },
  { id: 'arrived_at_rest', label: 'הגעה למסעדה', sortable: true, type: 'date', getValue: d => fmtDate(d.arrived_at_rest || d.arrivedAtRestaurantAt) },
  { id: 'took_it_time', label: 'זמן איסוף', sortable: true, type: 'date', getValue: d => fmtDate(d.took_it_time || d.pickedUpAt) },
  { id: 'started_dropoff', label: 'התחיל מסירה', sortable: true, type: 'date', getValue: d => fmtDate(d.started_dropoff) },
  { id: 'arrived_at_client', label: 'הגעה ללקוח', sortable: true, type: 'date', getValue: d => fmtDate(d.arrived_at_client || d.arrivedAtCustomerAt) },
  { id: 'delivered_time', label: 'זמן מסירה', sortable: true, type: 'date', getValue: d => fmtDate(d.delivered_time || d.deliveredAt) },

  // ===== 📊 ביצועים =====
  { id: 'should_delivered_time', label: 'יעד מסירה', sortable: true, type: 'date', getValue: d => fmtDate(d.should_delivered_time) },
  { id: 'max_time_to_deliver', label: 'זמן מקס׳ למשלוח', sortable: true, type: 'number', getValue: d => fmtNum(d.max_time_to_deliver ?? d.maxDeliveryTime, ' דק׳') },
  { id: 'min_time_to_suplly', label: 'מינ׳ אספקה', sortable: true, type: 'number', getValue: d => fmtNum(d.min_time_to_suplly, ' דק׳') },
  { id: 'max_time_to_suplly', label: 'מקס׳ אספקה', sortable: true, type: 'number', getValue: d => fmtNum(d.max_time_to_suplly, ' דק׳') },
  { id: 'minutes_late', label: 'דק׳ איחור', sortable: true, type: 'number', getValue: d => fmtNum(d.minutes_late) },
  { id: 'pickup_deviation', label: 'סטיית איסוף', sortable: true, type: 'number', getValue: d => fmtNum(d.pickup_deviation, ' דק׳') },
  { id: 'dropoff_deviation', label: 'סטיית מסירה', sortable: true, type: 'number', getValue: d => fmtNum(d.dropoff_deviation, ' דק׳') },
  { id: 'delay_reason', label: 'סיבת עיכוב', sortable: true, type: 'text', getValue: d => fmtStr(d.delay_reason) },
  { id: 'delay_duration', label: 'משך עיכוב', sortable: true, type: 'number', getValue: d => fmtNum(d.delay_duration, ' דק׳') },
  { id: 'delivery_distance', label: 'מרחק משלוח', sortable: true, type: 'number', getValue: d => d.delivery_distance != null ? `${d.delivery_distance.toFixed(1)} ק"מ` : '-' },
  { id: 'duration_to_client', label: 'משך ללקוח', sortable: true, type: 'number', getValue: d => fmtNum(d.duration_to_client, ' דק׳') },
  { id: 'eta_after_pickup', label: 'ETA אחרי איסוף', sortable: true, type: 'number', getValue: d => fmtNum(d.eta_after_pickup, ' דק׳') },
  { id: 'suplly_status', label: 'סטטוס אספקה', sortable: true, type: 'text', getValue: d => fmtStr(d.suplly_status) },
  { id: 'timeRemaining', label: 'זמן נותר', sortable: true, type: 'custom', getValue: (d, extra) => extra?.timeRemaining != null && extra?.formatTime ? extra.formatTime(extra.timeRemaining) : '-' },
  { id: 'estimatedTime', label: 'זמן משוער', sortable: true, type: 'number', getValue: d => fmtNum(d.estimatedTime, ' דק׳') },

  // ===== 💰 כלכלה =====
  { id: 'rest_price', label: 'מחיר מסעדה', sortable: true, type: 'money', getValue: d => fmtMoney(d.rest_price ?? d.restaurantPrice) },
  { id: 'rest_polygon_price', label: 'מחיר פוליגון', sortable: true, type: 'money', getValue: d => fmtMoney(d.rest_polygon_price) },
  { id: 'runner_price', label: 'תשלום שליח', sortable: true, type: 'money', getValue: d => fmtMoney(d.runner_price ?? d.courierPayment) },
  { id: 'runner_tip', label: 'טיפ', sortable: true, type: 'money', getValue: d => fmtMoney(d.runner_tip) },
  { id: 'sum_cash', label: 'סכום מזומן', sortable: true, type: 'money', getValue: d => fmtMoney(d.sum_cash) },
  { id: 'price', label: 'מחיר ללקוח', sortable: true, type: 'custom', getValue: d => `₪${d.price}` },
  { id: 'is_cash', label: 'מזומן', sortable: true, type: 'boolean', getValue: d => fmtBool(d.is_cash) },
  { id: 'commissionAmount', label: 'עמלה', sortable: true, type: 'money', getValue: d => fmtMoney(d.commissionAmount) },

  // ===== 📡 מטא =====
  { id: 'api_type', label: 'סוג API', sortable: true, type: 'text', getValue: d => fmtStr(d.api_type) },
  { id: 'api_source', label: 'מקור API', sortable: true, type: 'text', getValue: d => fmtStr(d.api_source) },
  { id: 'source_platform', label: 'פלטפורמה', sortable: true, type: 'text', getValue: d => fmtStr(d.source_platform) },
  { id: 'website_id', label: 'מזהה אתר', sortable: true, type: 'text', getValue: d => fmtStr(d.website_id) },
  { id: 'comax_id', label: 'Comax', sortable: true, type: 'text', getValue: d => fmtStr(d.comax_id) },
  { id: 'parent_mishloha_order_id', label: 'הזמנה אב', sortable: true, type: 'text', getValue: d => fmtStr(d.parent_mishloha_order_id) },
  { id: 'associated_api_order_id', label: 'הזמנה משויכת', sortable: true, type: 'text', getValue: d => fmtStr(d.associated_api_order_id) },
  { id: 'associated_short_api_order_id', label: 'קצר משויך', sortable: true, type: 'text', getValue: d => fmtStr(d.associated_short_api_order_id) },
  { id: 'sms_status', label: 'SMS', sortable: true, type: 'text', getValue: d => fmtStr(d.sms_status) },
  { id: 'sms_code', label: 'קוד SMS', sortable: true, type: 'text', getValue: d => fmtStr(d.sms_code) },
  { id: 'tracker_viewed', label: 'מעקב נצפה', sortable: true, type: 'boolean', getValue: d => fmtBool(d.tracker_viewed) },

  // ===== ⭐ פידבק =====
  { id: 'runner_took_comment', label: 'הערת שליח (איסוף)', sortable: true, type: 'text', getValue: d => fmtStr(d.runner_took_comment) },
  { id: 'runner_delivered_comment', label: 'הערת שליח (מסירה)', sortable: true, type: 'text', getValue: d => fmtStr(d.runner_delivered_comment) },
  { id: 'client_runner_rank', label: 'דירוג שליח מלקוח', sortable: true, type: 'number', getValue: d => { const v = d.client_runner_rank ?? d.customerRating; return v ? `⭐ ${v}` : '-'; } },
  { id: 'client_remark', label: 'הערת לקוח (פידבק)', sortable: true, type: 'text', getValue: d => fmtStr(d.client_remark || d.customerFeedback) },
  { id: 'feedback_status', label: 'סטטוס פידבק', sortable: true, type: 'text', getValue: d => fmtStr(d.feedback_status) },
  { id: 'feedback_first_answer', label: 'תשובה לפידבק 1', sortable: true, type: 'text', getValue: d => fmtStr(d.feedback_first_answer || d.customerFeedbackQuestion1) },
  { id: 'feedback_second_answer', label: 'תשובה לפידבק 2', sortable: true, type: 'text', getValue: d => fmtStr(d.feedback_second_answer || d.customerFeedbackQuestion2) },
  { id: 'feedback_third_answer', label: 'תשובה לפידבק 3', sortable: true, type: 'text', getValue: d => fmtStr(d.feedback_third_answer || d.customerFeedbackQuestion3) },

  // ===== 📝 אחר =====
  { id: 'cancelledAt', label: 'זמן ביטול', sortable: true, type: 'date', getValue: d => fmtDate(d.cancelledAt) },
  { id: 'cancelledAfterPickup', label: 'בוטל אחרי איסוף', sortable: true, type: 'boolean', getValue: d => fmtBool(d.cancelledAfterPickup) },
  { id: 'vehicle_type', label: 'סוג רכב', sortable: true, type: 'text', getValue: (d, extra) => fmtStr(extra?.courier?.vehicleType || d.vehicle_type) },
  { id: 'courierRating', label: 'דירוג שליח', sortable: true, type: 'number', getValue: (d, extra) => extra?.courier?.rating ? `⭐ ${extra.courier.rating}` : d.courierRating ? `⭐ ${d.courierRating}` : '-' },
  { id: 'dropoff_coords', label: 'נ.צ לקוח', sortable: false, type: 'text', getValue: d => fmtCoordPair(d.dropoff_latitude, d.dropoff_longitude) },
  { id: 'pickup_coords', label: 'נ.צ מסעדה', sortable: false, type: 'text', getValue: d => fmtCoordPair(d.pickup_latitude, d.pickup_longitude) },
];

// Quick lookup by ID
export const COLUMN_MAP = new Map(ALL_COLUMNS.map(c => [c.id, c]));

// IDs that need custom rendering (not simple text cells)
export const CUSTOM_COLUMN_IDS = new Set(['orderNumber', 'status', 'courier', 'timeRemaining', 'price']);

// ── Excel Export helpers ──
// Build an export-friendly value from a column: replaces emojis with text, uses full date format
const fmtDateExport = (d: Date | null | undefined) => d ? format(d, 'dd/MM/yyyy HH:mm:ss', { locale: he }) : '-';
const fmtBoolExport = (v: boolean | undefined | null) => v === true ? 'כן' : v === false ? 'לא' : '-';

export function buildExportMapping(
  statusLabels: Record<string, string>,
  calculateTimeRemaining?: (d: Delivery) => number | null,
): Record<string, { label: string; getValue: (d: Delivery, courier?: Courier | null) => string }> {
  return Object.fromEntries(
    ALL_COLUMNS.map(col => [col.id, {
      label: col.label,
      getValue: (d: Delivery, courier?: Courier | null): string => {
        // Special cases that need Excel-specific formatting
        if (col.id === 'status') return statusLabels[d.status] || d.status;
        if (col.id === 'timeRemaining' && calculateTimeRemaining) {
          const r = calculateTimeRemaining(d);
          return r !== null ? Math.ceil(r / 60).toString() : '-';
        }

        // Type-based overrides for Excel-friendly output
        if (col.type === 'boolean') {
          // Get the raw boolean from the delivery data
          const raw = col.getValue(d, { courier });
          if (raw === '✅') return 'כן';
          if (raw === '❌') return 'לא';
          return raw;
        }

        if (col.type === 'date') {
          // Re-format dates with full timestamp for Excel
          const raw = col.getValue(d, { courier });
          if (raw === '-') return '-';
          // The getValue already returns formatted, just use it
          return raw;
        }

        // Default: use column-defs getValue (already handles all the field fallback logic)
        return col.getValue(d, { courier });
      },
    }])
  );
}



