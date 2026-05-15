import React from 'react';

type AppErrorBoundaryState = {
  error: Error | null;
};

const clearClientCaches = async () => {
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // Keep recovery usable even if the browser blocks service worker access.
    }
  }

  if ('caches' in window) {
    try {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    } catch {
      // Cache cleanup is best-effort.
    }
  }
};

export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crashed', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    void clearClientCaches().finally(() => {
      window.location.replace('/login');
    });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main
        className="flex min-h-[100dvh] items-center justify-center bg-app-background px-4 text-right text-app-text"
        dir="rtl"
      >
        <section className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-5 shadow-[var(--app-shadow-panel)]">
          <div className="mb-4">
            <p className="text-xs font-semibold text-app-text-secondary">שגיאת טעינה</p>
            <h1 className="mt-1 text-xl font-bold text-app-text">משהו נתקע בטעינת האפליקציה</h1>
            <p className="mt-2 text-sm leading-6 text-app-text-secondary">
              אפשר לרענן, ואם זה ממשיך לקרות לנקות את הנתונים המקומיים של הדפדפן.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-app-border bg-app-surface-raised px-4 text-sm font-semibold text-app-text transition-colors hover:bg-white/10"
            >
              רענן
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-app-brand-solid px-4 text-sm font-bold text-app-background transition-colors hover:bg-app-brand-hover"
            >
              נקה ופתח מחדש
            </button>
          </div>
        </section>
      </main>
    );
  }
}
