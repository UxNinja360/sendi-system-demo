import React from 'react';
import {
  Bike,
  Check,
  ChevronDown,
  FileSpreadsheet,
  Files,
  Store,
  X,
} from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { useDelivery } from '../context/delivery-context-value';
import { getWorkedMinutesWithinRange } from '../utils/shift-work';
import { PageToolbar } from '../components/common/page-toolbar';
import {
  ToolbarPeriodControl,
  type PeriodMode,
} from '../components/common/toolbar-period-control';
import { useReportsExport } from '../reports/use-reports-export';
import {
  getDeliveryCommission,
  getDeliveryCourierBasePay,
  getDeliveryCustomerCharge,
  sumDeliveryMoney,
} from '../utils/delivery-finance';

const buildShiftBounds = (dateKey: string, startTime: string, endTime: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const start = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
  const end = new Date(year, month - 1, day, endHour, endMinute, 0, 0);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
};

export const ReportsPage: React.FC = () => {
  const { state } = useDelivery();
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>('current_month');
  const [monthAnchor, setMonthAnchor] = React.useState(new Date());
  const [customStartDate, setCustomStartDate] = React.useState(
    formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
  );
  const [customEndDate, setCustomEndDate] = React.useState(
    formatDate(new Date(), 'yyyy-MM-dd'),
  );
  const [exportEntityType, setExportEntityType] = React.useState<
    'couriers' | 'restaurants'
  >('couriers');
  const [exportSelectedIds, setExportSelectedIds] = React.useState<string[]>([]);
  const [exportDropdownOpen, setExportDropdownOpen] = React.useState(false);
  const exportDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setExportSelectedIds([]);
  }, [exportEntityType]);

  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
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

    const anchor = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);

    return {
      start: new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0),
      end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }, [customEndDate, customStartDate, monthAnchor, periodMode]);

  const deliveriesInRange = React.useMemo(
    () =>
      state.deliveries.filter((delivery) => {
        const createdAt = new Date(delivery.createdAt);
        return createdAt >= dateRange.start && createdAt <= dateRange.end;
      }),
    [dateRange.end, dateRange.start, state.deliveries],
  );

  const courierReports = React.useMemo(
    () =>
      state.couriers
        .map((courier) => {
          const deliveries = deliveriesInRange.filter(
            (delivery) =>
              delivery.courierId === courier.id ||
              delivery.runner_id === courier.id ||
              delivery.courierName === courier.name,
          );
          const assignments = state.shifts.flatMap((shift) => {
            const relevantAssignments = shift.courierAssignments.filter(
              (assignment) =>
                assignment.courierId === courier.id && assignment.startedAt !== null,
            );

            if (relevantAssignments.length === 0) {
              return [];
            }

            const { start, end } = buildShiftBounds(
              shift.date,
              shift.startTime,
              shift.endTime,
            );
            if (end < dateRange.start || start > dateRange.end) {
              return [];
            }

            return relevantAssignments.map((assignment) => ({ shift, assignment }));
          });
          const workedMinutes = assignments.reduce(
            (sum, item) =>
              sum +
              getWorkedMinutesWithinRange(
                item.assignment,
                dateRange.start,
                dateRange.end,
              ),
            0,
          );

          return {
            courier,
            deliveries,
            assignments,
            workedMinutes,
            deliveredCount: deliveries.filter((delivery) => delivery.status === 'delivered')
              .length,
            cancelledCount: deliveries.filter((delivery) => delivery.status === 'cancelled')
              .length,
            revenue: sumDeliveryMoney(deliveries, getDeliveryCustomerCharge),
            courierPay: sumDeliveryMoney(deliveries, getDeliveryCourierBasePay),
          };
        })
        .filter((report) => report.deliveries.length > 0 || report.assignments.length > 0),
    [dateRange.end, dateRange.start, deliveriesInRange, state.couriers, state.shifts],
  );

  const restaurantReports = React.useMemo(
    () =>
      state.restaurants
        .map((restaurant) => {
          const deliveries = deliveriesInRange.filter(
            (delivery) =>
              delivery.restaurantId === restaurant.id ||
              delivery.rest_id === restaurant.id ||
              delivery.restaurantName === restaurant.name ||
              delivery.rest_name === restaurant.name,
          );

          return {
            restaurant,
            deliveries,
            deliveredCount: deliveries.filter((delivery) => delivery.status === 'delivered')
              .length,
            cancelledCount: deliveries.filter((delivery) => delivery.status === 'cancelled')
              .length,
            revenue: sumDeliveryMoney(deliveries, getDeliveryCustomerCharge),
            commission: sumDeliveryMoney(deliveries, getDeliveryCommission),
          };
        })
        .filter((report) => report.deliveries.length > 0),
    [deliveriesInRange, state.restaurants],
  );

  const { handleExportCombined, handleExportSeparate } = useReportsExport({
    dateRange,
    exportEntityType,
    exportSelectedIds,
    courierReports,
    restaurantReports,
  });

  const reportsToolbarActions = (
    <>
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

      <div className="relative w-[200px]" ref={exportDropdownRef}>
        <button
          onClick={() => setExportDropdownOpen((current) => !current)}
          className={`w-full h-9 px-3 flex items-center justify-between gap-2 rounded-[4px] border text-sm font-medium transition-colors ${
            exportSelectedIds.length > 0
              ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
              : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
          }`}
        >
          <span className="truncate text-right flex-1">
            {exportSelectedIds.length === 0
              ? `בחר ${exportEntityType === 'couriers' ? 'שליחים' : 'מסעדות'}...`
              : exportSelectedIds.length ===
                    (exportEntityType === 'couriers'
                      ? courierReports
                      : restaurantReports
                    ).length
                ? `כל ה${exportEntityType === 'couriers' ? 'שליחים' : 'מסעדות'} (${exportSelectedIds.length})`
                : `${exportSelectedIds.length} נבחרו`}
          </span>
          {exportSelectedIds.length > 0 ? (
            <span
              onClick={(event) => {
                event.stopPropagation();
                setExportSelectedIds([]);
                setExportDropdownOpen(false);
              }}
              className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer shrink-0"
              role="button"
            >
              <X className="w-3 h-3" />
            </span>
          ) : (
            <ChevronDown
              className={`w-4 h-4 text-[#a3a3a3] shrink-0 transition-transform ${
                exportDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>

        {exportDropdownOpen ? (
          <div className="absolute top-full mt-1 right-0 left-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#f0f0f0] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111]">
              <button
                onClick={() => {
                  const allIds = (
                    exportEntityType === 'couriers'
                      ? courierReports
                      : restaurantReports
                  ).map((report) =>
                    exportEntityType === 'couriers'
                      ? (report as (typeof courierReports)[number]).courier.id
                      : (report as (typeof restaurantReports)[number]).restaurant.id,
                  );
                  setExportSelectedIds(allIds);
                }}
                className="text-xs text-[#0fcdd3] hover:underline"
              >
                בחר הכל
              </button>
              <button
                onClick={() => setExportSelectedIds([])}
                className="text-xs text-[#a3a3a3] hover:underline"
              >
                נקה
              </button>
            </div>
            <div className="max-h-[220px] overflow-y-auto divide-y divide-[#f0f0f0] dark:divide-[#1f1f1f]">
              {(exportEntityType === 'couriers'
                ? courierReports
                : restaurantReports
              ).map((report) => {
                const id =
                  exportEntityType === 'couriers'
                    ? (report as (typeof courierReports)[number]).courier.id
                    : (report as (typeof restaurantReports)[number]).restaurant.id;
                const name =
                  exportEntityType === 'couriers'
                    ? (report as (typeof courierReports)[number]).courier.name
                    : (report as (typeof restaurantReports)[number]).restaurant.name;
                const isChecked = exportSelectedIds.includes(id);

                return (
                  <button
                    key={id}
                    onClick={() =>
                      setExportSelectedIds((previous) =>
                        isChecked
                          ? previous.filter((value) => value !== id)
                          : [...previous, id],
                      )
                    }
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-right hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-[#9fe870] border-[#9fe870]'
                          : 'border-[#d4d4d4] dark:border-[#404040]'
                      }`}
                    >
                      {isChecked ? (
                        <Check className="w-2.5 h-2.5 text-[#0d0d12]" />
                      ) : null}
                    </div>
                    <span className="text-sm text-[#0d0d12] dark:text-[#fafafa] truncate flex-1">
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

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
        {exportSelectedIds.length > 0 ? (
          <span className="bg-[#9fe870] text-[#0d0d12] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
            {exportSelectedIds.length}
          </span>
        ) : null}
      </button>
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]">
      <div dir="rtl">
        <PageToolbar
          title="דוחות"
          onToggleMobileSidebar={() => (window as any).toggleMobileSidebar?.()}
          periodControl={
            <ToolbarPeriodControl
              periodMode={periodMode}
              setPeriodMode={setPeriodMode}
              monthAnchor={monthAnchor}
              setMonthAnchor={setMonthAnchor}
              customStartDate={customStartDate}
              setCustomStartDate={setCustomStartDate}
              customEndDate={customEndDate}
              setCustomEndDate={setCustomEndDate}
            />
          }
          actions={reportsToolbarActions}
          summary={`${deliveriesInRange.length} משלוחים • ${courierReports.length} שליחים • ${restaurantReports.length} מסעדות`}
        />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto flex w-full max-w-[90rem] flex-col" />
        </div>
      </div>
    </div>
  );
};
