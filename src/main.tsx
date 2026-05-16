import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AppErrorBoundary } from "./app/components/common/app-error-boundary.tsx";
import { setupAppUpdateChecks } from "./app/pwa/app-update.ts";
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

if (import.meta.env.DEV) {
  unregisterDevServiceWorkers();
} else {
  setupAppUpdateChecks();
}

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
