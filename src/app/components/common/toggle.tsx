import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  haptic?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  ariaLabel,
  className,
  disabled = false,
  haptic = 'selection',
}) => (
  <button
    type="button"
    data-haptic={haptic}
    onClick={onChange}
    className={[
      'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]/30',
      checked
        ? 'border-[#0A84FF] bg-[#0A84FF]'
        : 'border-transparent bg-[#EDEDED] dark:bg-[#1F1F1F]',
      disabled ? 'cursor-not-allowed opacity-50' : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ')}
    aria-pressed={checked}
    aria-label={ariaLabel}
    disabled={disabled}
  >
    <span
      className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all duration-200 ${
        checked
          ? 'left-0.5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.22)] dark:bg-[#D7E9FF]'
          : 'right-0.5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.14)] ring-1 ring-black/5 dark:bg-[#555555] dark:shadow-none dark:ring-0'
      }`}
    />
  </button>
);
