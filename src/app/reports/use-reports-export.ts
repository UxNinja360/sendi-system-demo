import { useCallback } from 'react';
import { format as formatDate } from 'date-fns';
import JSZip from 'jszip';
import { toast } from 'sonner';
import type {
  Courier,
  CourierShiftAssignment,
  Delivery,
  Restaurant,
  WorkShift,
} from '../types/delivery.types';
import {
  appendAoaSheet,
  appendJsonSheet,
  createRtlWorkbook,
  downloadBlob,
  downloadWorkbook,
  sanitizeExportFileName,
  workbookToExcelBuffer,
} from '../utils/export-utils';
import {
  SENDI_PLUS_BASE_DELIVERY_CHARGE,
  SENDI_PLUS_DISTANCE_STEP_CHARGE,
  findDeliveryRestaurant,
  formatCurrency,
  getDeliveryCourierBasePay,
  getDeliveryCustomerCharge,
  getDeliveryRestaurantCharge,
  getDeliveryWalletCharge,
  getSendiPlusBillableDistanceKm,
  isSendiPlusDelivery,
} from '../utils/delivery-finance';
import { SENDI_PLUS_LABEL } from '../utils/sendi-plus';
import { formatWorkedDuration, getWorkedMinutesWithinRange } from '../utils/shift-work';

const MONEY = (value: number) => formatCurrency(value);
const DETAIL_HEADERS = [
  'מס׳ הזמנה',
  'מקור',
  'סטטוס',
  'מסעדה',
  'לקוח',
  'כתובת',
  'נוצרה',
  'נאסף',
  'נמסר',
  'חיוב לקוח',
  `חיוב ${SENDI_PLUS_LABEL}`,
  'חיוב מסעדה רגיל',
  'ק״מ לחיוב',
  'תשלום שליח',
];

const safeSheetName = (name: string) =>
  sanitizeExportFileName(name, 'דוח').slice(0, 31);

const formatDateTime = (value: Date | string | null | undefined) => {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : formatDate(date, 'dd/MM/yyyy HH:mm');
};

export interface ReportsDateRange {
  start: Date;
  end: Date;
}

export interface CourierReportAssignment {
  shift: WorkShift;
  assignment: CourierShiftAssignment;
}

export interface CourierReport {
  courier: Courier;
  deliveries: Delivery[];
  assignments: CourierReportAssignment[];
  workedMinutes: number;
  deliveredCount: number;
  cancelledCount: number;
  creditCount: number;
  revenue: number;
  billableRevenue: number;
  walletRevenue: number;
  regularRevenue: number;
  courierPay: number;
  sendiPlusCreditCount: number;
  regularCreditCount: number;
  billableDistanceKm: number;
}

export interface RestaurantReport {
  restaurant: Restaurant;
  isSendiPlus: boolean;
  deliveries: Delivery[];
  deliveredCount: number;
  cancelledCount: number;
  creditCount: number;
  revenue: number;
  billableRevenue: number;
  walletRevenue: number;
  regularRevenue: number;
  commission: number;
  sendiPlusCreditCount: number;
  regularCreditCount: number;
  billableDistanceKm: number;
}

interface UseReportsExportParams {
  dateRange: ReportsDateRange;
  exportEntityType: 'couriers' | 'restaurants';
  exportSelectedIds: string[];
  courierReports: CourierReport[];
  restaurantReports: RestaurantReport[];
  restaurants: Restaurant[];
}

const buildDeliveryRows = (deliveries: Delivery[], restaurants: Restaurant[]) =>
  deliveries.map((delivery) => {
    const restaurant = findDeliveryRestaurant(delivery, restaurants);
    const isSendiPlus = isSendiPlusDelivery(delivery, restaurant);
    const walletCharge = getDeliveryWalletCharge(delivery, restaurant);
    const restaurantCharge = isSendiPlus ? 0 : getDeliveryRestaurantCharge(delivery);
    const billableDistanceKm = isSendiPlus ? getSendiPlusBillableDistanceKm(delivery) : 0;

    return [
      delivery.orderNumber,
      isSendiPlus ? SENDI_PLUS_LABEL : 'רגיל',
      delivery.status,
      delivery.rest_name || delivery.restaurantName || '-',
      delivery.client_name || delivery.customerName || '-',
      delivery.client_full_address || delivery.address || '-',
      formatDateTime(delivery.createdAt ?? delivery.creation_time),
      formatDateTime(delivery.pickedUpAt ?? delivery.picked_up_time),
      formatDateTime(delivery.deliveredAt ?? delivery.delivered_time),
      getDeliveryCustomerCharge(delivery),
      walletCharge,
      restaurantCharge,
      billableDistanceKm || '-',
      getDeliveryCourierBasePay(delivery),
    ];
  });

const buildCourierWorkbook = (
  report: CourierReport,
  dateRange: ReportsDateRange,
  restaurants: Restaurant[],
  opts?: { includeShifts?: boolean; includeDeliveries?: boolean },
) => {
  const includeShifts = opts?.includeShifts ?? true;
  const includeDeliveries = opts?.includeDeliveries ?? true;
  const workbook = createRtlWorkbook();

  appendJsonSheet(
    workbook,
    [
      { פרט: 'שליח', ערך: report.courier.name },
      { פרט: 'טלפון', ערך: report.courier.phone || '-' },
      { פרט: 'משמרות', ערך: report.assignments.length },
      { פרט: 'שעות עבודה', ערך: formatWorkedDuration(report.workedMinutes) },
      { פרט: 'סה"כ משלוחים', ערך: report.deliveries.length },
      { פרט: 'נמסרו', ערך: report.deliveredCount },
      { פרט: 'בוטלו', ערך: report.cancelledCount },
      { פרט: 'קרדיטים נוצלו', ערך: report.creditCount },
      { פרט: `${SENDI_PLUS_LABEL} לחיוב`, ערך: report.sendiPlusCreditCount },
      { פרט: 'רגילים לחיוב', ערך: report.regularCreditCount },
      { פרט: `חיוב ${SENDI_PLUS_LABEL}`, ערך: MONEY(report.walletRevenue) },
      { פרט: 'חיוב רגיל ישיר', ערך: MONEY(report.regularRevenue) },
      { פרט: 'ק״מ לחיוב', ערך: report.billableDistanceKm },
      { פרט: 'חיוב אמיתי', ערך: MONEY(report.billableRevenue) },
      { פרט: 'תשלום שליח', ערך: MONEY(report.courierPay) },
    ],
    'סיכום',
  );

  if (includeShifts) {
    const dayLabels = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const formatTime = (value: Date | null | undefined) =>
      value ? formatDate(new Date(value), 'HH:mm') : '-';
    const shiftRows = report.assignments.map(({ shift, assignment }) => {
      const shiftDate = new Date(shift.date);
      const workedMinutes = getWorkedMinutesWithinRange(
        assignment,
        dateRange.start,
        dateRange.end,
      );
      const hours = Math.floor(workedMinutes / 60);
      const minutes = workedMinutes % 60;
      const dayDeliveries = report.deliveries.filter((delivery) => {
        if (!delivery.createdAt) {
          return false;
        }

        return (
          new Date(delivery.createdAt).toDateString() === shiftDate.toDateString()
        );
      }).length;

      return [
        dayLabels[shiftDate.getDay()],
        formatDate(shiftDate, 'dd/MM/yyyy'),
        formatTime(assignment.startedAt),
        formatTime(assignment.endedAt),
        workedMinutes > 0 ? `${hours}:${String(minutes).padStart(2, '0')}` : '-',
        dayDeliveries,
      ];
    });

    appendAoaSheet(
      workbook,
      [
        ['יום', 'תאריך', 'כניסה', 'יציאה', 'סיכום שעות', 'כמות משלוחים'],
        ...(shiftRows.length > 0
          ? shiftRows
          : [['אין משמרות בתקופה הנבחרת', '', '', '', '', '']]),
      ],
      'משמרות',
      [10, 14, 10, 10, 14, 16],
    );
  }

  if (includeDeliveries) {
    appendAoaSheet(
      workbook,
      [DETAIL_HEADERS, ...buildDeliveryRows(report.deliveries, restaurants)],
      'משלוחים',
    );
  }

  return workbook;
};

const buildRestaurantWorkbook = (report: RestaurantReport, restaurants: Restaurant[]) => {
  const workbook = createRtlWorkbook();

  appendJsonSheet(
    workbook,
    [
      { פרט: 'מסעדה', ערך: report.restaurant.name },
      { פרט: 'מקור', ערך: report.isSendiPlus ? SENDI_PLUS_LABEL : 'רגיל' },
      { פרט: 'עיר', ערך: report.restaurant.city || '-' },
      { פרט: 'כתובת', ערך: report.restaurant.address || '-' },
      { פרט: 'סה"כ משלוחים', ערך: report.deliveries.length },
      { פרט: 'נמסרו', ערך: report.deliveredCount },
      { פרט: 'בוטלו', ערך: report.cancelledCount },
      { פרט: 'קרדיטים לחיוב', ערך: report.creditCount },
      { פרט: `${SENDI_PLUS_LABEL} לחיוב`, ערך: report.sendiPlusCreditCount },
      { פרט: 'רגילים לחיוב', ערך: report.regularCreditCount },
      { פרט: `חיוב ${SENDI_PLUS_LABEL}`, ערך: MONEY(report.walletRevenue) },
      { פרט: 'חיוב רגיל ישיר', ערך: MONEY(report.regularRevenue) },
      { פרט: 'ק״מ לחיוב', ערך: report.billableDistanceKm },
      { פרט: 'חיוב אמיתי', ערך: MONEY(report.billableRevenue) },
      { פרט: 'עמלות', ערך: MONEY(report.commission) },
    ],
    'סיכום',
  );
  appendAoaSheet(
    workbook,
    [DETAIL_HEADERS, ...buildDeliveryRows(report.deliveries, restaurants)],
    'משלוחים',
  );

  return workbook;
};

export const useReportsExport = ({
  dateRange,
  exportEntityType,
  exportSelectedIds,
  courierReports,
  restaurantReports,
  restaurants,
}: UseReportsExportParams) => {
  const handleExportCombined = useCallback(() => {
    const dateTag = `${formatDate(dateRange.start, 'dd-MM-yyyy')}_${formatDate(dateRange.end, 'dd-MM-yyyy')}`;

    if (exportEntityType === 'couriers') {
      const selectedReports =
        exportSelectedIds.length > 0
          ? courierReports.filter((report) =>
              exportSelectedIds.includes(report.courier.id),
            )
          : courierReports;

      if (selectedReports.length === 0) {
        toast.error('אין נתונים לשליחים בתקופה שנבחרה');
        return;
      }

      const workbook = createRtlWorkbook();
      appendJsonSheet(
        workbook,
        selectedReports.map((report) => ({
          שליח: report.courier.name,
          משמרות: report.assignments.length,
          'שעות עבודה': formatWorkedDuration(report.workedMinutes),
          'סה"כ משלוחים': report.deliveries.length,
          נמסרו: report.deliveredCount,
          בוטלו: report.cancelledCount,
          'קרדיטים נוצלו': report.creditCount,
          [`${SENDI_PLUS_LABEL} לחיוב`]: report.sendiPlusCreditCount,
          'רגילים לחיוב': report.regularCreditCount,
          [`חיוב ${SENDI_PLUS_LABEL}`]: report.walletRevenue,
          'חיוב רגיל ישיר': report.regularRevenue,
          'ק״מ לחיוב': report.billableDistanceKm,
          'חיוב אמיתי': report.billableRevenue,
          'תשלום שליח': report.courierPay,
        })),
        'סיכום שליחים',
      );
      selectedReports.forEach((report) => {
        appendAoaSheet(
          workbook,
          [DETAIL_HEADERS, ...buildDeliveryRows(report.deliveries, restaurants)],
          safeSheetName(report.courier.name),
        );
      });

      downloadWorkbook(workbook, `דוח_מקובץ_שליחים_${dateTag}.xlsx`);
      toast.success(`דוח מקובץ של ${selectedReports.length} שליחים ירד`);
      return;
    }

    const selectedReports =
      exportSelectedIds.length > 0
        ? restaurantReports.filter((report) =>
            exportSelectedIds.includes(report.restaurant.id),
          )
        : restaurantReports;

    if (selectedReports.length === 0) {
      toast.error('אין נתונים למסעדות בתקופה שנבחרה');
      return;
    }

    const workbook = createRtlWorkbook();
    appendJsonSheet(
      workbook,
      selectedReports.map((report) => ({
        מסעדה: report.restaurant.name,
        מקור: report.isSendiPlus ? SENDI_PLUS_LABEL : 'רגיל',
        'סה"כ משלוחים': report.deliveries.length,
        נמסרו: report.deliveredCount,
        בוטלו: report.cancelledCount,
        'קרדיטים לחיוב': report.creditCount,
        [`${SENDI_PLUS_LABEL} לחיוב`]: report.sendiPlusCreditCount,
        'רגילים לחיוב': report.regularCreditCount,
        [`חיוב ${SENDI_PLUS_LABEL}`]: report.walletRevenue,
        'חיוב רגיל ישיר': report.regularRevenue,
        'ק״מ לחיוב': report.billableDistanceKm,
        'חיוב אמיתי': report.billableRevenue,
        עמלות: report.commission,
      })),
      'סיכום מסעדות',
    );
    selectedReports.forEach((report) => {
      appendAoaSheet(
        workbook,
        [DETAIL_HEADERS, ...buildDeliveryRows(report.deliveries, restaurants)],
        safeSheetName(report.restaurant.name),
      );
    });

    downloadWorkbook(workbook, `דוח_מקובץ_מסעדות_${dateTag}.xlsx`);
    toast.success(`דוח מקובץ של ${selectedReports.length} מסעדות ירד`);
  }, [
    courierReports,
    dateRange.end,
    dateRange.start,
    exportEntityType,
    exportSelectedIds,
    restaurantReports,
    restaurants,
  ]);

  const handleExportSeparate = useCallback(async () => {
    if (exportSelectedIds.length === 0) {
      toast.error('בחר לפחות ישות אחת לייצוא');
      return;
    }

    const dateTag = `${formatDate(dateRange.start, 'dd-MM-yyyy')}_${formatDate(dateRange.end, 'dd-MM-yyyy')}`;

    if (exportEntityType === 'couriers') {
      const selectedReports = courierReports.filter((report) =>
        exportSelectedIds.includes(report.courier.id),
      );

      if (selectedReports.length === 0) {
        toast.error('לא נמצאו שליחים לייצוא');
        return;
      }

      if (selectedReports.length === 1) {
        const report = selectedReports[0];
        downloadWorkbook(
          buildCourierWorkbook(report, dateRange, restaurants, {
            includeShifts: true,
            includeDeliveries: true,
          }),
          `דוח_${sanitizeExportFileName(report.courier.name)}_${dateTag}.xlsx`,
        );
        toast.success(`הדוח של ${report.courier.name} ירד`);
        return;
      }

      toast.loading('מכין קבצים...', { id: 'toolbar-sep' });
      const zip = new JSZip();
      selectedReports.forEach((report) => {
        zip.file(
          `${sanitizeExportFileName(report.courier.name)}.xlsx`,
          workbookToExcelBuffer(
            buildCourierWorkbook(report, dateRange, restaurants, {
              includeShifts: true,
              includeDeliveries: true,
            }),
          ),
        );
      });

      downloadBlob(
        await zip.generateAsync({ type: 'blob' }),
        `דוחות_שליחים_${dateTag}.zip`,
      );
      toast.dismiss('toolbar-sep');
      toast.success(`${selectedReports.length} קבצים נפרדים ירדו`);
      return;
    }

    const selectedReports = restaurantReports.filter((report) =>
      exportSelectedIds.includes(report.restaurant.id),
    );

    if (selectedReports.length === 0) {
      toast.error('לא נמצאו מסעדות לייצוא');
      return;
    }

    if (selectedReports.length === 1) {
      const report = selectedReports[0];
      downloadWorkbook(
        buildRestaurantWorkbook(report, restaurants),
        `דוח_${sanitizeExportFileName(report.restaurant.name)}_${dateTag}.xlsx`,
      );
      toast.success(`הדוח של ${report.restaurant.name} ירד`);
      return;
    }

    toast.loading('מכין קבצים...', { id: 'toolbar-sep' });
    const zip = new JSZip();
    selectedReports.forEach((report) => {
      zip.file(
        `${sanitizeExportFileName(report.restaurant.name)}.xlsx`,
        workbookToExcelBuffer(buildRestaurantWorkbook(report, restaurants)),
      );
    });

    downloadBlob(
      await zip.generateAsync({ type: 'blob' }),
      `דוחות_מסעדות_${dateTag}.zip`,
    );
    toast.dismiss('toolbar-sep');
    toast.success(`${selectedReports.length} קבצים נפרדים ירדו`);
  }, [
    courierReports,
    dateRange.end,
    dateRange.start,
    exportEntityType,
    exportSelectedIds,
    restaurantReports,
    restaurants,
  ]);

  return {
    handleExportCombined,
    handleExportSeparate,
  };
};
