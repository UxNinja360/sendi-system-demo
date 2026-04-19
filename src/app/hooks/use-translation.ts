import { useLanguage } from '../context/language.context';

/**
 * Hook for accessing translations easily
 * Usage: const t = useTranslation();
 * t('common.search') => 'Search' or 'חיפוש'
 */
export const useTranslation = () => {
  const { t } = useLanguage();
  return t;
};
