export const formatOrderNumber = (value: string | number | null | undefined) => {
  const rawValue = String(value ?? '').trim();
  if (!rawValue) return '-';

  const numberPart = rawValue.replace(/^#+/, '');
  return numberPart ? `#${numberPart}` : '#';
};
