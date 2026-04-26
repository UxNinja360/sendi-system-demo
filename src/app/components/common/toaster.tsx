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
      toastOptions={{
        style: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        className: 'sonner-toast',
      }}
    />
  );
};
