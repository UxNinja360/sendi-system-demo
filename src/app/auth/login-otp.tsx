import React, { useEffect, useRef, useState } from 'react';

interface LoginOtpProps {
  error?: string;
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

export const LoginOtp: React.FC<LoginOtpProps> = ({
  error: externalError,
  isSubmitting = false,
  onBack,
  onResend,
  onSubmit,
  phone,
}) => {
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [error, setError] = useState('');
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
    <section className="w-full max-w-[340px] text-center" dir="rtl" aria-label="אימות מספר טלפון">
      <h1 className="mb-3 text-3xl font-extrabold text-[#0d0d12] dark:text-app-text sm:text-[32px]">
        אימות מספר
      </h1>
      <p className="mb-7 text-sm font-medium text-[#666d80] dark:text-app-text-secondary">
        קוד נשלח אל <span dir="ltr">{formatPhone(phone)}</span>
      </p>

      <label className="sr-only">קוד אימות</label>
      <div className="flex justify-center gap-2" dir="ltr">
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
            className={`h-12 w-10 rounded-lg border bg-white text-center text-xl font-bold text-[#0d0d12] outline-none transition-colors focus:border-[#0d0d12] focus:ring-2 focus:ring-[#0d0d12]/10 dark:bg-[#050505] dark:text-app-text dark:focus:border-[#ededed] dark:focus:ring-[#ededed]/10 ${
              error
                ? 'animate-shake border-[#ea0b0b]'
                : 'border-[#d8d8d8] dark:border-[#252525]'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="mt-4 text-center text-sm font-medium text-[#ea0b0b]">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void handleSubmit(otpString)}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-lg bg-[#0d0d12] px-4 text-sm font-bold text-white transition-colors hover:bg-[#24242b] active:bg-[#050505] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[#ededed] dark:text-[#050505] dark:hover:bg-white dark:active:bg-[#d8d8d8]"
      >
        {isSubmitting ? 'מאמת...' : 'אמת והמשך'}
      </button>

      <div className="mt-5 flex items-center justify-center gap-4 text-sm">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleResend}
          className="font-medium text-app-brand-text hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          שלח קוד חדש
        </button>
        <span className="h-4 w-px bg-[#d8d8d8] dark:bg-[#252525]" />
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="font-medium text-[#666d80] transition-colors hover:text-[#0d0d12] disabled:cursor-not-allowed disabled:opacity-50 dark:text-app-text-secondary dark:hover:text-app-text"
        >
          ערוך מספר
        </button>
      </div>
    </section>
  );
};
