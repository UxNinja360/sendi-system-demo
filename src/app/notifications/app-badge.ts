type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

type BadgeServiceWorkerMessage = {
  type: 'SENDI_SET_BADGE';
  count: number;
};

const getBadgeNavigator = () =>
  typeof navigator === 'undefined' ? null : (navigator as BadgeNavigator);

export const canUseAppBadge = () => {
  const badgeNavigator = getBadgeNavigator();
  return Boolean(badgeNavigator?.setAppBadge);
};

const postBadgeToServiceWorker = (count: number) => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const message: BadgeServiceWorkerMessage = {
    type: 'SENDI_SET_BADGE',
    count,
  };

  navigator.serviceWorker.controller?.postMessage(message);
};

export const setPendingDeliveriesBadge = async (count: number) => {
  const safeCount = Math.max(0, Math.floor(count));
  const badgeNavigator = getBadgeNavigator();

  postBadgeToServiceWorker(safeCount);

  try {
    if (safeCount > 0 && badgeNavigator?.setAppBadge) {
      await badgeNavigator.setAppBadge(safeCount);
      return true;
    }

    if (safeCount === 0 && badgeNavigator?.clearAppBadge) {
      await badgeNavigator.clearAppBadge();
      return true;
    }

    if (safeCount === 0 && badgeNavigator?.setAppBadge) {
      await badgeNavigator.setAppBadge(0);
      return true;
    }
  } catch {
    return false;
  }

  return false;
};
