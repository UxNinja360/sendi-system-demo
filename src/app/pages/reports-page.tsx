import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bike,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  FileSpreadsheet,
  Files,
  FileText,
  PackageCheck,
  Store,
  Wallet,
} from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { useDelivery } from '../context/delivery-context-value';
import type { Delivery } from '../types/delivery.types';
import { formatWorkedDuration, getWorkedMinutesWithinRange } from '../utils/shift-work';
import { PageToolbar } from '../components/common/page-toolbar';
import {
  ToolbarPeriodControl,
  type PeriodMode,
} from '../components/common/toolbar-period-control';
import { useReportsExport } from '../reports/use-reports-export';
import {
  formatCurrency,
  getDeliveryCommission,
  getDeliveryCourierBasePay,
  getDeliveryCustomerCharge,
  sumDeliveryMoney,
} from '../utils/delivery-finance';

type ReportTemplateId = 'restaurantBilling' | 'courierPayout' | 'companySummary';
type ReportEntityType = 'couriers' | 'restaurants';

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

const toDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isDateInRange = (
  value: Date | string | null | undefined,
  range: { start: Date; end: Date },
) => {
  const date = toDate(value);
  return Boolean(date && date >= range.start && date <= range.end);
};

const getAssignmentDate = (delivery: Delivery) =>
  toDate(delivery.deliveryCreditConsumedAt) ??
  toDate(delivery.coupled_time) ??
  toDate(delivery.assignedAt);

const hasConsumedCredit = (delivery: Delivery) => {
  if (delivery.deliveryCreditConsumedAt || delivery.coupled_time || delivery.assignedAt) {
    return true;
  }

  return Boolean(
    delivery.status !== 'pending' &&
      delivery.status !== 'expired' &&
      (delivery.runner_id || delivery.courierId),
  );
};

const minutesBetween = (
  startValue: Date | string | null | undefined,
  endValue: Date | string | null | undefined,
) => {
  const start = toDate(startValue);
  const end = toDate(endValue);
  if (!start || !end || end < start) return null;
  return Math.round((end.getTime() - start.getTime()) / 60000);
};

const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

const formatNumber = (value: number) => value.toLocaleString('he-IL');
const formatMinutes = (value: number) => (value > 0 ? `${formatNumber(value)} דק׳` : '-');
const formatPercent = (value: number) =>
  `${Math.round(value).toLocaleString('he-IL', { maximumFractionDigits: 0 })}%`;

const getDeliveryDurationMinutes = (delivery: Delivery) =>
  minutesBetween(
    getAssignmentDate(delivery) ?? delivery.createdAt ?? delivery.creation_time,
    delivery.deliveredAt ?? delivery.delivered_time,
  );

const isChainRestaurant = (chainId: string | null | undefined) =>
  Boolean(chainId && chainId.trim() !== '' && chainId.trim() !== '-');

const reportTemplates: Array<{
  id: ReportTemplateId;
  title: string;
  shortTitle: string;
  description: string;
  entityType?: ReportEntityType;
  icon: React.ReactNode;
}> = [
  {
    id: 'restaurantBilling',
    title: 'חיוב מסעדות',
    shortTitle: 'מסעדות',
    description: 'משלוחים לחיוב, קרדיטים שנוצלו ופירוט למסעדה.',
    entityType: 'restaurants',
    icon: <Store className="h-4 w-4" />,
  },
  {
    id: 'courierPayout',
    title: 'תשלום שליחים',
    shortTitle: 'שליחים',
    description: 'משמרות, משלוחים ותשלום בסיס לשליחים.',
    entityType: 'couriers',
    icon: <Bike className="h-4 w-4" />,
  },
  {
    id: 'companySummary',
    title: 'סיכום חברה',
    shortTitle: 'חברה',
    description: 'קרדיטים, פעילות, פגי תוקף ופערי התחשבנות.',
    icon: <Building2 className="h-4 w-4" />,
  },
];

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  tone?: 'default' | 'success' | 'warning' | 'info';
}> = ({ icon, label, value, helper, tone = 'default' }) => {
  const valueClassName =
    tone === 'success'
      ? 'text-app-success-text'
      : tone === 'warning'
        ? 'text-app-warning-text'
        : tone === 'info'
          ? 'text-app-info-text'
          : 'text-app-text';

  return (
    <section className="rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-app-text-secondary">
            {label}
          </div>
          <div className={`mt-2 text-3xl font-semibold tabular-nums ${valueClassName}`}>
            {value}
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--app-radius-xs)] border border-app-border bg-app-surface-inset text-app-text-secondary">
          {icon}
        </div>
      </div>
      <div className="mt-2 text-xs leading-5 text-app-text-muted">
        {helper}
      </div>
    </section>
  );
};

const ReportSwitchButton: React.FC<{
  active: boolean;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ active, title, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-[var(--app-radius-xs)] px-3 text-sm font-semibold transition-colors ${
      active
        ? 'bg-app-brand text-app-text'
        : 'text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text'
    }`}
  >
    {icon}
    <span className="truncate">{title}</span>
  </button>
);

const TableEmptyState: React.FC<{ children: React.ReactNode; colSpan: number }> = ({
  children,
  colSpan,
}) => (
  <tr>
    <td
      colSpan={colSpan}
      className="px-4 py-8 text-center text-sm text-app-text-secondary"
    >
      {children}
    </td>
  </tr>
);

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
  const [activeReportId, setActiveReportId] =
    React.useState<ReportTemplateId>('restaurantBilling');
  const [exportSelectedIds, setExportSelectedIds] = React.useState<string[]>([]);
  const [exportDropdownOpen, setExportDropdownOpen] = React.useState(false);
  const exportDropdownRef = React.useRef<HTMLDivElement>(null);

  const activeTemplate =
    reportTemplates.find((template) => template.id === activeReportId) ?? reportTemplates[0];
  const activeEntityType = activeTemplate.entityType;

  React.useEffect(() => {
    setExportSelectedIds([]);
    setExportDropdownOpen(false);
  }, [activeReportId]);

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

  const periodLabel = `${dateRange.start.toLocaleDateString('he-IL')} - ${dateRange.end.toLocaleDateString('he-IL')}`;

  const restaurantLookup = React.useMemo(() => {
    const byId = new Map<string, (typeof state.restaurants)[number]>();
    const byName = new Map<string, (typeof state.restaurants)[number]>();
    state.restaurants.forEach((restaurant) => {
      byId.set(restaurant.id, restaurant);
      byName.set(restaurant.name, restaurant);
    });
    return { byId, byName };
  }, [state.restaurants]);

  const deliveriesInRange = React.useMemo(
    () =>
      state.deliveries.filter((delivery) => {
        const createdAt = delivery.createdAt ?? delivery.creation_time;
        return isDateInRange(createdAt, dateRange);
      }),
    [dateRange, state.deliveries],
  );

  const creditedDeliveries = React.useMemo(
    () => deliveriesInRange.filter(hasConsumedCredit),
    [deliveriesInRange],
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
          const credited = deliveries.filter(hasConsumedCredit);
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
          const deliveredDurations = deliveries
            .filter((delivery) => delivery.status === 'delivered')
            .map(getDeliveryDurationMinutes)
            .filter((value): value is number => value !== null);

          return {
            courier,
            deliveries,
            assignments,
            workedMinutes,
            deliveredCount: deliveries.filter((delivery) => delivery.status === 'delivered')
              .length,
            cancelledCount: deliveries.filter((delivery) => delivery.status === 'cancelled')
              .length,
            revenue: sumDeliveryMoney(credited, getDeliveryCustomerCharge),
            courierPay: sumDeliveryMoney(credited, getDeliveryCourierBasePay),
            avgDeliveryMinutes: average(deliveredDurations),
            creditCount: credited.length,
          };
        })
        .filter((report) => report.deliveries.length > 0 || report.assignments.length > 0)
        .sort((a, b) => b.creditCount - a.creditCount),
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
          const credited = deliveries.filter(hasConsumedCredit);
          const deliveredDurations = deliveries
            .filter((delivery) => delivery.status === 'delivered')
            .map(getDeliveryDurationMinutes)
            .filter((value): value is number => value !== null);

          return {
            restaurant,
            deliveries,
            deliveredCount: deliveries.filter((delivery) => delivery.status === 'delivered')
              .length,
            cancelledCount: deliveries.filter((delivery) => delivery.status === 'cancelled')
              .length,
            expiredCount: deliveries.filter((delivery) => delivery.status === 'expired').length,
            revenue: sumDeliveryMoney(credited, getDeliveryCustomerCharge),
            commission: sumDeliveryMoney(credited, getDeliveryCommission),
            avgDeliveryMinutes: average(deliveredDurations),
            creditCount: credited.length,
          };
        })
        .filter((report) => report.deliveries.length > 0)
        .sort((a, b) => b.creditCount - a.creditCount || b.deliveries.length - a.deliveries.length),
    [deliveriesInRange, state.restaurants],
  );

  const companyStats = React.useMemo(() => {
    const delivered = deliveriesInRange.filter((delivery) => delivery.status === 'delivered');
    const cancelled = deliveriesInRange.filter((delivery) => delivery.status === 'cancelled');
    const expired = deliveriesInRange.filter((delivery) => delivery.status === 'expired');
    const active = deliveriesInRange.filter((delivery) =>
      ['pending', 'assigned', 'delivering'].includes(delivery.status),
    );
    const chainDeliveries = deliveriesInRange.filter((delivery) => {
      const restaurant =
        restaurantLookup.byId.get(delivery.rest_id ?? delivery.restaurantId ?? '') ??
        restaurantLookup.byName.get(delivery.rest_name || delivery.restaurantName);
      return isChainRestaurant(restaurant?.chainId);
    });
    const deliveredDurations = delivered
      .map(getDeliveryDurationMinutes)
      .filter((value): value is number => value !== null);
    const courierPay = sumDeliveryMoney(creditedDeliveries, getDeliveryCourierBasePay);
    const deliveryCharges = sumDeliveryMoney(creditedDeliveries, getDeliveryCustomerCharge);
    const deliveredRate = deliveriesInRange.length
      ? (delivered.length / deliveriesInRange.length) * 100
      : 0;

    return {
      activeCount: active.length,
      deliveredCount: delivered.length,
      cancelledCount: cancelled.length,
      expiredCount: expired.length,
      creditsUsed: creditedDeliveries.length,
      deliveryCharges,
      courierPay,
      estimatedMargin: deliveryCharges - courierPay,
      avgDeliveryMinutes: average(deliveredDurations),
      chainCount: chainDeliveries.length,
      deliveredRate,
    };
  }, [creditedDeliveries, deliveriesInRange, restaurantLookup.byId, restaurantLookup.byName]);

  const totalWorkedMinutes = React.useMemo(
    () => courierReports.reduce((sum, report) => sum + report.workedMinutes, 0),
    [courierReports],
  );
  const billableRestaurants = React.useMemo(
    () => restaurantReports.filter((report) => report.creditCount > 0).length,
    [restaurantReports],
  );

  const { handleExportCombined, handleExportSeparate } = useReportsExport({
    dateRange,
    exportEntityType: activeEntityType ?? 'restaurants',
    exportSelectedIds,
    courierReports,
    restaurantReports,
  });

  const exportOptions =
    activeEntityType === 'couriers'
      ? courierReports.map((report) => ({
          id: report.courier.id,
          name: report.courier.name,
        }))
      : activeEntityType === 'restaurants'
        ? restaurantReports.map((report) => ({
            id: report.restaurant.id,
            name: report.restaurant.name,
          }))
        : [];
  const entityLabel = activeEntityType === 'couriers' ? 'שליחים' : 'מסעדות';
  const selectedLabel =
    exportSelectedIds.length === 0
      ? `כל ה${entityLabel} בדוח`
      : exportSelectedIds.length === exportOptions.length
        ? `כל ה${entityLabel} (${exportSelectedIds.length})`
        : `${exportSelectedIds.length} נבחרו`;

  const reportMetrics =
    activeReportId === 'restaurantBilling'
      ? [
          {
            icon: <Store className="h-4 w-4" />,
            label: 'מסעדות לחיוב',
            value: formatNumber(billableRestaurants),
            helper: 'מסעדות עם לפחות קרדיט מנוצל בתקופה',
            tone: 'success' as const,
          },
          {
            icon: <PackageCheck className="h-4 w-4" />,
            label: 'משלוחים לחיוב',
            value: formatNumber(companyStats.creditsUsed),
            helper: 'נספר רק אחרי ציוות לשליח',
          },
          {
            icon: <Wallet className="h-4 w-4" />,
            label: 'סה״כ לחיוב',
            value: formatCurrency(companyStats.deliveryCharges),
            helper: 'חיוב משלוחים בלבד, בלי מחיר הארוחה',
            tone: 'info' as const,
          },
          {
            icon: <AlertTriangle className="h-4 w-4" />,
            label: 'פגו ללא חיוב',
            value: formatNumber(companyStats.expiredCount),
            helper: 'נשמר לאינסייטים, לא לחשבונית',
            tone: companyStats.expiredCount > 0 ? ('warning' as const) : ('default' as const),
          },
        ]
      : activeReportId === 'courierPayout'
        ? [
            {
              icon: <Bike className="h-4 w-4" />,
              label: 'שליחים לתשלום',
              value: formatNumber(courierReports.length),
              helper: 'שליחים עם פעילות או משמרת בתקופה',
              tone: 'success' as const,
            },
            {
              icon: <Wallet className="h-4 w-4" />,
              label: 'תשלום שליחים',
              value: formatCurrency(companyStats.courierPay),
              helper: 'מבוסס על משלוחים שצוותו',
              tone: 'info' as const,
            },
            {
              icon: <Clock3 className="h-4 w-4" />,
              label: 'שעות עבודה',
              value: formatWorkedDuration(totalWorkedMinutes),
              helper: 'משמרות בתוך טווח הדוח',
            },
            {
              icon: <PackageCheck className="h-4 w-4" />,
              label: 'נמסרו',
              value: formatNumber(companyStats.deliveredCount),
              helper: `${formatPercent(companyStats.deliveredRate)} מכל הפעילות בטווח`,
            },
          ]
        : [
            {
              icon: <Wallet className="h-4 w-4" />,
              label: 'קרדיטים זמינים',
              value: formatNumber(state.deliveryBalance),
              helper: 'חסימה קשיחה כשהיתרה נגמרת',
              tone: state.deliveryBalance <= 10 ? ('warning' as const) : ('success' as const),
            },
            {
              icon: <PackageCheck className="h-4 w-4" />,
              label: 'קרדיטים נוצלו',
              value: formatNumber(companyStats.creditsUsed),
              helper: 'יורד רק אחרי ציוות לשליח',
            },
            {
              icon: <AlertTriangle className="h-4 w-4" />,
              label: 'הצעות שפגו',
              value: formatNumber(companyStats.expiredCount),
              helper: 'לא נספרות כמשלוחים אמיתיים',
              tone: companyStats.expiredCount > 0 ? ('warning' as const) : ('default' as const),
            },
            {
              icon: <Clock3 className="h-4 w-4" />,
              label: 'זמן מסירה ממוצע',
              value: formatMinutes(companyStats.avgDeliveryMinutes),
              helper: 'מציוות ועד מסירה ללקוח',
              tone: 'info' as const,
            },
          ];

  const companyRows = [
    {
      label: 'קרדיטים זמינים',
      value: formatNumber(state.deliveryBalance),
      detail: 'יתרת משלוחים לחברת המשלוחים הנוכחית',
    },
    {
      label: 'קרדיטים נוצלו',
      value: formatNumber(companyStats.creditsUsed),
      detail: 'נספר רק אחרי ציוות לשליח',
    },
    {
      label: 'הצעות שפגו',
      value: formatNumber(companyStats.expiredCount),
      detail: 'לא נספרות כמשלוחים אמיתיים',
    },
    {
      label: 'חיובי משלוחים',
      value: formatCurrency(companyStats.deliveryCharges),
      detail: 'לא מחיר הארוחה של הלקוח',
    },
    {
      label: 'תשלום לשליחים',
      value: formatCurrency(companyStats.courierPay),
      detail: 'תשלום בסיס לפני התחשבנות סופית',
    },
    {
      label: 'פער חיוב/שליח',
      value: formatCurrency(companyStats.estimatedMargin),
      detail: 'אינדיקציה תפעולית לדמו, לא חשבונאות מלאה',
    },
  ];

  const handlePrintPdf = () => {
    window.print();
  };

  const exportActions = activeEntityType ? (
    <>
      <div className="relative min-w-[220px] max-w-full flex-1 sm:flex-none" ref={exportDropdownRef}>
        <button
          type="button"
          onClick={() => setExportDropdownOpen((current) => !current)}
          className={`h-9 w-full rounded-[var(--app-radius-xs)] border px-3 text-sm font-medium transition-colors ${
            exportSelectedIds.length > 0
              ? 'border-app-brand/40 bg-app-brand-subtle text-app-brand-text'
              : 'border-app-border bg-app-surface text-app-text-secondary hover:bg-app-surface-raised'
          }`}
        >
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-right">{selectedLabel}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-app-text-secondary transition-transform ${
                exportDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </span>
        </button>

        {exportDropdownOpen ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[var(--app-radius-md)] border border-app-border bg-app-surface text-right shadow-[var(--app-shadow-panel)]">
            <div className="flex items-center justify-between border-b border-app-border bg-app-surface-inset px-3 py-2">
              <button
                type="button"
                onClick={() => setExportSelectedIds(exportOptions.map((option) => option.id))}
                className="text-xs text-app-info-text hover:underline"
              >
                בחר הכל
              </button>
              <button
                type="button"
                onClick={() => setExportSelectedIds([])}
                className="text-xs text-app-text-secondary hover:underline"
              >
                נקה
              </button>
            </div>
            <div className="max-h-[220px] overflow-y-auto divide-y divide-app-border">
              {exportOptions.length > 0 ? (
                exportOptions.map((option) => {
                  const isChecked = exportSelectedIds.includes(option.id);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setExportSelectedIds((previous) =>
                          isChecked
                            ? previous.filter((value) => value !== option.id)
                            : [...previous, option.id],
                        )
                      }
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-right transition-colors hover:bg-app-surface-inset"
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                          isChecked
                            ? 'border-app-brand bg-app-brand'
                            : 'border-app-border-strong'
                        }`}
                      >
                        {isChecked ? (
                          <Check className="h-2.5 w-2.5 text-app-text" />
                        ) : null}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm text-app-text">
                        {option.name}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-sm text-app-text-secondary">
                  אין נתונים לייצוא בתקופה הזו
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleExportCombined}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[var(--app-radius-xs)] border border-app-border bg-app-surface px-3 text-sm font-medium text-app-text-secondary transition-colors hover:bg-app-surface-raised"
      >
        <FileSpreadsheet className="h-3.5 w-3.5 text-app-success-text" />
        Excel
      </button>
      <button
        type="button"
        onClick={handleExportSeparate}
        disabled={exportSelectedIds.length === 0}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[var(--app-radius-xs)] border border-app-border bg-app-surface px-3 text-sm font-medium text-app-text-secondary transition-colors hover:bg-app-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Files className="h-3.5 w-3.5 text-app-info-text" />
        נפרדים
        {exportSelectedIds.length > 0 ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-app-brand text-[10px] font-bold text-app-text">
            {exportSelectedIds.length}
          </span>
        ) : null}
      </button>
    </>
  ) : (
    <div className="rounded-[var(--app-radius-xs)] border border-app-border bg-app-surface-inset px-3 py-2 text-sm leading-6 text-app-text-secondary">
      זה דוח סקירה למסך. ייצוא מפורט זמין בדוחות חיוב מסעדות ותשלום שליחים.
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-app-background">
      <div className="flex min-h-0 flex-1 flex-col" dir="rtl">
        <PageToolbar
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
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
            <header className="border-b border-app-border pb-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface text-app-brand-text">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold tracking-normal text-app-text">
                      דוחות
                    </h1>
                    <div className="mt-0.5 text-sm text-app-text-secondary">
                      {activeTemplate.title}
                    </div>
                  </div>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-app-text-secondary">
                  הדוח מתחיל מהשאלה העסקית. קודם בוחרים דוח, אחר כך רואים סיכום, ואז מפיקים קובץ.
                </p>
              </div>

              <div className="mt-4 flex max-w-full flex-col items-start gap-2">
                <div className="text-xs font-semibold text-app-text-muted">
                  סוג דוח
                </div>
                <div className="flex max-w-full flex-wrap items-center gap-1 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface-inset p-1">
                  {reportTemplates.map((template) => (
                    <ReportSwitchButton
                      key={template.id}
                      active={activeReportId === template.id}
                      title={template.shortTitle}
                      icon={template.icon}
                      onClick={() => setActiveReportId(template.id)}
                    />
                  ))}
                </div>
              </div>
            </header>

            <section className="rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-app-text-muted">
                    דוח פעיל
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--app-radius-xs)] border border-app-border bg-app-surface-inset text-app-brand-text">
                      {activeTemplate.icon}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-app-text">
                        {activeTemplate.title}
                      </h2>
                      <p className="mt-0.5 text-sm text-app-text-secondary">
                        {activeTemplate.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 text-xs font-semibold text-app-text-muted">
                סיכום
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {reportMetrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  icon={metric.icon}
                  label={metric.label}
                  value={metric.value}
                  helper={metric.helper}
                  tone={metric.tone}
                />
              ))}
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface">
              <div className="flex flex-col gap-3 border-b border-app-border px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-app-text-muted">
                    פירוט והפקה
                  </div>
                  <h2 className="mt-1 text-sm font-semibold text-app-text">
                    {activeTemplate.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-app-text-secondary">
                    {activeReportId === 'restaurantBilling'
                      ? 'פירוט למסעדות לפי קרדיטים שנוצלו, פגי תוקף וסכומי חיוב.'
                      : activeReportId === 'courierPayout'
                        ? 'פירוט לשליחים לפי משמרות, משלוחים ותשלום בסיס.'
                        : 'סיכום קרדיטים, פעילות ופערי התחשבנות לחברת המשלוחים.'}
                  </p>
                </div>
                <div className="flex max-w-full flex-wrap items-center gap-2">
                  {exportActions}
                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[var(--app-radius-xs)] border border-app-border bg-app-surface px-3 text-sm font-medium text-app-text-secondary transition-colors hover:bg-app-surface-raised"
                  >
                    <FileText className="h-3.5 w-3.5 text-app-warning-text" />
                    PDF
                  </button>
                </div>
              </div>

                {activeReportId === 'companySummary' ? (
                  <div className="grid gap-px bg-app-border md:grid-cols-2">
                    {companyRows.map((row) => (
                      <div
                        key={row.label}
                        className="bg-app-surface p-4"
                      >
                        <div className="text-xs text-app-text-secondary">
                          {row.label}
                        </div>
                        <div className="mt-1 text-2xl font-semibold tabular-nums text-app-text">
                          {row.value}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-app-text-muted">
                          {row.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-app-border bg-app-surface-inset text-xs text-app-text-secondary">
                          <th className="px-4 py-3 text-right font-medium">
                            {activeReportId === 'courierPayout' ? 'שליח' : 'מסעדה'}
                          </th>
                          <th className="px-4 py-3 text-right font-medium">סה״כ</th>
                          <th className="px-4 py-3 text-right font-medium">לחיוב</th>
                          <th className="px-4 py-3 text-right font-medium">נמסרו</th>
                          <th className="px-4 py-3 text-right font-medium">בוטלו</th>
                          <th className="px-4 py-3 text-right font-medium">
                            {activeReportId === 'courierPayout' ? 'שעות' : 'פגו'}
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            {activeReportId === 'courierPayout' ? 'תשלום שליח' : 'חיוב משלוחים'}
                          </th>
                          <th className="px-4 py-3 text-right font-medium">זמן ממוצע</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border">
                        {activeReportId === 'courierPayout' ? (
                          courierReports.length > 0 ? (
                            courierReports.map((report) => (
                              <tr
                                key={report.courier.id}
                                className="text-app-text"
                              >
                                <td className="px-4 py-3 font-semibold">
                                  {report.courier.name}
                                </td>
                                <td className="px-4 py-3 tabular-nums">
                                  {formatNumber(report.deliveries.length)}
                                </td>
                                <td className="px-4 py-3 tabular-nums text-app-success-text">
                                  {formatNumber(report.creditCount)}
                                </td>
                                <td className="px-4 py-3 tabular-nums">
                                  {formatNumber(report.deliveredCount)}
                                </td>
                                <td className="px-4 py-3 tabular-nums text-app-error-text">
                                  {formatNumber(report.cancelledCount)}
                                </td>
                                <td className="px-4 py-3 tabular-nums">
                                  {formatWorkedDuration(report.workedMinutes)}
                                </td>
                                <td className="px-4 py-3 tabular-nums">
                                  {formatCurrency(report.courierPay)}
                                </td>
                                <td className="px-4 py-3 tabular-nums">
                                  {formatMinutes(report.avgDeliveryMinutes)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <TableEmptyState colSpan={8}>
                              אין פעילות שליחים בתקופה הזו
                            </TableEmptyState>
                          )
                        ) : restaurantReports.length > 0 ? (
                          restaurantReports.map((report) => (
                            <tr
                              key={report.restaurant.id}
                              className="text-app-text"
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold">{report.restaurant.name}</div>
                                <div className="mt-0.5 text-xs text-app-text-muted">
                                  {isChainRestaurant(report.restaurant.chainId)
                                    ? 'רשת'
                                    : report.restaurant.city || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3 tabular-nums">
                                {formatNumber(report.deliveries.length)}
                              </td>
                              <td className="px-4 py-3 tabular-nums text-app-success-text">
                                {formatNumber(report.creditCount)}
                              </td>
                              <td className="px-4 py-3 tabular-nums">
                                {formatNumber(report.deliveredCount)}
                              </td>
                              <td className="px-4 py-3 tabular-nums text-app-error-text">
                                {formatNumber(report.cancelledCount)}
                              </td>
                              <td className="px-4 py-3 tabular-nums text-app-warning-text">
                                {formatNumber(report.expiredCount)}
                              </td>
                              <td className="px-4 py-3 tabular-nums">
                                {formatCurrency(report.revenue)}
                              </td>
                              <td className="px-4 py-3 tabular-nums">
                                {formatMinutes(report.avgDeliveryMinutes)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <TableEmptyState colSpan={8}>
                            אין פעילות מסעדות בתקופה הזו
                          </TableEmptyState>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
