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
  Trash2,
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
import type { DeliveryState } from '../types/delivery.types';
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
import { playHaptic } from '../utils/haptics';
import {
  clearAuthSession,
  readAuthSession,
  updateAuthSessionUser,
  updateAuthSessionWorkspace,
  type AuthSession,
  type AuthWorkspaceMember,
  type WorkspaceRole,
} from '../auth/auth-session';
import {
  deleteCurrentWorkspaceAccount,
  TLV_RUNNERS_WORKSPACE_ID,
} from '../workspaces/workspace-registry';

const TEXT = {
  title: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea',
  subtitle: '\u05d7\u05dc\u05d5\u05e7\u05d4 \u05dc\u05e4\u05d9 \u05ea\u05e4\u05e2\u05d5\u05dc, \u05de\u05de\u05e9\u05e7 \u05d5\u05e2\u05de\u05d5\u05d3\u05d9\u05dd \u05e0\u05e4\u05e8\u05d3\u05d9\u05dd',
  open: '\u05e4\u05ea\u05d7',
  operations: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05ea\u05e4\u05e2\u05d5\u05dc',
  operationsDescription: '\u05e8\u05d9\u05db\u05d5\u05d6 \u05db\u05dc \u05d4\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05e9\u05e7\u05d5\u05d1\u05e2\u05d5\u05ea \u05d0\u05d9\u05da \u05d4\u05e2\u05e1\u05e7 \u05e2\u05d5\u05d1\u05d3 \u05d1\u05e9\u05d8\u05d7: \u05e9\u05e2\u05d5\u05ea, \u05d0\u05d6\u05d5\u05e8\u05d9\u05dd \u05d5\u05ea\u05de\u05d7\u05d5\u05e8.',
  system: '\u05d4\u05de\u05e2\u05e8\u05db\u05ea',
  systemDescription: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05e9\u05de\u05db\u05ea\u05d9\u05d1\u05d5\u05ea \u05d0\u05d9\u05da \u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05db\u05d5\u05dc\u05d4 \u05e2\u05d5\u05d1\u05d3\u05ea \u05d1\u05d6\u05de\u05df \u05d0\u05de\u05ea.',
  systemOpen: '\u05de\u05e2\u05e8\u05db\u05ea \u05d3\u05dc\u05d5\u05e7\u05d4',
  systemOpenHint: '\u05db\u05d9\u05d1\u05d5\u05d9 \u05d6\u05de\u05d9\u05df \u05e8\u05e7 \u05db\u05e9\u05d0\u05d9\u05df \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05e4\u05e2\u05d9\u05dc\u05d9\u05dd, \u05d5\u05de\u05db\u05d1\u05d4 \u05d0\u05ea \u05db\u05dc \u05de\u05e6\u05d1\u05d9 \u05d4\u05ea\u05e4\u05e2\u05d5\u05dc.',
  deliveryIntake: '\u05e7\u05d1\u05dc\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
  deliveryIntakeHint: '\u05e9\u05dc\u05d9\u05d8\u05d4 \u05d1\u05db\u05e0\u05d9\u05e1\u05ea \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd \u05d7\u05d3\u05e9\u05d9\u05dd \u05db\u05e9\u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05d3\u05dc\u05d5\u05e7\u05d4.',
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
  sounds: 'צלילים',
  soundsDescription: 'הפעלת צלילים, בחירת צליל ובדיקת צליל למשלוחים חדשים.',
  soundChoice: 'בחירת צליל',
  soundChoiceHint: 'בחר איזה צליל יופעל כשנכנס משלוח חדש.',
  haptics: 'רטטים',
  hapticsDescription: 'כל רטטי הממשק והרטטים של משלוח חדש במקום אחד.',
  pushNotifications: 'התראות Push',
  pushNotificationsDescription: 'הרשאות והתראות דפדפן למשלוחים חדשים.',
  newDeliverySound: 'צליל משלוח חדש',
  newDeliverySoundHint: 'השמעת צליל קצר בכל משלוח חדש.',
  hapticFeedback: 'הפטיק בממשק',
  hapticFeedbackHint: 'רטט קצר בלחיצה על כפתורים ופקדים תומכים.',
  newDeliveryHaptic: 'רטט למשלוח חדש',
  newDeliveryHapticHint: 'ניסיון להפעיל רטט/הפטיק בכל משלוח חדש.',
  newDeliveryBanner: 'באנרים למשלוחים חדשים',
  newDeliveryBannerHint: 'הצגת באנר פנימי כשנכנס משלוח חדש לאפליקציה.',
  browserNotifications: 'התראות דפדפן',
  browserNotificationsHint: 'התראות מערכת כשהאפליקציה אינה בפוקוס. כשהיא פתוחה נשתמש בהתראה פנימית.',
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
  appearance: 'תצוגה',
  appearanceDescription: 'העדפות תצוגה שמשפיעות על סביבת העבודה האישית.',
  account: 'חשבון וחברה',
  accountDescription: 'פעולות שמשפיעות על החשבון הנוכחי וחברת המשלוחים המחוברת אליו.',
  advanced: '\u05de\u05ea\u05e7\u05d3\u05dd',
  advancedDescription: '\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05de\u05e2\u05e8\u05db\u05ea \u05e8\u05d2\u05d9\u05e9\u05d5\u05ea. \u05de\u05d5\u05de\u05dc\u05e5 \u05dc\u05d2\u05e2\u05ea \u05d1\u05d4\u05df \u05e8\u05e7 \u05db\u05e9\u05d1\u05d0\u05de\u05ea \u05e6\u05e8\u05d9\u05da.',
  logout: '\u05d4\u05ea\u05e0\u05ea\u05e7\u05d5\u05ea',
  logoutHint: '\u05d9\u05e6\u05d9\u05d0\u05d4 \u05de\u05d4\u05d7\u05e9\u05d1\u05d5\u05df \u05d5\u05d7\u05d6\u05e8\u05d4 \u05dc\u05de\u05e1\u05da \u05d4\u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea.',
  logoutShort: '\u05d4\u05ea\u05e0\u05ea\u05e7',
  deleteAccount: 'מחיקת חשבון',
  deleteAccountHint: 'מחיקת חברת המשלוחים והמספר שמחובר אליה. אחרי המחיקה אפשר להשתמש במספר שוב.',
  deleteAccountShort: 'מחק חשבון',
  deleteAccountDemoUnavailable: 'לא ניתן למחוק את חשבון הדמו הקבוע.',
  deleteAccountConfirm: 'למחוק את החשבון הזה?',
  deleteAccountConfirmBody: 'הפעולה תמחק את חברת המשלוחים, תשחרר את מספר הטלפון להרשמה חדשה ותוציא אותך מהמערכת. אי אפשר לשחזר את החשבון מתוך הדמו.',
  deleteAccountCancel: 'השאר חשבון',
  deleteAccountConfirmAction: 'מחק חשבון',
  reset: '\u05d0\u05d9\u05e4\u05d5\u05e1 \u05de\u05e2\u05e8\u05db\u05ea',
  resetHint: '\u05de\u05d7\u05d6\u05d9\u05e8 \u05d0\u05ea \u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05dc\u05de\u05e6\u05d1 \u05d4\u05d4\u05ea\u05d7\u05dc\u05ea\u05d9.',
  resetShort: '\u05d0\u05e4\u05e1',
  resetConfirm: '\u05dc\u05d0\u05e4\u05e1 \u05d0\u05ea \u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05db\u05d5\u05dc\u05d4?',
  resetConfirmBody: '\u05d4\u05e4\u05e2\u05d5\u05dc\u05d4 \u05ea\u05de\u05d7\u05e7 \u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd, \u05e9\u05d9\u05d1\u05d5\u05e6\u05d9\u05dd, \u05de\u05d9\u05e7\u05d5\u05de\u05d9 \u05dc\u05d9\u05d9\u05d1 \u05d5\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05ea\u05e6\u05d5\u05d2\u05ea \u05d3\u05de\u05d5. \u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea \u05d5\u05e2\u05e8\u05db\u05ea \u05e6\u05d1\u05e2\u05d9\u05dd \u05d9\u05d9\u05e9\u05d0\u05e8\u05d5.',
  resetCancel: '\u05d1\u05d9\u05d8\u05d5\u05dc',
  resetConfirmAction: '\u05d0\u05e4\u05e1 \u05e2\u05db\u05e9\u05d9\u05d5',
  timeHintPrefix: '\u05e8\u05e5 \u05db\u05e8\u05d2\u05e2 \u05e2\u05dc x',
  pages: '\u05ea\u05e4\u05e2\u05d5\u05dc \u05d5\u05e2\u05de\u05d5\u05d3\u05d9\u05dd',
  pagesDescription: 'מעברים לעמודי ניהול, כלי תפעול, ניסויים וארכיון בלי לפתוח אקורדיונים.',
  pagesHub: 'תפעול עמודים',
  pagesHubHint: 'פתח מסך בחירה עם כל עמודי התפעול, הניסויים והעמודים הישנים.',
  pagesHubDescription: 'בחר לאיזה עמוד לעבור מתוך רשימת כלי התפעול, הניסויים והארכיון.',
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
    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-3 py-2.5 last:border-b-0 sm:px-4 ${
      danger
        ? 'border-red-100 bg-red-50/70 dark:border-red-500/10 dark:bg-red-500/5'
        : 'border-[#f1f1f1] dark:border-app-border'
    }`}
  >
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-none sm:h-8 sm:w-8 ${
          danger
            ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
            : 'bg-[#f5f5f5] text-app-brand dark:bg-app-surface dark:text-app-brand'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`truncate text-sm font-semibold ${danger ? 'text-red-700 dark:text-red-300' : 'text-[#0d0d12] dark:text-app-text'}`}>
          {title}
        </div>
        {hint ? (
          <div className={`mt-0.5 truncate text-[11px] ${danger ? 'text-red-600/80 dark:text-red-300/75' : 'text-[#666d80] dark:text-app-text-secondary'}`}>
            {hint}
          </div>
        ) : null}
      </div>
    </div>
    <div className="flex min-w-0 max-w-[46vw] items-center justify-end sm:max-w-none">{control}</div>
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
    <div className="relative w-full sm:w-[180px] sm:max-w-[48vw]" dir="rtl">
      <button
        ref={triggerRef}
        type="button"
        data-haptic="selection"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex h-10 w-full items-center justify-between gap-2 rounded-none border border-app-border bg-[#f5f5f5] pl-3 pr-3 text-right text-xs font-semibold text-[#0d0d12] outline-none transition-colors hover:bg-[#ececec] focus:border-app-brand focus:bg-white focus:ring-2 focus:ring-app-brand/20 dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised dark:focus:bg-app-surface"
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
            className={`absolute overflow-hidden rounded-none border border-app-border bg-white text-right shadow-2xl dark:border-app-border dark:bg-app-surface ${
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
                    className={`mb-1 flex h-11 w-full items-center justify-between gap-3 rounded-none px-3 text-right text-sm transition-colors ${
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
}> = ({ value, onChange }) => {
  const selectedOption = themeModeOptions.find((option) => option.id === value) ?? themeModeOptions[0];
  const SelectedIcon = selectedOption.icon;

  return (
    <div className="relative w-[156px] max-w-[46vw] sm:w-[172px]" dir="rtl">
      <select
        value={value}
        data-haptic="selection"
        aria-label={TEXT.themeMode}
        onChange={(event) => onChange(event.currentTarget.value as ThemeMode)}
        className="h-10 w-full appearance-none rounded-none border border-app-border bg-[#f5f5f5] pl-8 pr-9 text-right text-xs font-semibold text-[#0d0d12] outline-none transition-colors hover:bg-[#ececec] focus:border-app-brand focus:bg-white focus:ring-2 focus:ring-app-brand/20 dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised dark:focus:bg-app-surface"
      >
        {themeModeOptions.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <SelectedIcon
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-brand"
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666d80] dark:text-app-text-secondary"
      />
    </div>
  );
};

const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
  hideHeader?: boolean;
}> = ({ icon, title, description, children, danger = false, hideHeader = false }) => (
  <section
    className={`overflow-hidden rounded-none border ${
      danger
        ? 'border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/5'
        : 'border-[#e5e5e5] bg-white dark:border-app-border dark:bg-app-surface'
    }`}
    aria-label={`${title}. ${description}`}
  >
    {!hideHeader ? (
      <div
        className={`border-b px-3 py-2 sm:px-4 ${
          danger
            ? 'border-red-100 bg-red-50/80 dark:border-red-500/15 dark:bg-red-500/10'
            : 'border-[#f1f1f1] bg-[#fafafa] dark:border-app-border dark:bg-app-surface'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="shrink-0">{icon}</div>
          <div className="min-w-0">
            <h2
              className={`truncate text-sm font-bold ${
                danger ? 'text-red-700 dark:text-red-300' : 'text-[#0d0d12] dark:text-app-text'
              }`}
            >
              {title}
            </h2>
            <p
              className={`sr-only ${
                danger ? 'text-red-600/80 dark:text-red-300/75' : 'text-[#666d80] dark:text-app-text-secondary'
              }`}
            >
              {description}
            </p>
          </div>
        </div>
      </div>
    ) : null}
    <div>{children}</div>
  </section>
);

const SettingsLinkRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint?: string;
  tag?: string;
  onClick: () => void;
}> = ({ icon, title, hint, tag, onClick }) => (
  <button
    type="button"
    data-haptic="selection"
    onClick={onClick}
    className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-[#f1f1f1] px-3 py-3 text-right transition-colors last:border-b-0 hover:bg-[#f7f7f7] dark:border-app-border dark:hover:bg-app-surface-raised sm:px-4"
  >
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-[#f5f5f5] text-app-brand dark:bg-app-surface dark:text-app-brand sm:h-9 sm:w-9">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-[#0d0d12] dark:text-app-text">
            {title}
          </span>
          {tag ? (
            <span className="shrink-0 rounded-none bg-app-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-app-brand">
              {tag}
            </span>
          ) : null}
        </div>
        {hint ? (
          <div className="mt-0.5 max-h-10 overflow-hidden text-xs leading-5 text-[#666d80] dark:text-app-text-secondary">
            {hint}
          </div>
        ) : null}
      </div>
    </div>
    <ChevronLeft className="h-4 w-4 shrink-0 text-[#666d80] dark:text-app-text-secondary" />
  </button>
);

const SettingsActionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon, title, description, onClick }) => (
  <button
    type="button"
    data-haptic="selection"
    onClick={onClick}
    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[#e5e5e5] bg-white px-3 py-2.5 text-right transition-colors hover:bg-[#f7f7f7] dark:border-app-border dark:bg-app-surface dark:hover:bg-app-surface-raised sm:px-4"
  >
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-bold text-[#0d0d12] dark:text-app-text">
          {title}
        </h2>
        <p className="mt-0.5 truncate text-[11px] text-[#666d80] dark:text-app-text-secondary">
          {description}
        </p>
      </div>
    </div>
    <ChevronLeft className="h-4 w-4 shrink-0 text-[#666d80] dark:text-app-text-secondary" />
  </button>
);

const SettingsLinkGroup: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="border-b border-[#f1f1f1] last:border-b-0 dark:border-app-border">
    <div className="px-3 pb-2 pt-3 sm:px-4">
      <h3 className="text-xs font-bold text-[#0d0d12] dark:text-app-text">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-[#666d80] dark:text-app-text-secondary">
        {description}
      </p>
    </div>
    <div>{children}</div>
  </div>
);

const formatPhone = (value: string) => {
  const normalized = value.replace(/\D/g, '');
  if (!normalized) return '';

  return normalized.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
};

const normalizePhoneValue = (value: string) => value.replace(/\D/g, '');
const normalizeRegistrationNumber = (value: string) => value.replace(/\D/g, '');

const workspaceRoleOptions: Array<{ id: WorkspaceRole; label: string }> = [
  { id: 'owner', label: 'בעלים' },
  { id: 'admin', label: 'מנהל' },
  { id: 'dispatcher', label: 'מוקדן' },
  { id: 'viewer', label: 'צופה' },
];

const getSessionWorkspaceRole = (session: AuthSession | null): WorkspaceRole => {
  if (!session) return 'dispatcher';

  const memberRole = session.workspace?.members?.find(
    (member) => member.userId === session.user.id,
  )?.role;
  if (memberRole) return memberRole;

  if (
    session.workspace?.ownerUserId === session.user.id ||
    session.workspace?.id === TLV_RUNNERS_WORKSPACE_ID
  ) {
    return 'owner';
  }

  return 'dispatcher';
};

type AccountFormState = {
  companyName: string;
  companyPhone: string;
  companyRegistrationNumber: string;
  userName: string;
  userPhone: string;
  userRole: WorkspaceRole;
};

const createAccountFormState = (
  session: AuthSession | null,
  state: DeliveryState,
): AccountFormState => ({
  companyName: session?.workspace?.name ?? state.workspaceName ?? '',
  companyPhone: session?.workspace?.phone ?? state.workspacePhone ?? session?.user.phone ?? '',
  companyRegistrationNumber:
    session?.workspace?.registrationNumber ?? state.workspaceRegistrationNumber ?? '',
  userName: session?.user.name ?? '',
  userPhone: session?.user.phone ?? '',
  userRole: getSessionWorkspaceRole(session),
});

const createCurrentUserWorkspaceMembers = ({
  role,
  session,
  userName,
  userPhone,
}: {
  role: WorkspaceRole;
  session: AuthSession;
  userName: string;
  userPhone: string;
}): AuthWorkspaceMember[] => {
  const existingMembers = session.workspace?.members ?? [];
  const existingMember = existingMembers.find((member) => member.userId === session.user.id);
  const nextMember: AuthWorkspaceMember = {
    joinedAt: existingMember?.joinedAt ?? session.createdAt,
    name: userName,
    phone: userPhone,
    role,
    userId: session.user.id,
  };

  return [
    ...existingMembers.filter((member) => member.userId !== session.user.id),
    nextMember,
  ];
};

const AccountTextField: React.FC<{
  dir?: 'ltr' | 'rtl';
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  onChange: (value: string) => void;
  value: string;
}> = ({ dir = 'rtl', inputMode, label, onChange, value }) => (
  <label className="block min-w-0">
    <span className="mb-1.5 block text-xs font-semibold text-[#666d80] dark:text-app-text-secondary">
      {label}
    </span>
    <input
      value={value}
      dir={dir}
      inputMode={inputMode}
      onChange={(event) => onChange(event.currentTarget.value)}
      className="h-10 w-full rounded-none border border-app-border bg-[#f5f5f5] px-3 text-sm font-semibold text-[#0d0d12] outline-none transition-colors placeholder:text-[#8a8f98] focus:border-app-brand focus:bg-white focus:ring-2 focus:ring-app-brand/20 dark:bg-app-surface dark:text-app-text dark:placeholder:text-app-text-muted dark:focus:bg-app-surface"
    />
  </label>
);

const AccountSettingsPanel: React.FC<{
  form: AccountFormState;
  onChange: <Key extends keyof AccountFormState>(key: Key, value: AccountFormState[Key]) => void;
  onSave: () => void;
}> = ({ form, onChange, onSave }) => (
  <SectionCard
    icon={<Users className="h-4 w-4 text-app-brand" />}
    title={TEXT.account}
    description={TEXT.accountDescription}
  >
    <div className="border-b border-[#f1f1f1] px-3 py-3 dark:border-app-border sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-[#f5f5f5] text-app-brand dark:bg-app-surface">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-[#0d0d12] dark:text-app-text">
            המשתמש שלי
          </h2>
          <p className="mt-0.5 truncate text-xs text-[#666d80] dark:text-app-text-secondary">
            השם שמופיע בדשבורד, טלפון המשתמש והתפקיד שלו במערכת.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <AccountTextField
          label="שם משתמש"
          value={form.userName}
          onChange={(value) => onChange('userName', value)}
        />
        <AccountTextField
          dir="ltr"
          inputMode="tel"
          label="טלפון משתמש"
          value={form.userPhone}
          onChange={(value) => onChange('userPhone', value)}
        />
        <label className="block min-w-0">
          <span className="mb-1.5 block text-xs font-semibold text-[#666d80] dark:text-app-text-secondary">
            תפקיד
          </span>
          <div className="relative">
            <select
              value={form.userRole}
              data-haptic="selection"
              onChange={(event) => onChange('userRole', event.currentTarget.value as WorkspaceRole)}
              className="h-10 w-full appearance-none rounded-none border border-app-border bg-[#f5f5f5] pl-8 pr-3 text-right text-sm font-semibold text-[#0d0d12] outline-none transition-colors focus:border-app-brand focus:bg-white focus:ring-2 focus:ring-app-brand/20 dark:bg-app-surface dark:text-app-text dark:focus:bg-app-surface"
            >
              {workspaceRoleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666d80] dark:text-app-text-secondary" />
          </div>
        </label>
      </div>
    </div>

    <div className="px-3 py-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-[#f5f5f5] text-app-brand dark:bg-app-surface">
          <Store className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-[#0d0d12] dark:text-app-text">
            חברת המשלוחים
          </h2>
          <p className="mt-0.5 truncate text-xs text-[#666d80] dark:text-app-text-secondary">
            פרטי העסק: שם החברה, ח.פ וטלפון עסקי.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <AccountTextField
          label="שם חברת המשלוחים"
          value={form.companyName}
          onChange={(value) => onChange('companyName', value)}
        />
        <AccountTextField
          dir="ltr"
          inputMode="numeric"
          label="ח.פ"
          value={form.companyRegistrationNumber}
          onChange={(value) => onChange('companyRegistrationNumber', value)}
        />
        <AccountTextField
          dir="ltr"
          inputMode="tel"
          label="טלפון עסק"
          value={form.companyPhone}
          onChange={(value) => onChange('companyPhone', value)}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          data-haptic="success"
          onClick={onSave}
          className="inline-flex h-10 items-center gap-2 rounded-none bg-[#0d0d12] px-4 text-sm font-bold text-white transition-colors hover:bg-[#2b2d33] focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 dark:bg-app-brand-solid dark:text-app-background dark:hover:bg-app-brand"
        >
          <Check className="h-4 w-4" />
          <span>שמור פרטים</span>
        </button>
      </div>
    </div>
  </SectionCard>
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

type SettingsCategory = 'system' | 'display' | 'audio' | 'haptics' | 'notifications' | 'advanced';

export const SettingsPagesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-app-background" dir="rtl">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-2.5 py-3 sm:px-3 md:px-5 md:py-5">
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
                    <SettingsLinkRow
                      key={item.id}
                      icon={<Icon className="h-4 w-4" />}
                      title={item.label}
                      tag={item.tag === 'beta' ? 'בטא' : undefined}
                      onClick={() => navigate(item.path)}
                    />
                  );
                })}
              </SectionCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const SettingsPage: React.FC<{ onLogout?: () => void; category?: SettingsCategory }> = ({
  onLogout,
  category,
}) => {
  const navigate = useNavigate();
  const { themeMode, setThemeMode } = useTheme();
  const { state, dispatch, resetSystem, toggleSystem } = useDelivery();
  const hasCouriersForOperations = state.couriers.length > 0;
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [alertPreferences, setAlertPreferencesState] = useState<AlertPreferences>(() =>
    getAlertPreferences(),
  );
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>(() => getNotificationPermissionState());
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => readAuthSession());
  const [accountForm, setAccountForm] = useState<AccountFormState>(() =>
    createAccountFormState(readAuthSession(), state),
  );
  const currentSession = authSession;
  const isDemoAccount = currentSession?.workspace?.id === TLV_RUNNERS_WORKSPACE_ID;
  const currentPhone = currentSession?.user.phone ?? state.workspacePhone ?? '';

  useEffect(() => {
    setAccountForm(createAccountFormState(authSession, state));
  }, [
    authSession,
    state.workspaceName,
    state.workspacePhone,
    state.workspaceRegistrationNumber,
  ]);

  useEffect(() => {
    const handlePreferencesChange = () => {
      setAlertPreferencesState(getAlertPreferences());
    };

    window.addEventListener(ALERT_PREFERENCES_EVENT, handlePreferencesChange);
    return () => window.removeEventListener(ALERT_PREFERENCES_EVENT, handlePreferencesChange);
  }, []);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    clearAuthSession();
    navigate('/login', { replace: true });
  };

  const handleResetSystem = () => {
    setIsResetDialogOpen(false);
    resetSystem();
  };

  const handleDeleteAccount = () => {
    const result = deleteCurrentWorkspaceAccount();
    setIsDeleteAccountDialogOpen(false);

    if (!result.ok) {
      toast.error(
        result.reason === 'demo'
          ? TEXT.deleteAccountDemoUnavailable
          : 'לא הצלחנו למחוק את החשבון הנוכחי',
      );
      return;
    }

    toast.success('החשבון נמחק והמספר שוחרר להרשמה חדשה');
    navigate('/login', { replace: true });
  };

  const handleAccountFormChange = <Key extends keyof AccountFormState>(
    key: Key,
    value: AccountFormState[Key],
  ) => {
    setAccountForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSaveAccountSettings = () => {
    const session = authSession ?? readAuthSession();
    if (!session) {
      toast.error('צריך להתחבר מחדש כדי לערוך פרטי פרופיל.');
      return;
    }

    const userName = accountForm.userName.trim();
    const userPhone = normalizePhoneValue(accountForm.userPhone);
    const companyName = accountForm.companyName.trim();
    const companyPhone = normalizePhoneValue(accountForm.companyPhone);
    const companyRegistrationNumber = normalizeRegistrationNumber(
      accountForm.companyRegistrationNumber,
    );

    if (userName.length < 2) {
      toast.error('צריך להזין שם משתמש מלא.');
      return;
    }

    if (userPhone.length < 9) {
      toast.error('צריך להזין טלפון משתמש תקין.');
      return;
    }

    if (companyName.length < 2) {
      toast.error('צריך להזין שם חברת משלוחים.');
      return;
    }

    if (companyPhone.length < 9) {
      toast.error('צריך להזין טלפון עסק תקין.');
      return;
    }

    if (companyRegistrationNumber && companyRegistrationNumber.length !== 9) {
      toast.error('ח.פ צריך להיות בן 9 ספרות.');
      return;
    }

    const nextUserSession = updateAuthSessionUser({
      name: userName,
      phone: userPhone,
    });
    if (!nextUserSession) {
      toast.error('מספר הטלפון הזה כבר מחובר לחשבון אחר.');
      return;
    }

    const nextMembers = nextUserSession.workspace
      ? createCurrentUserWorkspaceMembers({
          role: accountForm.userRole,
          session: nextUserSession,
          userName,
          userPhone,
        })
      : undefined;

    const nextWorkspaceSession = updateAuthSessionWorkspace({
      members: nextMembers,
      name: companyName,
      ownerUserId:
        accountForm.userRole === 'owner'
          ? nextUserSession.user.id
          : nextUserSession.workspace?.ownerUserId,
      phone: companyPhone,
      registrationNumber: companyRegistrationNumber || undefined,
    });
    const nextSession = nextWorkspaceSession ?? nextUserSession;

    dispatch({
      type: 'UPDATE_WORKSPACE_DETAILS',
      payload: {
        workspaceName: companyName,
        workspacePhone: companyPhone,
        workspaceRegistrationNumber: companyRegistrationNumber || undefined,
      },
    });
    setAuthSession(nextSession);
    setAccountForm(
      createAccountFormState(nextSession, {
        ...state,
        workspaceName: companyName,
        workspacePhone: companyPhone,
        workspaceRegistrationNumber: companyRegistrationNumber || undefined,
      }),
    );
    toast.success('פרטי המשתמש והחברה נשמרו.');
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
        <div className="mx-auto w-full max-w-5xl px-2.5 py-3 sm:px-3 md:px-5 md:py-5">
          <div className="flex flex-col gap-3">
            {!category ? (
              <main className="flex min-w-0 flex-col gap-3">
                <AccountSettingsPanel
                  form={accountForm}
                  onChange={handleAccountFormChange}
                  onSave={handleSaveAccountSettings}
                />
                <div
                  className="overflow-hidden rounded-none border border-[#e5e5e5] bg-white dark:border-app-border dark:bg-app-surface"
                  aria-label="מעברים להגדרות"
                >
                  <SettingsLinkRow
                    icon={<Power className="h-4 w-4" />}
                    title="הגדרות מערכת"
                    hint={TEXT.systemDescription}
                    onClick={() => navigate('/settings/system')}
                  />
                  <SettingsLinkRow
                    icon={<Palette className="h-4 w-4" />}
                    title={TEXT.appearance}
                    hint={TEXT.appearanceDescription}
                    onClick={() => navigate('/settings/display')}
                  />
                  <SettingsLinkRow
                    icon={<Volume2 className="h-4 w-4" />}
                    title="צלילים"
                    hint={TEXT.soundsDescription}
                    onClick={() => navigate('/settings/audio')}
                  />
                  <SettingsLinkRow
                    icon={<Zap className="h-4 w-4" />}
                    title={TEXT.haptics}
                    hint={TEXT.hapticsDescription}
                    onClick={() => navigate('/settings/haptics')}
                  />
                  <SettingsLinkRow
                    icon={<BellRing className="h-4 w-4" />}
                    title="התראות"
                    hint={TEXT.pushNotificationsDescription}
                    onClick={() => navigate('/settings/notifications')}
                  />
                  <SettingsLinkRow
                    icon={<SlidersHorizontal className="h-4 w-4" />}
                    title={TEXT.pagesHub}
                    hint={TEXT.pagesHubHint}
                    onClick={() => navigate('/settings/pages')}
                  />
                  <SettingsLinkRow
                    icon={<AlertTriangle className="h-4 w-4" />}
                    title="הגדרות מתקדמות"
                    hint="מחיקת חשבון ואיפוס חשבון."
                    onClick={() => navigate('/settings/advanced')}
                  />
                  <SettingsLinkRow
                    icon={<LogOut className="h-4 w-4" />}
                    title={TEXT.logout}
                    hint={TEXT.logoutHint}
                    onClick={handleLogout}
                  />
                </div>
              </main>
            ) : null}
            {category ? (
            <main className="flex min-w-0 flex-col gap-3">
              {category === 'system' ? (
              <SectionCard
                icon={<Power className="h-4 w-4 text-app-brand" />}
                title={TEXT.system}
                description={TEXT.systemDescription}
                hideHeader
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
                  icon={<Package className="h-4 w-4" />}
                  title={TEXT.deliveryIntake}
                  hint={TEXT.deliveryIntakeHint}
                  control={
                    <Toggle
                      checked={state.isReceivingDeliveries}
                      disabled={!state.isSystemOpen}
                      onChange={() => dispatch({ type: 'TOGGLE_DELIVERY_INTAKE' })}
                      ariaLabel={TEXT.deliveryIntake}
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
                      disabled={!state.isSystemOpen || !hasCouriersForOperations}
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
                        className="h-10 w-full appearance-none rounded-none border border-app-border bg-[#f5f5f5] pl-8 pr-3 text-right text-xs font-semibold text-[#0d0d12] outline-none transition-colors hover:bg-[#ececec] focus:border-app-brand focus:bg-white focus:ring-2 focus:ring-app-brand/20 dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised dark:focus:bg-app-surface"
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
              ) : null}

          {category === 'display' ? (
          <SectionCard
            icon={<Palette className="h-4 w-4 text-app-brand" />}
            title={TEXT.appearance}
            description={TEXT.appearanceDescription}
            hideHeader
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
          </SectionCard>
          ) : null}

          {category === 'audio' ? (
          <SectionCard
            icon={<Volume2 className="h-4 w-4 text-app-brand" />}
            title={TEXT.sounds}
            description={TEXT.soundsDescription}
            hideHeader
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
              title={TEXT.soundChoice}
              hint={TEXT.soundChoiceHint}
              control={
                <SoundPicker
                  selectedSoundId={alertPreferences.newDeliverySoundId}
                  onSelect={handleSelectDeliverySound}
                />
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
                  className="inline-flex h-9 items-center gap-2 rounded-none bg-[#f5f5f5] px-3 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>{TEXT.playSound}</span>
                </button>
              }
            />
          </SectionCard>
          ) : null}

          {category === 'haptics' ? (
          <SectionCard
            icon={<Zap className="h-4 w-4 text-app-brand" />}
            title={TEXT.haptics}
            description={TEXT.hapticsDescription}
            hideHeader
          >
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
                  className="inline-flex h-9 items-center gap-2 rounded-none bg-[#f5f5f5] px-3 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
                >
                  <Zap className="h-4 w-4" />
                  <span>{TEXT.playHaptic}</span>
                </button>
              }
            />
          </SectionCard>
          ) : null}

          {category === 'notifications' ? (
          <SectionCard
            icon={<BellRing className="h-4 w-4 text-app-brand" />}
            title={TEXT.pushNotifications}
            description={TEXT.pushNotificationsDescription}
            hideHeader
          >
            <SettingRow
              icon={<BellRing className="h-4 w-4" />}
              title={TEXT.newDeliveryBanner}
              hint={TEXT.newDeliveryBannerHint}
              control={
                <Toggle
                  checked={alertPreferences.newDeliveryBannerEnabled}
                  onChange={() => {
                    updateAlertPreference(
                      'newDeliveryBannerEnabled',
                      !alertPreferences.newDeliveryBannerEnabled,
                    );
                  }}
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
                    className="inline-flex h-9 items-center gap-2 rounded-none bg-[#f5f5f5] px-3 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
                  >
                    <BellRing className="h-4 w-4" />
                    <span>{TEXT.enableNotifications}</span>
                  </button>
                ) : (
                  <span className="rounded-none bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#666d80] dark:bg-app-surface dark:text-app-text-secondary">
                    {getNotificationPermissionLabel(notificationPermission)}
                  </span>
                )
              }
            />
          </SectionCard>
          ) : null}

          {category === 'advanced' ? (
            <>
              <SectionCard
                icon={<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-300" />}
                title={TEXT.advanced}
                description={TEXT.advancedDescription}
                danger
                hideHeader
              >
                <SettingRow
                  icon={<Trash2 className="h-4 w-4" />}
                  title={TEXT.deleteAccount}
                  hint={isDemoAccount ? TEXT.deleteAccountDemoUnavailable : TEXT.deleteAccountHint}
                  danger
                  control={
                    <button
                      type="button"
                      data-haptic="warning"
                      disabled={isDemoAccount}
                      onClick={() => setIsDeleteAccountDialogOpen(true)}
                      className="inline-flex items-center gap-2 rounded-none bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 disabled:text-white/80 dark:disabled:bg-red-500/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{TEXT.deleteAccountShort}</span>
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
                      className="inline-flex items-center gap-2 rounded-none bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{TEXT.resetShort}</span>
                    </button>
                  }
                />
              </SectionCard>
            </>
          ) : null}
            </main>
            ) : null}
          </div>
        </div>
      </div>

      {isDeleteAccountDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-md rounded-none border border-red-200 bg-white p-5 shadow-xl dark:border-red-500/30 dark:bg-app-surface"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 id="delete-account-title" className="text-base font-bold text-[#0d0d12] dark:text-app-text">
                  {TEXT.deleteAccountConfirm}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#666d80] dark:text-app-text-secondary">
                  {TEXT.deleteAccountConfirmBody}
                </p>
                {currentPhone ? (
                  <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" dir="ltr">
                    {formatPhone(currentPhone)}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteAccountDialogOpen(false)}
                className="rounded-none bg-[#f5f5f5] px-4 py-2 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-[#262626] dark:text-app-text dark:hover:bg-[#333]"
              >
                {TEXT.deleteAccountCancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="inline-flex items-center gap-2 rounded-none bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                <span>{TEXT.deleteAccountConfirmAction}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isResetDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-system-title"
            className="w-full max-w-md rounded-none border border-red-200 bg-white p-5 shadow-xl dark:border-red-500/30 dark:bg-app-surface"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
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
                className="rounded-none bg-[#f5f5f5] px-4 py-2 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-[#262626] dark:text-app-text dark:hover:bg-[#333]"
              >
                {TEXT.resetCancel}
              </button>
              <button
                type="button"
                onClick={handleResetSystem}
                className="inline-flex items-center gap-2 rounded-none bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
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
