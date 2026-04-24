import { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import type {
  Courier,
  Delivery,
  ShiftTemplate,
  WorkShift,
} from '../types/delivery.types';
import { downloadWorkbook } from '../utils/export-utils';
import { ALL_COLUMNS, type ColumnDef } from './column-defs';
import { ALL_SUMMARY_IDS, type ExportConfig } from './export-config';
import {
  buildConfiguredExcelZipBlob,
  buildGroupedExcelZipBlob,
  buildGroupedPdfDocument,
  buildSimpleExcelWorkbook,
  buildSimplePdfDocument,
  buildSingleEntityWorkbookBuffer,
} from './export-builders';
import {
  calculateGroupFinancials,
  getDeliveriesToExport,
  getEntityLabels,
  groupDeliveriesByEntity as groupDeliveriesByEntityBase,
} from './export-helpers';

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
  const calcGroupFinancials = useCallback(
    (deliveries: Delivery[]) => calculateGroupFinancials(deliveries),
    [],
  );

  const groupDeliveriesByEntity = useCallback(
    (deliveries: Delivery[], groupBy: 'courier' | 'restaurant') =>
      groupDeliveriesByEntityBase(deliveries, groupBy, couriers),
    [couriers],
  );

  const buildSingleEntityWorkbook = useCallback(
    (
      entityName: string,
      _entityLabel: string,
      deliveries: Delivery[],
      columns: ColumnDef[],
      courierId?: string,
    ) =>
      buildSingleEntityWorkbookBuffer({
        group: {
          id: courierId || entityName,
          name: entityName,
          deliveries,
        },
        groupBy: courierId ? 'courier' : 'restaurant',
        columns,
        couriers,
        shifts,
        shiftTemplates,
        calculateTimeRemaining,
        formatTime,
      }),
    [
      couriers,
      shifts,
      shiftTemplates,
      calculateTimeRemaining,
      formatTime,
    ],
  );

  const buildGroupedExcel = useCallback(
    async (groupBy: 'courier' | 'restaurant') => {
      const deliveriesToExport = getDeliveriesToExport(
        filteredDeliveries,
        selectedIds,
      );
      const columns = ALL_COLUMNS.filter((column) => visibleColumns.has(column.id));
      const groups = groupDeliveriesByEntityBase(
        deliveriesToExport,
        groupBy,
        couriers,
      );

      if (groups.length === 0) {
        toast.error('אין נתונים לייצוא');
        return;
      }

      toast.loading(`מכין ${groups.length} קבצי Excel...`, { id: 'zip-export' });

      const zipBlob = await buildGroupedExcelZipBlob({
        deliveriesToExport,
        groups,
        groupBy,
        columns,
        couriers,
        shifts,
        shiftTemplates,
        calculateTimeRemaining,
        formatTime,
      });
      const zipName =
        groupBy === 'courier'
          ? `דוחות_שליחים_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.zip`
          : `דוחות_מסעדות_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.zip`;

      saveAs(zipBlob, zipName);
      toast.dismiss('zip-export');
      toast.success(
        `${groups.length} קבצי Excel נארזו ב-ZIP והורדו — ${deliveriesToExport.length} משלוחים`,
      );
    },
    [
      filteredDeliveries,
      selectedIds,
      visibleColumns,
      couriers,
      shifts,
      shiftTemplates,
      calculateTimeRemaining,
      formatTime,
    ],
  );

  const buildGroupedPDF = useCallback(
    (groupBy: 'courier' | 'restaurant') => {
      const deliveriesToExport = getDeliveriesToExport(
        filteredDeliveries,
        selectedIds,
      );
      const columns = ALL_COLUMNS.filter((column) => visibleColumns.has(column.id));
      const groups = groupDeliveriesByEntityBase(
        deliveriesToExport,
        groupBy,
        couriers,
      );

      if (groups.length === 0) {
        toast.error('אין נתונים לייצוא');
        return;
      }

      const document = buildGroupedPdfDocument({
        deliveriesToExport,
        groups,
        groupBy,
        columns,
        summaryFields: ALL_SUMMARY_IDS,
        includeMasterSummary: true,
        couriers,
        calculateTimeRemaining,
        formatTime,
      });
      const { entityLabelPlural } = getEntityLabels(groupBy);
      const fileName =
        groupBy === 'courier'
          ? `דוח_לפי_שליח_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.pdf`
          : `דוח_לפי_מסעדה_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.pdf`;

      document.save(fileName);
      toast.success(
        `PDF מקובץ לפי ${entityLabelPlural} הורד — ${groups.length} ${entityLabelPlural}, ${deliveriesToExport.length} משלוחים`,
      );
    },
    [
      filteredDeliveries,
      selectedIds,
      visibleColumns,
      couriers,
      calculateTimeRemaining,
      formatTime,
    ],
  );

  const handleReportGenerate = useCallback(
    async (config: {
      groupBy: 'courier' | 'restaurant';
      format: 'excel-zip' | 'pdf';
      summaryFields: Set<string>;
      detailColumns: Set<string>;
      includeEntitySummary: boolean;
      includeEntityDetail: boolean;
      includeMasterSummary: boolean;
    }) => {
      const deliveriesToExport = getDeliveriesToExport(
        filteredDeliveries,
        selectedIds,
      );
      const columns = ALL_COLUMNS.filter((column) =>
        config.detailColumns.has(column.id),
      );
      const groups = groupDeliveriesByEntityBase(
        deliveriesToExport,
        config.groupBy,
        couriers,
      );

      if (groups.length === 0) {
        toast.error('אין נתונים לייצוא');
        return;
      }

      const { entityLabel, entityLabelPlural } = getEntityLabels(config.groupBy);

      if (config.format === 'excel-zip') {
        toast.loading(`מכין ${groups.length} קבצי Excel...`, {
          id: 'report-export',
        });

        const zipBlob = await buildConfiguredExcelZipBlob({
          deliveriesToExport,
          groups,
          groupBy: config.groupBy,
          columns,
          summaryFields: config.summaryFields,
          includeMasterSummary: config.includeMasterSummary,
          includeEntitySummary: config.includeEntitySummary,
          includeEntityDetail: config.includeEntityDetail,
          couriers,
          shifts,
          shiftTemplates,
          calculateTimeRemaining,
          formatTime,
        });

        saveAs(
          zipBlob,
          `דוחות_${entityLabelPlural}_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.zip`,
        );
        toast.dismiss('report-export');
        toast.success(
          `${groups.length} קבצי Excel נארזו ב-ZIP — ${deliveriesToExport.length} משלוחים`,
        );
        return;
      }

      const document = buildGroupedPdfDocument({
        deliveriesToExport,
        groups,
        groupBy: config.groupBy,
        columns,
        summaryFields: config.summaryFields,
        includeMasterSummary: config.includeMasterSummary,
        couriers,
        calculateTimeRemaining,
        formatTime,
      });

      document.save(
        `דוח_לפי_${entityLabel}_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.pdf`,
      );
      toast.success(
        `PDF מקובץ לפי ${entityLabelPlural} הורד — ${groups.length} ${entityLabelPlural}, ${deliveriesToExport.length} משלוחים`,
      );
    },
    [
      filteredDeliveries,
      selectedIds,
      couriers,
      shifts,
      shiftTemplates,
      calculateTimeRemaining,
      formatTime,
    ],
  );

  const handleUnifiedExport = useCallback(
    async (config: ExportConfig) => {
      const getExportColumns = () => {
        if (config.columnMode === 'all') {
          return ALL_COLUMNS;
        }

        if (config.columnMode === 'custom') {
          return ALL_COLUMNS.filter((column) => config.customColumns.has(column.id));
        }

        return ALL_COLUMNS.filter((column) => visibleColumns.has(column.id));
      };

      if (config.mode === 'simple') {
        const columns = getExportColumns();
        const deliveriesToExport = getDeliveriesToExport(
          filteredDeliveries,
          selectedIds,
        );

        if (config.format === 'excel') {
          downloadWorkbook(
            buildSimpleExcelWorkbook({
              deliveries: deliveriesToExport,
              columns,
              couriers,
              calculateTimeRemaining,
              formatTime,
            }),
            `היסטוריה_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`,
          );
          toast.success(
            `Excel הורד — ${deliveriesToExport.length} משלוחים, ${columns.length} עמודות`,
          );
          return;
        }


        const document = buildSimplePdfDocument({
          deliveries: deliveriesToExport,
          columns,
          couriers,
          calculateTimeRemaining,
          formatTime,
        });
        document.save(`היסטוריה_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.pdf`);
        toast.success(
          `PDF הורד — ${deliveriesToExport.length} משלוחים, ${columns.length} עמודות`,
        );
        return;
      }

      await handleReportGenerate({
        groupBy: config.groupBy,
        format: config.format === 'pdf' ? 'pdf' : 'excel-zip',
        summaryFields: config.summaryFields,
        detailColumns:
          config.columnMode === 'all'
            ? new Set(ALL_COLUMNS.map((column) => column.id))
            : config.columnMode === 'custom'
              ? config.customColumns
              : visibleColumns,
        includeEntitySummary: config.includeEntitySummary,
        includeEntityDetail: config.includeEntityDetail,
        includeMasterSummary: config.includeMasterSummary,
      });
    },
    [
      filteredDeliveries,
      selectedIds,
      visibleColumns,
      couriers,
      calculateTimeRemaining,
      formatTime,
      handleReportGenerate,
    ],
  );

  const reportGroupCounts = useMemo(() => {
    const deliveriesToExport = getDeliveriesToExport(
      filteredDeliveries,
      selectedIds,
    );

    return {
      couriers: groupDeliveriesByEntityBase(
        deliveriesToExport,
        'courier',
        couriers,
      ).length,
      restaurants: groupDeliveriesByEntityBase(
        deliveriesToExport,
        'restaurant',
        couriers,
      ).length,
    };
  }, [filteredDeliveries, selectedIds, couriers]);

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
