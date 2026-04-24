export interface ExportConfig {
  mode: 'simple' | 'grouped';
  format: 'excel' | 'pdf';
  columnMode: 'visible' | 'all' | 'custom';
  customColumns: Set<string>;
  groupBy: 'courier' | 'restaurant';
  summaryFields: Set<string>;
  includeMasterSummary: boolean;
  includeEntitySummary: boolean;
  includeEntityDetail: boolean;
}

export interface SummaryFieldDef {
  id: string;
  label: string;
  category: 'general' | 'financial';
}

export const SUMMARY_FIELDS: SummaryFieldDef[] = [
  { id: 'totalDeliveries', label: 'סה"כ משלוחים', category: 'general' },
  { id: 'deliveredCount', label: 'נמסרו', category: 'general' },
  { id: 'cancelledCount', label: 'בוטלו', category: 'general' },
  { id: 'successRate', label: 'אחוז הצלחה', category: 'general' },
  { id: 'avgTime', label: 'זמן ממוצע (דק׳)', category: 'general' },
  { id: 'totalRevenue', label: 'הכנסות', category: 'financial' },
  { id: 'totalRestPrice', label: 'מחיר מסעדה', category: 'financial' },
  { id: 'totalCourierPay', label: 'תשלום שליח', category: 'financial' },
  { id: 'totalTips', label: 'טיפים', category: 'financial' },
  { id: 'totalCash', label: 'מזומן', category: 'financial' },
  { id: 'totalCommission', label: 'עמלות', category: 'financial' },
  { id: 'profit', label: 'רווח נקי', category: 'financial' },
];

export const ALL_SUMMARY_IDS = new Set(SUMMARY_FIELDS.map((field) => field.id));
export const DEFAULT_SUMMARY_IDS = new Set(ALL_SUMMARY_IDS);
