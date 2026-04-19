export const formatAddressWithArea = (address?: string | null, area?: string | null) => {
  return address?.trim() || area?.trim() || '';
};
