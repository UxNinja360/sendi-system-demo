import React from 'react';
import { RefreshCw } from 'lucide-react';
import {
  acknowledgeCurrentBuildUpdate,
  activateWaitingAppUpdate,
  APP_UPDATE_ACTIVATING_EVENT,
  APP_UPDATE_AVAILABLE_EVENT,
  getCurrentBuildUpdatePending,
  getWaitingAppUpdateAvailable,
  getWaitingAppUpdateRegistration,
} from '../../pwa/app-update';

export const AppUpdateBanner: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [hasWaitingWorker, setHasWaitingWorker] = React.useState(false);
  const updateButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    const showBanner = () => {
      setHasWaitingWorker(getWaitingAppUpdateAvailable());
      setUpdating(false);
      setVisible(true);
    };
    const markUpdating = () => {
      setHasWaitingWorker(true);
      setUpdating(true);
      setVisible(true);
    };

    if (getWaitingAppUpdateAvailable() || getCurrentBuildUpdatePending()) {
      showBanner();
    }

    window.addEventListener(APP_UPDATE_AVAILABLE_EVENT, showBanner);
    window.addEventListener(APP_UPDATE_ACTIVATING_EVENT, markUpdating);

    return () => {
      window.removeEventListener(APP_UPDATE_AVAILABLE_EVENT, showBanner);
      window.removeEventListener(APP_UPDATE_ACTIVATING_EVENT, markUpdating);
    };
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    updateButtonRef.current?.focus();
  }, [visible]);

  const handleUpdate = () => {
    setUpdating(true);

    if (getWaitingAppUpdateAvailable() || getWaitingAppUpdateRegistration()?.waiting) {
      const didStartUpdate = activateWaitingAppUpdate();
      if (!didStartUpdate) {
        setUpdating(false);
        return;
      }

      window.setTimeout(() => {
        window.location.reload();
      }, 4000);
      return;
    }

    acknowledgeCurrentBuildUpdate();
    setUpdating(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
      dir="rtl"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="app-update-title"
      aria-describedby="app-update-description"
    >
      <div className="w-full max-w-[420px] rounded-[10px] border border-app-border bg-app-surface p-4 text-app-text shadow-[0_24px_80px_rgba(0,0,0,0.55)] dark:border-[#2E2E2E] dark:bg-[#0A0A0A]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-app-surface-raised text-app-brand-text">
            <RefreshCw className={`h-5 w-5 ${updating ? 'animate-spin' : ''}`} aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 text-right">
            <div id="app-update-title" className="text-base font-bold text-app-text">
              {updating ? 'מעדכן גרסה...' : 'עדכון גרסה נדרש'}
            </div>
            <div id="app-update-description" className="mt-1 text-sm leading-6 text-app-text-secondary">
              {updating
                ? 'מרענן לגרסה החדשה. האפליקציה תחזור מיד.'
                : hasWaitingWorker
                  ? 'יש גרסה חדשה זמינה. כדי להמשיך להשתמש באפליקציה צריך לעדכן עכשיו.'
                  : 'הגרסה החדשה נטענה במכשיר. אשר כדי להמשיך לעבוד בגרסה המעודכנת.'}
            </div>
          </div>
        </div>

        <button
          ref={updateButtonRef}
          type="button"
          onClick={handleUpdate}
          disabled={updating}
          className="mt-4 inline-flex h-10 w-full shrink-0 items-center justify-center rounded-[7px] bg-app-brand-solid px-4 text-sm font-bold text-app-background transition-colors hover:bg-app-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/40 disabled:cursor-wait disabled:opacity-70"
          data-haptic="success"
        >
          {updating ? 'מעדכן' : hasWaitingWorker ? 'עדכן עכשיו' : 'אישור'}
        </button>
      </div>
    </div>
  );
};
