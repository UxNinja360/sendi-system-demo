export const APP_UPDATE_AVAILABLE_EVENT = 'sendi-app-update-available';
export const APP_UPDATE_ACTIVATING_EVENT = 'sendi-app-update-activating';

let waitingRegistration: ServiceWorkerRegistration | null = null;
let activationRequested = false;
let reloadStarted = false;
let setupStarted = false;

const watchedRegistrations = new WeakSet<ServiceWorkerRegistration>();

const emitUpdateAvailable = (registration: ServiceWorkerRegistration) => {
  waitingRegistration = registration;
  window.dispatchEvent(new CustomEvent(APP_UPDATE_AVAILABLE_EVENT));
};

const watchRegistration = (registration: ServiceWorkerRegistration) => {
  if (watchedRegistrations.has(registration)) return;
  watchedRegistrations.add(registration);

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && (navigator.serviceWorker.controller || registration.active)) {
        emitUpdateAvailable(registration);
      }
    });
  });
};

const checkRegistrationForUpdate = (registration: ServiceWorkerRegistration) => {
  watchRegistration(registration);

  if (registration.waiting && (navigator.serviceWorker.controller || registration.active)) {
    emitUpdateAvailable(registration);
  }
};

export const getWaitingAppUpdateRegistration = () => waitingRegistration;

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
