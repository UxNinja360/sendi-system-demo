import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AppLogo } from '../components/icons/app-logo';

interface LoginOtpProps {
  demoOtp?: string;
  error?: string;
  expiresAt?: number;
  isSubmitting?: boolean;
  onBack: () => void;
  onResend: () => void;
  onSubmit: (otp: string) => Promise<boolean>;
  phone: string;
}

const EMPTY_OTP = ['', '', '', '', '', ''];

const formatPhone = (value: string) => {
  const normalized = value.replace(/\D/g, '');
  if (!normalized) return '';

  return normalized.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
};

const formatExpiry = (expiresAt?: number) => {
  if (!expiresAt) return '';

  const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, '0');

  return `${minutes}:${remainingSeconds}`;
};

export const LoginOtp: React.FC<LoginOtpProps> = ({
  demoOtp,
  error: externalError,
  expiresAt,
  isSubmitting = false,
  onBack,
  onResend,
  onSubmit,
  phone,
}) => {
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [error, setError] = useState('');
  const [expiryLabel, setExpiryLabel] = useState(() => formatExpiry(expiresAt));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpRef = useRef(EMPTY_OTP);
  const otpString = otp.join('');
  const canSubmit = otp.every(Boolean) && !isSubmitting;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    setError(externalError || '');
  }, [externalError]);

  useEffect(() => {
    setExpiryLabel(formatExpiry(expiresAt));
    const interval = window.setInterval(() => {
      setExpiryLabel(formatExpiry(expiresAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAt]);

  const handleSubmit = async (otpString: string) => {
    if (isSubmitting) return false;

    const ok = await onSubmit(otpString);
    if (ok) return true;

    setError('קוד שגוי או פג תוקף, נסה שוב');
    otpRef.current = EMPTY_OTP;
    setOtp(EMPTY_OTP);
    inputRefs.current[0]?.focus();
    return false;
  };

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const nextOtp = [...otpRef.current];
    nextOtp[index] = value;
    otpRef.current = nextOtp;
    setOtp(nextOtp);
    setError('');

    if (value && index < nextOtp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === nextOtp.length - 1 && value) {
      void handleSubmit(nextOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');

    if (pastedData.length === 6) {
      const nextOtp = pastedData.split('');
      otpRef.current = nextOtp;
      setOtp(nextOtp);
      inputRefs.current[5]?.focus();
      window.setTimeout(() => void handleSubmit(pastedData), 100);
    }
  };

  const handleResend = () => {
    otpRef.current = EMPTY_OTP;
    setOtp(EMPTY_OTP);
    setError('');
    inputRefs.current[0]?.focus();
    onResend();
  };

  return (
    <div className="flex w-full items-center justify-center py-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-[28rem]">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-app-brand-solid shadow-lg sm:h-20 sm:w-20">
            <AppLogo size={40} className="text-app-background sm:h-12 sm:w-12" />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-[#0d0d12] dark:text-app-text sm:text-3xl">
            אימות מספר טלפון
          </h1>
          <p className="text-sm text-[#666d80] dark:text-app-text-secondary sm:text-base">
            הזן את הקוד שנשלח אל
          </p>
          <p className="mt-1 font-medium text-[#0d0d12] dark:text-app-text" dir="ltr">
            {formatPhone(phone)}
          </p>
        </div>

        <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-xl dark:border-app-border dark:bg-app-surface sm:p-7">
          <div className="space-y-5">
            {demoOtp && (
              <div className="rounded-lg border border-app-brand/35 bg-app-brand-soft px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-[#666d80] dark:text-app-text-secondary">
                    קוד בדיקה
                  </span>
                  <span className="text-2xl font-black tracking-[0.18em] text-app-brand-text" dir="ltr">
                    {demoOtp}
                  </span>
                </div>
                {expiryLabel && (
                  <div className="mt-1 text-xs text-[#666d80] dark:text-app-text-secondary">
                    תקף לעוד {expiryLabel} דקות
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#0d0d12] dark:text-app-text">
                קוד אימות
              </label>
              <div className="flex justify-center gap-2 sm:gap-3" dir="ltr">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    disabled={isSubmitting}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`h-12 w-10 rounded-lg border-2 bg-[#fafafa] text-center text-xl font-bold text-[#0d0d12] transition-all focus:outline-none focus:border-app-brand dark:bg-app-surface dark:text-app-text sm:h-14 sm:w-12 sm:text-2xl ${
                      error
                        ? 'border-[#ea0b0b] animate-shake'
                        : 'border-[#e5e5e5] dark:border-app-border'
                    }`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="animate-in fade-in text-center text-sm font-medium text-[#ea0b0b]">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit(otpString)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-app-brand-solid px-6 py-3.5 font-bold text-app-background shadow-lg transition-all duration-200 hover:bg-app-brand-hover hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-app-brand-solid"
            >
              <span>{isSubmitting ? 'מאמת...' : 'אמת והמשך'}</span>
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-center gap-4 text-sm">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleResend}
                className="text-sm font-medium text-app-brand-text hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                שלח קוד חדש
              </button>
              <span className="h-4 w-px bg-[#d8d8d8] dark:bg-app-border" />
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 font-medium text-[#666d80] transition-colors hover:text-[#0d0d12] disabled:cursor-not-allowed disabled:opacity-50 dark:text-app-text-secondary dark:hover:text-app-text"
              >
                <ArrowRight className="h-4 w-4" />
                <span>ערוך מספר</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
