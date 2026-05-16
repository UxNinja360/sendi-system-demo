import React from 'react';
import { toast, type ExternalToast } from 'sonner';

type ToastMessage = React.ReactNode | (() => React.ReactNode);

const mergeToastClassName = (baseClassName: string, className?: string) =>
  [baseClassName, className].filter(Boolean).join(' ');

const getActionToastOptions = (options: ExternalToast = {}): ExternalToast => ({
  ...options,
  id: options.id ?? 'sendi-action-toast',
  duration: options.duration ?? 1600,
  position: options.position ?? 'bottom-center',
  className: mergeToastClassName('sonner-toast sonner-toast--action', options.className),
});

export const showActionToast = (message: ToastMessage, options?: ExternalToast) =>
  toast.success(message, getActionToastOptions(options));

export const showActionInfoToast = (message: ToastMessage, options?: ExternalToast) =>
  toast.info(message, getActionToastOptions(options));

export const showActionErrorToast = (message: ToastMessage, options?: ExternalToast) =>
  toast.error(message, {
    ...getActionToastOptions(options),
    duration: options?.duration ?? 2200,
  });

export const showDeliveryAlertToast = (
  message: ToastMessage,
  options?: ExternalToast,
) =>
  toast.success(message, {
    ...options,
    duration: options?.duration ?? 3600,
    position: 'top-center',
    className: mergeToastClassName(
      'sonner-toast sonner-toast--delivery-alert',
      options?.className,
    ),
  });
