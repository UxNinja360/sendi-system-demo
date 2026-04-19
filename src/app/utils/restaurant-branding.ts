export const isMcDonaldsRestaurant = (name?: string | null) => {
  if (!name) return false;
  const normalized = name.toLowerCase();
  return normalized.includes('מקדונלד') || normalized.includes('mcdonald');
};

export const getRestaurantChainId = (name?: string | null) => {
  if (isMcDonaldsRestaurant(name)) {
    return 'מקדונלדס';
  }

  return '-';
};
