import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

type ExportCellValue = string | number | boolean | null | undefined;
type ExportRow = Record<string, ExportCellValue>;
type ExportAoaRow = Array<ExportCellValue>;

type ExportRowsToExcelParams = {
  rows: ExportRow[];
  sheetName: string;
  fileName: string;
  columnWidths?: number[];
};

export const sanitizeExportFileName = (
  name: string,
  fallback = 'ללא_שם',
) => {
  const sanitized = name.replace(/[\\/*?\[\]:"<>|]/g, '').trim();
  return sanitized || fallback;
};

export const createRtlWorkbook = () => {
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = {
    ...(workbook.Workbook || {}),
    Views: [{ RTL: true }],
  };

  return workbook;
};

export const appendJsonSheet = (
  workbook: XLSX.WorkBook,
  rows: ExportRow[],
  sheetName: string,
  columnWidths?: number[],
) => {
  const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: false });

  if (columnWidths?.length) {
    worksheet['!cols'] = columnWidths.map((width) => ({ wch: width }));
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return worksheet;
};

export const appendAoaSheet = (
  workbook: XLSX.WorkBook,
  rows: ExportAoaRow[],
  sheetName: string,
  columnWidths?: number[],
) => {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  if (columnWidths?.length) {
    worksheet['!cols'] = columnWidths.map((width) => ({ wch: width }));
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return worksheet;
};

export const createExcelWorkbook = ({
  rows,
  sheetName,
  columnWidths,
}: Omit<ExportRowsToExcelParams, 'fileName'>) => {
  const workbook = createRtlWorkbook();
  appendJsonSheet(workbook, rows, sheetName, columnWidths);
  return workbook;
};

export const workbookToExcelBuffer = (workbook: XLSX.WorkBook) =>
  XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

export const downloadBlob = (blob: Blob, fileName: string) => {
  saveAs(blob, fileName);
};

export const downloadExcelBuffer = (buffer: ArrayBuffer, fileName: string) => {
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    fileName,
  );
};

export const downloadWorkbook = (workbook: XLSX.WorkBook, fileName: string) => {
  downloadExcelBuffer(workbookToExcelBuffer(workbook), fileName);
};

export const exportRowsToExcel = ({
  rows,
  sheetName,
  fileName,
  columnWidths,
}: ExportRowsToExcelParams) => {
  const workbook = createExcelWorkbook({
    rows,
    sheetName,
    columnWidths,
  });

  downloadWorkbook(workbook, fileName);
};
