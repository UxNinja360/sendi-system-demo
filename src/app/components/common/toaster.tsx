import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = () => {
  return (
    <SonnerToaster
      position="bottom-left"
      dir="rtl"
      richColors={false}
      expand={false}
      offset={24}
      gap={10}
      visibleToasts={4}
      toastOptions={{
        style: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        className: 'sonner-toast',
      }}
    />
  );
};
