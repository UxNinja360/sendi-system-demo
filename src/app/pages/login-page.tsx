import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { requestOtp, verifyOtp } from '../auth/auth-api';
import type { AccountType } from '../auth/auth-session';
import {
  readAuthSession,
  upsertAuthProfile,
} from '../auth/auth-session';
import { AppLogo } from '../components/icons/app-logo';
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
    setFormError('');
  };

  const handleModeChange = (mode: LoginPhoneMode) => {
    setAuthMode(mode);
    setFormError('');
  };

  const headerActionLabel = authMode === 'signup' ? 'כניסה' : 'הרשמה';

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-app-background text-[#0d0d12] dark:text-app-text">
      <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6" dir="ltr">
        <div className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0d0d12] dark:text-app-text">
          <AppLogo size={20} className="h-5 w-5" />
          <span>סנדי</span>
        </div>

        {authStep === 'phone' ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleModeChange(authMode === 'signup' ? 'login' : 'signup')}
            className="inline-flex h-8 items-center justify-center rounded-md border border-[#d8d8d8] px-3 text-xs font-bold text-[#0d0d12] transition-colors hover:border-[#bdbdbd] hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#252525] dark:text-app-text dark:hover:border-[#3a3a3a] dark:hover:bg-[#111]"
          >
            {headerActionLabel}
          </button>
        ) : (
          <span className="h-8 w-16" aria-hidden="true" />
        )}
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16 pt-8 sm:px-6">
        {authStep === 'phone' ? (
          <LoginPhone
            error={formError}
            isSubmitting={isSubmitting}
            mode={authMode}
            onSubmit={handlePhoneSubmit}
          />
        ) : (
          <LoginOtp
            error={formError}
            isSubmitting={isSubmitting}
            phone={phoneNumber}
            onBack={handleBack}
            onResend={handleResend}
            onSubmit={handleOtpSubmit}
          />
        )}
      </main>

      <footer className="flex h-12 shrink-0 items-center justify-center gap-4 px-4 text-[11px] font-medium text-[#777] dark:text-app-text-secondary">
        <a href="#" className="transition-colors hover:text-[#0d0d12] dark:hover:text-app-text">
          תנאי שימוש
        </a>
        <a href="#" className="transition-colors hover:text-[#0d0d12] dark:hover:text-app-text">
          פרטיות
        </a>
      </footer>
    </div>
  );
};
