import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Shield } from 'lucide-react';
import { AppLogo } from '../icons/app-logo';

interface LoginOtpProps {
  phone: string;
  onSubmit: (otp: string) => void;
  onBack: () => void;
}

export const LoginOtp: React.FC<LoginOtpProps> = ({ phone, onSubmit, onBack }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus on first input when component mounts
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (index === 5 && value) {
      const otpString = newOtp.join('');
      handleSubmit(otpString);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      // Auto-submit after paste
      setTimeout(() => handleSubmit(pastedData), 100);
    }
  };

  const handleSubmit = (otpString: string) => {
    if (otpString === '123456') {
      onSubmit(otpString);
    } else {
      setError('קוד שגוי, נסה שוב');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#02B74F] rounded-2xl mb-4 shadow-lg">
            <AppLogo size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#0d0d12] dark:text-[#fafafa] mb-2">
            הזן קוד אימות
          </h1>
          <p className="text-[#666d80] dark:text-[#a3a3a3]">
            שלחנו קוד אימות למספר
          </p>
          <p className="text-[#0d0d12] dark:text-[#fafafa] font-medium mt-1" dir="ltr">
            {formatPhone(phone)}
          </p>
        </div>

        {/* OTP Card */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-8 shadow-xl">
          <div className="space-y-6">
            {/* OTP Inputs */}
            <div className="flex justify-center gap-3" dir="ltr">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-12 h-14 text-center text-2xl font-bold bg-[#fafafa] dark:bg-[#0a0a0a] border-2 rounded-xl text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:border-[#02B74F] transition-all ${
                    error ? 'border-[#ea0b0b] animate-shake' : 'border-[#e5e5e5] dark:border-[#262626]'
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-center text-sm text-[#ea0b0b] font-medium animate-in fade-in">
                {error}
              </div>
            )}

            {/* Hint */}
            <div className="text-center">
              <p className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                💡 רמז: הקוד הוא 123456
              </p>
            </div>

            {/* Resend */}
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-[#02B74F] hover:underline font-medium"
              >
                שלח קוד שוב
              </button>
            </div>

            {/* Back Button */}
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