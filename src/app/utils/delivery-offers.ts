import type { Delivery, Restaurant } from '../types/delivery.types';

export const CHAIN_DELIVERY_OFFER_WINDOW_MS = 2 * 60 * 1000;

export const toValidDate = (value: Date | string | number | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isNetworkRestaurant = (
  restaurant?: Pick<Restaurant, 'chainId'> | null
) => {
  const chainId = restaurant?.chainId?.trim();
  return Boolean(chainId && chainId !== '-');
};

export const getDeliveryOfferExpiresAt = (
  createdAt: Date,
  restaurant?: Pick<Restaurant, 'chainId'> | null
) => {
  if (!isNetworkRestaurant(restaurant)) return null;
  return new Date(createdAt.getTime() + CHAIN_DELIVERY_OFFER_WINDOW_MS);
};

export const isDeliveryOfferExpired = (delivery: Delivery, now: Date) => {
  if (delivery.status !== 'pending') return false;
  const offerExpiresAt = toValidDate(delivery.offerExpiresAt);
  return Boolean(offerExpiresAt && offerExpiresAt.getTime() <= now.getTime());
};
