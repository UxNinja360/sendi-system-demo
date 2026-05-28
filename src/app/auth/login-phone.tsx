import React, { useState } from 'react';
import { ArrowLeft, Phone } from 'lucide-react';
import { AppLogo } from '../components/icons/app-logo';

export type LoginPhoneMode = 'login' | 'signup';

interface LoginPhoneProps {
  error?: string;
  isSubmitting?: boolean;
  mode: LoginPhoneMode;
  onModeChange: (mode: LoginPhoneMode) => void;
  onSubmit: (phone: string) => void;
}

export const LoginPhone: React.FC<LoginPhoneProps> = ({
  error,
  isSubmitting = false,
  mode,
  onModeChange,
  onSubmit,
}) => {
  const [phone, setPhone] = useState('');

  const canSubmit = phone.length === 10 && !isSubmitting;
  const isSignup = mode === 'signup';
  const title = isSignup ? 'פתיחת חברת משלוחים' : 'כניסה לסנדי';
  const subtitle = isSignup
    ? 'נפתח חשבון חדש ונחבר אותו למספר הטלפון שלך.'
    : 'הכנס את מספר הטלפון שמחובר לחברת המשלוחים שלך.';
  const label = isSignup
    ? 'מספר טלפון לחברה החדשה'
    : 'מספר טלפון של חשבון קיים';
  const helperText = isSignup
    ? 'אחרי אימות הטלפון תמשיך להרשמה קצרה של שם החברה ואזור הפעילות.'
    : 'נשלח קוד אימות רק למספר שמחובר לחברת משלוחים קיימת במערכת.';
  const submitText = isSignup ? 'שלחו לי קוד לפתיחת חברה' : 'שלחו לי קוד כניסה';
  const switchLead = isSignup ? 'כבר יש לך חשבון?' : 'עדיין אין לך חשבון?';
  const switchText = isSignup ? 'כניסה לחשבון קיים' : 'פתיחת חברת משלוחים חדשה';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit(phone);
    }
  };

  return (
    <div className="flex w-full items-center justify-center py-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-[28rem]">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-app-brand-solid shadow-lg sm:h-20 sm:w-20">
            <AppLogo size={40} className="text-app-background sm:h-12 sm:w-12" />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-[#0d0d12] dark:text-app-text sm:text-3xl">
            {title}
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-6 text-[#666d80] dark:text-app-text-secondary sm:text-base">
            {subtitle}
          </p>
        </div>

        <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-xl dark:border-app-border dark:bg-app-surface sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#0d0d12] dark:text-app-text">
                {label}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <Phone className="h-5 w-5 text-[#666d80] dark:text-app-text-secondary" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="0501234567"
                  className="w-full rounded-xl border border-[#e5e5e5] bg-[#fafafa] py-3 pl-4 pr-12 text-base text-[#0d0d12] transition-all placeholder:text-[#a3a3a3] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-app-brand dark:border-app-border dark:bg-app-surface dark:text-app-text"
                  maxLength={10}
                  dir="ltr"
                  autoComplete="tel"
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-[#666d80] dark:text-app-text-secondary">
                {helperText}
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-[#ffd0d0] bg-[#fff5f5] px-3 py-2 text-sm font-medium text-[#c00] dark:border-[#4a1f1f] dark:bg-[#2a1414] dark:text-[#ffb4b4]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-app-brand-solid px-6 py-3.5 font-bold text-app-background shadow-lg transition-all duration-200 hover:bg-app-brand-hover hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-app-brand-solid"
            >
              <span>{isSubmitting ? 'שולח קוד...' : submitText}</span>
              <ArrowLeft className="h-5 w-5" />
            </button>
          </form>
        </div>

        <div className="mt-4 text-center text-sm text-[#666d80] dark:text-app-text-secondary">
          <span>{switchLead}</span>{' '}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onModeChange(isSignup ? 'login' : 'signup')}
            className="font-bold text-app-brand-text underline-offset-4 transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {switchText}
          </button>
        </div>

        <p className="mt-5 px-2 text-center text-xs leading-5 text-[#666d80] dark:text-app-text-secondary sm:mt-6">
          בהמשך אתה מאשר את{' '}
          <a href="#" className="text-app-brand-text hover:underline">
            תנאי השימוש
          </a>{' '}
          ו-
          <a href="#" className="text-app-brand-text hover:underline">
            מדיניות הפרטיות
          </a>
        </p>
      </div>
    </div>
  );
};
