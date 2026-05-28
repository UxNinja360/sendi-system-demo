import React, { useState } from 'react';

export type LoginPhoneMode = 'login' | 'signup';

interface LoginPhoneProps {
  error?: string;
  isSubmitting?: boolean;
  mode: LoginPhoneMode;
  onSubmit: (phone: string) => void;
}

export const LoginPhone: React.FC<LoginPhoneProps> = ({
  error,
  isSubmitting = false,
  mode,
  onSubmit,
}) => {
  const [phone, setPhone] = useState('');

  const canSubmit = !isSubmitting;
  const isSignup = mode === 'signup';
  const title = isSignup ? 'הרשמה לסנדי' : 'כניסה לסנדי';
  const submitText = 'שלח קוד אימות';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length === 10 && canSubmit) {
      onSubmit(phone);
    }
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.setCustomValidity('');
    setPhone(event.target.value.replace(/\D/g, '').slice(0, 10));
  };

  const handlePhoneInvalid = (event: React.InvalidEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    input.setCustomValidity(
      input.value
        ? 'צריך להזין מספר טלפון תקין בן 10 ספרות'
        : 'צריך להזין מספר טלפון',
    );
  };

  return (
    <section className="w-full max-w-[320px] text-center" dir="rtl" aria-label={title}>
      <h1 className="mb-7 text-3xl font-extrabold text-[#0d0d12] dark:text-app-text sm:text-[32px]">
        {title}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="sr-only" htmlFor="login-phone-number">
          מספר טלפון
        </label>
        <input
          id="login-phone-number"
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          onInvalid={handlePhoneInvalid}
          placeholder="0501234567"
          className="h-12 w-full rounded-lg border border-[#d8d8d8] bg-white px-3 text-left text-sm font-medium text-[#0d0d12] outline-none transition-colors placeholder:text-[#777] hover:border-[#bdbdbd] focus:border-[#0d0d12] focus:bg-white focus:ring-2 focus:ring-[#0d0d12]/10 dark:border-[#252525] dark:bg-[#050505] dark:text-app-text dark:placeholder:text-[#777] dark:hover:border-[#3a3a3a] dark:hover:bg-[#080808] dark:focus:border-[#ededed] dark:focus:ring-[#ededed]/10"
          required
          pattern="[0-9]{10}"
          maxLength={10}
          dir="ltr"
          autoComplete="tel"
          inputMode="tel"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-[#0d0d12] px-4 text-sm font-bold text-white transition-colors hover:bg-[#24242b] active:bg-[#050505] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[#ededed] dark:text-[#050505] dark:hover:bg-white dark:active:bg-[#d8d8d8]"
        >
          {isSubmitting ? 'שולח קוד...' : submitText}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-lg border border-[#ffd0d0] bg-[#fff5f5] px-3 py-2 text-right text-sm font-medium text-[#c00] dark:border-[#4a1f1f] dark:bg-[#2a1414] dark:text-[#ffb4b4]">
          {error}
        </div>
      )}
    </section>
  );
};
