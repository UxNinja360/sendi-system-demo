import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

type ExportRowsToExcelParams = {
  rows: Record<string, string | number>[];
  sheetName: string;
  fileName: string;
  columnWidths?: number[];
};

export const exportRowsToExcel = ({
  rows,
  sheetName,
  fileName,
  columnWidths,
}: ExportRowsToExcelParams) => {
  const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: false });

  if (columnWidths?.length) {
    worksheet['!cols'] = columnWidths.map((width) => ({ wch: width }));
  }

  const workbook = XLSX.utils.book_new();
  workbook.Workbook = {
    Views: [{ RTL: true }],
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, fileName);
};
