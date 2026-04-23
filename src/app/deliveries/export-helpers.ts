import type { Courier, Delivery } from '../types/delivery.types';
import { sanitizeExportFileName } from '../utils/export-utils';
import { SUMMARY_FIELDS } from './export-config';

export type DeliveryExportGroupBy = 'courier' | 'restaurant';

export interface DeliveryGroupFinancials {
  deliveredCount: number;
  cancelledCount: number;
  totalRevenue: number;
  totalCourierPay: number;
  totalTips: number;
  totalCash: number;
  totalCommission: number;
  totalRestPrice: number;
  profit: number;
  avgTime: number;
}

export interface DeliveryExportGroup {
  id: string;
  name: string;
  deliveries: Delivery[];
}

const SUMMARY_VALUE_LABELS: Record<string, string> = {
  totalDeliveries: 'סה"כ משלוחים',
  deliveredCount: 'נמסרו',
  cancelledCount: 'בוטלו',
  successRate: 'אחוז הצלחה',
  avgTime: 'זמן ממוצע (דק׳)',
  totalRevenue: 'הכנסות',
  totalRestPrice: 'מחיר מסעדה',
  totalCourierPay: 'תשלום שליח',
  totalTips: 'טיפים',
  totalCash: 'מזומן',
  totalCommission: 'עמלות',
  profit: 'רווח נקי',
};

export const getDeliveriesToExport = (
  filteredDeliveries: Delivery[],
  selectedIds: Set<string>,
) =>
  selectedIds.size > 0
    ? filteredDeliveries.filter((delivery) => selectedIds.has(delivery.id))
    : filteredDeliveries;

export const calculateGroupFinancials = (
  deliveries: Delivery[],
): DeliveryGroupFinancials => {
  const delivered = deliveries.filter((delivery) => delivery.status === 'delivered');
  const cancelled = deliveries.filter((delivery) => delivery.status === 'cancelled');
  const totalRevenue = delivered.reduce((sum, delivery) => sum + delivery.price, 0);
  const totalCourierPay = deliveries.reduce(
    (sum, delivery) => sum + (delivery.runner_price ?? delivery.courierPayment ?? 0),
    0,
  );
  const totalTips = deliveries.reduce(
    (sum, delivery) => sum + (delivery.runner_tip ?? 0),
    0,
  );
  const totalCash = deliveries.reduce(
    (sum, delivery) => sum + (delivery.sum_cash ?? 0),
    0,
  );
  const totalCommission = deliveries.reduce(
    (sum, delivery) => sum + (delivery.commissionAmount ?? 0),
    0,
  );
  const totalRestPrice = deliveries.reduce(
    (sum, delivery) => sum + (delivery.rest_price ?? delivery.restaurantPrice ?? 0),
    0,
  );
  const profit = totalRevenue - totalCourierPay - totalCommission;
  const avgTime =
    delivered.length > 0
      ? Math.round(
          delivered.reduce((sum, delivery) => {
            if (delivery.deliveredAt && delivery.createdAt) {
              return (
                sum +
                (new Date(delivery.deliveredAt).getTime() -
                  new Date(delivery.createdAt).getTime()) /
                  60000
              );
            }

            return sum;
          }, 0) / delivered.length,
        )
      : 0;

  return {
    deliveredCount: delivered.length,
    cancelledCount: cancelled.length,
    totalRevenue,
    totalCourierPay,
    totalTips,
    totalCash,
    totalCommission,
    totalRestPrice,
    profit,
    avgTime,
  };
};

export const groupDeliveriesByEntity = (
  deliveries: Delivery[],
  groupBy: DeliveryExportGroupBy,
  couriers: Courier[],
): DeliveryExportGroup[] => {
  const groups = new Map<string, DeliveryExportGroup>();

  deliveries.forEach((delivery) => {
    const groupId =
      groupBy === 'courier'
        ? delivery.courierId || '__no_courier__'
        : delivery.restaurantId || delivery.rest_id || '__no_restaurant__';
    const courier =
      groupBy === 'courier' && delivery.courierId
        ? couriers.find((item) => item.id === delivery.courierId)
        : null;
    const groupName =
      groupBy === 'courier'
        ? courier?.name || delivery.courierName || 'ללא שליח'
        : delivery.rest_name || delivery.restaurantName || 'ללא מסעדה';

    if (!groups.has(groupId)) {
      groups.set(groupId, { id: groupId, name: groupName, deliveries: [] });
    }

    groups.get(groupId)!.deliveries.push(delivery);
  });

  return Array.from(groups.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'he'),
  );
};

export const getEntityLabels = (groupBy: DeliveryExportGroupBy) =>
  groupBy === 'courier'
    ? { entityLabel: 'שליח', entityLabelPlural: 'שליחים' }
    : { entityLabel: 'מסעדה', entityLabelPlural: 'מסעדות' };

export const buildConfigSummaryRow = (
  summaryFields: Set<string>,
  financials: DeliveryGroupFinancials,
  totalDeliveries: number,
) => {
  const values: Record<string, string | number> = {
    totalDeliveries,
    deliveredCount: financials.deliveredCount,
    cancelledCount: financials.cancelledCount,
    successRate:
      totalDeliveries > 0
        ? `${Math.round((financials.deliveredCount / totalDeliveries) * 100)}%`
        : '0%',
    avgTime: financials.avgTime || '-',
    totalRevenue: `₪${financials.totalRevenue.toLocaleString()}`,
    totalRestPrice: `₪${financials.totalRestPrice.toLocaleString()}`,
    totalCourierPay: `₪${financials.totalCourierPay.toLocaleString()}`,
    totalTips: `₪${financials.totalTips.toLocaleString()}`,
    totalCash: `₪${financials.totalCash.toLocaleString()}`,
    totalCommission: `₪${financials.totalCommission.toLocaleString()}`,
    profit: `₪${financials.profit.toLocaleString()}`,
  };

  const row: Record<string, string | number> = {};

  SUMMARY_FIELDS.forEach((field) => {
    if (summaryFields.has(field.id)) {
      row[SUMMARY_VALUE_LABELS[field.id]] = values[field.id];
    }
  });

  return row;
};

export const ensureUniqueExportName = (
  name: string,
  usedNames: Set<string>,
  fallback?: string,
) => {
  const baseName = sanitizeExportFileName(name, fallback);
  let candidate = baseName;
  let counter = 2;

  while (usedNames.has(candidate)) {
    candidate = `${baseName}_${counter}`;
    counter += 1;
  }

  usedNames.add(candidate);
  return candidate;
};
