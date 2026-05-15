import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AppErrorBoundary } from "./app/components/common/app-error-boundary.tsx";
import "./styles/index.css";

const unregisterDevServiceWorkers = () => {
  if (!("serviceWorker" in navigator)) return;

  void navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    })
    .catch(() => undefined);
};

const setupServiceWorkerUpdates = () => {
  if (!("serviceWorker" in navigator)) return;

  let isRefreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isRefreshing) return;
    isRefreshing = true;
    window.location.reload();
  });

  const updateRegistrations = () => {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          void registration.update().catch(() => undefined);
        });
      })
      .catch(() => undefined);
  };

  window.addEventListener(
    "load",
    () => {
      updateRegistrations();
      window.setTimeout(updateRegistrations, 1_000);
    },
    { once: true },
  );
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateRegistrations();
  });
  window.setInterval(updateRegistrations, 60_000);
};

if (import.meta.env.DEV) {
  unregisterDevServiceWorkers();
} else {
  setupServiceWorkerUpdates();
}

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
