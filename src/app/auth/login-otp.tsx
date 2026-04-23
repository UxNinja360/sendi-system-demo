import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppLogo } from '../components/icons/app-logo';

interface LoginOtpProps {
  phone: string;
  onSubmit: (otp: string) => void;
  onBack: () => void;
}

const EMPTY_OTP = ['', '', '', '', '', ''];

export const LoginOtp: React.FC<LoginOtpProps> = ({ phone, onSubmit, onBack }) => {
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleSubmit = (otpString: string) => {
    if (otpString === '123456') {
      onSubmit(otpString);
      return;
    }

    setError('קוד שגוי, נסה שוב');
    setOtp(EMPTY_OTP);
    inputRefs.current[0]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);
    setError('');

    if (value && index < nextOtp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === nextOtp.length - 1 && value) {
      handleSubmit(nextOtp.join(''));
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
      setOtp(nextOtp);
      inputRefs.current[5]?.focus();
      setTimeout(() => handleSubmit(pastedData), 100);
    }
  };

  const formatPhone = (value: string) => {
    if (!value) return '';
    return value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  };

  return (
    <div className="w-full flex items-center justify-center py-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 bg-[#02B74F] rounded-2xl mb-4 shadow-lg">
            <AppLogo size={40} className="text-white sm:h-12 sm:w-12" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d0d12] dark:text-[#fafafa] mb-2">
            הזן קוד אימות
          </h1>
          <p className="text-sm sm:text-base text-[#666d80] dark:text-[#a3a3a3]">
            שלחנו קוד אימות למספר
          </p>
          <p className="text-[#0d0d12] dark:text-[#fafafa] font-medium mt-1" dir="ltr">
            {formatPhone(phone)}
          </p>
        </div>

        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5 sm:p-8 shadow-xl">
          <div className="space-y-6">
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
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`h-12 w-10 sm:h-14 sm:w-12 text-center text-xl sm:text-2xl font-bold bg-[#fafafa] dark:bg-[#0a0a0a] border-2 rounded-xl text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:border-[#02B74F] transition-all ${
                    error
                      ? 'border-[#ea0b0b] animate-shake'
                      : 'border-[#e5e5e5] dark:border-[#262626]'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="text-center text-sm text-[#ea0b0b] font-medium animate-in fade-in">
                {error}
              </div>
            )}

            <div className="text-center">
              <p className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                טיפ: קוד הבדיקה הוא 123456
              </p>
            </div>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-[#02B74F] hover:underline font-medium"
              >
                שלח קוד שוב
              </button>
            </div>

            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#f5f5f5] dark:bg-[#262626] hover:bg-[#e5e5e5] dark:hover:bg-[#404040] text-[#0d0d12] dark:text-[#fafafa] font-medium rounded-xl transition-all duration-200"
            >
              <ArrowRight className="w-5 h-5" />
              <span>חזור</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
