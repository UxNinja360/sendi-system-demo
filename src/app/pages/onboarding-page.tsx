import React, { useEffect, useState } from 'react';
import { ArrowLeft, Building2, MapPin, Phone, Zap } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  clearAuthSession,
  readAuthSession,
  updateAuthSessionWorkspace,
  type AuthSession,
} from '../auth/auth-session';
import { AppLogo } from '../components/icons/app-logo';
import { createInitialDeliveryState } from '../context/delivery-bootstrap';
import {
  DELIVERY_STORAGE_KEYS,
  clearSystemResetStorage,
  createStorageEpoch,
} from '../context/delivery-storage';
import type { DeliveryState } from '../types/delivery.types';
import {
  writeStoredSendiPlusRadius,
  writeStoredSendiPlusTermsAccepted,
} from '../utils/sendi-plus';
import { writeWorkspaceState } from '../workspaces/workspace-registry';

const normalizePhone = (value: string) => value.replace(/\D/g, '');

const createEmptyWorkspaceState = ({
  area,
  companyName,
  companyPhone,
  session,
}: {
  area: string;
  companyName: string;
  companyPhone: string;
  session: AuthSession;
}) => {
  const workspaceId = session.workspace?.id ?? `wrk-${Date.now()}`;
  const baseState = createInitialDeliveryState();
  const now = new Date();

  return {
    ...baseState,
    dataMode: 'workspace',
    workspaceId,
    workspaceName: companyName.trim(),
    workspaceArea: area.trim(),
    workspacePhone: companyPhone.trim(),
    isSystemOpen: false,
    isReceivingDeliveries: false,
    autoAssignEnabled: false,
    deliveries: [],
    couriers: [],
    shifts: [],
    restaurants: [],
    customers: [],
    courierRoutePlans: {},
    activityLogs: [
      {
        id: `log-${now.getTime()}-workspace-created`,
        timestamp: now,
        title: 'חברת משלוחים נפתחה',
        description: `${companyName.trim()} · ${area.trim()}`,
        actionType: 'ONBOARDING_COMPLETE',
        category: 'settings',
      },
    ],
    deliveryBalance: 500,
    stats: {
      hour: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
      today: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
      week: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
      month: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
      year: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
    },
  } satisfies DeliveryState;
};

const saveWorkspace = ({
  area,
  companyName,
  companyPhone,
  session,
}: {
  area: string;
  companyName: string;
  companyPhone: string;
  session: AuthSession;
}) => {
  const storage = window.localStorage;
  const nextState = createEmptyWorkspaceState({
    area,
    companyName,
    companyPhone,
    session,
  });

  clearSystemResetStorage(storage);
  storage.setItem(DELIVERY_STORAGE_KEYS.stateEpoch, createStorageEpoch());
  storage.setItem(DELIVERY_STORAGE_KEYS.state, JSON.stringify(nextState));
  writeWorkspaceState(nextState, storage);
  writeStoredSendiPlusTermsAccepted(false, storage);
  writeStoredSendiPlusRadius(5, storage);

  updateAuthSessionWorkspace({
    name: companyName.trim(),
    onboardingStatus: 'complete',
  });
};

export const OnboardingPage: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [area, setArea] = useState('תל אביב');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const currentSession = readAuthSession();
    setSession(currentSession);

    if (!currentSession) {
      navigate('/login', { replace: true });
      return;
    }

    setCompanyPhone((current) => current || currentSession.user.phone);
  }, [navigate]);

  const canComplete =
    companyName.trim().length > 1 &&
    normalizePhone(companyPhone).length >= 9 &&
    area.trim().length > 1;

  const handleComplete = () => {
    if (!session) return;

    if (!companyName.trim()) {
      setError('צריך שם לחברת המשלוחים.');
      return;
    }

    if (normalizePhone(companyPhone).length < 9) {
      setError('צריך מספר טלפון תקין לחברה.');
      return;
    }

    if (!area.trim()) {
      setError('צריך אזור פעילות ראשי.');
      return;
    }

    saveWorkspace({
      area,
      companyName,
      companyPhone: normalizePhone(companyPhone),
      session,
    });

    navigate('/dashboard', { replace: true });
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  if (!session) return null;

  return (
    <div className="min-h-[100dvh] w-full bg-app-background text-[#0d0d12] dark:text-app-text">
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6" dir="rtl">
        <div className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0d0d12] dark:text-app-text">
          <AppLogo size={28} className="h-7 w-7" />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-10 items-center justify-center rounded-md border border-[#d8d8d8] px-4 text-sm font-bold text-[#0d0d12] transition-colors hover:border-[#bdbdbd] hover:bg-[#f5f5f5] dark:border-[#252525] dark:text-app-text dark:hover:border-[#3a3a3a] dark:hover:bg-[#111]"
        >
          חזור
        </button>
      </header>

      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col px-4 sm:px-6">
        <main className="flex flex-1 items-center py-8">
          <section className="w-full rounded-lg border border-[#e5e5e5] bg-white p-5 shadow-xl dark:border-app-border dark:bg-app-surface sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-brand-soft text-app-brand-text">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-black">פרטי חברת המשלוחים</h2>
                <p className="text-xs text-[#666d80] dark:text-app-text-secondary">
                  סניפים, שליחים וסנדי פלוס יופיעו בתוך המערכת.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-bold">
                  <Building2 className="h-4 w-4 text-app-brand" />
                  שם חברת משלוחים
                </span>
                <input
                  value={companyName}
                  onChange={(event) => {
                    setCompanyName(event.target.value);
                    setError('');
                  }}
                  placeholder="לדוגמה: דן משלוחים"
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-app-brand dark:border-app-border dark:bg-app-background"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-bold">
                  <Phone className="h-4 w-4 text-app-brand" />
                  טלפון חברה
                </span>
                <input
                  value={companyPhone}
                  onChange={(event) => {
                    setCompanyPhone(normalizePhone(event.target.value));
                    setError('');
                  }}
                  inputMode="tel"
                  dir="ltr"
                  placeholder="0501234567"
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-app-brand dark:border-app-border dark:bg-app-background"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-bold">
                  <MapPin className="h-4 w-4 text-app-brand" />
                  אזור פעילות
                </span>
                <input
                  value={area}
                  onChange={(event) => {
                    setArea(event.target.value);
                    setError('');
                  }}
                  placeholder="תל אביב"
                  className="w-full rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-app-brand dark:border-app-border dark:bg-app-background"
                />
              </label>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-[#ffd0d0] bg-[#fff5f5] px-4 py-3 text-sm font-bold text-[#c00] dark:border-[#4a1f1f] dark:bg-[#2a1414] dark:text-[#ffb4b4]">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-[#666d80] dark:text-app-text-secondary">
                <Zap className="h-4 w-4 text-app-brand" />
                הדשבורד יפתח נקי, בלי סניפי דמו.
              </div>
              <button
                type="button"
                disabled={!canComplete}
                onClick={handleComplete}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-app-brand-solid px-6 py-3 font-black text-app-background shadow-lg transition-colors hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-app-brand-solid"
              >
                <span>כניסה למערכת</span>
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
