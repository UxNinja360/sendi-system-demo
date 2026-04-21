import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { LoginPhone } from '../auth/login-phone';
import { LoginOtp } from '../auth/login-otp';

export const LoginPage: React.FC = () => {
  const [authStep, setAuthStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const navigate = useNavigate();

  const handlePhoneSubmit = (phone: string) => {
    setPhoneNumber(phone);
    setAuthStep('otp');
  };

  const handleOtpSubmit = () => {
    // Store auth state
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.removeItem('onboarding_done_v1');
    navigate('/dashboard');
  };

  const handleBack = () => {
    setAuthStep('phone');
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#f0fdf4] via-[#fafafa] to-[#ecfccb] dark:from-[#0a0a0a] dark:via-[#0f1410] dark:to-[#0a0a0a] flex items-center justify-center p-4 sm:p-6">
      {authStep === 'phone' ? (
        <LoginPhone onSubmit={handlePhoneSubmit} />
      ) : (
        <LoginOtp phone={phoneNumber} onSubmit={handleOtpSubmit} onBack={handleBack} />
      )}
    </div>
  );
};
