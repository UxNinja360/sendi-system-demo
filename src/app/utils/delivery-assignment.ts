import type { Delivery, DeliveryState } from '../types/delivery.types';
import {
  getCreditCostForAssignment,
} from './delivery-credits';
import {
  isDeliveryOfferExpired,
  toValidDate,
} from './delivery-offers';

export type DeliveryAssignmentBlockReason =
  | 'not_pending'
  | 'offer_expired'
  | 'no_credits'
  | 'no_available_couriers';

export const getDeliveryOfferRemainingSeconds = (
  delivery: Delivery,
  now = new Date()
) => {
  const expiresAt = toValidDate(delivery.offerExpiresAt);
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));
};

export const getDeliveryAssignmentBlockReason = (
  delivery: Delivery,
  options: {
    deliveryBalance: Pick<DeliveryState, 'deliveryBalance'>['deliveryBalance'];
    availableCourierCount?: number;
    now?: Date;
  }
): DeliveryAssignmentBlockReason | null => {
  const now = options.now ?? new Date();

  if (delivery.status === 'expired' || isDeliveryOfferExpired(delivery, now)) {
    return 'offer_expired';
  }

  if (delivery.status !== 'pending') {
    return 'not_pending';
  }

  if (getCreditCostForAssignment(delivery) > options.deliveryBalance) {
    return 'no_credits';
  }

  if (
    typeof options.availableCourierCount === 'number' &&
    options.availableCourierCount <= 0
  ) {
    return 'no_available_couriers';
  }

  return null;
};

export const DELIVERY_ASSIGNMENT_BLOCK_COPY: Record<DeliveryAssignmentBlockReason, string> = {
  not_pending: 'ניתן לשבץ רק משלוח ממתין',
  offer_expired: 'חלון הציוות הבלעדי פג',
  no_credits: 'אין מספיק יתרת משלוחים',
  no_available_couriers: 'אין שליחים זמינים',
};
