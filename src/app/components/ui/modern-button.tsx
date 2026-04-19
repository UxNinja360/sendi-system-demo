import React from 'react';

interface ModernButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled = false,
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-[4px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-[#0a0a0a] dark:bg-[#262626] text-white border border-[#262626] hover:bg-[#171717] dark:hover:bg-[#404040]',
    secondary: 'bg-white dark:bg-[#171717] text-[#0d0d12] dark:text-[#fafafa] border border-[#e5e5e5] dark:border-[#262626] hover:bg-[#fafafa] dark:hover:bg-[#262626]',
    ghost: 'bg-transparent text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]',
    gradient: 'text-white border-none',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const gradientStyle = variant === 'gradient' 
    ? { backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(90deg, rgb(22, 51, 0) 0%, rgb(22, 51, 0) 100%)' }
    : {};
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      style={gradientStyle}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
