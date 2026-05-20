export const APP_UPDATE_AVAILABLE_EVENT = 'sendi-app-update-available';
export const APP_UPDATE_ACTIVATING_EVENT = 'sendi-app-update-activating';

declare const __SENDI_APP_BUILD_ID__: string;

const APP_BUILD_ACK_STORAGE_KEY = 'sendi-app-build-acknowledged';

let waitingRegistration: ServiceWorkerRegistration | null = null;
let activationRequested = false;
let reloadStarted = false;
let setupStarted = false;
let currentBuildUpdatePending = false;

const watchedRegistrations = new WeakSet<ServiceWorkerRegistration>();
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

const emitUpdateAvailable = (registration: ServiceWorkerRegistration) => {
  waitingRegistration = registration;
  window.dispatchEvent(new CustomEvent(APP_UPDATE_AVAILABLE_EVENT));
};

const emitCurrentBuildUpdateAvailable = () => {
  currentBuildUpdatePending = true;
  window.dispatchEvent(new CustomEvent(APP_UPDATE_AVAILABLE_EVENT));
};

const checkCurrentBuildAcknowledgement = () => {
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

const watchRegistration = (registration: ServiceWorkerRegistration) => {
  if (watchedRegistrations.has(registration)) return;
  watchedRegistrations.add(registration);

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        emitUpdateAvailable(registration);
      }
    });
  });
};

const checkRegistrationForUpdate = (registration: ServiceWorkerRegistration) => {
  watchRegistration(registration);

  if (registration.waiting && navigator.serviceWorker.controller) {
    emitUpdateAvailable(registration);
  }
};

export const getWaitingAppUpdateRegistration = () => waitingRegistration;

export const getCurrentBuildUpdatePending = () => currentBuildUpdatePending;

export const acknowledgeCurrentBuildUpdate = () => {
  currentBuildUpdatePending = false;
  safelyWriteAcknowledgedBuildId();
};

export const activateWaitingAppUpdate = () => {
  const waitingWorker = waitingRegistration?.waiting;
  if (!waitingWorker) return false;

  activationRequested = true;
  window.dispatchEvent(new CustomEvent(APP_UPDATE_ACTIVATING_EVENT));
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
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
    void registration.update().catch(() => undefined);
  };

  const updateRegistrations = () => {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach(checkAndUpdateRegistration);
      })
      .catch(() => undefined);
  };

  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then(checkAndUpdateRegistration)
    .catch(() => undefined);

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
  window.setInterval(updateRegistrations, 60_000);
};
