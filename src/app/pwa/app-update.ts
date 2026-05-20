import { registerSW } from 'virtual:pwa-register';

export const APP_UPDATE_AVAILABLE_EVENT = 'sendi-app-update-available';
export const APP_UPDATE_ACTIVATING_EVENT = 'sendi-app-update-activating';

const UPDATE_CHECK_INTERVAL_MS = 15_000;
const INITIAL_UPDATE_CHECK_DELAYS_MS = [0, 1_000, 5_000];

let setupStarted = false;
let updateAvailable = false;
let activationRequested = false;
let reloadStarted = false;
let latestRegistration: ServiceWorkerRegistration | null = null;
let updateServiceWorker: ReturnType<typeof registerSW> | null = null;
let updateCheckIntervalId: number | null = null;

const watchedRegistrations = new WeakSet<ServiceWorkerRegistration>();
const watchedWorkers = new WeakSet<ServiceWorker>();

const emitUpdateAvailable = (registration?: ServiceWorkerRegistration | null) => {
  if (registration) {
    latestRegistration = registration;
  }

  updateAvailable = true;
  window.dispatchEvent(new CustomEvent(APP_UPDATE_AVAILABLE_EVENT));
};

const emitUpdateActivating = () => {
  window.dispatchEvent(new CustomEvent(APP_UPDATE_ACTIVATING_EVENT));
};

const getWaitingWorker = () => latestRegistration?.waiting ?? null;

const checkRegistrationForWaitingWorker = (registration: ServiceWorkerRegistration) => {
  latestRegistration = registration;

  if (registration.waiting && navigator.serviceWorker.controller) {
    emitUpdateAvailable(registration);
    return true;
  }

  return false;
};

const watchWorkerForUpdate = (
  registration: ServiceWorkerRegistration,
  worker: ServiceWorker | null,
) => {
  if (!worker || watchedWorkers.has(worker)) return;
  watchedWorkers.add(worker);

  const checkWorkerState = () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      emitUpdateAvailable(registration);
    }
  };

  worker.addEventListener('statechange', checkWorkerState);
  checkWorkerState();
};

const watchRegistration = (registration: ServiceWorkerRegistration) => {
  if (watchedRegistrations.has(registration)) return;
  watchedRegistrations.add(registration);

  registration.addEventListener('updatefound', () => {
    watchWorkerForUpdate(registration, registration.installing);
  });
};

const prepareRegistration = (registration: ServiceWorkerRegistration) => {
  latestRegistration = registration;
  watchRegistration(registration);
  watchWorkerForUpdate(registration, registration.installing);
  return checkRegistrationForWaitingWorker(registration);
};

const updateRegistration = async (registration: ServiceWorkerRegistration) => {
  prepareRegistration(registration);

  try {
    await registration.update();
  } catch {
    return getWaitingAppUpdateAvailable();
  }

  return prepareRegistration(registration);
};

export const getWaitingAppUpdateAvailable = () =>
  updateAvailable || Boolean(latestRegistration?.waiting);

export const checkForAppUpdate = async () => {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();

    if (registrations.length === 0) {
      return getWaitingAppUpdateAvailable();
    }

    const checks = await Promise.all(registrations.map(updateRegistration));
    return checks.some(Boolean) || getWaitingAppUpdateAvailable();
  } catch {
    return getWaitingAppUpdateAvailable();
  }
};

export const activateWaitingAppUpdate = () => {
  const waitingWorker = getWaitingWorker();

  if (!waitingWorker && !updateServiceWorker) {
    return false;
  }

  activationRequested = true;
  emitUpdateActivating();

  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }

  void updateServiceWorker?.().catch(() => undefined);

  window.setTimeout(() => {
    if (reloadStarted) return;

    reloadStarted = true;
    window.location.reload();
  }, 8_000);

  return true;
};

export const setupAppUpdateChecks = () => {
  if (!('serviceWorker' in navigator)) return;
  if (setupStarted) return;
  setupStarted = true;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!activationRequested || reloadStarted) return;

    reloadStarted = true;
    window.location.reload();
  });

  const scheduleUpdateCheck = () => {
    void checkForAppUpdate();
  };

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      emitUpdateAvailable(latestRegistration);
    },
    onRegisteredSW(_swScriptUrl, registration) {
      if (!registration) return;

      prepareRegistration(registration);
      void updateRegistration(registration);
    },
    onRegisterError() {
      // Keep the app usable when service workers are unavailable.
    },
  });

  void navigator.serviceWorker.ready
    .then((registration) => {
      prepareRegistration(registration);
      return updateRegistration(registration);
    })
    .catch(() => undefined);

  INITIAL_UPDATE_CHECK_DELAYS_MS.forEach((delayMs) => {
    window.setTimeout(scheduleUpdateCheck, delayMs);
  });

  window.addEventListener('load', scheduleUpdateCheck, { once: true });
  window.addEventListener('pageshow', scheduleUpdateCheck);
  window.addEventListener('focus', scheduleUpdateCheck);
  window.addEventListener('online', scheduleUpdateCheck);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleUpdateCheck();
  });

  if (updateCheckIntervalId === null) {
    updateCheckIntervalId = window.setInterval(
      scheduleUpdateCheck,
      UPDATE_CHECK_INTERVAL_MS,
    );
  }
};
