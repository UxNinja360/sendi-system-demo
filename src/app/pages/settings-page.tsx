import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BellRing,
  ChevronLeft,
  LogOut,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  Volume2,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTheme } from '../context/theme.context';
import { useDelivery } from '../context/delivery-context-value';
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

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    data-haptic="selection"
    onClick={onChange}
    className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-app-brand' : 'bg-[#d4d4d4] dark:bg-[#404040]'}`}
    aria-pressed={checked}
  >
    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-1' : 'left-6'}`} />
  </button>
);

const SoundPicker: React.FC<{
  selectedSoundId: AlertSoundId;
  onSelect: (soundId: AlertSoundId) => void;
}> = ({ selectedSoundId, onSelect }) => (
  <div className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-5" dir="rtl">
    {ALERT_SOUND_PRESETS.map((sound) => {
      const selected = sound.id === selectedSoundId;

      return (
        <button
          key={sound.id}
          type="button"
          data-haptic={selected ? 'selection' : 'light'}
          onClick={() => onSelect(sound.id)}
          className={`min-h-9 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors ${
            selected
              ? 'border-app-brand bg-app-brand/15 text-app-brand-text'
              : 'border-app-border bg-[#f5f5f5] text-[#0d0d12] hover:bg-[#ececec] dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised'
          }`}
          aria-pressed={selected}
        >
          {sound.label}
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
}> = ({ icon, title, description, children, danger = false }) => (
  <div
    className={`overflow-hidden rounded-2xl border ${
      danger
        ? 'border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/5'
        : 'border-[#e5e5e5] bg-white dark:border-app-border dark:bg-app-surface'
    }`}
  >
    <div
      className={`border-b px-4 py-3 ${
        danger
          ? 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10'
          : 'border-[#e5e5e5] bg-[#fafafa] dark:border-app-border dark:bg-app-surface'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-sm font-semibold ${danger ? 'text-red-700 dark:text-red-300' : 'text-[#0d0d12] dark:text-app-text'}`}>
          {title}
        </span>
      </div>
      <div className={`mt-1 text-xs ${danger ? 'text-red-600/80 dark:text-red-300/75' : 'text-[#666d80] dark:text-app-text-secondary'}`}>
        {description}
      </div>
    </div>
    {children}
  </div>
);

const OpenButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
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
  const { isDark, toggleDark } = useTheme();
  const { resetSystem } = useDelivery();
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
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-3 md:px-5 md:py-5">
          <SectionCard
            icon={<Palette className="h-4 w-4 text-app-brand" />}
            title={TEXT.personal}
            description={TEXT.personalDescription}
          >
            <SettingRow
              icon={isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              title={TEXT.darkMode}
              hint={TEXT.darkModeHint}
              control={<Toggle checked={isDark} onChange={() => toggleDark()} />}
            />
          </SectionCard>

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
                    onClick={handleEnableDeliveryPush}
                    disabled={isDeliveryPushBusy}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] disabled:cursor-wait disabled:opacity-60 dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
                  >
                    <BellRing className="h-4 w-4" />
                    <span>{TEXT.enableRealPush}</span>
                  </button>
                  <button
                    type="button"
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
            title={TEXT.logout}
            description={TEXT.logoutHint}
          >
            <SettingRow
              icon={<LogOut className="h-4 w-4" />}
              title={TEXT.logout}
              hint={TEXT.logoutHint}
              control={
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{TEXT.logoutShort}</span>
                </button>
              }
            />
          </SectionCard>

          <SectionCard
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            title={TEXT.reset}
            description={TEXT.resetHint}
            danger
          >
            <SettingRow
              icon={<AlertTriangle className="h-4 w-4" />}
              title={TEXT.reset}
              hint={TEXT.resetHint}
              danger
              control={
                <button
                  type="button"
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
