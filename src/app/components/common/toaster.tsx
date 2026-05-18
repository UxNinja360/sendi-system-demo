import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = () => {
  return (
    <SonnerToaster
      position="bottom-left"
      dir="rtl"
      closeButton
      richColors={false}
      expand={false}
      gap={10}
      visibleToasts={3}
      duration={3200}
      offset={{
        top: 'calc(var(--app-safe-top) + 6px)',
        bottom: 'calc(var(--app-safe-bottom) + 18px)',
        left: 'calc(var(--app-safe-left) + 18px)',
      }}
      mobileOffset={{
        top: 'calc(var(--app-safe-top) + 6px)',
        bottom: 'calc(var(--app-safe-bottom) + 12px)',
        left: 'calc(var(--app-safe-left) + 12px)',
        right: 'calc(var(--app-safe-right) + 12px)',
      }}
      toastOptions={{
        style: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        className: 'sonner-toast sonner-toast--action',
      }}
    />
  );
};
