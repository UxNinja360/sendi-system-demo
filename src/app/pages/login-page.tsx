import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { requestOtp, verifyOtp } from '../auth/auth-api';
import type { AccountType } from '../auth/auth-session';
import {
  readAuthSession,
  upsertAuthProfile,
} from '../auth/auth-session';
import { LoginPhone } from '../auth/login-phone';
import type { LoginPhoneMode } from '../auth/login-phone';
import { LoginOtp } from '../auth/login-otp';
import {
  activateWorkspaceAccount,
  readWorkspaceAccounts,
} from '../workspaces/workspace-registry';

const normalizePhone = (value: string) => value.replace(/\D/g, '');

const getAuthDestination = () => {
  const session = readAuthSession();
  if (!session) return null;

  return session.workspace?.onboardingStatus === 'complete'
    ? '/dashboard'
    : '/onboarding';
};

const getAuthErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');

  switch (message) {
    case 'account_type_not_available':
      return 'החשבון הזה עדיין לא פתוח להרשמה. כרגע אפשר לפתוח חברת משלוחים.';
    case 'invalid_phone':
      return 'מספר הטלפון לא תקין.';
    case 'invalid_otp':
    case 'invalid_credentials':
    case 'expired_otp':
      return 'קוד האימות שגוי או פג תוקף.';
    default:
      return 'משהו השתבש בתהליך האימות. נסה שוב.';
  }
};

export const LoginPage: React.FC = () => {
  const accountType: AccountType = 'delivery_company';
  const [authStep, setAuthStep] = useState<'phone' | 'otp'>('phone');
  const [authMode, setAuthMode] = useState<LoginPhoneMode>('login');
  const [challengeId, setChallengeId] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | undefined>();
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const destination = getAuthDestination();
    if (destination) {
      navigate(destination, { replace: true });
    }
  }, [navigate]);

  const handlePhoneSubmit = async (phone: string) => {
    const normalizedPhone = normalizePhone(phone);
    const existingAccount = readWorkspaceAccounts().find(
      (account) => normalizePhone(account.phone) === normalizedPhone,
    );

    setFormError('');

    if (authMode === 'login' && !existingAccount) {
      setFormError('לא מצאנו חברת משלוחים עם המספר הזה. לפתיחת חברה חדשה לחץ על הכפתור למטה.');
      return;
    }

    if (authMode === 'signup' && existingAccount) {
      setFormError('המספר הזה כבר מחובר לחברת משלוחים קיימת. עבור לכניסה לחשבון קיים.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await requestOtp({ accountType, phone });
      setPhoneNumber(normalizedPhone);
      setChallengeId(result.challengeId);
      setDemoOtp(result.demoOtp);
      setExpiresAt(result.expiresAt);
      setAuthStep('otp');
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (otp: string) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      const normalizedPhone = normalizePhone(phoneNumber);
      const result = await verifyOtp({
        accountType,
        challengeId,
        otp,
        phone: normalizedPhone,
      });
      const existingAccount = readWorkspaceAccounts().find(
        (account) => account.phone === normalizedPhone,
      );

      if (existingAccount) {
        activateWorkspaceAccount(existingAccount);
        navigate('/dashboard', { replace: true });
        return true;
      }

      if (authMode === 'login') {
        setFormError('לא מצאנו חברת משלוחים עם המספר הזה. חזור ובחר פתיחת חברה חדשה.');
        return false;
      }

      const session = upsertAuthProfile({
        accountType: result.accountType,
        phone: result.user.phone,
        sessionToken: result.sessionToken,
        user: result.user,
        workspace: result.workspace,
      });

      navigate(
        session.workspace?.onboardingStatus === 'complete'
          ? '/dashboard'
          : '/onboarding',
        { replace: true },
      );
      return true;
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    if (phoneNumber) {
      void handlePhoneSubmit(phoneNumber);
    }
  };

  const handleBack = () => {
    setAuthStep('phone');
    setChallengeId('');
    setDemoOtp('');
    setExpiresAt(undefined);
    setFormError('');
  };

  const handleModeChange = (mode: LoginPhoneMode) => {
    setAuthMode(mode);
    setFormError('');
  };

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-app-background p-4 sm:p-6">
      {authStep === 'phone' ? (
        <LoginPhone
          error={formError}
          isSubmitting={isSubmitting}
          mode={authMode}
          onModeChange={handleModeChange}
          onSubmit={handlePhoneSubmit}
        />
      ) : (
        <LoginOtp
          demoOtp={demoOtp}
          error={formError}
          expiresAt={expiresAt}
          isSubmitting={isSubmitting}
          phone={phoneNumber}
          onBack={handleBack}
          onResend={handleResend}
          onSubmit={handleOtpSubmit}
        />
      )}
    </div>
  );
};
