import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import type { Courier, Delivery, ShiftTemplate, WorkShift } from '../types/delivery.types';
import type { ColumnDef } from './column-defs';
import { ALL_SUMMARY_IDS } from './export-config';
import {
  buildConfigSummaryRow,
  calculateGroupFinancials,
  ensureUniqueExportName,
  getEntityLabels,
  type DeliveryExportGroup,
  type DeliveryExportGroupBy,
} from './export-helpers';
import { createExcelWorkbook, workbookToExcelBuffer } from '../utils/export-utils';

interface DeliveryExportRuntime {
  couriers: Courier[];
  calculateTimeRemaining: (delivery: Delivery) => number | null;
  formatTime: (seconds: number) => string;
}

interface DeliveryExportRuntimeWithShifts extends DeliveryExportRuntime {
  shifts?: WorkShift[];
  shiftTemplates?: ShiftTemplate[];
}

interface GroupedExportParams extends DeliveryExportRuntimeWithShifts {
  deliveriesToExport: Delivery[];
  groups: DeliveryExportGroup[];
  groupBy: DeliveryExportGroupBy;
  columns: ColumnDef[];
}

interface ConfiguredGroupedExportParams extends GroupedExportParams {
  summaryFields: Set<string>;
  includeMasterSummary: boolean;
  includeEntitySummary: boolean;
  includeEntityDetail: boolean;
}

const buildDeliveryRowObjects = (
  deliveries: Delivery[],
  columns: ColumnDef[],
  { couriers, calculateTimeRemaining, formatTime }: DeliveryExportRuntime,
) =>
  deliveries.map((delivery) => {
    const courier = delivery.courierId
      ? couriers.find((item) => item.id === delivery.courierId) ?? null
      : null;
    const timeRemaining = calculateTimeRemaining(delivery);
    const row: Record<string, string> = {};

    columns.forEach((column) => {
      row[column.label] = column.getValue(delivery, {
        courier,
        timeRemaining,
        formatTime,
      });
    });

    return row;
  });

const buildDeliveryTableRows = (
  deliveries: Delivery[],
  columns: ColumnDef[],
  runtime: DeliveryExportRuntime,
) =>
  buildDeliveryRowObjects(deliveries, columns, runtime).map((row) =>
    columns.map((column) => row[column.label] ?? '-'),
  );

const buildShiftSheetRows = (
  courierId: string,
  deliveries: Delivery[],
  shifts: WorkShift[],
  shiftTemplates: ShiftTemplate[],
) => {
  const formatTime = (value: Date) =>
    new Date(value).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  const dayLabels = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  return shifts
    .flatMap((shift) => {
      const template = shiftTemplates.find((item) => item.id === shift.templateId);

      return shift.courierAssignments
        .filter(
          (assignment) =>
            assignment.courierId === courierId &&
            (assignment.startedAt || assignment.endedAt),
        )
        .map((assignment) => {
          const shiftDate = new Date(shift.date);
          const entryTime = assignment.startedAt ? formatTime(assignment.startedAt) : '-';
          const exitTime = assignment.endedAt ? formatTime(assignment.endedAt) : '-';

          let totalMinutes = 0;
          if (assignment.startedAt && assignment.endedAt) {
            totalMinutes = Math.round(
              (new Date(assignment.endedAt).getTime() -
                new Date(assignment.startedAt).getTime()) /
                60000,
            );
          }

          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          const totalHours =
            totalMinutes > 0 ? `${hours}:${String(minutes).padStart(2, '0')}` : '-';

          const dayDeliveries = deliveries.filter((delivery) => {
            if (!delivery.createdAt) {
              return false;
            }

            return (
              new Date(delivery.createdAt).toDateString() ===
              shiftDate.toDateString()
            );
          }).length;

          return [
            dayLabels[shiftDate.getDay()],
            format(shiftDate, 'dd/MM/yyyy'),
            template?.name ?? shift.name,
            entryTime,
            exitTime,
            totalHours,
            dayDeliveries,
          ];
        });
    })
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
};

const buildSimpleSummaryRows = (
  entityLabel: string,
  entityName: string,
  deliveries: Delivery[],
) => {
  const financials = calculateGroupFinancials(deliveries);
  const summaryRow = buildConfigSummaryRow(
    ALL_SUMMARY_IDS,
    financials,
    deliveries.length,
  );

  return [
    { פרט: entityLabel, ערך: entityName },
    ...Object.entries(summaryRow).map(([label, value]) => ({
      פרט: label,
      ערך: value,
    })),
  ];
};

export const buildSingleEntityWorkbookBuffer = ({
  group,
  groupBy,
  columns,
  couriers,
  shifts = [],
  shiftTemplates = [],
  calculateTimeRemaining,
  formatTime,
}: {
  group: DeliveryExportGroup;
  groupBy: DeliveryExportGroupBy;
  columns: ColumnDef[];
} & DeliveryExportRuntimeWithShifts) => {
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = workbook.Workbook || {};
  workbook.Workbook.Views = [{ RTL: true }];

  const { entityLabel } = getEntityLabels(groupBy);
  const summarySheet = XLSX.utils.json_to_sheet(
    buildSimpleSummaryRows(entityLabel, group.name, group.deliveries),
  );
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'סיכום');

  const deliveryRows = buildDeliveryRowObjects(group.deliveries, columns, {
    couriers,
    calculateTimeRemaining,
    formatTime,
  });
  const detailSheet = XLSX.utils.json_to_sheet(deliveryRows);
  detailSheet['!cols'] = columns.map(() => ({ wch: 16 }));
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'משלוחים');

  if (groupBy === 'courier' && shifts.length > 0) {
    const shiftRows = buildShiftSheetRows(
      group.id,
      group.deliveries,
      shifts,
      shiftTemplates,
    );

    if (shiftRows.length > 0) {
      const shiftsSheet = XLSX.utils.aoa_to_sheet([
        ['יום', 'תאריך', 'שם משמרת', 'כניסה', 'יציאה', 'סיכום שעות', 'כמות משלוחים'],
        ...shiftRows,
      ]);
      shiftsSheet['!cols'] = [
        { wch: 10 },
        { wch: 14 },
        { wch: 18 },
        { wch: 10 },
        { wch: 10 },
        { wch: 14 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(workbook, shiftsSheet, 'משמרות');
    }
  }

  return workbookToExcelBuffer(workbook);
};

const buildConfiguredEntityWorkbookBuffer = ({
  group,
  groupBy,
  columns,
  summaryFields,
  includeEntitySummary,
  includeEntityDetail,
  couriers,
  shifts = [],
  shiftTemplates = [],
  calculateTimeRemaining,
  formatTime,
}: {
  group: DeliveryExportGroup;
  groupBy: DeliveryExportGroupBy;
  columns: ColumnDef[];
  summaryFields: Set<string>;
  includeEntitySummary: boolean;
  includeEntityDetail: boolean;
} & DeliveryExportRuntimeWithShifts) => {
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = workbook.Workbook || {};
  workbook.Workbook.Views = [{ RTL: true }];
  const { entityLabel } = getEntityLabels(groupBy);

  if (includeEntitySummary || includeEntityDetail) {
    const sheetRows: (string | number)[][] = [];

    if (includeEntitySummary) {
      const financials = calculateGroupFinancials(group.deliveries);
      sheetRows.push([entityLabel, group.name]);
      Object.entries(
        buildConfigSummaryRow(summaryFields, financials, group.deliveries.length),
      ).forEach(([label, value]) => {
        sheetRows.push([label, typeof value === 'number' ? value : String(value)]);
      });
      sheetRows.push([]);
    }

    if (includeEntityDetail) {
      sheetRows.push(columns.map((column) => column.label));
      buildDeliveryTableRows(group.deliveries, columns, {
        couriers,
        calculateTimeRemaining,
        formatTime,
      }).forEach((row) => {
        sheetRows.push(row);
      });
    }

    if (sheetRows.length > 0) {
      const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
      const maxColumns = Math.max(2, columns.length);
      worksheet['!cols'] = Array.from({ length: maxColumns }, () => ({ wch: 18 }));
      XLSX.utils.book_append_sheet(workbook, worksheet, 'דוח');
    }
  }

  if (groupBy === 'courier' && shifts.length > 0) {
    const shiftRows = buildShiftSheetRows(
      group.id,
      group.deliveries,
      shifts,
      shiftTemplates,
    );

    if (shiftRows.length > 0) {
      const shiftsSheet = XLSX.utils.aoa_to_sheet([
        ['יום', 'תאריך', 'שם משמרת', 'כניסה', 'יציאה', 'סיכום שעות', 'כמות משלוחים'],
        ...shiftRows,
      ]);
      shiftsSheet['!cols'] = [
        { wch: 10 },
        { wch: 14 },
        { wch: 18 },
        { wch: 10 },
        { wch: 10 },
        { wch: 14 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(workbook, shiftsSheet, 'משמרות');
    }
  }

  return workbookToExcelBuffer(workbook);
};

const buildMasterSummaryWorkbookBuffer = ({
  groups,
  deliveriesToExport,
  groupBy,
  summaryFields,
}: {
  groups: DeliveryExportGroup[];
  deliveriesToExport: Delivery[];
  groupBy: DeliveryExportGroupBy;
  summaryFields: Set<string>;
}) => {
  const { entityLabel } = getEntityLabels(groupBy);
  const rows = groups.map((group) => ({
    [entityLabel]: group.name,
    ...buildConfigSummaryRow(
      summaryFields,
      calculateGroupFinancials(group.deliveries),
      group.deliveries.length,
    ),
  }));

  rows.push({
    [entityLabel]: `⬅ סה"כ (${groups.length})`,
    ...buildConfigSummaryRow(
      summaryFields,
      calculateGroupFinancials(deliveriesToExport),
      deliveriesToExport.length,
    ),
  });

  return workbookToExcelBuffer(
    createExcelWorkbook({
      rows,
      sheetName: 'סיכום כללי',
      columnWidths: Object.keys(rows[0] || {}).map(() => 18),
    }),
  );
};

export const buildGroupedExcelZipBlob = async ({
  deliveriesToExport,
  groups,
  groupBy,
  columns,
  couriers,
  shifts = [],
  shiftTemplates = [],
  calculateTimeRemaining,
  formatTime,
}: GroupedExportParams) => {
  const zip = new JSZip();
  const dateTag = format(new Date(), 'dd-MM-yyyy');
  const { entityLabelPlural } = getEntityLabels(groupBy);

  zip.file(
    `סיכום_כללי_${entityLabelPlural}_${dateTag}.xlsx`,
    buildMasterSummaryWorkbookBuffer({
      groups,
      deliveriesToExport,
      groupBy,
      summaryFields: ALL_SUMMARY_IDS,
    }),
  );

  const usedNames = new Set<string>();
  groups.forEach((group) => {
    const fileName = ensureUniqueExportName(group.name, usedNames, `ללא_שם_${groupBy}`);
    zip.file(
      `${fileName}_${dateTag}.xlsx`,
      buildSingleEntityWorkbookBuffer({
        group,
        groupBy,
        columns,
        couriers,
        shifts,
        shiftTemplates,
        calculateTimeRemaining,
        formatTime,
      }),
    );
  });

  return zip.generateAsync({ type: 'blob' });
};

export const buildConfiguredExcelZipBlob = async ({
  deliveriesToExport,
  groups,
  groupBy,
  columns,
  summaryFields,
  includeMasterSummary,
  includeEntitySummary,
  includeEntityDetail,
  couriers,
  shifts = [],
  shiftTemplates = [],
  calculateTimeRemaining,
  formatTime,
}: ConfiguredGroupedExportParams) => {
  const zip = new JSZip();
  const dateTag = format(new Date(), 'dd-MM-yyyy');
  const { entityLabelPlural } = getEntityLabels(groupBy);

  if (includeMasterSummary) {
    zip.file(
      `סיכום_כללי_${entityLabelPlural}_${dateTag}.xlsx`,
      buildMasterSummaryWorkbookBuffer({
        groups,
        deliveriesToExport,
        groupBy,
        summaryFields,
      }),
    );
  }

  const usedNames = new Set<string>();
  groups.forEach((group) => {
    const fileName = ensureUniqueExportName(group.name, usedNames, `ללא_שם_${groupBy}`);
    zip.file(
      `${fileName}_${dateTag}.xlsx`,
      buildConfiguredEntityWorkbookBuffer({
        group,
        groupBy,
        columns,
        summaryFields,
        includeEntitySummary,
        includeEntityDetail,
        couriers,
        shifts,
        shiftTemplates,
        calculateTimeRemaining,
        formatTime,
      }),
    );
  });

  return zip.generateAsync({ type: 'blob' });
};

export const buildGroupedPdfDocument = ({
  deliveriesToExport,
  groups,
  groupBy,
  columns,
  summaryFields,
  includeMasterSummary,
  couriers,
  calculateTimeRemaining,
  formatTime,
}: {
  deliveriesToExport: Delivery[];
  groups: DeliveryExportGroup[];
  groupBy: DeliveryExportGroupBy;
  columns: ColumnDef[];
  summaryFields: Set<string>;
  includeMasterSummary: boolean;
} & DeliveryExportRuntime) => {
  const document = new jsPDF();
  const { entityLabel } = getEntityLabels(groupBy);
  let hasContent = false;

  if (includeMasterSummary) {
    const summaryHead = [
      entityLabel,
      ...Object.keys(
        buildConfigSummaryRow(summaryFields, calculateGroupFinancials([]), 0),
      ),
    ];
    const summaryBody = groups.map((group) => [
      group.name,
      ...Object.values(
        buildConfigSummaryRow(
          summaryFields,
          calculateGroupFinancials(group.deliveries),
          group.deliveries.length,
        ),
      ).map(String),
    ]);

    summaryBody.push([
      `סה"כ (${groups.length})`,
      ...Object.values(
        buildConfigSummaryRow(
          summaryFields,
          calculateGroupFinancials(deliveriesToExport),
          deliveriesToExport.length,
        ),
      ).map(String),
    ]);

    autoTable(document, {
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

    hasContent = true;
  }

  groups.forEach((group, index) => {
    if (hasContent || index > 0) {
      document.addPage();
    }

    document.setFontSize(12);
    document.text(
      `${entityLabel}: ${group.name} (${group.deliveries.length} משלוחים)`,
      document.internal.pageSize.getWidth() - 15,
      12,
      { align: 'right' },
    );

    autoTable(document, {
      head: [columns.map((column) => column.label)],
      body: buildDeliveryTableRows(group.deliveries, columns, {
        couriers,
        calculateTimeRemaining,
        formatTime,
      }),
      startY: 18,
      theme: 'grid',
      styles: { fontSize: 5, cellPadding: 1 },
      headStyles: { fillColor: [159, 232, 112], textColor: [0, 0, 0] },
    });

    hasContent = true;
  });

  return document;
};

export const buildSimpleExcelWorkbook = ({
  deliveries,
  columns,
  couriers,
  calculateTimeRemaining,
  formatTime,
}: {
  deliveries: Delivery[];
  columns: ColumnDef[];
} & DeliveryExportRuntime) =>
  createExcelWorkbook({
    rows: buildDeliveryRowObjects(deliveries, columns, {
      couriers,
      calculateTimeRemaining,
      formatTime,
    }),
    sheetName: 'היסטוריה',
    columnWidths: columns.map(() => 18),
  });

export const buildSimpleCsvBlob = ({
  deliveries,
  columns,
  couriers,
  calculateTimeRemaining,
  formatTime,
}: {
  deliveries: Delivery[];
  columns: ColumnDef[];
} & DeliveryExportRuntime) => {
  const headers = columns.map((column) => `"${column.label}"`).join(',');
  const rows = buildDeliveryTableRows(deliveries, columns, {
    couriers,
    calculateTimeRemaining,
    formatTime,
  })
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');

  return new Blob([`\uFEFF${headers}\n${rows}`], {
    type: 'text/csv;charset=utf-8;',
  });
};

export const buildSimplePdfDocument = ({
  deliveries,
  columns,
  couriers,
  calculateTimeRemaining,
  formatTime,
}: {
  deliveries: Delivery[];
  columns: ColumnDef[];
} & DeliveryExportRuntime) => {
  const document = new jsPDF();

  autoTable(document, {
    head: [columns.map((column) => column.label)],
    body: buildDeliveryTableRows(deliveries, columns, {
      couriers,
      calculateTimeRemaining,
      formatTime,
    }),
    startY: 20,
    theme: 'grid',
    styles: {
      fontSize: columns.length > 15 ? 5 : 7,
      cellPadding: columns.length > 15 ? 1 : 1.5,
    },
    headStyles: { fillColor: [159, 232, 112], textColor: [0, 0, 0] },
  });

  return document;
};
