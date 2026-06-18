import type { Courier } from '../types/delivery.types';

export const isCourierConnected = (courier: Courier) =>
  courier.registrationStatus !== 'invited' && courier.status !== 'offline';

export const hasConnectedCouriers = (couriers: Courier[]) =>
  couriers.some(isCourierConnected);
