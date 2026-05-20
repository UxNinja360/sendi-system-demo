import { registerSW } from 'virtual:pwa-register';

export const APP_UPDATE_AVAILABLE_EVENT = 'sendi-app-update-available';
export const APP_UPDATE_ACTIVATING_EVENT = 'sendi-app-update-activating';

declare const __SENDI_APP_BUILD_ID__: string;

const APP_BUILD_ACK_STORAGE_KEY = 'sendi-app-build-acknowledged';
const APP_UPDATE_APPROVED_STORAGE_KEY = 'sendi-app-update-approved';
const UPDATE_CHECK_INTERVAL_MS = 30_000;

let waitingRegistration: ServiceWorkerRegistration | null = null;
let latestRegistration: ServiceWorkerRegistration | null = null;
let waitingUpdateAvailable = false;
let activationRequested = false;
let reloadStarted = false;
let setupStarted = false;
let currentBuildUpdatePending = false;
let updateServiceWorker: ReturnType<typeof registerSW> | null = null;

const watchedRegistrations = new WeakSet<ServiceWorkerRegistration>();
const watchedWorkers = new WeakSet<ServiceWorker>();
const currentAppBuildId =
  typeof __SENDI_APP_BUILD_ID__ === 'string' && __SENDI_APP_BUILD_ID__
    ? __SENDI_APP_BUILD_ID__
    : 'development';

const safelyReadAcknowledgedBuildId = () => {
  try {
    return window.localStorage.getItem(APP_BUILD_ACK_STORAGE_KEY);
  } catch {
    return currentAppBuildId;
  }
};

const safelyWriteAcknowledgedBuildId = () => {
  try {
    window.localStorage.setItem(APP_BUILD_ACK_STORAGE_KEY, currentAppBuildId);
  } catch {
    // Storage can be blocked in private modes; keep the regular waiting-worker flow working.
  }
};

const safelyRememberApprovedUpdate = () => {
  try {
    window.localStorage.setItem(APP_UPDATE_APPROVED_STORAGE_KEY, 'true');
  } catch {
    // If storage is blocked, the waiting-worker update flow still works.
  }
};

const safelyConsumeApprovedUpdate = () => {
  try {
    const wasApproved = window.localStorage.getItem(APP_UPDATE_APPROVED_STORAGE_KEY) === 'true';
    window.localStorage.removeItem(APP_UPDATE_APPROVED_STORAGE_KEY);
    return wasApproved;
  } catch {
    return false;
  }
};

const emitUpdateAvailable = (registration?: ServiceWorkerRegistration | null) => {
  if (registration) {
    latestRegistration = registration;
    waitingRegistration = registration;
  } else if (latestRegistration) {
    waitingRegistration = latestRegistration;
  }

  waitingUpdateAvailable = true;
  currentBuildUpdatePending = false;
  window.dispatchEvent(new CustomEvent(APP_UPDATE_AVAILABLE_EVENT));
};

const emitCurrentBuildUpdateAvailable = () => {
  if (waitingUpdateAvailable) return;

  currentBuildUpdatePending = true;
  window.dispatchEvent(new CustomEvent(APP_UPDATE_AVAILABLE_EVENT));
};

const checkCurrentBuildAcknowledgement = () => {
  if (safelyConsumeApprovedUpdate()) {
    safelyWriteAcknowledgedBuildId();
    currentBuildUpdatePending = false;
    return;
  }

  const acknowledgedBuildId = safelyReadAcknowledgedBuildId();

  if (!acknowledgedBuildId) {
    safelyWriteAcknowledgedBuildId();
    return;
  }

  if (acknowledgedBuildId !== currentAppBuildId) {
    emitCurrentBuildUpdateAvailable();
    return;
  }

  currentBuildUpdatePending = false;
};

const watchWorkerForUpdate = (registration: ServiceWorkerRegistration, worker: ServiceWorker | null) => {
  if (!worker || watchedWorkers.has(worker)) return;
  watchedWorkers.add(worker);

  const checkWorkerState = () => {
    if (worker.state !== 'installed' || !navigator.serviceWorker.controller) return;

    window.setTimeout(() => {
      if (registration.waiting || worker.state === 'installed') {
        emitUpdateAvailable(registration);
      }
    }, 0);
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

const checkRegistrationForUpdate = (registration: ServiceWorkerRegistration) => {
  latestRegistration = registration;
  watchRegistration(registration);
  watchWorkerForUpdate(registration, registration.installing);

  if (registration.waiting && navigator.serviceWorker.controller) {
    emitUpdateAvailable(registration);
  }
};

export const getWaitingAppUpdateRegistration = () => waitingRegistration;

export const getWaitingAppUpdateAvailable = () =>
  waitingUpdateAvailable || Boolean(waitingRegistration?.waiting || latestRegistration?.waiting);

export const getCurrentBuildUpdatePending = () => currentBuildUpdatePending;

export const acknowledgeCurrentBuildUpdate = () => {
  currentBuildUpdatePending = false;
  safelyWriteAcknowledgedBuildId();
};

export const activateWaitingAppUpdate = () => {
  const waitingWorker = waitingRegistration?.waiting || latestRegistration?.waiting;
  if (!waitingWorker && !updateServiceWorker) return false;

  activationRequested = true;
  safelyRememberApprovedUpdate();
  window.dispatchEvent(new CustomEvent(APP_UPDATE_ACTIVATING_EVENT));

  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  } else {
    void updateServiceWorker?.().catch(() => undefined);
  }

  return true;
};

export const setupAppUpdateChecks = () => {
  if (!('serviceWorker' in navigator)) return;
  if (setupStarted) return;
  setupStarted = true;

  checkCurrentBuildAcknowledgement();

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!activationRequested || reloadStarted) return;

    reloadStarted = true;
    window.location.reload();
  });

  const checkAndUpdateRegistration = (registration: ServiceWorkerRegistration) => {
    checkRegistrationForUpdate(registration);
    void registration
      .update()
      .then(() => checkRegistrationForUpdate(registration))
      .catch(() => undefined);
  };

  const updateRegistrations = () => {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach(checkAndUpdateRegistration);
      })
      .catch(() => undefined);
  };

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      emitUpdateAvailable(latestRegistration);
    },
    onRegisteredSW(_swScriptUrl, registration) {
      if (registration) {
        checkAndUpdateRegistration(registration);
      }
    },
    onRegisterError() {
      // Keep the app usable when service workers are blocked by the browser.
    },
  });

  void navigator.serviceWorker.ready
    .then(checkAndUpdateRegistration)
    .catch(() => undefined);

  updateRegistrations();
  window.setTimeout(updateRegistrations, 1_000);
  window.setTimeout(updateRegistrations, 5_000);

  window.addEventListener(
    'load',
    () => {
      updateRegistrations();
      window.setTimeout(updateRegistrations, 1_000);
    },
    { once: true },
  );

  window.addEventListener('pageshow', updateRegistrations);
  window.addEventListener('focus', updateRegistrations);
  window.addEventListener('online', updateRegistrations);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateRegistrations();
  });
  window.setInterval(updateRegistrations, UPDATE_CHECK_INTERVAL_MS);
};
