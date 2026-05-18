import type { Delivery, Restaurant } from '../types/delivery.types';
import { isSendiPlusRestaurant } from './sendi-plus';

export const SENDI_PLUS_BASE_DELIVERY_CHARGE = 22;
export const SENDI_PLUS_DISTANCE_STEP_CHARGE = 1;

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

export const findDeliveryRestaurant = (
  delivery: Delivery,
  restaurants: Restaurant[],
) =>
  restaurants.find(
    (restaurant) =>
      restaurant.id === delivery.restaurantId ||
      restaurant.id === delivery.rest_id ||
      restaurant.name === delivery.restaurantName ||
      restaurant.name === delivery.rest_name,
  ) ?? null;

export const isSendiPlusDelivery = (
  delivery: Delivery,
  restaurant?: Pick<Restaurant, 'chainId' | 'name'> | null,
) =>
  isSendiPlusRestaurant(restaurant?.name, restaurant?.chainId) ||
  isSendiPlusRestaurant(delivery.restaurantName) ||
  isSendiPlusRestaurant(delivery.rest_name);

export const getSendiPlusBillableDistanceKm = (delivery: Delivery) => {
  const distance = delivery.delivery_distance;
  if (typeof distance !== 'number' || !Number.isFinite(distance) || distance <= 0) return 0;

  return Math.ceil(distance);
};

export const calculateSendiPlusDeliveryCharge = (distanceKm: number | null | undefined) => {
  const billableDistanceKm =
    typeof distanceKm === 'number' && Number.isFinite(distanceKm) && distanceKm > 0
      ? Math.ceil(distanceKm)
      : 0;

  return SENDI_PLUS_BASE_DELIVERY_CHARGE + billableDistanceKm * SENDI_PLUS_DISTANCE_STEP_CHARGE;
};

export const getSendiPlusDeliveryCharge = (delivery: Delivery) =>
  calculateSendiPlusDeliveryCharge(delivery.delivery_distance);

export const getDeliveryWalletCharge = (
  delivery: Delivery,
  restaurant?: Pick<Restaurant, 'chainId' | 'name'> | null,
) => (isSendiPlusDelivery(delivery, restaurant) ? getSendiPlusDeliveryCharge(delivery) : 0);

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
