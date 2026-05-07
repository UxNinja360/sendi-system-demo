import type { DeliveryHub } from '../types/delivery.types';

export const TLV_RUNNERS_HUB_ID = 'tlv-runners';

export const DELIVERY_HUBS: DeliveryHub[] = [
  {
    id: TLV_RUNNERS_HUB_ID,
    name: 'TLV RUNNERS',
    isActive: true,
  },
];

const DELIVERY_HUB_BY_ID = new Map(DELIVERY_HUBS.map((hub) => [hub.id, hub]));

export const getDeliveryHubNames = (hubIds: string[] | undefined) => {
  const normalizedHubIds = hubIds && hubIds.length > 0 ? hubIds : [TLV_RUNNERS_HUB_ID];

  return Array.from(new Set(normalizedHubIds)).map((hubId) => (
    DELIVERY_HUB_BY_ID.get(hubId)?.name ?? hubId
  ));
};

export const hasActiveLinkedDeliveryHub = (hubIds: string[] | undefined) => {
  if (!hubIds || hubIds.length === 0) return false;

  return hubIds.some((hubId) => DELIVERY_HUB_BY_ID.get(hubId)?.isActive);
};
