export const APP_UPDATE_AVAILABLE_EVENT = 'sendi-app-update-available';
export const APP_UPDATE_ACTIVATING_EVENT = 'sendi-app-update-activating';

let waitingRegistration: ServiceWorkerRegistration | null = null;
let activationRequested = false;
let reloadStarted = false;

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

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!activationRequested || reloadStarted) return;

    reloadStarted = true;
    window.location.reload();
  });

  const updateRegistrations = () => {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          checkRegistrationForUpdate(registration);
          void registration.update().catch(() => undefined);
        });
      })
      .catch(() => undefined);
  };

  window.addEventListener(
    'load',
    () => {
      updateRegistrations();
      window.setTimeout(updateRegistrations, 1_000);
    },
    { once: true },
  );

  window.addEventListener('focus', updateRegistrations);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateRegistrations();
  });
  window.setInterval(updateRegistrations, 60_000);
};
