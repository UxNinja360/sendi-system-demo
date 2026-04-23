import React from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  Globe,
  LogOut,
  Menu,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTheme } from '../context/theme.context';
import { useLanguage } from '../context/language.context';
import { useDelivery } from '../context/delivery.context';

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
  personalDescription: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05ea\u05e6\u05d5\u05d2\u05d4 \u05d5\u05e9\u05e4\u05d4 \u05e9\u05de\u05e9\u05e4\u05d9\u05e2\u05d5\u05ea \u05e2\u05dc \u05e1\u05d1\u05d9\u05d1\u05ea \u05d4\u05e2\u05d1\u05d5\u05d3\u05d4 \u05d4\u05d0\u05d9\u05e9\u05d9\u05ea \u05e9\u05dc\u05da.',
  darkMode: '\u05de\u05e6\u05d1 \u05db\u05d4\u05d4',
  darkModeHint: '\u05de\u05e2\u05d1\u05e8 \u05d9\u05d3\u05e0\u05d9 \u05d1\u05d9\u05df \u05d1\u05d4\u05d9\u05e8 \u05dc\u05db\u05d4\u05d4.',
  autoTheme: '\u05ea\u05d1\u05e0\u05d9\u05ea \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9\u05ea',
  autoThemeHint: '\u05d4\u05ea\u05d0\u05de\u05d4 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9\u05ea \u05e9\u05dc \u05d4\u05de\u05de\u05e9\u05e7.',
  language: '\u05e9\u05e4\u05d4',
  languageHint: '\u05d1\u05d7\u05d9\u05e8\u05ea \u05e9\u05e4\u05ea \u05d4\u05de\u05de\u05e9\u05e7.',
  hebrew: '\u05e2\u05d1\u05e8\u05d9\u05ea',
  advanced: '\u05de\u05ea\u05e7\u05d3\u05dd',
  advancedDescription: '\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05de\u05e2\u05e8\u05db\u05ea \u05e8\u05d2\u05d9\u05e9\u05d5\u05ea. \u05de\u05d5\u05de\u05dc\u05e5 \u05dc\u05d2\u05e2\u05ea \u05d1\u05d4\u05df \u05e8\u05e7 \u05db\u05e9\u05d1\u05d0\u05de\u05ea \u05e6\u05e8\u05d9\u05da.',
  logout: '\u05d4\u05ea\u05e0\u05ea\u05e7\u05d5\u05ea',
  logoutHint: '\u05d9\u05e6\u05d9\u05d0\u05d4 \u05de\u05d4\u05d7\u05e9\u05d1\u05d5\u05df \u05d5\u05d7\u05d6\u05e8\u05d4 \u05dc\u05de\u05e1\u05da \u05d4\u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea.',
  logoutShort: '\u05d4\u05ea\u05e0\u05ea\u05e7',
  reset: '\u05d0\u05d9\u05e4\u05d5\u05e1 \u05de\u05e2\u05e8\u05db\u05ea',
  resetHint: '\u05de\u05d7\u05d6\u05d9\u05e8 \u05d0\u05ea \u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05dc\u05de\u05e6\u05d1 \u05d4\u05d4\u05ea\u05d7\u05dc\u05ea\u05d9.',
  resetShort: '\u05d0\u05e4\u05e1',
  resetConfirm: '\u05dc\u05d0\u05e4\u05e1 \u05d0\u05ea \u05d4\u05de\u05e2\u05e8\u05db\u05ea \u05db\u05d5\u05dc\u05d4?',
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
        : 'border-[#f1f1f1] dark:border-[#1f1f1f]'
    }`}
  >
    <div className="min-w-0 flex items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          danger
            ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
            : 'bg-[#f5f5f5] text-[#16a34a] dark:bg-[#0a0a0a] dark:text-[#9fe870]'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`text-sm font-semibold ${danger ? 'text-red-700 dark:text-red-300' : 'text-[#0d0d12] dark:text-[#fafafa]'}`}>
          {title}
        </div>
        {hint ? (
          <div className={`mt-0.5 text-xs ${danger ? 'text-red-600/80 dark:text-red-300/75' : 'text-[#666d80] dark:text-[#a3a3a3]'}`}>
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
    onClick={onChange}
    className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-[#9fe870]' : 'bg-[#d4d4d4] dark:bg-[#404040]'}`}
    aria-pressed={checked}
  >
    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-1' : 'left-6'}`} />
  </button>
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
        : 'border-[#e5e5e5] bg-white dark:border-[#1f1f1f] dark:bg-[#171717]'
    }`}
  >
    <div
      className={`border-b px-4 py-3 ${
        danger
          ? 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10'
          : 'border-[#e5e5e5] bg-[#fafafa] dark:border-[#1f1f1f] dark:bg-[#111111]'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-sm font-semibold ${danger ? 'text-red-700 dark:text-red-300' : 'text-[#0d0d12] dark:text-[#fafafa]'}`}>
          {title}
        </span>
      </div>
      <div className={`mt-1 text-xs ${danger ? 'text-red-600/80 dark:text-red-300/75' : 'text-[#666d80] dark:text-[#a3a3a3]'}`}>
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
    className="inline-flex items-center gap-1 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-[#0a0a0a] dark:text-[#fafafa] dark:hover:bg-[#151515]"
  >
    <span>{TEXT.open}</span>
    <ChevronLeft className="h-4 w-4" />
  </button>
);

export const SettingsPage: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { isDark, toggleDark } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { resetSystem } = useDelivery();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    localStorage.removeItem('isAuthenticated');
    navigate('/login', { replace: true });
  };

  const handleResetSystem = () => {
    if (!window.confirm(TEXT.resetConfirm)) return;
    resetSystem();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-white px-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (window as any).toggleMobileSidebar?.()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#525252] transition-colors hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#262626] md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">{TEXT.title}</span>
          <span className="text-[13px] text-[#737373] dark:text-[#a3a3a3]">{TEXT.subtitle}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-3 md:px-5 md:py-5">
          <SectionCard
            icon={<Palette className="h-4 w-4 text-[#16a34a] dark:text-[#9fe870]" />}
            title={TEXT.personal}
            description={TEXT.personalDescription}
          >
            <SettingRow
              icon={isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              title={TEXT.darkMode}
              hint={TEXT.darkModeHint}
              control={<Toggle checked={isDark} onChange={() => toggleDark()} />}
            />
            <SettingRow
              icon={<Globe className="h-4 w-4" />}
              title={TEXT.language}
              hint={TEXT.languageHint}
              control={
                <div className="flex items-center gap-1 rounded-xl bg-[#f5f5f5] p-1 dark:bg-[#0a0a0a]">
                  {[
                    { value: 'he', label: TEXT.hebrew },
                    { value: 'en', label: 'English' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLanguage(option.value as typeof language)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        language === option.value
                          ? 'bg-[#0d0d12] text-white dark:bg-[#fafafa] dark:text-[#0d0d12]'
                          : 'text-[#666d80] hover:bg-white dark:text-[#a3a3a3] dark:hover:bg-[#151515]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              }
            />
          </SectionCard>

          <SectionCard
            icon={<LogOut className="h-4 w-4 text-[#16a34a] dark:text-[#9fe870]" />}
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
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-[#0a0a0a] dark:text-[#fafafa] dark:hover:bg-[#151515]"
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
                  onClick={handleResetSystem}
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
    </div>
  );
};
