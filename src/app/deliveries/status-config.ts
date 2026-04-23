import { DeliveryStatus } from '../types/delivery.types';
import {
  AlertCircle,
  Bike,
  Package,
  Navigation,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  badgeColor: string;
  tableColor: string; // plain text color for table display
  sidePanelColor: string;
  sidePanelBg: string;
  sidePanelBorder: string;
  icon: typeof AlertCircle;
  dotColor: string;
}

export const STATUS_CONFIG: Record<DeliveryStatus, StatusConfig> = {
  pending: {
    label: 'ממתין',
    color: 'text-white',
    bg: 'bg-orange-500',
    badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    tableColor: 'text-orange-500 dark:text-orange-400',
    sidePanelColor: 'text-orange-600 dark:text-orange-400',
    sidePanelBg: 'bg-orange-50 dark:bg-orange-950/40',
    sidePanelBorder: 'border-orange-200 dark:border-orange-800',
    icon: AlertCircle,
    dotColor: 'bg-orange-500',
  },
  assigned: {
    label: 'שובץ',
    color: 'text-white',
    bg: 'bg-yellow-500',
    badgeColor: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    tableColor: 'text-yellow-500 dark:text-yellow-400',
    sidePanelColor: 'text-yellow-600 dark:text-yellow-400',
    sidePanelBg: 'bg-yellow-50 dark:bg-yellow-950/40',
    sidePanelBorder: 'border-yellow-200 dark:border-yellow-800',
    icon: Bike,
    dotColor: 'bg-yellow-500',
  },
  delivering: {
    label: 'נאסף',
    color: 'text-white',
    bg: 'bg-indigo-500',
    badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    tableColor: 'text-indigo-500 dark:text-indigo-400',
    sidePanelColor: 'text-indigo-600 dark:text-indigo-400',
    sidePanelBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    sidePanelBorder: 'border-indigo-200 dark:border-indigo-800',
    icon: Navigation,
    dotColor: 'bg-indigo-500',
  },
  delivered: {
    label: 'נמסר',
    color: 'text-white',
    bg: 'bg-green-500',
    badgeColor: 'bg-green-500/10 text-green-700 dark:text-green-400',
    tableColor: 'text-green-500 dark:text-green-400',
    sidePanelColor: 'text-green-600 dark:text-green-400',
    sidePanelBg: 'bg-green-50 dark:bg-green-950/40',
    sidePanelBorder: 'border-green-200 dark:border-green-800',
    icon: CheckCircle2,
    dotColor: 'bg-green-500',
  },
  cancelled: {
    label: 'בוטל',
    color: 'text-white',
    bg: 'bg-red-500',
    badgeColor: 'bg-red-500/10 text-red-700 dark:text-red-400',
    tableColor: 'text-red-500 dark:text-red-400',
    sidePanelColor: 'text-red-600 dark:text-red-400',
    sidePanelBg: 'bg-red-50 dark:bg-red-950/40',
    sidePanelBorder: 'border-red-200 dark:border-red-800',
    icon: XCircle,
    dotColor: 'bg-red-500',
  },
};

export const STATUS_ORDER: DeliveryStatus[] = ['pending', 'assigned', 'delivering', 'delivered'];

export const ALL_STATUSES: { key: DeliveryStatus; label: string; icon: typeof AlertCircle; color: string }[] = [
  { key: 'pending', label: 'ממתין', icon: AlertCircle, color: 'text-orange-500' },
  { key: 'assigned', label: 'שובץ', icon: Bike, color: 'text-yellow-500' },
  { key: 'delivering', label: 'נאסף', icon: Navigation, color: 'text-indigo-500' },
  { key: 'delivered', label: 'נמסר', icon: CheckCircle2, color: 'text-green-500' },
  { key: 'cancelled', label: 'בוטל', icon: XCircle, color: 'text-red-500' },
];

export const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  assigned: 'שובץ',
  delivering: 'נאסף',
  delivered: 'נמסר',
  cancelled: 'בוטל',
};

/** Default visible columns — uses new unified IDs */
export const DEFAULT_VISIBLE_COLUMNS = new Set([
  'orderNumber', 'creation_time', 'status', 'rest_name', 'client_full_address', 'courier',
]);

