import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-colors rounded-[4px] outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-app-brand-solid hover:bg-app-brand-hover text-white focus:ring-app-brand',
    secondary: 'bg-app-interactive hover:bg-app-interactive-hover text-foreground focus:ring-app-border-strong',
    outline: 'border-2 border-app-brand-solid hover:bg-app-brand-solid text-app-brand-text hover:text-white focus:ring-app-brand dark:border-app-brand dark:hover:bg-app-brand dark:text-app-brand dark:hover:text-foreground',
    ghost: 'hover:bg-app-surface-raised text-app-text-secondary hover:text-foreground focus:ring-app-border',
    danger: 'bg-app-error-text hover:bg-[#dc2626] text-white focus:ring-app-error-text dark:bg-app-error-text dark:hover:bg-[#dc2626]',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'right' && icon}
      {children}
      {icon && iconPosition === 'left' && icon}
    </button>
  );
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({ 
  icon,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center transition-colors rounded-[4px] outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-app-brand-solid hover:bg-app-brand-hover text-white focus:ring-app-brand',
    secondary: 'bg-app-interactive hover:bg-app-interactive-hover text-foreground focus:ring-app-border-strong',
    ghost: 'hover:bg-app-surface-raised text-app-text-secondary hover:text-foreground focus:ring-app-border',
    danger: 'bg-app-error-text hover:bg-[#dc2626] text-white focus:ring-app-error-text dark:bg-app-error-text dark:hover:bg-[#dc2626]',
  };
  
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {icon}
    </button>
  );
};

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 bg-app-interactive p-1 rounded-[4px] ${className}`}>
      {children}
    </div>
  );
};
