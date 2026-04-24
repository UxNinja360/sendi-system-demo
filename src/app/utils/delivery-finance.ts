import type { Delivery } from '../types/delivery.types';

const asMoney = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const firstMoney = (...values: Array<number | null | undefined>) => {
  for (const value of values) {
    const money = asMoney(value);
    if (money !== null) return money;
  }

  return 0;
};

export const getDeliveryCustomerCharge = (delivery: Delivery) =>
  firstMoney(delivery.price, delivery.sum_cash);

export const getDeliveryRestaurantCharge = (delivery: Delivery) =>
  firstMoney(delivery.rest_price, delivery.restaurantPrice);

export const getDeliveryCourierBasePay = (delivery: Delivery) =>
  firstMoney(delivery.runner_price, delivery.courierPayment);

export const getDeliveryCourierTip = (delivery: Delivery) =>
  firstMoney(delivery.runner_tip);

export const getDeliveryCourierTotalPay = (delivery: Delivery) =>
  getDeliveryCourierBasePay(delivery) + getDeliveryCourierTip(delivery);

export const getDeliveryCashAmount = (delivery: Delivery) =>
  firstMoney(delivery.sum_cash, delivery.is_cash ? delivery.price : undefined);

export const getDeliveryCommission = (delivery: Delivery) => {
  const explicitCommission = asMoney(delivery.commissionAmount);
  if (explicitCommission !== null) return explicitCommission;

  const customerCharge = getDeliveryCustomerCharge(delivery);
  const restaurantCharge = getDeliveryRestaurantCharge(delivery);

  return restaurantCharge > 0 ? Math.max(customerCharge - restaurantCharge, 0) : 0;
};

export const getDeliveryGrossProfit = (delivery: Delivery) =>
  getDeliveryCustomerCharge(delivery) -
  getDeliveryCourierBasePay(delivery) -
  getDeliveryCommission(delivery);

export const sumDeliveryMoney = (
  deliveries: Delivery[],
  selector: (delivery: Delivery) => number,
) => deliveries.reduce((sum, delivery) => sum + selector(delivery), 0);

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
