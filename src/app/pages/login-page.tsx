import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type LoginPointerState = {
  active: boolean;
  x: number;
  y: number;
};

type LoginDot = {
  color: string;
  depth: number;
  id: string;
  opacity: number;
  radius: number;
  x: number;
  y: number;
};

const LOGIN_POINTER_REST: LoginPointerState = { active: false, x: 50, y: 45 };
const LOGIN_DOT_COLUMNS = 92;
const LOGIN_DOT_ROWS = 54;
const LOGIN_DOT_COLORS = [
  'var(--login-dot-a)',
  'var(--login-dot-b)',
  'var(--login-dot-c)',
  'var(--login-dot-d)',
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const fract = (value: number) => value - Math.floor(value);

const seededNoise = (x: number, y: number, salt = 0) =>
  fract(Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + salt * 37.719) * 43758.5453);

const createLoginDots = (): LoginDot[] => {
  const dots: LoginDot[] = [];

  for (let row = 0; row < LOGIN_DOT_ROWS; row += 1) {
    for (let column = 0; column < LOGIN_DOT_COLUMNS; column += 1) {
      const noise = seededNoise(column, row);
      const x = (column / (LOGIN_DOT_COLUMNS - 1)) * 104 - 2 + (noise - 0.5) * 0.36;
      const y =
        (row / (LOGIN_DOT_ROWS - 1)) * 104 -
        2 +
        (seededNoise(column, row, 1) - 0.5) * 0.36;
      const color = LOGIN_DOT_COLORS[
        Math.floor(seededNoise(column, row, 2) * LOGIN_DOT_COLORS.length)
      ];

      dots.push({
        color,
        depth: 0.3 + seededNoise(column, row, 3) * 0.9,
        id: `${row}-${column}`,
        opacity: 0.18 + seededNoise(column, row, 4) * 0.32,
        radius: 0.055 + seededNoise(column, row, 5) * 0.055,
        x,
        y,
      });
    }
  }

  return dots;
};

const useLoginPointer = () => {
  const [pointer, setPointer] = useState<LoginPointerState>(LOGIN_POINTER_REST);
  const frameRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<LoginPointerState>(LOGIN_POINTER_REST);

  const flushPointer = useCallback(() => {
    frameRef.current = null;
    setPointer(pendingPointerRef.current);
  }, []);

  const schedulePointer = useCallback((nextPointer: LoginPointerState) => {
    pendingPointerRef.current = nextPointer;

    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(flushPointer);
  }, [flushPointer]);

  useEffect(() => () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;

    const rect = event.currentTarget.getBoundingClientRect();
    schedulePointer({
      active: true,
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    });
  }, [schedulePointer]);

  const handlePointerLeave = useCallback(() => {
    schedulePointer(LOGIN_POINTER_REST);
  }, [schedulePointer]);

  return { handlePointerLeave, handlePointerMove, pointer };
};

const LoginDotField: React.FC<{ pointer: LoginPointerState }> = ({ pointer }) => {
  const dots = useMemo(createLoginDots, []);
  const parallaxX = pointer.active ? (pointer.x - 50) / 50 : 0;
  const parallaxY = pointer.active ? (pointer.y - 50) / 50 : 0;

  return (
    <div className="login-dot-field" aria-hidden="true">
      <svg
        className="login-dot-field__svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        focusable="false"
      >
        {dots.map((dot) => {
          const offsetX = dot.x - pointer.x;
          const offsetY = (dot.y - pointer.y) * 1.35;
          const distance = Math.hypot(offsetX, offsetY);
          const influence = pointer.active ? Math.max(0, 1 - distance / 15.5) : 0;
          const directionX = distance > 0 ? offsetX / distance : 0;
          const directionY = distance > 0 ? offsetY / distance : 0;
          const moveX = directionX * influence * 16 + parallaxX * dot.depth * 4.8;
          const moveY = directionY * influence * 12 + parallaxY * dot.depth * 3.6;
          const opacity = Math.min(0.88, dot.opacity + influence * 0.46);

          return (
            <circle
              key={dot.id}
              className="login-dot-field__dot"
              cx={dot.x}
              cy={dot.y}
              r={dot.radius}
              style={{
                fill: dot.color,
                opacity,
                transform: `translate(${moveX.toFixed(3)}px, ${moveY.toFixed(3)}px)`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};

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
  const { handlePointerLeave, handlePointerMove, pointer } = useLoginPointer();
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
    <div
      className="login-shell relative isolate flex min-h-[100dvh] w-full flex-col overflow-hidden text-app-text"
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
    >
      <LoginDotField pointer={pointer} />

      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6" dir="rtl">
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

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-16 pt-8 sm:px-6">
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

      <footer className="relative z-10 flex h-12 shrink-0 items-center justify-center gap-4 px-4 text-[11px] font-medium text-[#777] dark:text-app-text-secondary">
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
