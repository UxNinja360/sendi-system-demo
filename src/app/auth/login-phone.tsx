import React, { useState } from 'react';
import { Phone, ArrowLeft } from 'lucide-react';
import { AppLogo } from '../components/icons/app-logo';

interface LoginPhoneProps {
  onSubmit: (phone: string) => void;
}

export const LoginPhone: React.FC<LoginPhoneProps> = ({ onSubmit }) => {
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 9) {
      onSubmit(phone);
    }
  };

  return (
    <div className="w-full flex items-center justify-center py-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 bg-[#02B74F] rounded-2xl mb-4 shadow-lg">
            <AppLogo size={40} className="text-white sm:h-12 sm:w-12" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d0d12] dark:text-[#fafafa] mb-2">
            ברוכים הבאים לסנדי
          </h1>
          <p className="text-sm sm:text-base text-[#666d80] dark:text-[#a3a3a3]">
            הכנס את מספר הטלפון שלך כדי להתחבר
          </p>
        </div>

        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-5 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#0d0d12] dark:text-[#fafafa] mb-2">
                מספר טלפון
              </label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Phone className="w-5 h-5 text-[#666d80] dark:text-[#a3a3a3]" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="050-1234567"
                  className="w-full pr-12 pl-4 py-3 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-xl text-base text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#02B74F] focus:border-transparent transition-all"
                  maxLength={10}
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-[#666d80] dark:text-[#a3a3a3] mt-2">
                נשלח אליך קוד אימות ב-SMS
              </p>
            </div>

            <button
              type="submit"
              disabled={phone.length < 9}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#02B74F] hover:bg-[#029943] text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#02B74F]"
            >
              <span>המשך</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </form>
        </div>

        <p className="text-center text-xs sm:text-sm text-[#666d80] dark:text-[#a3a3a3] mt-5 sm:mt-6 px-2">
          בהמשך אתה מאשר את{' '}
          <a href="#" className="text-[#02B74F] hover:underline">
            תנאי השימוש
          </a>{' '}
          ו-
          <a href="#" className="text-[#02B74F] hover:underline">
            מדיניות הפרטיות
          </a>
        </p>
      </div>
    </div>
  );
};
