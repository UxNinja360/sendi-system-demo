export const isMcDonaldsRestaurant = (name?: string | null) => {
  if (!name) return false;
  const normalized = name.toLowerCase();
  return normalized.includes('מקדונלד') || normalized.includes('mcdonald');
};

export const isDominosRestaurant = (name?: string | null) => {
  if (!name) return false;
  const normalized = name.toLowerCase();
  return normalized.includes('דומינו') || normalized.includes('domino');
};

export const getRestaurantChainId = (name?: string | null) => {
  if (isMcDonaldsRestaurant(name)) {
    return 'מקדונלדס';
  }

  if (isDominosRestaurant(name)) {
    return 'דומינוס';
  }

  return '-';
};

export const getRestaurantBrandMarker = (name?: string | null) => {
  if (isMcDonaldsRestaurant(name)) {
    return {
      label: 'M',
      fill: '#da291c',
      text: '#ffc72c',
      stroke: '#ffffff',
    };
  }

  if (isDominosRestaurant(name)) {
    return {
      label: 'D',
      fill: '#0066b2',
      text: '#ffffff',
      stroke: '#e31837',
    };
  }

  return null;
};
