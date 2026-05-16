import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import {
  activateWaitingAppUpdate,
  APP_UPDATE_ACTIVATING_EVENT,
  APP_UPDATE_AVAILABLE_EVENT,
  getWaitingAppUpdateRegistration,
} from '../../pwa/app-update';

export const AppUpdateBanner: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);

  React.useEffect(() => {
    const showBanner = () => {
      setUpdating(false);
      setVisible(true);
    };
    const markUpdating = () => {
      setUpdating(true);
      setVisible(true);
    };

    if (getWaitingAppUpdateRegistration()) {
      showBanner();
    }

    window.addEventListener(APP_UPDATE_AVAILABLE_EVENT, showBanner);
    window.addEventListener(APP_UPDATE_ACTIVATING_EVENT, markUpdating);

    return () => {
      window.removeEventListener(APP_UPDATE_AVAILABLE_EVENT, showBanner);
      window.removeEventListener(APP_UPDATE_ACTIVATING_EVENT, markUpdating);
    };
  }, []);

  const handleUpdate = () => {
    setUpdating(true);

    const didStartUpdate = activateWaitingAppUpdate();
    if (!didStartUpdate) {
      window.location.reload();
      return;
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 4000);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-3 bottom-[calc(var(--app-safe-bottom)+12px)] z-[9998] mx-auto max-w-xl md:inset-x-auto md:left-1/2 md:w-[520px] md:-translate-x-1/2"
      dir="rtl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-[8px] border border-app-border bg-app-surface px-3.5 py-3 text-app-text shadow-[0_18px_50px_rgba(0,0,0,0.35)] dark:border-[#2E2E2E] dark:bg-[#0A0A0A]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-app-surface-raised text-app-brand-text">
          <RefreshCw className={`h-4.5 w-4.5 ${updating ? 'animate-spin' : ''}`} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <div className="text-sm font-bold text-app-text">
            {updating ? 'מעדכן גרסה...' : 'עדכון גרסה זמין'}
          </div>
          <div className="mt-0.5 text-xs leading-5 text-app-text-secondary">
            {updating ? 'מרענן לגרסה החדשה.' : 'אפשר לרענן עכשיו בלי להתקין מחדש את האפליקציה.'}
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpdate}
          disabled={updating}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-[6px] bg-app-brand-solid px-3 text-xs font-bold text-app-background transition-colors hover:bg-app-brand-hover disabled:cursor-wait disabled:opacity-70"
          data-haptic="success"
        >
          {updating ? 'מעדכן' : 'עדכן'}
        </button>

        <button
          type="button"
          onClick={() => setVisible(false)}
          disabled={updating}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text disabled:cursor-wait disabled:opacity-50"
          aria-label="סגור"
          data-haptic="light"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
