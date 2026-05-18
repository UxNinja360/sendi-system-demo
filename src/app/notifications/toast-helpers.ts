import React from 'react';
import { toast, type ExternalToast } from 'sonner';

type ToastMessage = React.ReactNode | (() => React.ReactNode);
export type DeliveryAlertToastVariant = 'regular' | 'sendi-plus';

type DeliveryAlertToastOptions = ExternalToast & {
  variant?: DeliveryAlertToastVariant;
};

const mergeToastClassName = (baseClassName: string, className?: string) =>
  [baseClassName, className].filter(Boolean).join(' ');

const getSystemToastOptions = (options: ExternalToast = {}): ExternalToast => ({
  ...options,
  duration: options.duration ?? 2800,
  position: options.position ?? 'bottom-left',
  className: mergeToastClassName(
    'sonner-toast sonner-toast--system sonner-toast--action',
    options.className,
  ),
});

export const showActionToast = (message: ToastMessage, options?: ExternalToast) =>
  toast.success(message, getSystemToastOptions(options));

export const showActionInfoToast = (message: ToastMessage, options?: ExternalToast) =>
  toast.info(message, getSystemToastOptions(options));

export const showActionErrorToast = (message: ToastMessage, options?: ExternalToast) =>
  toast.error(message, {
    ...getSystemToastOptions(options),
    duration: options?.duration ?? 2200,
  });

export const showDeliveryAlertToast = (
  message: ToastMessage,
  options: DeliveryAlertToastOptions = {},
) => {
  const { variant = 'regular', className, ...toastOptions } = options;

  return toast.success(message, {
    ...toastOptions,
    duration: toastOptions.duration ?? 3800,
    position: toastOptions.position ?? 'bottom-left',
    className: mergeToastClassName(
      `sonner-toast sonner-toast--delivery-alert sonner-toast--delivery-${variant}`,
      className,
    ),
  });
};
