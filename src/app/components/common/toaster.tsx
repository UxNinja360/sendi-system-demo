import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = () => {
  return (
    <SonnerToaster
      position="top-center"
      dir="rtl"
      richColors={false}
      expand
      gap={8}
      visibleToasts={4}
      duration={2400}
      offset={{ top: 'calc(var(--app-topbar-offset) + 10px)' }}
      mobileOffset={{ top: 'calc(var(--app-topbar-offset) + 8px)' }}
      toastOptions={{
        style: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        className: 'sonner-toast',
      }}
    />
  );
};
