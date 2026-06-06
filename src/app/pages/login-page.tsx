import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  readWorkspaceAccountByPhone,
} from '../workspaces/workspace-registry';

const normalizePhone = (value: string) => value.replace(/\D/g, '');

type LoginDot = {
  id: string;
  x: number;
  y: number;
};

export type LoginDotFieldHandle = {
  leave: () => void;
  move: (clientX: number, clientY: number, rect: DOMRect) => void;
};

type LoginPointer = {
  x: number;
  y: number;
};

type LoginPointerSample = {
  clientX: number;
  clientY: number;
  time: number;
};

type LoginCanvasMetrics = {
  dpr: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  width: number;
};

const LOGIN_VIEWBOX_WIDTH = 160;
const LOGIN_VIEWBOX_HEIGHT = 100;
const LOGIN_DOT_COLUMNS = 88;
const LOGIN_DOT_ROWS = 54;
const LOGIN_DOT_RADIUS = 0.09;
const LOGIN_CURSOR_RADIUS = 15.8;
const LOGIN_REPULSION_STRENGTH = 3.1;
const LOGIN_FAST_POINTER_SPEED = 1.35;
const LOGIN_FAST_REPULSION_SCALE = 0.1;
const LOGIN_POINTER_REST_MS = 42;
const LOGIN_DOT_COLUMN_GAP = LOGIN_VIEWBOX_WIDTH / (LOGIN_DOT_COLUMNS - 1);
const LOGIN_DOT_ROW_GAP = LOGIN_VIEWBOX_HEIGHT / (LOGIN_DOT_ROWS - 1);
const LOGIN_TAU = Math.PI * 2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createLoginDots = () => {
  const dots: LoginDot[] = [];

  for (let row = 0; row < LOGIN_DOT_ROWS; row += 1) {
    for (let column = 0; column < LOGIN_DOT_COLUMNS; column += 1) {
      dots.push({
        id: `${row}-${column}`,
        x: (column / (LOGIN_DOT_COLUMNS - 1)) * LOGIN_VIEWBOX_WIDTH,
        y: (row / (LOGIN_DOT_ROWS - 1)) * LOGIN_VIEWBOX_HEIGHT,
      });
    }
  }

  return dots;
};

const getLoginPointerInViewBox = (clientX: number, clientY: number, rect: DOMRect) => {
  const viewAspect = LOGIN_VIEWBOX_WIDTH / LOGIN_VIEWBOX_HEIGHT;
  const rectAspect = rect.width / rect.height;

  if (rectAspect < viewAspect) {
    const scale = LOGIN_VIEWBOX_HEIGHT / rect.height;
    const visibleWidth = rect.width * scale;
    const offsetX = (LOGIN_VIEWBOX_WIDTH - visibleWidth) / 2;

    return {
      x: clamp(offsetX + (clientX - rect.left) * scale, 0, LOGIN_VIEWBOX_WIDTH),
      y: clamp((clientY - rect.top) * scale, 0, LOGIN_VIEWBOX_HEIGHT),
    };
  }

  const scale = LOGIN_VIEWBOX_WIDTH / rect.width;
  const visibleHeight = rect.height * scale;
  const offsetY = (LOGIN_VIEWBOX_HEIGHT - visibleHeight) / 2;

  return {
    x: clamp((clientX - rect.left) * scale, 0, LOGIN_VIEWBOX_WIDTH),
    y: clamp(offsetY + (clientY - rect.top) * scale, 0, LOGIN_VIEWBOX_HEIGHT),
  };
};

export const LoginDotField = React.forwardRef<LoginDotFieldHandle>((_, ref) => {
  const dots = useMemo(createLoginDots, []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastPointerSampleRef = useRef<LoginPointerSample | null>(null);
  const metricsRef = useRef<LoginCanvasMetrics | null>(null);
  const pointerRef = useRef<LoginPointer & { active: boolean; strengthScale: number }>({
    active: false,
    strengthScale: 1,
    x: 0,
    y: 0,
  });
  const restTimerRef = useRef<number | null>(null);

  const syncCanvasMetrics = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const dpr = window.devicePixelRatio || 1;
    const viewAspect = LOGIN_VIEWBOX_WIDTH / LOGIN_VIEWBOX_HEIGHT;
    const rectAspect = width / height;
    const scale = rectAspect > viewAspect
      ? width / LOGIN_VIEWBOX_WIDTH
      : height / LOGIN_VIEWBOX_HEIGHT;
    const offsetX = (width - LOGIN_VIEWBOX_WIDTH * scale) / 2;
    const offsetY = (height - LOGIN_VIEWBOX_HEIGHT * scale) / 2;

    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr);
    }

    if (canvas.height !== Math.round(height * dpr)) {
      canvas.height = Math.round(height * dpr);
    }

    const metrics = {
      dpr,
      height,
      offsetX,
      offsetY,
      scale,
      width,
    };

    metricsRef.current = metrics;
    return metrics;
  }, []);

  const drawDots = useCallback(() => {
    frameRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const metrics = metricsRef.current ?? syncCanvasMetrics();
    if (!metrics) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const pointer = pointerRef.current;
    const styles = getComputedStyle(canvas);
    const dotColor = styles.getPropertyValue('--login-dot').trim() || '#2f5f72';
    const dotOpacity = Number(styles.getPropertyValue('--login-dot-opacity').trim()) || 0.72;
    const strength = LOGIN_REPULSION_STRENGTH * pointer.strengthScale;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(
      metrics.dpr * metrics.scale,
      0,
      0,
      metrics.dpr * metrics.scale,
      metrics.dpr * metrics.offsetX,
      metrics.dpr * metrics.offsetY,
    );
    context.fillStyle = dotColor;
    context.globalAlpha = dotOpacity;

    dots.forEach((dot) => {
      let x = dot.x;
      let y = dot.y;

      if (pointer.active) {
        const dx = dot.x - pointer.x;
        const dy = dot.y - pointer.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0.001 && distance < LOGIN_CURSOR_RADIUS) {
          const influence = 1 - distance / LOGIN_CURSOR_RADIUS;
          const force = influence * influence * strength;

          x += (dx / distance) * force;
          y += (dy / distance) * force;
        }
      }

      context.beginPath();
      context.arc(x, y, LOGIN_DOT_RADIUS, 0, LOGIN_TAU);
      context.fill();
    });

    context.globalAlpha = 1;
  }, [dots, syncCanvasMetrics]);

  const scheduleDraw = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(drawDots);
  }, [drawDots]);

  const leave = useCallback(() => {
    lastPointerSampleRef.current = null;

    if (restTimerRef.current !== null) {
      window.clearTimeout(restTimerRef.current);
      restTimerRef.current = null;
    }

    pointerRef.current = {
      ...pointerRef.current,
      active: false,
    };
    scheduleDraw();
  }, [scheduleDraw]);

  useImperativeHandle(ref, () => ({
    leave,
    move: (clientX, clientY, rect) => {
      const now = performance.now();
      const previous = lastPointerSampleRef.current;
      const speed = previous
        ? Math.hypot(clientX - previous.clientX, clientY - previous.clientY) / Math.max(8, now - previous.time)
        : 0;
      const speedFactor = clamp(speed / LOGIN_FAST_POINTER_SPEED, 0, 1);
      const strengthScale = 1 - speedFactor * (1 - LOGIN_FAST_REPULSION_SCALE);

      lastPointerSampleRef.current = { clientX, clientY, time: now };
      pointerRef.current = {
        active: true,
        strengthScale,
        ...getLoginPointerInViewBox(clientX, clientY, rect),
      };

      if (restTimerRef.current !== null) {
        window.clearTimeout(restTimerRef.current);
      }

      scheduleDraw();

      restTimerRef.current = window.setTimeout(() => {
        const pointer = pointerRef.current;
        if (!pointer.active) return;

        pointerRef.current = {
          ...pointer,
          strengthScale: 1,
        };
        scheduleDraw();
        restTimerRef.current = null;
      }, LOGIN_POINTER_REST_MS);
    },
  }), [leave, scheduleDraw]);

  useEffect(() => {
    syncCanvasMetrics();
    drawDots();

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resizeObserver = new ResizeObserver(() => {
      syncCanvasMetrics();
      scheduleDraw();
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (restTimerRef.current !== null) {
        window.clearTimeout(restTimerRef.current);
      }
    };
  }, [drawDots, scheduleDraw, syncCanvasMetrics]);

  return (
    <div className="login-dot-field" aria-hidden="true">
      <canvas ref={canvasRef} className="login-dot-field__canvas" />
    </div>
  );
});

LoginDotField.displayName = 'LoginDotField';

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
  const [authMode, setAuthMode] = useState<LoginPhoneMode>('signup');
  const [challengeId, setChallengeId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const dotFieldRef = useRef<LoginDotFieldHandle>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const destination = getAuthDestination();
    if (destination) {
      navigate(destination, { replace: true });
    }
  }, [navigate]);

  const handlePhoneSubmit = async (phone: string) => {
    const normalizedPhone = normalizePhone(phone);
    const existingAccount = readWorkspaceAccountByPhone(normalizedPhone);

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
      const existingAccount = readWorkspaceAccountByPhone(normalizedPhone);

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

  const handleModeChange = () => {
    setAuthMode((currentMode) => (currentMode === 'signup' ? 'login' : 'signup'));
    setFormError('');
  };

  const handleModeClick = () => {
    handleModeChange();
  };

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;

    const coalescedEvents = event.nativeEvent.getCoalescedEvents?.();
    const latestEvent = coalescedEvents?.[coalescedEvents.length - 1] ?? event;

    dotFieldRef.current?.move(
      latestEvent.clientX,
      latestEvent.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
  }, []);

  const handlePointerLeave = useCallback(() => {
    dotFieldRef.current?.leave();
  }, []);

  const headerActionLabel = authMode === 'signup' ? 'כניסה' : 'הרשמה';

  return (
    <div
      className="login-shell relative isolate flex w-full flex-col overflow-x-hidden text-app-text"
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
    >
      <LoginDotField ref={dotFieldRef} />

      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6" dir="rtl">
        <div className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0d0d12] dark:text-app-text">
          <AppLogo size={28} className="h-7 w-7" />
        </div>

        {authStep === 'phone' ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleModeClick}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#d8d8d8] px-4 text-sm font-bold text-[#0d0d12] transition-colors hover:border-[#bdbdbd] hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#252525] dark:text-app-text dark:hover:border-[#3a3a3a] dark:hover:bg-[#111]"
          >
            {headerActionLabel}
          </button>
        ) : (
          <span className="h-8 w-16" aria-hidden="true" />
        )}
      </header>

      <main className="login-main login-main--auth relative z-10 flex flex-1 items-center justify-center px-5 pb-16 pt-8 sm:px-6">
        {authStep === 'phone' ? (
          <LoginPhone
            error={formError}
            isSubmitting={isSubmitting}
            mode={authMode}
            phone={phoneNumber}
            onPhoneChange={setPhoneNumber}
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

      <footer className="relative z-10 flex h-12 shrink-0 items-center justify-center px-4 text-[11px] font-medium text-[#777] dark:text-app-text-secondary">
        <a
          href="#"
          className="absolute right-4 whitespace-nowrap transition-colors hover:text-[#0d0d12] dark:hover:text-app-text"
        >
          נגישות
        </a>
        <div className="flex items-center justify-center gap-4">
          <a href="#" className="whitespace-nowrap transition-colors hover:text-[#0d0d12] dark:hover:text-app-text">
            בטיחות בדרכים
          </a>
        </div>
        <a
          href="#"
          className="absolute left-4 whitespace-nowrap transition-colors hover:text-[#0d0d12] dark:hover:text-app-text"
        >
          תנאים
        </a>
      </footer>
    </div>
  );
};
