import React from 'react';
import { useDelivery } from '../../context/delivery.context';
import { Menu, Bike, Store, FileSpreadsheet, Files, TrendingUp, AlertTriangle, Wallet, BarChart3, ChevronDown, X, Check } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { getWorkedMinutesWithinRange, formatWorkedDuration } from '../../utils/shift-work';
import { PeriodToolbar, PeriodMode } from '../ui/period-toolbar';

type AnalyticsView = 'overview' | 'couriers' | 'restaurants' | 'profitability';

const MONEY = (n: number) => `₪${n.toLocaleString('he-IL')}`;
const safeSheet = (name: string) => (name.replace(/[\\/*?:[\]]/g, '').trim() || 'דוח').slice(0, 31);
const fmtDateTime = (value: Date | string | null | undefined) => {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : formatDate(d, 'dd/MM/yyyy HH:mm');
};

const buildShiftBounds = (dateKey: string, startTime: string, endTime: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const start = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
  const end = new Date(year, month - 1, day, endHour, endMinute, 0, 0);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
};

const DETAIL_HEADERS = ['מס׳ הזמנה', 'סטטוס', 'מסעדה', 'לקוח', 'כתובת', 'נוצרה', 'נאסף', 'נמסר', 'מחיר', 'תשלום שליח'];

export const ReportsPage: React.FC = () => {
  const { state } = useDelivery();
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>('current_month');
  const [monthAnchor, setMonthAnchor] = React.useState(new Date());
  const [customStartDate, setCustomStartDate] = React.useState(formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = React.useState(formatDate(new Date(), 'yyyy-MM-dd'));
  const [analyticsView, setAnalyticsView] = React.useState<AnalyticsView>('overview');

  // Export toolbar state
  const [exportEntityType, setExportEntityType] = React.useState<'couriers' | 'restaurants'>('couriers');
  const [exportSelectedIds, setExportSelectedIds] = React.useState<string[]>([]);
  const [exportDropdownOpen, setExportDropdownOpen] = React.useState(false);
  const exportDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setExportSelectedIds([]);
  }, [exportEntityType]);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  const dateRange = React.useMemo(() => {
    if (periodMode === 'custom_range') {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    const anchor = periodMode === 'prev_month'
      ? new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1)
      : new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
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

  const courierReports = React.useMemo(() => {
    return state.couriers.map((courier) => {
      const deliveries = deliveriesInRange.filter((delivery) =>
        delivery.courierId === courier.id ||
        delivery.runner_id === courier.id ||
        delivery.courierName === courier.name
      );
      const assignments = state.shifts.flatMap((shift) => {
        // רק שיבוצים שהשליח כבר נכנס אליהם בפועל (startedAt קיים)
        const relevant = shift.courierAssignments.filter(
          (assignment) => assignment.courierId === courier.id && assignment.startedAt !== null
        );
        if (relevant.length === 0) return [];
        const { start, end } = buildShiftBounds(shift.date, shift.startTime, shift.endTime);
        if (end < dateRange.start || start > dateRange.end) return [];
        return relevant.map((assignment) => ({ shift, assignment }));
      });
      const workedMinutes = assignments.reduce(
        (sum, item) => sum + getWorkedMinutesWithinRange(item.assignment, dateRange.start, dateRange.end),
        0,
      );
      return {
        courier,
        deliveries,
        assignments,
        workedMinutes,
        deliveredCount: deliveries.filter((d) => d.status === 'delivered').length,
        cancelledCount: deliveries.filter((d) => d.status === 'cancelled').length,
        revenue: deliveries.reduce((sum, d) => sum + (d.price || 0), 0),
        courierPay: deliveries.reduce((sum, d) => sum + (d.runner_price ?? d.courierPayment ?? 0), 0),
      };
    }).filter((report) => report.deliveries.length > 0 || report.assignments.length > 0);
  }, [dateRange.end, dateRange.start, deliveriesInRange, state.couriers, state.shifts]);

  const restaurantReports = React.useMemo(() => {
    return state.restaurants.map((restaurant) => {
      const deliveries = deliveriesInRange.filter((delivery) =>
        delivery.restaurantId === restaurant.id ||
        delivery.rest_id === restaurant.id ||
        delivery.restaurantName === restaurant.name ||
        delivery.rest_name === restaurant.name
      );
      return {
        restaurant,
        deliveries,
        deliveredCount: deliveries.filter((d) => d.status === 'delivered').length,
        cancelledCount: deliveries.filter((d) => d.status === 'cancelled').length,
        revenue: deliveries.reduce((sum, d) => sum + (d.price || 0), 0),
        commission: deliveries.reduce((sum, d) => sum + (d.commissionAmount || 0), 0),
      };
    }).filter((report) => report.deliveries.length > 0);
  }, [deliveriesInRange, state.restaurants]);

  const buildDeliveryRows = React.useCallback((deliveries: typeof deliveriesInRange) => {
    return deliveries.map((delivery) => [
      delivery.orderNumber,
      delivery.status,
      delivery.rest_name || delivery.restaurantName || '-',
      delivery.client_name || delivery.customerName || '-',
      delivery.client_full_address || delivery.address || '-',
      fmtDateTime(delivery.createdAt),
      fmtDateTime(delivery.pickedUpAt),
      fmtDateTime(delivery.deliveredAt),
      delivery.price || 0,
      delivery.runner_price ?? delivery.courierPayment ?? 0,
    ]);
  }, []);

  const workbookBlob = React.useCallback((wb: XLSX.WorkBook) => {
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Views = [{ RTL: true }];
    return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }, []);

  const buildCourierWorkbook = React.useCallback((report: (typeof courierReports)[number], opts?: { includeShifts?: boolean; includeDeliveries?: boolean }) => {
    const includeShifts = opts?.includeShifts ?? true;
    const includeDeliveries = opts?.includeDeliveries ?? true;
    const wb = XLSX.utils.book_new();
    const summary = XLSX.utils.json_to_sheet([
      { פריט: 'שליח', ערך: report.courier.name },
      { פריט: 'טלפון', ערך: report.courier.phone || '-' },
      { פריט: 'משמרות', ערך: report.assignments.length },
      { פריט: 'שעות עבודה', ערך: formatWorkedDuration(report.workedMinutes) },
      { פריט: 'סה״כ משלוחים', ערך: report.deliveries.length },
      { פריט: 'נמסרו', ערך: report.deliveredCount },
      { פריט: 'בוטלו', ערך: report.cancelledCount },
      { פריט: 'הכנסות', ערך: MONEY(report.revenue) },
      { פריט: 'תשלום שליח', ערך: MONEY(report.courierPay) },
    ]);
    XLSX.utils.book_append_sheet(wb, summary, 'סיכום');

    if (includeShifts) {
      const DAY_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      const fmtTime = (d: Date | null | undefined) => d ? formatDate(new Date(d), 'HH:mm') : '-';
      const SHIFT_HEADERS = ['יום', 'תאריך', 'כניסה', 'יציאה', 'סיכום שעות', 'כמות משלוחים'];
      const shiftRows = report.assignments.map(({ shift, assignment }) => {
        const shiftDate = new Date(shift.date);
        const workedMins = getWorkedMinutesWithinRange(assignment, dateRange.start, dateRange.end);
        const h = Math.floor(workedMins / 60);
        const m = workedMins % 60;
        const dayDeliveries = report.deliveries.filter(d => {
          if (!d.createdAt) return false;
          return new Date(d.createdAt).toDateString() === shiftDate.toDateString();
        }).length;
        return [
          DAY_HE[shiftDate.getDay()],
          formatDate(shiftDate, 'dd/MM/yyyy'),
          fmtTime(assignment.startedAt),
          fmtTime(assignment.endedAt),
          workedMins > 0 ? `${h}:${String(m).padStart(2, '0')}` : '-',
          dayDeliveries,
        ];
      });
      const shiftsWs = XLSX.utils.aoa_to_sheet([
        SHIFT_HEADERS,
        ...(shiftRows.length > 0 ? shiftRows : [['אין משמרות בתקופה הנבחרת', '', '', '', '', '']]),
      ]);
      shiftsWs['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, shiftsWs, 'משמרות');
    }

    if (includeDeliveries) {
      const deliveriesWs = XLSX.utils.aoa_to_sheet([DETAIL_HEADERS, ...buildDeliveryRows(report.deliveries)]);
      XLSX.utils.book_append_sheet(wb, deliveriesWs, 'משלוחים');
    }

    return wb;
  }, [buildDeliveryRows, dateRange.end, dateRange.start]);

  const buildRestaurantWorkbook = React.useCallback((report: (typeof restaurantReports)[number]) => {
    const wb = XLSX.utils.book_new();
    const summary = XLSX.utils.json_to_sheet([
      { פריט: 'מסעדה', ערך: report.restaurant.name },
      { פריט: 'עיר', ערך: report.restaurant.city || '-' },
      { פריט: 'כתובת', ערך: report.restaurant.address || '-' },
      { פריט: 'סה״כ משלוחים', ערך: report.deliveries.length },
      { פריט: 'נמסרו', ערך: report.deliveredCount },
      { פריט: 'בוטלו', ערך: report.cancelledCount },
      { פריט: 'הכנסות', ערך: MONEY(report.revenue) },
      { פריט: 'עמלות', ערך: MONEY(report.commission) },
    ]);
    XLSX.utils.book_append_sheet(wb, summary, 'סיכום');
    const deliveries = XLSX.utils.aoa_to_sheet([DETAIL_HEADERS, ...buildDeliveryRows(report.deliveries)]);
    XLSX.utils.book_append_sheet(wb, deliveries, 'משלוחים');
    return wb;
  }, [buildDeliveryRows]);

  const exportAllCouriers = React.useCallback(() => {
    if (courierReports.length === 0) return toast.error('אין נתונים לשליחים בתקופה שנבחרה');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(courierReports.map((report) => ({
      שליח: report.courier.name,
      משמרות: report.assignments.length,
      'שעות עבודה': formatWorkedDuration(report.workedMinutes),
      'סה״כ משלוחים': report.deliveries.length,
      נמסרו: report.deliveredCount,
      בוטלו: report.cancelledCount,
      הכנסות: report.revenue,
      'תשלום שליח': report.courierPay,
    }))), 'סיכום שליחים');
    courierReports.forEach((report) => {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([DETAIL_HEADERS, ...buildDeliveryRows(report.deliveries)]), safeSheet(report.courier.name));
    });
    saveAs(workbookBlob(wb), `דוח_מקובץ_שליחים_${formatDate(dateRange.start, 'dd-MM-yyyy')}_${formatDate(dateRange.end, 'dd-MM-yyyy')}.xlsx`);
    toast.success('דוח מקובץ של שליחים ירד');
  }, [buildDeliveryRows, courierReports, dateRange.end, dateRange.start, workbookBlob]);

  const exportAllRestaurants = React.useCallback(() => {
    if (restaurantReports.length === 0) return toast.error('אין נתונים למסעדות בתקופה שנבחרה');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(restaurantReports.map((report) => ({
      מסעדה: report.restaurant.name,
      'סה״כ משלוחים': report.deliveries.length,
      נמסרו: report.deliveredCount,
      בוטלו: report.cancelledCount,
      הכנסות: report.revenue,
      עמלות: report.commission,
    }))), 'סיכום מסעדות');
    restaurantReports.forEach((report) => {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([DETAIL_HEADERS, ...buildDeliveryRows(report.deliveries)]), safeSheet(report.restaurant.name));
    });
    saveAs(workbookBlob(wb), `דוח_מקובץ_מסעדות_${formatDate(dateRange.start, 'dd-MM-yyyy')}_${formatDate(dateRange.end, 'dd-MM-yyyy')}.xlsx`);
    toast.success('דוח מקובץ של מסעדות ירד');
  }, [buildDeliveryRows, dateRange.end, dateRange.start, restaurantReports, workbookBlob]);

  const exportSeparateCouriers = React.useCallback(async () => {
    if (courierReports.length === 0) return toast.error('אין נתונים לשליחים בתקופה שנבחרה');
    toast.loading('מכין קבצי שליחים...', { id: 'courier-reports' });
    const zip = new JSZip();
    courierReports.forEach((report) => zip.file(`${report.courier.name}.xlsx`, workbookBlob(buildCourierWorkbook(report))));
    saveAs(await zip.generateAsync({ type: 'blob' }), `דוחות_שליחים_${formatDate(dateRange.start, 'dd-MM-yyyy')}_${formatDate(dateRange.end, 'dd-MM-yyyy')}.zip`);
    toast.dismiss('courier-reports');
    toast.success('קבצים נפרדים לכל השליחים ירדו');
  }, [buildCourierWorkbook, courierReports, dateRange.end, dateRange.start, workbookBlob]);

  const exportSeparateRestaurants = React.useCallback(async () => {
    if (restaurantReports.length === 0) return toast.error('אין נתונים למסעדות בתקופה שנבחרה');
    toast.loading('מכין קבצי מסעדות...', { id: 'restaurant-reports' });
    const zip = new JSZip();
    restaurantReports.forEach((report) => zip.file(`${report.restaurant.name}.xlsx`, workbookBlob(buildRestaurantWorkbook(report))));
    saveAs(await zip.generateAsync({ type: 'blob' }), `דוחות_מסעדות_${formatDate(dateRange.start, 'dd-MM-yyyy')}_${formatDate(dateRange.end, 'dd-MM-yyyy')}.zip`);
    toast.dismiss('restaurant-reports');
    toast.success('קבצים נפרדים לכל המסעדות ירדו');
  }, [buildRestaurantWorkbook, dateRange.end, dateRange.start, restaurantReports, workbookBlob]);

  const handleExportCombined = React.useCallback(() => {
    const dateTag = `${formatDate(dateRange.start, 'dd-MM-yyyy')}_${formatDate(dateRange.end, 'dd-MM-yyyy')}`;

    if (exportEntityType === 'couriers') {
      // אם אין בחירה — הורד את כולם
      const selected = exportSelectedIds.length > 0
        ? courierReports.filter((r) => exportSelectedIds.includes(r.courier.id))
        : courierReports;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(selected.map((r) => ({
        שליח: r.courier.name,
        משמרות: r.assignments.length,
        'שעות עבודה': formatWorkedDuration(r.workedMinutes),
        'סה״כ משלוחים': r.deliveries.length,
        נמסרו: r.deliveredCount,
        בוטלו: r.cancelledCount,
        הכנסות: r.revenue,
        'תשלום שליח': r.courierPay,
      }))), 'סיכום שליחים');
      selected.forEach((r) => {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([DETAIL_HEADERS, ...buildDeliveryRows(r.deliveries)]), safeSheet(r.courier.name));
      });
      saveAs(workbookBlob(wb), `דוח_מקובץ_שליחים_${dateTag}.xlsx`);
      toast.success(`דוח מקובץ של ${selected.length} שליחים ירד`);
    } else {
      // אם אין בחירה — הורד את כולם
      const selected = exportSelectedIds.length > 0
        ? restaurantReports.filter((r) => exportSelectedIds.includes(r.restaurant.id))
        : restaurantReports;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(selected.map((r) => ({
        מסעדה: r.restaurant.name,
        'סה״כ משלוחים': r.deliveries.length,
        נמסרו: r.deliveredCount,
        בוטלו: r.cancelledCount,
        הכנסות: r.revenue,
        עמלות: r.commission,
      }))), 'סיכום מסעדות');
      selected.forEach((r) => {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([DETAIL_HEADERS, ...buildDeliveryRows(r.deliveries)]), safeSheet(r.restaurant.name));
      });
      saveAs(workbookBlob(wb), `דוח_מקובץ_מסעדות_${dateTag}.xlsx`);
      toast.success(`דוח מקובץ של ${selected.length} מסעדות ירד`);
    }
  }, [exportEntityType, exportSelectedIds, courierReports, restaurantReports, buildDeliveryRows, workbookBlob, dateRange]);

  const handleExportSeparate = React.useCallback(async () => {
    if (exportSelectedIds.length === 0) return toast.error('בחר לפחות ישות אחת לייצוא');
    const dateTag = `${formatDate(dateRange.start, 'dd-MM-yyyy')}_${formatDate(dateRange.end, 'dd-MM-yyyy')}`;

    if (exportEntityType === 'couriers') {
      const selected = courierReports.filter((r) => exportSelectedIds.includes(r.courier.id));
      if (selected.length === 1) {
        const r = selected[0];
        saveAs(workbookBlob(buildCourierWorkbook(r, { includeShifts: true, includeDeliveries: true })), `דוח_${r.courier.name}_${dateTag}.xlsx`);
        toast.success(`הדוח של ${r.courier.name} ירד`);
        return;
      }
      toast.loading('מכין קבצים...', { id: 'toolbar-sep' });
      const zip = new JSZip();
      selected.forEach((r) => zip.file(`${r.courier.name}.xlsx`, workbookBlob(buildCourierWorkbook(r, { includeShifts: true, includeDeliveries: true }))));
      saveAs(await zip.generateAsync({ type: 'blob' }), `דוחות_שליחים_${dateTag}.zip`);
      toast.dismiss('toolbar-sep');
      toast.success(`${selected.length} קבצים נפרדים ירדו`);
    } else {
      const selected = restaurantReports.filter((r) => exportSelectedIds.includes(r.restaurant.id));
      if (selected.length === 1) {
        const r = selected[0];
        saveAs(workbookBlob(buildRestaurantWorkbook(r)), `דוח_${r.restaurant.name}_${dateTag}.xlsx`);
        toast.success(`הדוח של ${r.restaurant.name} ירד`);
        return;
      }
      toast.loading('מכין קבצים...', { id: 'toolbar-sep' });
      const zip = new JSZip();
      selected.forEach((r) => zip.file(`${r.restaurant.name}.xlsx`, workbookBlob(buildRestaurantWorkbook(r))));
      saveAs(await zip.generateAsync({ type: 'blob' }), `דוחות_מסעדות_${dateTag}.zip`);
      toast.dismiss('toolbar-sep');
      toast.success(`${selected.length} קבצים נפרדים ירדו`);
    }
  }, [exportEntityType, exportSelectedIds, courierReports, restaurantReports, buildCourierWorkbook, buildRestaurantWorkbook, workbookBlob, dateRange]);

  const deliveredInRange = React.useMemo(
    () => deliveriesInRange.filter((delivery) => delivery.status === 'delivered'),
    [deliveriesInRange]
  );
  const cancelledInRange = React.useMemo(
    () => deliveriesInRange.filter((delivery) => delivery.status === 'cancelled'),
    [deliveriesInRange]
  );
  const totalRevenue = React.useMemo(
    () => deliveredInRange.reduce((sum, delivery) => sum + (delivery.price || 0), 0),
    [deliveredInRange]
  );
  const totalCourierPay = React.useMemo(
    () => deliveredInRange.reduce((sum, delivery) => sum + (delivery.runner_price ?? delivery.courierPayment ?? 0), 0),
    [deliveredInRange]
  );
  const totalCommission = React.useMemo(
    () => deliveredInRange.reduce((sum, delivery) => sum + (delivery.commissionAmount || 0), 0),
    [deliveredInRange]
  );
  const grossProfit = totalRevenue - totalCourierPay;
  const successRate = deliveriesInRange.length > 0 ? (deliveredInRange.length / deliveriesInRange.length) * 100 : 0;
  const avgOrderValue = deliveredInRange.length > 0 ? totalRevenue / deliveredInRange.length : 0;
  const daysCovered = React.useMemo(() => {
    const ms = dateRange.end.getTime() - dateRange.start.getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [dateRange.end, dateRange.start]);
  const avgDeliveriesPerDay = deliveredInRange.length / daysCovered;
  const avgDeliveryMinutes = React.useMemo(() => {
    const completedWithTimes = deliveredInRange.filter((delivery) => delivery.createdAt && delivery.deliveredAt);
    if (completedWithTimes.length === 0) return 0;
    const totalMinutes = completedWithTimes.reduce((sum, delivery) => {
      const start = new Date(delivery.createdAt).getTime();
      const end = new Date(delivery.deliveredAt as string).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return sum;
      return sum + (end - start) / 60000;
    }, 0);
    return totalMinutes / completedWithTimes.length;
  }, [deliveredInRange]);
  const topCouriers = React.useMemo(
    () => [...courierReports].sort((a, b) => b.deliveredCount - a.deliveredCount || b.revenue - a.revenue).slice(0, 5),
    [courierReports]
  );
  const topRestaurants = React.useMemo(
    () => [...restaurantReports].sort((a, b) => b.revenue - a.revenue || b.deliveredCount - a.deliveredCount).slice(0, 5),
    [restaurantReports]
  );
  const weakestRestaurants = React.useMemo(
    () => [...restaurantReports].sort((a, b) => b.cancelledCount - a.cancelledCount || a.deliveredCount - b.deliveredCount).slice(0, 5),
    [restaurantReports]
  );
  const kpiCards = [
    {
      title: 'הכנסות שנמסרו',
      value: MONEY(totalRevenue),
      note: `${deliveredInRange.length} משלוחים נמסרו`,
      icon: Wallet,
      tint: 'bg-[#ecfccb] text-[#365314]',
    },
    {
      title: 'רווח גולמי',
      value: MONEY(grossProfit),
      note: `עמלות ${MONEY(totalCommission)} • שליחים ${MONEY(totalCourierPay)}`,
      icon: TrendingUp,
      tint: 'bg-[#dcfce7] text-[#166534]',
    },
    {
      title: 'אחוז הצלחה',
      value: `${successRate.toFixed(1)}%`,
      note: `${cancelledInRange.length} ביטולים בתקופה`,
      icon: BarChart3,
      tint: 'bg-[#dbeafe] text-[#1d4ed8]',
    },
    {
      title: 'זמן ממוצע',
      value: avgDeliveryMinutes > 0 ? `${Math.round(avgDeliveryMinutes)} דק׳` : '-',
      note: `${avgDeliveriesPerDay.toFixed(1)} משלוחים בממוצע ליום`,
      icon: AlertTriangle,
      tint: 'bg-[#fef3c7] text-[#92400e]',
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a]">
      <div className="bg-white dark:bg-[#171717] border-b border-[#e5e5e5] dark:border-[#1f1f1f] px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button onClick={() => (window as any).toggleMobileSidebar?.()} className="md:hidden p-1.5 rounded-lg text-[#737373] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">דוחות</span>
        </div>
      </div>

      <div dir="rtl">
        <PeriodToolbar
          periodMode={periodMode}
          setPeriodMode={setPeriodMode}
          monthAnchor={monthAnchor}
          setMonthAnchor={setMonthAnchor}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717] flex-wrap"
        >
          {/* מפריד */}
          <div className="h-5 w-px bg-[#e5e5e5] dark:bg-[#262626] shrink-0" />

          {/* Entity type toggle */}
          <button
            onClick={() => setExportEntityType('couriers')}
            className={`h-9 flex items-center gap-1.5 px-3 rounded-[4px] border text-sm font-medium transition-colors ${
              exportEntityType === 'couriers'
                ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
                : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            שליחים
          </button>
          <button
            onClick={() => setExportEntityType('restaurants')}
            className={`h-9 flex items-center gap-1.5 px-3 rounded-[4px] border text-sm font-medium transition-colors ${
              exportEntityType === 'restaurants'
                ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
                : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            מסעדות
          </button>

          {/* Multi-select dropdown */}
          <div className="relative w-[200px]" ref={exportDropdownRef}>
            <button
              onClick={() => setExportDropdownOpen((v) => !v)}
              className={`w-full h-9 px-3 flex items-center justify-between gap-2 rounded-[4px] border text-sm font-medium transition-colors ${
                exportSelectedIds.length > 0
                  ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
                  : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
              }`}
            >
              <span className="truncate text-right flex-1">
                {exportSelectedIds.length === 0
                  ? `בחר ${exportEntityType === 'couriers' ? 'שליחים' : 'מסעדות'}...`
                  : exportSelectedIds.length === (exportEntityType === 'couriers' ? courierReports : restaurantReports).length
                  ? `כל ה${exportEntityType === 'couriers' ? 'שליחים' : 'מסעדות'} (${exportSelectedIds.length})`
                  : `${exportSelectedIds.length} נבחרו`}
              </span>
              {exportSelectedIds.length > 0 ? (
                <span
                  onClick={(e) => { e.stopPropagation(); setExportSelectedIds([]); setExportDropdownOpen(false); }}
                  className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer shrink-0"
                  role="button"
                >
                  <X className="w-3 h-3" />
                </span>
              ) : (
                <ChevronDown className={`w-4 h-4 text-[#a3a3a3] shrink-0 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {exportDropdownOpen && (
              <div className="absolute top-full mt-1 right-0 left-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#f0f0f0] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111]">
                  <button
                    onClick={() => {
                      const all = (exportEntityType === 'couriers' ? courierReports : restaurantReports)
                        .map((r) => exportEntityType === 'couriers' ? (r as typeof courierReports[0]).courier.id : (r as typeof restaurantReports[0]).restaurant.id);
                      setExportSelectedIds(all);
                    }}
                    className="text-xs text-[#0fcdd3] hover:underline"
                  >בחר הכל</button>
                  <button onClick={() => setExportSelectedIds([])} className="text-xs text-[#a3a3a3] hover:underline">נקה</button>
                </div>
                <div className="max-h-[220px] overflow-y-auto divide-y divide-[#f0f0f0] dark:divide-[#1f1f1f]">
                  {(exportEntityType === 'couriers' ? courierReports : restaurantReports).map((r) => {
                    const id = exportEntityType === 'couriers' ? (r as typeof courierReports[0]).courier.id : (r as typeof restaurantReports[0]).restaurant.id;
                    const name = exportEntityType === 'couriers' ? (r as typeof courierReports[0]).courier.name : (r as typeof restaurantReports[0]).restaurant.name;
                    const isChecked = exportSelectedIds.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => setExportSelectedIds((prev) => isChecked ? prev.filter((x) => x !== id) : [...prev, id])}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-right hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors"
                      >
                        <div className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-[#9fe870] border-[#9fe870]' : 'border-[#d4d4d4] dark:border-[#404040]'}`}>
                          {isChecked && <Check className="w-2.5 h-2.5 text-[#0d0d12]" />}
                        </div>
                        <span className="text-sm text-[#0d0d12] dark:text-[#fafafa] truncate flex-1">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Export buttons */}
          <button
            onClick={handleExportCombined}
            className="h-9 flex items-center gap-1.5 px-3 rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#525252] dark:text-[#a3a3a3] text-sm font-medium hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#16a34a]" />
            אקסל
          </button>
          <button
            onClick={handleExportSeparate}
            disabled={exportSelectedIds.length === 0}
            className="h-9 flex items-center gap-1.5 px-3 rounded-[4px] border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#525252] dark:text-[#a3a3a3] text-sm font-medium hover:bg-[#f5f5f5] dark:hover:bg-[#202020] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Files className="w-3.5 h-3.5 text-[#2563eb]" />
            נפרד
            {exportSelectedIds.length > 0 && (
              <span className="bg-[#9fe870] text-[#0d0d12] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                {exportSelectedIds.length}
              </span>
            )}
          </button>
        </PeriodToolbar>
        <div className="shrink-0 px-4 py-1 border-b border-[#e5e5e5] dark:border-[#1f1f1f] bg-white dark:bg-[#171717]">
          <span className="text-xs text-[#a3a3a3] dark:text-[#737373]">
            {deliveriesInRange.length} משלוחים • {courierReports.length} שליחים • {restaurantReports.length} מסעדות
          </span>
        </div>
        <div className="flex flex-col items-center">
        <div className="w-full max-w-[90rem]">

        {false && (
        <div className="px-5 pt-5">
          <section className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#0d0d12] dark:text-[#fafafa]">מרכז ביצועים</h2>
                  <p className="text-sm text-[#737373] dark:text-[#a3a3a3]">ניתוח חי של התקופה שנבחרה, לפני הייצוא.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['overview', 'סקירה'],
                    ['couriers', 'שליחים'],
                    ['restaurants', 'מסעדות'],
                    ['profitability', 'רווחיות'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setAnalyticsView(id as AnalyticsView)}
                      className={`h-9 px-3 text-sm rounded-[4px] border transition-colors ${
                        analyticsView === id
                          ? 'bg-[#0d0d12] dark:bg-[#fafafa] border-[#0d0d12] dark:border-[#fafafa] text-white dark:text-[#0d0d12]'
                          : 'bg-[#fafafa] dark:bg-[#111111] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {kpiCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.title} className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm text-[#666d80] dark:text-[#a3a3a3]">{card.title}</div>
                          <div className="mt-2 text-2xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{card.value}</div>
                        </div>
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${card.tint}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-[#737373] dark:text-[#a3a3a3]">{card.note}</div>
                    </div>
                  );
                })}
              </div>

              {analyticsView === 'overview' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="xl:col-span-2 rounded-xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden">
                    <div className="px-4 py-3 bg-[#fafafa] dark:bg-[#111111] border-b border-[#e5e5e5] dark:border-[#262626]">
                      <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">מסעדות מובילות לפי הכנסות</div>
                    </div>
                    <div className="divide-y divide-[#e5e5e5] dark:divide-[#262626]">
                      {topRestaurants.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-[#737373] dark:text-[#a3a3a3]">אין נתונים להצגה בטווח שנבחר.</div>
                      ) : topRestaurants.map((report, index) => (
                        <div key={report.restaurant.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{index + 1}. {report.restaurant.name}</div>
                            <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">{report.deliveredCount} נמסרו • {report.cancelledCount} בוטלו</div>
                          </div>
                          <div className="text-sm font-semibold text-[#166534] dark:text-[#4ade80]">{MONEY(report.revenue)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] p-4 bg-[#fafafa] dark:bg-[#111111]">
                    <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">תקציר מהיר</div>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#737373] dark:text-[#a3a3a3]">ממוצע להזמנה</span>
                        <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{MONEY(avgOrderValue)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#737373] dark:text-[#a3a3a3]">עמלות שנצברו</span>
                        <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{MONEY(totalCommission)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#737373] dark:text-[#a3a3a3]">תשלום שליחים</span>
                        <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{MONEY(totalCourierPay)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#737373] dark:text-[#a3a3a3]">ימי פעילות בטווח</span>
                        <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{daysCovered}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {analyticsView === 'couriers' && (
                <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden">
                  <div className="px-4 py-3 bg-[#fafafa] dark:bg-[#111111] border-b border-[#e5e5e5] dark:border-[#262626]">
                    <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">שליחים מובילים</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#fafafa] dark:bg-[#0f0f0f]">
                        <tr className="text-right text-[#666d80] dark:text-[#a3a3a3]">
                          <th className="px-4 py-3 font-medium">שליח</th>
                          <th className="px-4 py-3 font-medium">משמרות</th>
                          <th className="px-4 py-3 font-medium">שעות עבודה</th>
                          <th className="px-4 py-3 font-medium">נמסרו</th>
                          <th className="px-4 py-3 font-medium">בוטלו</th>
                          <th className="px-4 py-3 font-medium">הכנסות</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#262626]">
                        {topCouriers.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-[#737373] dark:text-[#a3a3a3]">אין נתוני שליחים להצגה.</td></tr>
                        ) : topCouriers.map((report) => (
                          <tr key={report.courier.id}>
                            <td className="px-4 py-3 font-medium text-[#0d0d12] dark:text-[#fafafa]">{report.courier.name}</td>
                            <td className="px-4 py-3">{report.assignments.length}</td>
                            <td className="px-4 py-3">{formatWorkedDuration(report.workedMinutes)}</td>
                            <td className="px-4 py-3 text-[#166534] dark:text-[#4ade80] font-medium">{report.deliveredCount}</td>
                            <td className="px-4 py-3 text-[#dc2626] dark:text-[#f87171] font-medium">{report.cancelledCount}</td>
                            <td className="px-4 py-3 font-semibold">{MONEY(report.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {analyticsView === 'restaurants' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden">
                    <div className="px-4 py-3 bg-[#fafafa] dark:bg-[#111111] border-b border-[#e5e5e5] dark:border-[#262626]">
                      <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">מובילות בהכנסות</div>
                    </div>
                    <div className="divide-y divide-[#e5e5e5] dark:divide-[#262626]">
                      {topRestaurants.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-[#737373] dark:text-[#a3a3a3]">אין נתוני מסעדות להצגה.</div>
                      ) : topRestaurants.map((report) => (
                        <div key={report.restaurant.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-[#0d0d12] dark:text-[#fafafa]">{report.restaurant.name}</div>
                            <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">{report.deliveries.length} משלוחים • {report.deliveredCount} נמסרו</div>
                          </div>
                          <div className="text-sm font-semibold text-[#166534] dark:text-[#4ade80]">{MONEY(report.revenue)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden">
                    <div className="px-4 py-3 bg-[#fafafa] dark:bg-[#111111] border-b border-[#e5e5e5] dark:border-[#262626]">
                      <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">דורשות תשומת לב</div>
                    </div>
                    <div className="divide-y divide-[#e5e5e5] dark:divide-[#262626]">
                      {weakestRestaurants.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-[#737373] dark:text-[#a3a3a3]">אין חריגים בתקופה שנבחרה.</div>
                      ) : weakestRestaurants.map((report) => (
                        <div key={report.restaurant.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-[#0d0d12] dark:text-[#fafafa]">{report.restaurant.name}</div>
                            <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">{report.deliveredCount} נמסרו • {report.cancelledCount} בוטלו</div>
                          </div>
                          <div className="text-sm font-semibold text-[#dc2626] dark:text-[#f87171]">{report.cancelledCount} ביטולים</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {analyticsView === 'profitability' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] p-4 bg-[#fafafa] dark:bg-[#111111]">
                    <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">הכנסה ממוצעת ליום</div>
                    <div className="mt-2 text-2xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{MONEY(totalRevenue / daysCovered)}</div>
                  </div>
                  <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] p-4 bg-[#fafafa] dark:bg-[#111111]">
                    <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">תשלום ממוצע לשליח</div>
                    <div className="mt-2 text-2xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{deliveredInRange.length ? MONEY(totalCourierPay / deliveredInRange.length) : '-'}</div>
                  </div>
                  <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] p-4 bg-[#fafafa] dark:bg-[#111111]">
                    <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">רווח גולמי להזמנה</div>
                    <div className="mt-2 text-2xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{deliveredInRange.length ? MONEY(grossProfit / deliveredInRange.length) : '-'}</div>
                  </div>
                  <div className="rounded-xl border border-[#e5e5e5] dark:border-[#262626] p-4 bg-[#fafafa] dark:bg-[#111111]">
                    <div className="text-sm text-[#737373] dark:text-[#a3a3a3]">עמלה ממוצעת להזמנה</div>
                    <div className="mt-2 text-2xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{deliveredInRange.length ? MONEY(totalCommission / deliveredInRange.length) : '-'}</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
        )}


        </div>
        </div>
      </div>
    </div>
  );
};
