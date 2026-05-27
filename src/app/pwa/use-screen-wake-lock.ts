import { useEffect } from 'react';

type ScreenWakeLockType = 'screen';

type WakeLockSentinelLike = EventTarget & {
  readonly released: boolean;
  readonly type: ScreenWakeLockType;
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: ScreenWakeLockType) => Promise<WakeLockSentinelLike>;
  };
};

const getWakeLock = () => {
  if (typeof navigator === 'undefined') return null;

  const wakeLock = (navigator as WakeLockNavigator).wakeLock;
  return typeof wakeLock?.request === 'function' ? wakeLock : null;
};

export const useScreenWakeLock = () => {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const wakeLock = getWakeLock();
    if (!wakeLock) return;

    let disposed = false;
    let sentinel: WakeLockSentinelLike | null = null;
    let pendingRequest: Promise<void> | null = null;

    const releaseWakeLock = () => {
      if (!sentinel) return;

      const activeSentinel = sentinel;
      sentinel = null;
      activeSentinel.removeEventListener('release', handleRelease);
      void activeSentinel.release().catch(() => undefined);
    };

    const requestWakeLock = () => {
      if (
        disposed ||
        sentinel ||
        pendingRequest ||
        document.visibilityState !== 'visible'
      ) {
        return;
      }

      pendingRequest = wakeLock
        .request('screen')
        .then((nextSentinel) => {
          if (disposed || document.visibilityState !== 'visible') {
            void nextSentinel.release().catch(() => undefined);
            return;
          }

          sentinel = nextSentinel;
          sentinel.addEventListener('release', handleRelease);
        })
        .catch(() => undefined)
        .finally(() => {
          pendingRequest = null;
        });
    };

    function handleRelease() {
      sentinel?.removeEventListener('release', handleRelease);
      sentinel = null;

      if (!disposed && document.visibilityState === 'visible') {
        window.setTimeout(requestWakeLock, 250);
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      } else {
        releaseWakeLock();
      }
    };

    const handleFocus = () => {
      requestWakeLock();
    };

    const handlePageHide = () => {
      releaseWakeLock();
    };

    requestWakeLock();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
      releaseWakeLock();
    };
  }, []);
};
