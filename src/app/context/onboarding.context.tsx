import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useDelivery } from './delivery.context';

export type OnboardingStepId =
  | 'nav-couriers'
  | 'add-courier'
  | 'nav-restaurants'
  | 'activate-restaurant'
  | 'nav-live'
  | 'enable-system';

export interface OnboardingStepDef {
  id: OnboardingStepId;
  target: string; // data-onboarding attribute value
  title: string;
  body: string;
  placement: 'right' | 'left' | 'top' | 'bottom';
}

const STEPS: OnboardingStepDef[] = [
  {
    id: 'nav-couriers',
    target: 'nav-couriers',
    title: 'ברוכים הבאים! 👋',
    body: 'נתחיל עם הוספת שליחים. עבור לעמוד השליחים.',
    placement: 'left',
  },
  {
    id: 'add-courier',
    target: 'add-courier-btn',
    title: 'הוספת שליח',
    body: 'לחץ כאן כדי להוסיף שליח חדש למערכת.',
    placement: 'bottom',
  },
  {
    id: 'nav-restaurants',
    target: 'nav-restaurants',
    title: 'המשך למסעדות',
    body: 'עכשיו בוא נוסיף מסעדות. עבור לעמוד המסעדות.',
    placement: 'left',
  },
  {
    id: 'activate-restaurant',
    target: 'restaurant-toggle',
    title: 'הפעל מסעדה',
    body: 'לחץ על הכפתור כדי להפעיל מסעדה ולהתחיל לקבל ממנה משלוחים.',
    placement: 'right',
  },
  {
    id: 'nav-live',
    target: 'nav-live',
    title: 'מנג׳ר לייב',
    body: 'עבור למסך הניהול המרכזי לצפייה בזמן אמת.',
    placement: 'left',
  },
  {
    id: 'enable-system',
    target: 'system-toggle',
    title: 'הפעל את המערכת',
    body: 'לחץ על "קבלת משלוחים" כדי להתחיל את הסימולציה.',
    placement: 'left',
  },
];

const STORAGE_KEY = 'onboarding_done_v1';

interface OnboardingContextValue {
  active: boolean;
  step: OnboardingStepDef | null;
  stepIndex: number;
  totalSteps: number;
  skip: () => void;
  restart: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { state } = useDelivery();

  const [done, setDone] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [stepIndex, setStepIndex] = useState<number>(0);
  // Capture baseline couriers count at onboarding start so we advance only when the user actually adds one.
  const [baselineCouriers, setBaselineCouriers] = useState<number>(() => state.couriers.length);

  // Re-baseline whenever onboarding actually (re)starts
  useEffect(() => {
    if (!done && stepIndex === 0) {
      setBaselineCouriers(state.couriers.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // Auto-advance logic
  useEffect(() => {
    if (done) return;
    const current = STEPS[stepIndex];
    if (!current) return;

    const pathname = location.pathname;
    let shouldAdvance = false;

    switch (current.id) {
      case 'nav-couriers':
        shouldAdvance = pathname === '/couriers';
        break;
      case 'add-courier':
        shouldAdvance = state.couriers.length > baselineCouriers;
        break;
      case 'nav-restaurants':
        shouldAdvance = pathname === '/restaurants';
        break;
      case 'activate-restaurant':
        shouldAdvance = state.restaurants.some(r => r.isActive);
        break;
      case 'nav-live':
        shouldAdvance = pathname === '/live';
        break;
      case 'enable-system':
        shouldAdvance = state.isSystemOpen;
        break;
    }

    if (shouldAdvance) {
      if (stepIndex >= STEPS.length - 1) {
        // completed
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
        setDone(true);
      } else {
        setStepIndex(i => i + 1);
      }
    }
  }, [done, stepIndex, location.pathname, state.couriers.length, state.restaurants, state.isSystemOpen, baselineCouriers]);

  const skip = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
    setDone(true);
  };

  const restart = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    setStepIndex(0);
    setBaselineCouriers(state.couriers.length);
    setDone(false);
  };

  const value = useMemo<OnboardingContextValue>(() => ({
    active: !done,
    step: !done ? STEPS[stepIndex] ?? null : null,
    stepIndex,
    totalSteps: STEPS.length,
    skip,
    restart,
  }), [done, stepIndex]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    return {
      active: false,
      step: null,
      stepIndex: 0,
      totalSteps: STEPS.length,
      skip: () => {},
      restart: () => {},
    };
  }
  return ctx;
};
