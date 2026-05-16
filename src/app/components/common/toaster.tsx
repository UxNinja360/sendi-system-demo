import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = () => {
  return (
    <SonnerToaster
      position="bottom-center"
      dir="rtl"
      richColors={false}
      expand={false}
      gap={8}
      visibleToasts={3}
      duration={1800}
      offset={{
        top: 'calc(var(--app-safe-top) + 46px)',
        bottom: 'calc(var(--app-safe-bottom) + 18px)',
      }}
      mobileOffset={{
        top: 'calc(var(--app-safe-top) + 46px)',
        bottom: 'calc(var(--app-safe-bottom) + 14px)',
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
