import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  BellRing,
  Bike,
  Bot,
  Check,
  FileText,
  ChevronDown,
  ChevronLeft,
  Clock3,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Moon,
  Palette,
  Package,
  Power,
  RotateCcw,
  Ruler,
  Store,
  Sun,
  Sunset,
  SlidersHorizontal,
  TrendingUp,
  type LucideIcon,
  Users,
  Volume2,
  Wallet,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { APP_NAV_ITEMS, type AppNavIconKey, type AppNavSectionId } from '../app-navigation';
import { useTheme, type ThemeMode } from '../context/theme.context';
import { useDelivery } from '../context/delivery-context-value';
import { Toggle } from '../components/common/toggle';
import {
  ALERT_PREFERENCES_EVENT,
  getAlertPreferences,
  setAlertPreference,
  type AlertPreferences,
} from '../notifications/alert-preferences';
import { ALERT_SOUND_PRESETS, type AlertSoundId } from '../notifications/alert-sounds';
import {
  canUseBrowserNotifications,
  playNewDeliverySound,
  requestNotificationPermission,
  unlockAlertSound,
} from '../notifications/operational-alerts';
import {
  getDeliveryPushStatus,
  sendTestDeliveryPushNotification,
  subscribeToDeliveryPushNotifications,
  type DeliveryPushStatus,
} from '../notifications/web-push';
import { playHaptic } from '../utils/haptics';

const TEXT = {
  title: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea',
  subtitle: '\u05d7\u05dc\u05d5\u05e7\u05d4 \u05dc\u05e4\u05d9 \u05ea\u05e4\u05e2\u05d5\u05dc, \u05de\u05de\u05e9\u05e7 \u05d5\u05e2\u05de\u05d5\u05d3\u05d9\u05dd \u05e0\u05e4\u05e8\u05d3\u05d9\u05dd',
  open: '\u05e4\u05ea\u05d7',
  operations: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05ea\u05e4\u05e2\u05d5\u05dc',
  operationsDescription: '\u05e8\u05d9\u05db\u05d5\u05d6 \u05db\u05dc \u05d4\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05e9\u05e7\u05d5\u05d1\u05e2\u05d5\u05ea \u05d0\u05d9\u05da \u05d4\u05e2\u05e1\u05e7 \u05e2\u05d5\u05d1\u05d3 \u05d1\u05e9\u05d8\u05d7: \u05e9\u05e2\u05d5\u05ea, \u05d0\u05d6\u05d5\u05e8\u05d9\u05dd \u05d5\u05ea\u05de\u05d7\u05d5\u05e8.',
  system: '\u05d4\u05de\u05e2\u05e8\u05db\u05ea',
  systemDescription: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05e9\u05de\u05db\u05ea\u05d9\u05d1\u05d5\u05ea \u05d0\u05d9\u05da \u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05db\u05d5\u05dc\u05d4 \u05e2\u05d5\u05d1\u05d3\u05ea \u05d1\u05d6\u05de\u05df \u05d0\u05de\u05ea.',
  systemOpen: '\u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05e4\u05ea\u05d5\u05d7\u05d4',
  systemOpenHint: '\u05db\u05d9\u05d1\u05d5\u05d9 \u05e2\u05d5\u05e6\u05e8 \u05d9\u05e6\u05d9\u05e8\u05d4 \u05d5\u05e2\u05d1\u05d5\u05d3\u05d4 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9\u05ea.',
  autoAssign: '\u05e9\u05d9\u05d1\u05d5\u05e5 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9',
  autoAssignHint: '\u05e9\u05d9\u05d1\u05d5\u05e5 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9 \u05dc\u05e9\u05dc\u05d9\u05d7\u05d9\u05dd \u05db\u05e9\u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05e2\u05d5\u05d1\u05d3\u05ea.',
  timeMultiplier: '\u05de\u05db\u05e4\u05d9\u05dc \u05d6\u05de\u05df',
  business: '\u05e0\u05d9\u05d4\u05d5\u05dc \u05d4\u05e2\u05e1\u05e7',
  businessDescription: '\u05de\u05e1\u05db\u05d9 \u05e0\u05d9\u05d4\u05d5\u05dc \u05d9\u05d9\u05e2\u05d5\u05d3\u05d9\u05d9\u05dd \u05dc\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05d4\u05e2\u05e1\u05e7, \u05d4\u05d9\u05ea\u05e8\u05d4 \u05d5\u05e9\u05e2\u05d5\u05ea \u05d4\u05e4\u05e2\u05d9\u05dc\u05d5\u05ea.',
  balance: '\u05d9\u05ea\u05e8\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
  balanceHintPrefix: '\u05e2\u05de\u05d5\u05d3 \u05e0\u05e4\u05e8\u05d3 \u05dc\u05e8\u05db\u05d9\u05e9\u05d4 \u05d5\u05e0\u05d9\u05d4\u05d5\u05dc \u05d9\u05ea\u05e8\u05d4. \u05d9\u05ea\u05e8\u05d4 \u05e0\u05d5\u05db\u05d7\u05d9\u05ea: ',
  deliveriesSuffix: ' \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
  operatingHours: '\u05e9\u05e2\u05d5\u05ea \u05e4\u05e2\u05d9\u05dc\u05d5\u05ea',
  operatingHoursHint: '\u05e2\u05de\u05d5\u05d3 \u05e0\u05e4\u05e8\u05d3 \u05dc\u05d4\u05d2\u05d3\u05e8\u05ea \u05e9\u05e2\u05d5\u05ea \u05d4\u05e4\u05e2\u05d9\u05dc\u05d5\u05ea \u05e9\u05dc \u05d4\u05e2\u05e1\u05e7 \u05dc\u05db\u05dc \u05d9\u05de\u05d9 \u05d4\u05e9\u05d1\u05d5\u05e2.',
  pricing: '\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05d5\u05ea\u05de\u05d7\u05d5\u05e8',
  pricingDescription: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05e9\u05e7\u05e9\u05d5\u05e8\u05d5\u05ea \u05dc\u05d0\u05d6\u05d5\u05e8\u05d9 \u05de\u05e9\u05dc\u05d5\u05d7, \u05d8\u05d5\u05d5\u05d7\u05d9\u05dd \u05d5\u05ea\u05de\u05d7\u05d5\u05e8 \u05dc\u05e4\u05d9 \u05de\u05e8\u05d7\u05e7.',
  zones: '\u05d0\u05d6\u05d5\u05e8\u05d9 \u05de\u05e9\u05dc\u05d5\u05d7',
  zonesHint: '\u05e2\u05de\u05d5\u05d3 \u05e0\u05e4\u05e8\u05d3 \u05dc\u05d4\u05d2\u05d3\u05e8\u05ea \u05d0\u05d6\u05d5\u05e8\u05d9 \u05de\u05e9\u05dc\u05d5\u05d7, \u05e8\u05d3\u05d9\u05d5\u05e1\u05d9\u05dd \u05d5\u05de\u05d7\u05d9\u05e8 \u05dc\u05db\u05dc \u05d0\u05d6\u05d5\u05e8.',
  distancePricing: '\u05ea\u05de\u05d7\u05d5\u05e8 \u05dc\u05e4\u05d9 \u05de\u05e8\u05d7\u05e7',
  distancePricingHint: '\u05e2\u05de\u05d5\u05d3 \u05e0\u05e4\u05e8\u05d3 \u05dc\u05d4\u05d2\u05d3\u05e8\u05ea \u05de\u05d7\u05d9\u05e8\u05d9\u05dd \u05e9\u05d5\u05e0\u05d9\u05dd \u05dc\u05d8\u05d5\u05d5\u05d7\u05d9 \u05de\u05e8\u05d7\u05e7 \u05e9\u05d5\u05e0\u05d9\u05dd.',
  access: '\u05e0\u05d9\u05d4\u05d5\u05dc \u05d2\u05d9\u05e9\u05d4',
  accessDescription: '\u05e0\u05d9\u05d4\u05d5\u05dc \u05de\u05e0\u05d4\u05dc\u05d9\u05dd, \u05de\u05e9\u05ea\u05de\u05e9\u05d9 \u05de\u05e2\u05e8\u05db\u05ea \u05d5\u05d4\u05e8\u05e9\u05d0\u05d5\u05ea \u05d2\u05d9\u05e9\u05d4.',
  managers: '\u05de\u05e0\u05d4\u05dc\u05d9\u05dd',
  managersHint: '\u05de\u05e1\u05da \u05e0\u05e4\u05e8\u05d3 \u05dc\u05e0\u05d9\u05d4\u05d5\u05dc \u05de\u05e0\u05d4\u05dc\u05d9\u05dd, \u05de\u05e9\u05ea\u05de\u05e9\u05d9 \u05de\u05e2\u05e8\u05db\u05ea \u05d5\u05d4\u05e8\u05e9\u05d0\u05d5\u05ea.',
  couriersList: '\u05e8\u05e9\u05d9\u05de\u05ea \u05e9\u05dc\u05d9\u05d7\u05d9\u05dd',
  couriersListHint: '\u05de\u05e1\u05da \u05e0\u05e4\u05e8\u05d3 \u05dc\u05e8\u05e9\u05d9\u05de\u05ea \u05db\u05dc \u05d4\u05e9\u05dc\u05d9\u05d7\u05d9\u05dd, \u05d7\u05d9\u05e4\u05d5\u05e9, \u05e1\u05d9\u05e0\u05d5\u05df \u05d5\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05e0\u05d9\u05d4\u05d5\u05dc.',
  restaurants: '\u05de\u05e1\u05e2\u05d3\u05d5\u05ea',
  restaurantsHint: '\u05de\u05e1\u05da \u05e0\u05e4\u05e8\u05d3 \u05dc\u05e8\u05e9\u05d9\u05de\u05ea \u05db\u05dc \u05d4\u05de\u05e1\u05e2\u05d3\u05d5\u05ea, \u05d7\u05d9\u05e4\u05d5\u05e9, \u05e1\u05d9\u05e0\u05d5\u05df \u05d5\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05e0\u05d9\u05d4\u05d5\u05dc.',
  personal: '\u05d4\u05e2\u05d3\u05e4\u05d5\u05ea \u05d0\u05d9\u05e9\u05d9\u05d5\u05ea',
  personalDescription: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05ea\u05e6\u05d5\u05d2\u05d4 \u05e9\u05de\u05e9\u05e4\u05d9\u05e2\u05d5\u05ea \u05e2\u05dc \u05e1\u05d1\u05d9\u05d1\u05ea \u05d4\u05e2\u05d1\u05d5\u05d3\u05d4 \u05d4\u05d0\u05d9\u05e9\u05d9\u05ea \u05e9\u05dc\u05da.',
  darkMode: '\u05de\u05e6\u05d1 \u05db\u05d4\u05d4',
  darkModeHint: '\u05de\u05e2\u05d1\u05e8 \u05d9\u05d3\u05e0\u05d9 \u05d1\u05d9\u05df \u05d1\u05d4\u05d9\u05e8 \u05dc\u05db\u05d4\u05d4.',
  themeMode: '\u05e2\u05e8\u05db\u05ea \u05e0\u05d5\u05e9\u05d0',
  themeModeHint: '\u05d1\u05d7\u05d9\u05e8\u05d4 \u05d1\u05d9\u05df \u05d1\u05d4\u05d9\u05e8, \u05d3\u05de\u05d3\u05d5\u05de\u05d9\u05dd \u05d0\u05d5 \u05db\u05d4\u05d4.',
  themeLight: '\u05d1\u05d4\u05d9\u05e8',
  themeTwilight: '\u05d3\u05de\u05d3\u05d5\u05de\u05d9\u05dd',
  themeDark: '\u05db\u05d4\u05d4',
  autoTheme: '\u05ea\u05d1\u05e0\u05d9\u05ea \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9\u05ea',
  autoThemeHint: '\u05d4\u05ea\u05d0\u05de\u05d4 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9\u05ea \u05e9\u05dc \u05d4\u05de\u05de\u05e9\u05e7.',
  alerts: 'צלילים והתראות',
  alertsDescription: 'שליטה בצליל, רטט והתראות כשנכנס משלוח חדש.',
  newDeliverySound: 'צליל משלוח חדש',
  newDeliverySoundHint: 'השמעת צליל קצר בכל משלוח חדש.',
  hapticFeedback: 'הפטיק בממשק',
  hapticFeedbackHint: 'רטט קצר בלחיצה על כפתורים ופקדים תומכים.',
  newDeliveryHaptic: 'רטט למשלוח חדש',
  newDeliveryHapticHint: 'ניסיון להפעיל רטט/הפטיק בכל משלוח חדש.',
  browserNotifications: 'התראות דפדפן',
  browserNotificationsHint: 'התראות מערכת כשהאפליקציה אינה בפוקוס. כשהיא פתוחה נשתמש בהתראה פנימית.',
  realPush: 'פוש אמיתי ברקע',
  realPushHint: 'רישום המכשיר ל-Web Push כדי לקבל התראות כשה-PWA ממוזער או סגור.',
  enableRealPush: 'חבר',
  testRealPush: 'בדיקה',
  realPushSubscribed: 'מחובר',
  realPushReady: 'מוכן',
  realPushNeedsPermission: 'צריך הרשאה',
  realPushNotConfigured: 'חסר VAPID בשרת',
  realPushUnsupported: 'לא נתמך',
  realPushError: 'שגיאה',
  notificationPermission: 'הרשאת התראות',
  notificationPermissionHint: 'נדרש כדי להציג התראות מערכת במחשב וב-PWA.',
  enableNotifications: 'אפשר',
  notificationsAllowed: 'מאושר',
  notificationsBlocked: 'חסום',
  notificationsDefault: 'לא הופעל',
  notificationsUnsupported: 'לא נתמך',
  testSound: 'בדיקת צליל',
  playSound: 'נגן',
  testHaptic: 'בדיקת רטט',
  playHaptic: 'רטט',
  advanced: '\u05de\u05ea\u05e7\u05d3\u05dd',
  advancedDescription: '\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05de\u05e2\u05e8\u05db\u05ea \u05e8\u05d2\u05d9\u05e9\u05d5\u05ea. \u05de\u05d5\u05de\u05dc\u05e5 \u05dc\u05d2\u05e2\u05ea \u05d1\u05d4\u05df \u05e8\u05e7 \u05db\u05e9\u05d1\u05d0\u05de\u05ea \u05e6\u05e8\u05d9\u05da.',
  logout: '\u05d4\u05ea\u05e0\u05ea\u05e7\u05d5\u05ea',
  logoutHint: '\u05d9\u05e6\u05d9\u05d0\u05d4 \u05de\u05d4\u05d7\u05e9\u05d1\u05d5\u05df \u05d5\u05d7\u05d6\u05e8\u05d4 \u05dc\u05de\u05e1\u05da \u05d4\u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea.',
  logoutShort: '\u05d4\u05ea\u05e0\u05ea\u05e7',
  reset: '\u05d0\u05d9\u05e4\u05d5\u05e1 \u05de\u05e2\u05e8\u05db\u05ea',
  resetHint: '\u05de\u05d7\u05d6\u05d9\u05e8 \u05d0\u05ea \u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05dc\u05de\u05e6\u05d1 \u05d4\u05d4\u05ea\u05d7\u05dc\u05ea\u05d9.',
  resetShort: '\u05d0\u05e4\u05e1',
  resetConfirm: '\u05dc\u05d0\u05e4\u05e1 \u05d0\u05ea \u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05db\u05d5\u05dc\u05d4?',
  resetConfirmBody: '\u05d4\u05e4\u05e2\u05d5\u05dc\u05d4 \u05ea\u05de\u05d7\u05e7 \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd, \u05e9\u05d9\u05d1\u05d5\u05e6\u05d9\u05dd, \u05de\u05d9\u05e7\u05d5\u05de\u05d9 \u05dc\u05d9\u05d9\u05d1 \u05d5\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05ea\u05e6\u05d5\u05d2\u05ea \u05d3\u05de\u05d5. \u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea \u05d5\u05e2\u05e8\u05db\u05ea \u05e6\u05d1\u05e2\u05d9\u05dd \u05d9\u05d9\u05e9\u05d0\u05e8\u05d5.',
  resetCancel: '\u05d1\u05d9\u05d8\u05d5\u05dc',
  resetConfirmAction: '\u05d0\u05e4\u05e1 \u05e2\u05db\u05e9\u05d9\u05d5',
  timeHintPrefix: '\u05e8\u05e5 \u05db\u05e8\u05d2\u05e2 \u05e2\u05dc x',
  pages: '\u05ea\u05e4\u05e2\u05d5\u05dc \u05d5\u05e2\u05de\u05d5\u05d3\u05d9\u05dd',
  pagesDescription: '\u05db\u05dc \u05de\u05d4 \u05e9\u05d4\u05d9\u05d4 \u05d1\u05ea\u05e4\u05e8\u05d9\u05d8 \u05d4\u05e6\u05d3 \u05ea\u05d7\u05ea \u05ea\u05e4\u05e2\u05d5\u05dc, \u05e2\u05de\u05d5\u05d3\u05d9 \u05e0\u05d9\u05e1\u05d9\u05d5\u05df \u05d5\u05e2\u05de\u05d5\u05d3\u05d9\u05dd \u05d9\u05e9\u05e0\u05d9\u05dd.',
  operationsPages: '\u05e2\u05de\u05d5\u05d3\u05d9 \u05ea\u05e4\u05e2\u05d5\u05dc',
  operationsPagesDescription: '\u05db\u05dc\u05d9 \u05e0\u05d9\u05d4\u05d5\u05dc \u05d9\u05d5\u05de\u05d9\u05d5\u05de\u05d9\u05d9\u05dd \u05dc\u05ea\u05e4\u05e2\u05d5\u05dc \u05d4\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd, \u05d4\u05d0\u05d6\u05d5\u05e8\u05d9\u05dd \u05d5\u05d4\u05de\u05d7\u05d9\u05e8\u05d9\u05dd.',
  experimentPages: '\u05e2\u05de\u05d5\u05d3\u05d9 \u05e0\u05d9\u05e1\u05d9\u05d5\u05df',
  experimentPagesDescription: '\u05de\u05e1\u05db\u05d9 \u05d1\u05d3\u05d9\u05e7\u05d4 \u05d5\u05e0\u05d9\u05e1\u05d5\u05d9\u05d9\u05dd \u05e9\u05e0\u05e9\u05de\u05e8\u05d9\u05dd \u05de\u05d7\u05d5\u05e5 \u05dc\u05ea\u05e4\u05e8\u05d9\u05d8 \u05d4\u05e6\u05d3.',
  legacyPages: '\u05e2\u05de\u05d5\u05d3\u05d9\u05dd \u05d9\u05e9\u05e0\u05d9\u05dd',
  legacyPagesDescription: '\u05d2\u05e8\u05e1\u05d0\u05d5\u05ea \u05d9\u05e9\u05e0\u05d5\u05ea \u05dc\u05d4\u05e9\u05d5\u05d5\u05d0\u05d4 \u05d5\u05e9\u05d7\u05d6\u05d5\u05e8 \u05d4\u05ea\u05e0\u05d4\u05d2\u05d5\u05ea \u05e7\u05d5\u05d3\u05de\u05ea.',
} as const;

const SettingRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint?: string;
  control: React.ReactNode;
  danger?: boolean;
}> = ({ icon, title, hint, control, danger = false }) => (
  <div
    className={`flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0 ${
      danger
        ? 'border-red-100 bg-red-50/70 dark:border-red-500/10 dark:bg-red-500/5'
        : 'border-[#f1f1f1] dark:border-app-border'
    }`}
  >
    <div className="min-w-0 flex items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          danger
            ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
            : 'bg-[#f5f5f5] text-app-brand dark:bg-app-surface dark:text-app-brand'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`text-sm font-semibold ${danger ? 'text-red-700 dark:text-red-300' : 'text-[#0d0d12] dark:text-app-text'}`}>
          {title}
        </div>
        {hint ? (
          <div className={`mt-0.5 text-xs ${danger ? 'text-red-600/80 dark:text-red-300/75' : 'text-[#666d80] dark:text-app-text-secondary'}`}>
            {hint}
          </div>
        ) : null}
      </div>
    </div>
    <div className="shrink-0">{control}</div>
  </div>
);

const SOUND_PICKER_SHEET_BREAKPOINT = 640;
const SOUND_PICKER_PANEL_WIDTH = 280;
const SOUND_PICKER_PANEL_MARGIN = 12;
const SOUND_PICKER_PANEL_MAX_HEIGHT = 430;
const SOUND_PICKER_PANEL_MIN_ANCHORED_HEIGHT = 220;

const SoundPicker: React.FC<{
  selectedSoundId: AlertSoundId;
  onSelect: (soundId: AlertSoundId) => void;
}> = ({ selectedSoundId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [isSheetMode, setIsSheetMode] = useState(true);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedSound =
    ALERT_SOUND_PRESETS.find((sound) => sound.id === selectedSoundId) ??
    ALERT_SOUND_PRESETS[0];

  useEffect(() => {
    if (!isOpen) return;

    const updatePanelPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger || window.innerWidth < SOUND_PICKER_SHEET_BREAKPOINT) {
        setIsSheetMode(true);
        setPanelStyle({});
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(SOUND_PICKER_PANEL_WIDTH, window.innerWidth - SOUND_PICKER_PANEL_MARGIN * 2);
      const maxLeft = window.innerWidth - width - SOUND_PICKER_PANEL_MARGIN;
      const left = Math.min(
        maxLeft,
        Math.max(SOUND_PICKER_PANEL_MARGIN, rect.right - width),
      );
      const preferredTop = rect.bottom + 8;
      const belowSpace = window.innerHeight - preferredTop - SOUND_PICKER_PANEL_MARGIN;
      const aboveSpace = rect.top - SOUND_PICKER_PANEL_MARGIN - 8;
      const shouldOpenBelow =
        belowSpace >= SOUND_PICKER_PANEL_MIN_ANCHORED_HEIGHT || belowSpace >= aboveSpace;
      const panelHeight = Math.max(
        SOUND_PICKER_PANEL_MIN_ANCHORED_HEIGHT,
        Math.min(SOUND_PICKER_PANEL_MAX_HEIGHT, shouldOpenBelow ? belowSpace : aboveSpace),
      );
      const top = shouldOpenBelow
        ? preferredTop
        : Math.max(SOUND_PICKER_PANEL_MARGIN, rect.top - panelHeight - 8);

      setIsSheetMode(false);
      setPanelStyle({
        bottom: 'auto',
        left,
        maxHeight: panelHeight,
        right: 'auto',
        top,
        width,
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    updatePanelPosition();
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isOpen]);

  const handleSelect = (soundId: AlertSoundId) => {
    onSelect(soundId);
    setIsOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  return (
    <div className="relative w-[180px] max-w-[48vw]" dir="rtl">
      <button
        ref={triggerRef}
        type="button"
        data-haptic="selection"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-app-border bg-[#f5f5f5] pl-3 pr-3 text-right text-xs font-semibold text-[#0d0d12] outline-none transition-colors hover:bg-[#ececec] focus:border-app-brand focus:bg-white focus:ring-2 focus:ring-app-brand/20 dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised dark:focus:bg-app-surface"
        aria-label="בחירת צליל למשלוח חדש"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="min-w-0 truncate">{selectedSound.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#666d80] transition-transform dark:text-app-text-secondary ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[180]" dir="rtl">
          <button
            type="button"
            data-haptic="off"
            aria-label="סגור בחירת צליל"
            onClick={() => setIsOpen(false)}
            className={`absolute inset-0 ${
              isSheetMode ? 'bg-black/35 backdrop-blur-[2px]' : 'bg-transparent'
            }`}
          />
          <div
            role="listbox"
            aria-label="בחירת צליל למשלוח חדש"
            style={panelStyle}
            className={`absolute overflow-hidden rounded-2xl border border-app-border bg-white text-right shadow-2xl dark:border-app-border dark:bg-app-surface ${
              isSheetMode
                ? 'inset-x-3 bottom-3 max-h-[min(70vh,430px)]'
                : ''
            }`}
          >
            <div className="border-b border-[#f1f1f1] px-4 py-3 dark:border-app-border">
              <div className="text-sm font-bold text-[#0d0d12] dark:text-app-text">בחירת צליל</div>
              <div className="mt-0.5 text-xs text-[#666d80] dark:text-app-text-secondary">
                בחירה מפעילה תצוגת צליל קצרה.
              </div>
            </div>
            <div className="max-h-[calc(min(70vh,430px)-66px)] overflow-y-auto p-1.5">
              {ALERT_SOUND_PRESETS.map((sound) => {
                const isSelected = sound.id === selectedSoundId;

                return (
                  <button
                    key={sound.id}
                    type="button"
                    role="option"
                    data-haptic={isSelected ? 'selection' : 'light'}
                    aria-selected={isSelected}
                    onClick={() => handleSelect(sound.id)}
                    className={`mb-1 flex h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-right text-sm transition-colors ${
                      isSelected
                        ? 'bg-app-brand-solid text-app-background'
                        : 'text-[#0d0d12] hover:bg-[#f5f5f5] dark:text-app-text dark:hover:bg-app-surface-raised'
                    }`}
                  >
                    <span className="min-w-0 truncate font-semibold">{sound.label}</span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : (
                      <Volume2 className="h-4 w-4 shrink-0 text-[#8a8f98] dark:text-app-text-secondary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const themeModeOptions: Array<{ id: ThemeMode; label: string; icon: LucideIcon }> = [
  { id: 'light', label: TEXT.themeLight, icon: Sun },
  { id: 'twilight', label: TEXT.themeTwilight, icon: Sunset },
  { id: 'dark', label: TEXT.themeDark, icon: Moon },
];

const settingsNavIconMap: Record<AppNavIconKey, LucideIcon> = {
  activity: Activity,
  alertTriangle: AlertTriangle,
  barChart: TrendingUp,
  bike: Bike,
  calendar: Clock3,
  clock: Clock3,
  fileText: FileText,
  layoutDashboard: LayoutDashboard,
  map: MapIcon,
  package: Package,
  palette: Palette,
  ruler: Ruler,
  settings: Palette,
  sliders: SlidersHorizontal,
  store: Store,
  trendingUp: TrendingUp,
  users: Users,
  wallet: Wallet,
};

const settingsNavGroups: Array<{
  section: AppNavSectionId;
  title: string;
  description: string;
  icon: AppNavIconKey;
}> = [
  {
    section: 'operationsTools',
    title: TEXT.operationsPages,
    description: TEXT.operationsPagesDescription,
    icon: 'sliders',
  },
  {
    section: 'experiments',
    title: TEXT.experimentPages,
    description: TEXT.experimentPagesDescription,
    icon: 'palette',
  },
  {
    section: 'legacy',
    title: TEXT.legacyPages,
    description: TEXT.legacyPagesDescription,
    icon: 'layoutDashboard',
  },
];

const ThemeModePicker: React.FC<{
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}> = ({ value, onChange }) => (
  <div
    className="grid w-[282px] max-w-[62vw] grid-cols-3 gap-1 rounded-lg border border-app-border bg-app-interactive p-1"
    dir="rtl"
    role="group"
    aria-label={TEXT.themeMode}
  >
    {themeModeOptions.map(({ id, label, icon: Icon }) => {
      const isSelected = value === id;
      return (
        <button
          key={id}
          type="button"
          data-haptic="selection"
          aria-pressed={isSelected}
          onClick={() => onChange(id)}
          className={`inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors ${
            isSelected
              ? 'bg-app-brand-solid text-app-background shadow-sm'
              : 'text-app-text-secondary hover:bg-app-interactive-hover hover:text-app-text'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      );
    })}
  </div>
);

const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
}> = ({ icon, title, description, children, danger = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = React.useId();

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        danger
          ? 'border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/5'
          : 'border-[#e5e5e5] bg-white dark:border-app-border dark:bg-app-surface'
      }`}
    >
      <button
        type="button"
        data-haptic="selection"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors ${
          danger
            ? 'bg-red-50 hover:bg-red-100/70 dark:bg-red-500/10 dark:hover:bg-red-500/15'
            : 'bg-[#fafafa] hover:bg-[#f4f4f4] dark:bg-app-surface dark:hover:bg-app-surface-raised'
        } ${isOpen ? 'border-b border-[#e5e5e5] dark:border-app-border' : ''}`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <span className={`truncate text-sm font-semibold ${danger ? 'text-red-700 dark:text-red-300' : 'text-[#0d0d12] dark:text-app-text'}`}>
              {title}
            </span>
          </div>
          <div className={`mt-1 text-xs ${danger ? 'text-red-600/80 dark:text-red-300/75' : 'text-[#666d80] dark:text-app-text-secondary'}`}>
            {description}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          } ${danger ? 'text-red-600 dark:text-red-300' : 'text-[#666d80] dark:text-app-text-secondary'}`}
        />
      </button>
      {isOpen ? <div id={contentId}>{children}</div> : null}
    </div>
  );
};

const OpenButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    data-haptic="selection"
    onClick={onClick}
    className="inline-flex items-center gap-1 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
  >
    <span>{TEXT.open}</span>
    <ChevronLeft className="h-4 w-4" />
  </button>
);

type NotificationPermissionState = NotificationPermission | 'unsupported';

const getNotificationPermissionState = (): NotificationPermissionState => {
  if (!canUseBrowserNotifications()) return 'unsupported';
  return Notification.permission;
};

const getNotificationPermissionLabel = (permission: NotificationPermissionState) => {
  if (permission === 'granted') return TEXT.notificationsAllowed;
  if (permission === 'denied') return TEXT.notificationsBlocked;
  if (permission === 'unsupported') return TEXT.notificationsUnsupported;
  return TEXT.notificationsDefault;
};

const getDeliveryPushStatusLabel = (status: DeliveryPushStatus | null) => {
  if (status === 'subscribed') return TEXT.realPushSubscribed;
  if (status === 'ready') return TEXT.realPushReady;
  if (status === 'permission-needed') return TEXT.realPushNeedsPermission;
  if (status === 'permission-denied') return TEXT.notificationsBlocked;
  if (status === 'not-configured') return TEXT.realPushNotConfigured;
  if (status === 'unsupported') return TEXT.realPushUnsupported;
  if (status === 'error') return TEXT.realPushError;
  return TEXT.notificationsDefault;
};

export const SettingsPage: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { themeMode, setThemeMode } = useTheme();
  const { state, dispatch, resetSystem, toggleSystem } = useDelivery();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [alertPreferences, setAlertPreferencesState] = useState<AlertPreferences>(() =>
    getAlertPreferences(),
  );
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>(() => getNotificationPermissionState());
  const [deliveryPushStatus, setDeliveryPushStatus] = useState<DeliveryPushStatus | null>(null);
  const [isDeliveryPushBusy, setIsDeliveryPushBusy] = useState(false);

  useEffect(() => {
    const handlePreferencesChange = () => {
      setAlertPreferencesState(getAlertPreferences());
    };

    window.addEventListener(ALERT_PREFERENCES_EVENT, handlePreferencesChange);
    return () => window.removeEventListener(ALERT_PREFERENCES_EVENT, handlePreferencesChange);
  }, []);

  useEffect(() => {
    void getDeliveryPushStatus()
      .then((result) => setDeliveryPushStatus(result.status))
      .catch(() => setDeliveryPushStatus('error'));
  }, []);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    localStorage.removeItem('isAuthenticated');
    navigate('/login', { replace: true });
  };

  const handleResetSystem = () => {
    setIsResetDialogOpen(false);
    resetSystem();
  };

  const updateAlertPreference = <Key extends keyof AlertPreferences>(
    key: Key,
    value: AlertPreferences[Key],
  ) => {
    setAlertPreference(key, value);
    setAlertPreferencesState(getAlertPreferences());
  };

  const handleBrowserNotificationsToggle = () => {
    const nextValue = !alertPreferences.browserNotificationsEnabled;
    updateAlertPreference('browserNotificationsEnabled', nextValue);

    if (nextValue && notificationPermission === 'default') {
      void requestNotificationPermission().then(() => {
        setNotificationPermission(getNotificationPermissionState());
      });
    }
  };

  const handleRequestNotificationPermission = () => {
    void requestNotificationPermission().then(() => {
      setNotificationPermission(getNotificationPermissionState());
    });
  };

  const refreshDeliveryPushStatus = () => {
    void getDeliveryPushStatus()
      .then((result) => setDeliveryPushStatus(result.status))
      .catch(() => setDeliveryPushStatus('error'));
  };

  const handleEnableDeliveryPush = () => {
    setIsDeliveryPushBusy(true);
    void subscribeToDeliveryPushNotifications()
      .then((result) => {
        setDeliveryPushStatus(result.status);
        setNotificationPermission(getNotificationPermissionState());

        if (result.ok) {
          toast.success('פוש אמיתי חובר');
          return;
        }

        toast.error(
          result.status === 'not-configured'
            ? 'צריך להגדיר VAPID בשרת'
            : result.status === 'unsupported'
              ? 'המכשיר לא תומך בפוש Web Push'
              : 'לא הצלחנו לחבר פוש אמיתי',
        );
      })
      .catch(() => {
        setDeliveryPushStatus('error');
        toast.error('לא הצלחנו לחבר פוש אמיתי');
      })
      .finally(() => setIsDeliveryPushBusy(false));
  };

  const handleTestDeliveryPush = () => {
    setIsDeliveryPushBusy(true);
    void sendTestDeliveryPushNotification()
      .then((result) => {
        if (result.ok) {
          toast.success('פוש בדיקה נשלח');
          refreshDeliveryPushStatus();
          return;
        }

        toast.error(
          result.message === 'no_subscriptions'
            ? 'אין מכשירים רשומים לפוש'
            : 'פוש הבדיקה לא נשלח',
        );
      })
      .catch(() => toast.error('פוש הבדיקה לא נשלח'))
      .finally(() => setIsDeliveryPushBusy(false));
  };

  const handleTestSound = () => {
    unlockAlertSound();
    playNewDeliverySound({ force: true });
  };

  const handleTestHaptic = () => {
    playHaptic('success', { force: true });
  };

  const handleSelectDeliverySound = (soundId: AlertSoundId) => {
    updateAlertPreference('newDeliverySoundId', soundId);
    unlockAlertSound();
    playNewDeliverySound({ force: true });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-app-background" dir="rtl">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-3 py-3 md:px-5 md:py-5">
          <SectionCard
            icon={<Power className="h-4 w-4 text-app-brand" />}
            title={TEXT.system}
            description={TEXT.systemDescription}
          >
            <SettingRow
              icon={<Power className="h-4 w-4" />}
              title={TEXT.systemOpen}
              hint={TEXT.systemOpenHint}
              control={
                <Toggle
                  checked={state.isSystemOpen}
                  onChange={toggleSystem}
                  haptic={state.isSystemOpen ? 'warning' : 'success'}
                  ariaLabel={TEXT.systemOpen}
                />
              }
            />
            <SettingRow
              icon={<Bot className="h-4 w-4" />}
              title={TEXT.autoAssign}
              hint={TEXT.autoAssignHint}
              control={
                <Toggle
                  checked={state.autoAssignEnabled}
                  onChange={() => dispatch({ type: 'TOGGLE_AUTO_ASSIGN' })}
                  ariaLabel={TEXT.autoAssign}
                />
              }
            />
            <SettingRow
              icon={<Clock3 className="h-4 w-4" />}
              title={TEXT.timeMultiplier}
              hint={`${TEXT.timeHintPrefix}${state.timeMultiplier.toLocaleString('he-IL')}`}
              control={
                <div className="relative w-[132px]">
                  <select
                    value={state.timeMultiplier}
                    data-haptic="selection"
                    onChange={(event) =>
                      dispatch({
                        type: 'SET_TIME_MULTIPLIER',
                        payload: Number(event.currentTarget.value),
                      })
                    }
                    className="h-10 w-full appearance-none rounded-xl border border-app-border bg-[#f5f5f5] pl-8 pr-3 text-right text-xs font-semibold text-[#0d0d12] outline-none transition-colors hover:bg-[#ececec] focus:border-app-brand focus:bg-white focus:ring-2 focus:ring-app-brand/20 dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised dark:focus:bg-app-surface"
                    aria-label={TEXT.timeMultiplier}
                  >
                    {[0.5, 1, 2, 4, 8].map((speed) => (
                      <option key={speed} value={speed}>
                        x{speed.toLocaleString('he-IL')}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666d80] dark:text-app-text-secondary" />
                </div>
              }
            />
          </SectionCard>

          <SectionCard
              icon={<Package className="h-4 w-4 text-app-brand" />}
              title={TEXT.business}
              description={TEXT.businessDescription}
            >
              <SettingRow
                icon={<Package className="h-4 w-4" />}
                title={TEXT.balance}
                hint={`${TEXT.balanceHintPrefix}${state.deliveryBalance.toLocaleString('he-IL')}${TEXT.deliveriesSuffix}`}
                control={<OpenButton onClick={() => navigate('/delivery-balance')} />}
              />
              <SettingRow
                icon={<Wallet className="h-4 w-4" />}
                title="ארנק"
                hint="ניהול תשלומים והכנסות ממשלוחי סנדי פלוס."
                control={<OpenButton onClick={() => navigate('/wallet')} />}
              />
              <SettingRow
                icon={<Store className="h-4 w-4" />}
                title={TEXT.restaurants}
                hint={TEXT.restaurantsHint}
                control={<OpenButton onClick={() => navigate('/restaurants')} />}
              />
              <SettingRow
                icon={<Bike className="h-4 w-4" />}
                title={TEXT.couriersList}
                hint={TEXT.couriersListHint}
                control={<OpenButton onClick={() => navigate('/couriers')} />}
              />
          </SectionCard>

          {settingsNavGroups.map((group) => {
            const GroupIcon = settingsNavIconMap[group.icon];
            const groupItems = APP_NAV_ITEMS.filter((item) => item.section === group.section);

            return (
              <SectionCard
                key={group.section}
                icon={<GroupIcon className="h-4 w-4 text-app-brand" />}
                title={group.title}
                description={group.description}
              >
                {groupItems.map((item) => {
                  const Icon = settingsNavIconMap[item.icon];

                  return (
                    <SettingRow
                      key={item.id}
                      icon={<Icon className="h-4 w-4" />}
                      title={item.label}
                      control={<OpenButton onClick={() => navigate(item.path)} />}
                    />
                  );
                })}
              </SectionCard>
            );
          })}

          <SectionCard
              icon={<BellRing className="h-4 w-4 text-app-brand" />}
              title={TEXT.alerts}
              description={TEXT.alertsDescription}
            >
              <SettingRow
                icon={<Volume2 className="h-4 w-4" />}
                title={TEXT.newDeliverySound}
                hint={TEXT.newDeliverySoundHint}
                control={
                  <Toggle
                    checked={alertPreferences.newDeliverySoundEnabled}
                    onChange={() => {
                      const nextValue = !alertPreferences.newDeliverySoundEnabled;
                      updateAlertPreference('newDeliverySoundEnabled', nextValue);
                      if (nextValue) handleTestSound();
                    }}
                  />
                }
              />
              <SettingRow
                icon={<Volume2 className="h-4 w-4" />}
                title="בחירת צליל"
                hint="בחר איזה צליל יופעל כשנכנס משלוח חדש."
                control={
                  <SoundPicker
                    selectedSoundId={alertPreferences.newDeliverySoundId}
                    onSelect={handleSelectDeliverySound}
                  />
                }
              />
              <SettingRow
                icon={<BellRing className="h-4 w-4" />}
                title={TEXT.browserNotifications}
                hint={TEXT.browserNotificationsHint}
                control={
                  <Toggle
                    checked={alertPreferences.browserNotificationsEnabled}
                    onChange={handleBrowserNotificationsToggle}
                  />
                }
              />
              <SettingRow
                icon={<BellRing className="h-4 w-4" />}
                title={TEXT.notificationPermission}
                hint={TEXT.notificationPermissionHint}
                control={
                  notificationPermission === 'default' ? (
                    <button
                      type="button"
                      data-haptic="selection"
                      onClick={handleRequestNotificationPermission}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
                    >
                      <BellRing className="h-4 w-4" />
                      <span>{TEXT.enableNotifications}</span>
                    </button>
                  ) : (
                    <span className="rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#666d80] dark:bg-app-surface dark:text-app-text-secondary">
                      {getNotificationPermissionLabel(notificationPermission)}
                    </span>
                  )
                }
              />
              <SettingRow
                icon={<BellRing className="h-4 w-4" />}
                title={TEXT.realPush}
                hint={TEXT.realPushHint}
                control={
                  <div className="flex items-center gap-2">
                    <span className="hidden rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#666d80] dark:bg-app-surface dark:text-app-text-secondary sm:inline-flex">
                      {getDeliveryPushStatusLabel(deliveryPushStatus)}
                    </span>
                    <button
                      type="button"
                      data-haptic="selection"
                      onClick={handleEnableDeliveryPush}
                      disabled={isDeliveryPushBusy}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] disabled:cursor-wait disabled:opacity-60 dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
                    >
                      <BellRing className="h-4 w-4" />
                      <span>{TEXT.enableRealPush}</span>
                    </button>
                    <button
                      type="button"
                      data-haptic="success"
                      onClick={handleTestDeliveryPush}
                      disabled={isDeliveryPushBusy || deliveryPushStatus !== 'subscribed'}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
                    >
                      <span>{TEXT.testRealPush}</span>
                    </button>
                  </div>
                }
              />
              <SettingRow
                icon={<Volume2 className="h-4 w-4" />}
                title={TEXT.testSound}
                control={
                  <button
                    type="button"
                    data-haptic="light"
                    onClick={handleTestSound}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
                  >
                    <Volume2 className="h-4 w-4" />
                    <span>{TEXT.playSound}</span>
                  </button>
                }
              />
          </SectionCard>

          <SectionCard
              icon={<Palette className="h-4 w-4 text-app-brand" />}
              title={TEXT.personal}
              description={TEXT.personalDescription}
            >
              <SettingRow
                icon={
                  themeMode === 'dark' ? (
                    <Moon className="h-4 w-4" />
                  ) : themeMode === 'twilight' ? (
                    <Sunset className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )
                }
                title={TEXT.themeMode}
                hint={TEXT.themeModeHint}
                control={<ThemeModePicker value={themeMode} onChange={setThemeMode} />}
              />
              <SettingRow
                icon={<Zap className="h-4 w-4" />}
                title={TEXT.hapticFeedback}
                hint={TEXT.hapticFeedbackHint}
                control={
                  <Toggle
                    checked={alertPreferences.hapticFeedbackEnabled}
                    onChange={() => {
                      const nextValue = !alertPreferences.hapticFeedbackEnabled;
                      updateAlertPreference('hapticFeedbackEnabled', nextValue);
                      if (nextValue) handleTestHaptic();
                    }}
                  />
                }
              />
              <SettingRow
                icon={<Zap className="h-4 w-4" />}
                title={TEXT.newDeliveryHaptic}
                hint={TEXT.newDeliveryHapticHint}
                control={
                  <Toggle
                    checked={alertPreferences.newDeliveryHapticEnabled}
                    onChange={() => {
                      const nextValue = !alertPreferences.newDeliveryHapticEnabled;
                      updateAlertPreference('newDeliveryHapticEnabled', nextValue);
                      if (nextValue) handleTestHaptic();
                    }}
                  />
                }
              />
              <SettingRow
                icon={<Zap className="h-4 w-4" />}
                title={TEXT.testHaptic}
                control={
                  <button
                    type="button"
                    data-haptic="success"
                    onClick={handleTestHaptic}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
                  >
                    <Zap className="h-4 w-4" />
                    <span>{TEXT.playHaptic}</span>
                  </button>
                }
              />
          </SectionCard>

          <SectionCard
            icon={<LogOut className="h-4 w-4 text-app-brand" />}
            title={TEXT.advanced}
            description={TEXT.advancedDescription}
          >
            <SettingRow
              icon={<LogOut className="h-4 w-4" />}
              title={TEXT.logout}
              hint={TEXT.logoutHint}
              control={
                <button
                  type="button"
                  data-haptic="selection"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{TEXT.logoutShort}</span>
                </button>
              }
            />
            <SettingRow
              icon={<AlertTriangle className="h-4 w-4" />}
              title={TEXT.reset}
              hint={TEXT.resetHint}
              danger
              control={
                <button
                  type="button"
                  data-haptic="warning"
                  onClick={() => setIsResetDialogOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{TEXT.resetShort}</span>
                </button>
              }
            />
          </SectionCard>
        </div>
      </div>

      {isResetDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-system-title"
            className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-xl dark:border-red-500/30 dark:bg-app-surface"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 id="reset-system-title" className="text-base font-bold text-[#0d0d12] dark:text-app-text">
                  {TEXT.resetConfirm}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#666d80] dark:text-app-text-secondary">
                  {TEXT.resetConfirmBody}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResetDialogOpen(false)}
                className="rounded-xl bg-[#f5f5f5] px-4 py-2 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-[#262626] dark:text-app-text dark:hover:bg-[#333]"
              >
                {TEXT.resetCancel}
              </button>
              <button
                type="button"
                onClick={handleResetSystem}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{TEXT.resetConfirmAction}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
