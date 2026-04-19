import { useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { Delivery, Courier, WorkShift, ShiftTemplate } from '../types/delivery.types';
import { ALL_COLUMNS } from '../components/deliveries/column-defs';
import { SUMMARY_FIELDS } from '../components/deliveries/export-drawer';
import type { ExportConfig } from '../components/deliveries/export-drawer';

interface UseDeliveriesExportParams {
  filteredDeliveries: Delivery[];
  shifts?: WorkShift[];
  shiftTemplates?: ShiftTemplate[];
  selectedIds: Set<string>;
  visibleColumns: Set<string>;
  couriers: Courier[];
  calculateTimeRemaining: (delivery: Delivery) => number | null;
  formatTime: (seconds: number) => string;
}

export function useDeliveriesExport({
  filteredDeliveries,
  selectedIds,
  visibleColumns,
  couriers,
  shifts = [],
  shiftTemplates = [],
  calculateTimeRemaining,
  formatTime,
}: UseDeliveriesExportParams) {

  const calcGroupFinancials = useCallback((dels: Delivery[]) => {
    const delivered = dels.filter(d => d.status === 'delivered');
    const cancelled = dels.filter(d => d.status === 'cancelled');
    const totalRevenue = delivered.reduce((s, d) => s + d.price, 0);
    const totalCourierPay = dels.reduce((s, d) => s + (d.runner_price ?? d.courierPayment ?? 0), 0);
    const totalTips = dels.reduce((s, d) => s + (d.runner_tip ?? 0), 0);
    const totalCash = dels.reduce((s, d) => s + (d.sum_cash ?? 0), 0);
    const totalCommission = dels.reduce((s, d) => s + (d.commissionAmount ?? 0), 0);
    const totalRestPrice = dels.reduce((s, d) => s + (d.rest_price ?? d.restaurantPrice ?? 0), 0);
    const profit = totalRevenue - totalCourierPay - totalCommission;
    const avgTime = delivered.length > 0
      ? Math.round(delivered.reduce((s, d) => {
          if (d.deliveredAt && d.createdAt) return s + (new Date(d.deliveredAt).getTime() - new Date(d.createdAt).getTime()) / 60000;
          return s;
        }, 0) / delivered.length)
      : 0;
    return { deliveredCount: delivered.length, cancelledCount: cancelled.length, totalRevenue, totalCourierPay, totalTips, totalCash, totalCommission, totalRestPrice, profit, avgTime };
  }, []);

  const groupDeliveriesByEntity = useCallback((dels: Delivery[], groupBy: 'courier' | 'restaurant') => {
    const groups = new Map<string, { name: string; deliveries: Delivery[] }>();
    dels.forEach(d => {
      let groupId: string;
      let groupName: string;
      if (groupBy === 'courier') {
        groupId = d.courierId || '__no_courier__';
        const courier = d.courierId ? couriers.find(c => c.id === d.courierId) : null;
        groupName = courier?.name || d.courierName || 'ללא שליח';
      } else {
        groupId = d.restaurantId || d.rest_id || '__no_restaurant__';
        groupName = d.rest_name || d.restaurantName || 'ללא מסעדה';
      }
      if (!groups.has(groupId)) groups.set(groupId, { name: groupName, deliveries: [] });
      groups.get(groupId)!.deliveries.push(d);
    });
    return Array.from(groups.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name, 'he'));
  }, [couriers]);

  const buildSingleEntityWorkbook = useCallback((
    entityName: string,
    entityLabel: string,
    deliveries: Delivery[],
    cols: typeof ALL_COLUMNS,
    courierId?: string,
  ): ArrayBuffer => {
    const wb = XLSX.utils.book_new();
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Views = [{ RTL: true }];

    // --- Sheet 1: סיכום כספי ---
    const f = calcGroupFinancials(deliveries);
    const summaryRows = [
      { 'פרט': entityLabel, 'ערך': entityName },
      { 'פרט': 'סה״כ משלוחים', 'ערך': deliveries.length },
      { 'פרט': 'נמסרו', 'ערך': f.deliveredCount },
      { 'פרט': 'בוטלו', 'ערך': f.cancelledCount },
      { 'פרט': 'אחוז הצלחה', 'ערך': deliveries.length > 0 ? `${Math.round((f.deliveredCount / deliveries.length) * 100)}%` : '0%' },
      { 'פרט': 'זמן ממוצע (דק׳)', 'ערך': f.avgTime || '-' },
      { 'פרט': '', 'ערך': '' },
      { 'פרט': 'הכנסות', 'ערך': `₪${f.totalRevenue.toLocaleString()}` },
      { 'פרט': 'מחיר מסעדה', 'ערך': `₪${f.totalRestPrice.toLocaleString()}` },
      { 'פרט': 'תשלום שליח', 'ערך': `₪${f.totalCourierPay.toLocaleString()}` },
      { 'פרט': 'טיפים', 'ערך': `₪${f.totalTips.toLocaleString()}` },
      { 'פרט': 'מזומן', 'ערך': `₪${f.totalCash.toLocaleString()}` },
      { 'פרט': 'עמלות', 'ערך': `₪${f.totalCommission.toLocaleString()}` },
      { 'פרט': 'רווח נקי', 'ערך': `₪${f.profit.toLocaleString()}` },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    summaryWs['!cols'] = [{ wch: 20 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'סיכום');

    // --- Sheet 2: פירוט משלוחים ---
    const detailData = deliveries.map(d => {
      const courier = d.courierId ? couriers.find(c => c.id === d.courierId) : null;
      const timeRem = calculateTimeRemaining(d);
      const row: Record<string, string> = {};
      cols.forEach(col => {
        row[col.label] = col.getValue(d, { courier, timeRemaining: timeRem, formatTime });
      });
      return row;
    });
    const detailWs = XLSX.utils.json_to_sheet(detailData);
    detailWs['!cols'] = cols.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, detailWs, 'משלוחים');

    // --- Sheet 3: פירוט משמרות (רק לשליחים) ---
    if (courierId && shifts.length > 0) {
      const fmtT = (d: Date) => new Date(d).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      const DAY_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

      const shiftRows = shifts
        .flatMap(shift => {
          const template = shiftTemplates.find(t => t.id === shift.templateId);
          return shift.courierAssignments
            .filter(a => a.courierId === courierId && (a.startedAt || a.endedAt))
            .map(a => {
              const shiftDate = new Date(shift.date);
              const entryTime = a.startedAt ? fmtT(a.startedAt) : '-';
              const exitTime = a.endedAt ? fmtT(a.endedAt) : '-';

              let totalMinutes = 0;
              if (a.startedAt && a.endedAt) {
                totalMinutes = Math.round((new Date(a.endedAt).getTime() - new Date(a.startedAt).getTime()) / 60000);
              }
              const hours = Math.floor(totalMinutes / 60);
              const mins = totalMinutes % 60;
              const totalHours = totalMinutes > 0 ? `${hours}:${String(mins).padStart(2, '0')}` : '-';

              const dayDeliveries = deliveries.filter(d => {
                if (!d.createdAt) return false;
                const dDate = new Date(d.createdAt);
                return dDate.toDateString() === shiftDate.toDateString();
              }).length;

              return {
                'יום': DAY_HE[shiftDate.getDay()],
                'תאריך': format(shiftDate, 'dd/MM/yyyy'),
                'שם משמרת': template?.name ?? shift.name,
                'כניסה': entryTime,
                'יציאה': exitTime,
                'סיכום שעות': totalHours,
                'כמות משלוחים': dayDeliveries,
              };
            });
        })
        .sort((a, b) => a['תאריך'].localeCompare(b['תאריך']));

      if (shiftRows.length > 0) {
        const shiftsWs = XLSX.utils.json_to_sheet(shiftRows);
        shiftsWs['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
        XLSX.utils.book_append_sheet(wb, shiftsWs, 'משמרות');
      }
    }

    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  }, [calcGroupFinancials, couriers, shifts, shiftTemplates, calculateTimeRemaining, formatTime]);

  const buildGroupedExcel = useCallback(async (groupBy: 'courier' | 'restaurant') => {
    const deliveriesToExport = selectedIds.size > 0
      ? filteredDeliveries.filter(d => selectedIds.has(d.id))
      : filteredDeliveries;

    const selectedCols = ALL_COLUMNS.filter(c => visibleColumns.has(c.id));
    const entityLabel = groupBy === 'courier' ? 'שליח' : 'מסעדה';
    const entityLabelPlural = groupBy === 'courier' ? 'שליחים' : 'מסעדות';

    const sortedGroups = groupDeliveriesByEntity(deliveriesToExport, groupBy);

    if (sortedGroups.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    toast.loading(`מכין ${sortedGroups.length} קבצי Excel...`, { id: 'zip-export' });

    const zip = new JSZip();
    const dateStr = format(new Date(), 'dd-MM-yyyy');

    // Build a master summary workbook
    const masterSummaryData = sortedGroups.map(([, group]) => {
      const f = calcGroupFinancials(group.deliveries);
      return {
        [entityLabel]: group.name,
        'סה״כ משלוחים': group.deliveries.length,
        'נמסרו': f.deliveredCount,
        'בוטלו': f.cancelledCount,
        'אחוז הצלחה': group.deliveries.length > 0 ? `${Math.round((f.deliveredCount / group.deliveries.length) * 100)}%` : '0%',
        'זמן ממוצע (דק׳)': f.avgTime || '-',
        'הכנסות': `₪${f.totalRevenue.toLocaleString()}`,
        'מחיר מסעדה': `₪${f.totalRestPrice.toLocaleString()}`,
        'תשלום שליח': `₪${f.totalCourierPay.toLocaleString()}`,
        'טיפים': `₪${f.totalTips.toLocaleString()}`,
        'מזומן': `₪${f.totalCash.toLocaleString()}`,
        'עמלות': `₪${f.totalCommission.toLocaleString()}`,
        'רווח נקי': `₪${f.profit.toLocaleString()}`,
      } as Record<string, string | number>;
    });
    // Totals row
    const fAll = calcGroupFinancials(deliveriesToExport);
    masterSummaryData.push({
      [entityLabel]: `⬅ סה״כ (${sortedGroups.length})`,
      'סה״כ משלוחים': deliveriesToExport.length,
      'נמסרו': fAll.deliveredCount,
      'בוטלו': fAll.cancelledCount,
      'אחוז הצלחה': deliveriesToExport.length > 0 ? `${Math.round((fAll.deliveredCount / deliveriesToExport.length) * 100)}%` : '0%',
      'זמן ממוצע (דק׳)': fAll.avgTime || '-',
      'הכנסות': `₪${fAll.totalRevenue.toLocaleString()}`,
      'מחיר מסעדה': `₪${fAll.totalRestPrice.toLocaleString()}`,
      'תשלום שליח': `₪${fAll.totalCourierPay.toLocaleString()}`,
      'טיפים': `₪${fAll.totalTips.toLocaleString()}`,
      'מזומן': `₪${fAll.totalCash.toLocaleString()}`,
      'עמלות': `₪${fAll.totalCommission.toLocaleString()}`,
      'רווח נקי': `₪${fAll.profit.toLocaleString()}`,
    } as any);

    const masterWb = XLSX.utils.book_new();
    masterWb.Workbook = masterWb.Workbook || {};
    masterWb.Workbook.Views = [{ RTL: true }];
    const masterWs = XLSX.utils.json_to_sheet(masterSummaryData);
    masterWs['!cols'] = Object.keys(masterSummaryData[0] || {}).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(masterWb, masterWs, 'סיכום כללי');
    const masterBuf = XLSX.write(masterWb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    zip.file(`סיכום_כללי_${entityLabelPlural}_${dateStr}.xlsx`, masterBuf);

    // Create individual files per entity
    const usedNames = new Set<string>();
    sortedGroups.forEach(([groupId, group]) => {
      let safeName = group.name.replace(/[\\\/\*\?\[\]:\"<>|]/g, '').trim() || 'ללא_שם';
      if (usedNames.has(safeName)) {
        let c = 2;
        while (usedNames.has(`${safeName}_${c}`)) c++;
        safeName = `${safeName}_${c}`;
      }
      usedNames.add(safeName);

      const buf = buildSingleEntityWorkbook(group.name, entityLabel, group.deliveries, selectedCols, groupBy === 'courier' ? groupId : undefined);
      zip.file(`${safeName}_${dateStr}.xlsx`, buf);
    });

    // Generate and download zip
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipName = groupBy === 'courier'
      ? `דוחות_שליחים_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.zip`
      : `דוחות_מסעדות_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.zip`;
    saveAs(zipBlob, zipName);

    toast.dismiss('zip-export');
    toast.success(`${sortedGroups.length} קבצי Excel נארזו ב-ZIP והורדו — ${deliveriesToExport.length} משלוחים`);
  }, [filteredDeliveries, selectedIds, visibleColumns, groupDeliveriesByEntity, calcGroupFinancials, buildSingleEntityWorkbook]);

  const buildGroupedPDF = useCallback((groupBy: 'courier' | 'restaurant') => {
    const deliveriesToExport = selectedIds.size > 0
      ? filteredDeliveries.filter(d => selectedIds.has(d.id))
      : filteredDeliveries;

    const selectedCols = ALL_COLUMNS.filter(c => visibleColumns.has(c.id));
    const sortedGroups = groupDeliveriesByEntity(deliveriesToExport, groupBy);

    const doc = new jsPDF();
    const entityLabel = groupBy === 'courier' ? 'שליח' : 'מסעדה';

    // === Page 1: Summary table ===
    const summaryHead = [entityLabel, 'משלוחים', 'נמסרו', 'בוטלו', '%הצלחה', 'הכנסות', 'תשלום', 'טיפים', 'עמלות', 'רווח'];
    const summaryBody = sortedGroups.map(([, g]) => {
      const f = calcGroupFinancials(g.deliveries);
      return [g.name, g.deliveries.length.toString(), f.deliveredCount.toString(), f.cancelledCount.toString(),
        g.deliveries.length > 0 ? `${Math.round((f.deliveredCount / g.deliveries.length) * 100)}%` : '0%',
        `₪${f.totalRevenue.toLocaleString()}`, `₪${f.totalCourierPay.toLocaleString()}`, `₪${f.totalTips.toLocaleString()}`,
        `₪${f.totalCommission.toLocaleString()}`, `₪${f.profit.toLocaleString()}`];
    });
    // Totals row
    const fT = calcGroupFinancials(deliveriesToExport);
    summaryBody.push([`סה״כ (${sortedGroups.length})`, deliveriesToExport.length.toString(), fT.deliveredCount.toString(), fT.cancelledCount.toString(),
      deliveriesToExport.length > 0 ? `${Math.round((fT.deliveredCount / deliveriesToExport.length) * 100)}%` : '0%',
      `₪${fT.totalRevenue.toLocaleString()}`, `₪${fT.totalCourierPay.toLocaleString()}`, `₪${fT.totalTips.toLocaleString()}`,
      `₪${fT.totalCommission.toLocaleString()}`, `₪${fT.profit.toLocaleString()}`]);

    autoTable(doc, {
      head: [summaryHead],
      body: summaryBody,
      startY: 15,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [159, 232, 112], textColor: [0, 0, 0] },
      didParseCell: (data: any) => {
        if (data.row.index === summaryBody.length - 1 && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    // === Per-entity pages ===
    sortedGroups.forEach(([, group]) => {
      doc.addPage();
      doc.setFontSize(12);
      doc.text(`${entityLabel}: ${group.name} (${group.deliveries.length} משלוחים)`, doc.internal.pageSize.getWidth() - 15, 12, { align: 'right' });

      autoTable(doc, {
        head: [selectedCols.map(c => c.label)],
        body: group.deliveries.map(d => {
          const courier = d.courierId ? couriers.find(c => c.id === d.courierId) : null;
          const timeRem = calculateTimeRemaining(d);
          return selectedCols.map(col => col.getValue(d, { courier, timeRemaining: timeRem, formatTime }));
        }),
        startY: 18,
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1 },
        headStyles: { fillColor: [159, 232, 112], textColor: [0, 0, 0] },
      });
    });

    const fileName = groupBy === 'courier'
      ? `דוח_לפי_שליח_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.pdf`
      : `דוח_לפי_מסעדה_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.pdf`;
    doc.save(fileName);
    const elbl = groupBy === 'courier' ? 'שליחים' : 'מסעדות';
    toast.success(`PDF מקובץ לפי ${elbl} הורד — ${sortedGroups.length} ${elbl}, ${deliveriesToExport.length} משלוחים`);
  }, [filteredDeliveries, selectedIds, visibleColumns, groupDeliveriesByEntity, calcGroupFinancials, couriers, calculateTimeRemaining, formatTime]);

  const handleReportGenerate = useCallback(async (config: {
    groupBy: 'courier' | 'restaurant';
    format: 'excel-zip' | 'pdf';
    summaryFields: Set<string>;
    detailColumns: Set<string>;
    includeEntitySummary: boolean;
    includeEntityDetail: boolean;
    includeMasterSummary: boolean;
  }) => {
    const deliveriesToExport = selectedIds.size > 0
      ? filteredDeliveries.filter(d => selectedIds.has(d.id))
      : filteredDeliveries;

    const selectedCols = ALL_COLUMNS.filter(c => config.detailColumns.has(c.id));
    const entityLabel = config.groupBy === 'courier' ? 'שליח' : 'מסעדה';
    const entityLabelPlural = config.groupBy === 'courier' ? 'שליחים' : 'מסעדות';
    const sortedGroups = groupDeliveriesByEntity(deliveriesToExport, config.groupBy);

    if (sortedGroups.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    // Helper: build summary row from config
    const buildConfigSummaryRow = (f: ReturnType<typeof calcGroupFinancials>, count: number) => {
      const map: Record<string, { label: string; value: string | number }> = {
        totalDeliveries: { label: 'סה״כ משלוחים', value: count },
        deliveredCount: { label: 'נמסרו', value: f.deliveredCount },
        cancelledCount: { label: 'בוטלו', value: f.cancelledCount },
        successRate: { label: 'אחוז הצלחה', value: count > 0 ? `${Math.round((f.deliveredCount / count) * 100)}%` : '0%' },
        avgTime: { label: 'זמן ממוצע (דק׳)', value: f.avgTime || '-' },
        totalRevenue: { label: 'הכנסות', value: `₪${f.totalRevenue.toLocaleString()}` },
        totalRestPrice: { label: 'מחיר מסעדה', value: `₪${f.totalRestPrice.toLocaleString()}` },
        totalCourierPay: { label: 'תשלום שליח', value: `₪${f.totalCourierPay.toLocaleString()}` },
        totalTips: { label: 'טיפים', value: `₪${f.totalTips.toLocaleString()}` },
        totalCash: { label: 'מזומן', value: `₪${f.totalCash.toLocaleString()}` },
        totalCommission: { label: 'עמלות', value: `₪${f.totalCommission.toLocaleString()}` },
        profit: { label: 'רווח נקי', value: `₪${f.profit.toLocaleString()}` },
      };
      const result: Record<string, string | number> = {};
      SUMMARY_FIELDS.forEach(field => {
        if (config.summaryFields.has(field.id) && map[field.id]) {
          result[map[field.id].label] = map[field.id].value;
        }
      });
      return result;
    };

    if (config.format === 'excel-zip') {
      toast.loading(`מכין ${sortedGroups.length} קבצי Excel...`, { id: 'report-export' });
      const zip = new JSZip();
      const dateStr = format(new Date(), 'dd-MM-yyyy');

      // Master summary
      if (config.includeMasterSummary) {
        const masterData = sortedGroups.map(([, group]) => {
          const f = calcGroupFinancials(group.deliveries);
          return { [entityLabel]: group.name, ...buildConfigSummaryRow(f, group.deliveries.length) };
        });
        const fAll = calcGroupFinancials(deliveriesToExport);
        masterData.push({ [entityLabel]: `⬅ סה״כ (${sortedGroups.length})`, ...buildConfigSummaryRow(fAll, deliveriesToExport.length) } as any);

        const masterWb = XLSX.utils.book_new();
        masterWb.Workbook = masterWb.Workbook || {};
        masterWb.Workbook.Views = [{ RTL: true }];
        const masterWs = XLSX.utils.json_to_sheet(masterData);
        masterWs['!cols'] = Object.keys(masterData[0] || {}).map(() => ({ wch: 18 }));
        XLSX.utils.book_append_sheet(masterWb, masterWs, 'סיכום כללי');
        const masterBuf = XLSX.write(masterWb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
        zip.file(`סיכום_כללי_${entityLabelPlural}_${dateStr}.xlsx`, masterBuf);
      }

      // Per-entity files
      const usedNames = new Set<string>();
      sortedGroups.forEach(([groupId, group]) => {
        let safeName = group.name.replace(/[\\\\/\*\?\[\]:\\"<>|]/g, '').trim() || 'ללא_שם';
        if (usedNames.has(safeName)) {
          let c = 2;
          while (usedNames.has(`${safeName}_${c}`)) c++;
          safeName = `${safeName}_${c}`;
        }
        usedNames.add(safeName);

        const wb = XLSX.utils.book_new();
        wb.Workbook = wb.Workbook || {};
        wb.Workbook.Views = [{ RTL: true }];

        if (config.includeEntitySummary || config.includeEntityDetail) {
          const sheetData: (string | number)[][] = [];

          if (config.includeEntitySummary) {
            const f = calcGroupFinancials(group.deliveries);
            sheetData.push([entityLabel, group.name as string | number]);
            Object.entries(buildConfigSummaryRow(f, group.deliveries.length)).forEach(([k, v]) => {
              sheetData.push([k, typeof v === 'number' ? v : String(v)]);
            });
            sheetData.push([]);
          }

          if (config.includeEntityDetail) {
            sheetData.push(selectedCols.map(col => col.label));
            group.deliveries.forEach(d => {
              const courier = d.courierId ? couriers.find(c => c.id === d.courierId) : null;
              const timeRem = calculateTimeRemaining(d);
              sheetData.push(selectedCols.map(col => col.getValue(d, { courier, timeRemaining: timeRem, formatTime })));
            });
          }

          const ws = XLSX.utils.aoa_to_sheet(sheetData);
          const maxCols = Math.max(2, selectedCols.length);
          ws['!cols'] = Array.from({ length: maxCols }, () => ({ wch: 18 }));
          XLSX.utils.book_append_sheet(wb, ws, 'דוח');
        }

        // --- פירוט משמרות לשליח ---
        if (config.groupBy === 'courier' && shifts.length > 0) {
          const fmtT = (d: Date) => new Date(d).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
          const DAY_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
          const shiftRows = shifts
            .flatMap(shift => {
              const template = shiftTemplates.find(t => t.id === shift.templateId);
              return shift.courierAssignments
                .filter(a => a.courierId === groupId && (a.startedAt || a.endedAt))
                .map(a => {
                  const shiftDate = new Date(shift.date);
                  const entryTime = a.startedAt ? fmtT(a.startedAt) : '-';
                  const exitTime = a.endedAt ? fmtT(a.endedAt) : '-';
                  let totalMinutes = 0;
                  if (a.startedAt && a.endedAt) {
                    totalMinutes = Math.round((new Date(a.endedAt).getTime() - new Date(a.startedAt).getTime()) / 60000);
                  }
                  const hours = Math.floor(totalMinutes / 60);
                  const mins = totalMinutes % 60;
                  const totalHours = totalMinutes > 0 ? `${hours}:${String(mins).padStart(2, '0')}` : '-';
                  const dayDeliveries = group.deliveries.filter(d => {
                    if (!d.createdAt) return false;
                    return new Date(d.createdAt).toDateString() === shiftDate.toDateString();
                  }).length;
                  return [DAY_HE[shiftDate.getDay()], format(shiftDate, 'dd/MM/yyyy'), template?.name ?? shift.name, entryTime, exitTime, totalHours, dayDeliveries];
                });
            })
            .sort((a, b) => String(a[1]).localeCompare(String(b[1])));

          if (shiftRows.length > 0) {
            const shiftsWs = XLSX.utils.aoa_to_sheet([
              ['יום', 'תאריך', 'שם משמרת', 'כניסה', 'יציאה', 'סיכום שעות', 'כמות משלוחים'],
              ...shiftRows,
            ]);
            shiftsWs['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(wb, shiftsWs, 'משמרות');
          }
        }

        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
        zip.file(`${safeName}_${dateStr}.xlsx`, buf);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = `דוחות_${entityLabelPlural}_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.zip`;
      saveAs(zipBlob, zipName);
      toast.dismiss('report-export');
      toast.success(`${sortedGroups.length} קבצי Excel נארזו ב-ZIP — ${deliveriesToExport.length} משלוחים`);

    } else {
      // PDF format
      const doc = new jsPDF();

      if (config.includeMasterSummary) {
        const dummyF = calcGroupFinancials([]);
        const summaryHead = [entityLabel, ...Object.keys(buildConfigSummaryRow(dummyF, 0))];
        const summaryBody = sortedGroups.map(([, g]) => {
          const f = calcGroupFinancials(g.deliveries);
          return [g.name, ...Object.values(buildConfigSummaryRow(f, g.deliveries.length)).map(String)];
        });
        const fT = calcGroupFinancials(deliveriesToExport);
        summaryBody.push([`סה״כ (${sortedGroups.length})`, ...Object.values(buildConfigSummaryRow(fT, deliveriesToExport.length)).map(String)]);

        autoTable(doc, {
          head: [summaryHead],
          body: summaryBody,
          startY: 15,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [159, 232, 112], textColor: [0, 0, 0] },
          didParseCell: (data: any) => {
            if (data.row.index === summaryBody.length - 1 && data.section === 'body') {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 240, 240];
            }
          },
        });
      }

      sortedGroups.forEach(([, group]) => {
        doc.addPage();
        doc.setFontSize(12);
        doc.text(`${entityLabel}: ${group.name} (${group.deliveries.length} משלוחים)`, doc.internal.pageSize.getWidth() - 15, 12, { align: 'right' });

        autoTable(doc, {
          head: [selectedCols.map(c => c.label)],
          body: group.deliveries.map(d => {
            const courier = d.courierId ? couriers.find(c => c.id === d.courierId) : null;
            const timeRem = calculateTimeRemaining(d);
            return selectedCols.map(col => col.getValue(d, { courier, timeRemaining: timeRem, formatTime }));
          }),
          startY: 18,
          theme: 'grid',
          styles: { fontSize: 5, cellPadding: 1 },
          headStyles: { fillColor: [159, 232, 112], textColor: [0, 0, 0] },
        });
      });

      doc.save(`דוח_לפי_${entityLabel}_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.pdf`);
      toast.success(`PDF מקובץ לפי ${entityLabelPlural} הורד — ${sortedGroups.length} ${entityLabelPlural}, ${deliveriesToExport.length} משלוחים`);
    }
  }, [filteredDeliveries, selectedIds, groupDeliveriesByEntity, calcGroupFinancials, couriers, calculateTimeRemaining, formatTime]);

  const handleUnifiedExport = useCallback(async (config: ExportConfig) => {
    const getExportColumns = () => {
      if (config.columnMode === 'all') return ALL_COLUMNS;
      if (config.columnMode === 'custom') return ALL_COLUMNS.filter(c => config.customColumns.has(c.id));
      return ALL_COLUMNS.filter(c => visibleColumns.has(c.id));
    };

    if (config.mode === 'simple') {
      const cols = getExportColumns();
      const deliveriesToExport = selectedIds.size > 0
        ? filteredDeliveries.filter(d => selectedIds.has(d.id))
        : filteredDeliveries;

      if (config.format === 'excel') {
        const data = deliveriesToExport.map(d => {
          const courier = d.courierId ? couriers.find(c => c.id === d.courierId) : null;
          const timeRem = calculateTimeRemaining(d);
          const row: Record<string, string> = {};
          cols.forEach(col => { row[col.label] = col.getValue(d, { courier, timeRemaining: timeRem, formatTime }); });
          return row;
        });
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = cols.map(() => ({ wch: 18 }));
        const wb = XLSX.utils.book_new();
        wb.Workbook = wb.Workbook || {};
        wb.Workbook.Views = [{ RTL: true }];
        XLSX.utils.book_append_sheet(wb, ws, 'היסטוריה');
        XLSX.writeFile(wb, `היסטוריה_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`);
        toast.success(`Excel הורד — ${deliveriesToExport.length} משלוחים, ${cols.length} עמודות`);

      } else if (config.format === 'csv') {
        const headers = cols.map(c => c.label);
        const rows = deliveriesToExport.map(d => {
          const courier = d.courierId ? couriers.find(c => c.id === d.courierId) : null;
          const timeRem = calculateTimeRemaining(d);
          return cols.map(col => {
            const val = col.getValue(d, { courier, timeRemaining: timeRem, formatTime });
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(',');
        });
        const bom = '\uFEFF';
        const csv = bom + headers.map(h => `"${h}"`).join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `היסטוריה_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`CSV הורד — ${deliveriesToExport.length} משלוחים`);

      } else {
        // PDF
        const doc = new jsPDF();
        autoTable(doc, {
          head: [cols.map(c => c.label)],
          body: deliveriesToExport.map(d => {
            const courier = d.courierId ? couriers.find(c => c.id === d.courierId) : null;
            const timeRem = calculateTimeRemaining(d);
            return cols.map(col => col.getValue(d, { courier, timeRemaining: timeRem, formatTime }));
          }),
          startY: 20, theme: 'grid',
          styles: { fontSize: cols.length > 15 ? 5 : 7, cellPadding: cols.length > 15 ? 1 : 1.5 },
          headStyles: { fillColor: [159, 232, 112], textColor: [0, 0, 0] },
        });
        doc.save(`היסטוריה_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.pdf`);
        toast.success(`PDF הורד — ${deliveriesToExport.length} משלוחים, ${cols.length} עמודות`);
      }

    } else {
      // Grouped export — delegate to handleReportGenerate
      const reportConfig = {
        groupBy: config.groupBy,
        format: config.format === 'pdf' ? 'pdf' as const : 'excel-zip' as const,
        summaryFields: config.summaryFields,
        detailColumns: config.columnMode === 'all'
          ? new Set(ALL_COLUMNS.map(c => c.id))
          : config.columnMode === 'custom'
            ? config.customColumns
            : visibleColumns,
        includeEntitySummary: config.includeEntitySummary,
        includeEntityDetail: config.includeEntityDetail,
        includeMasterSummary: config.includeMasterSummary,
      };
      await handleReportGenerate(reportConfig);
    }
  }, [filteredDeliveries, selectedIds, visibleColumns, couriers, calculateTimeRemaining, formatTime, handleReportGenerate]);

  // Compute group counts for report builder
  const reportGroupCounts = useMemo(() => {
    const deliveriesToExport = selectedIds.size > 0
      ? filteredDeliveries.filter(d => selectedIds.has(d.id))
      : filteredDeliveries;
    const couriersSet = new Set(deliveriesToExport.map(d => d.courierId || d.courierName || '__none__'));
    const restaurants = new Set(deliveriesToExport.map(d => d.restaurantId || d.rest_id || d.rest_name || '__none__'));
    return { couriers: couriersSet.size, restaurants: restaurants.size };
  }, [filteredDeliveries, selectedIds]);

  return {
    calcGroupFinancials,
    groupDeliveriesByEntity,
    buildSingleEntityWorkbook,
    buildGroupedExcel,
    buildGroupedPDF,
    handleReportGenerate,
    handleUnifiedExport,
    reportGroupCounts,
  };
}
