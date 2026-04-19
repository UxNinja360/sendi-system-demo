import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'neutral',
  size = 'md',
  className = '' 
}) => {
  const variantClasses = {
    success: 'bg-app-success-subtle text-app-success-text',
    warning: 'bg-app-warning-subtle text-app-warning-text',
    error:   'bg-app-error-subtle text-app-error-text',
    info:    'bg-app-info-subtle text-app-info-text',
    neutral: 'bg-app-interactive text-app-text-secondary',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span 
      className={`
        inline-flex items-center justify-center 
        font-medium rounded-full
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

interface StatusBadgeProps {
  status: 'pending' | 'assigned' | 'delivered' | 'cancelled' | 'available' | 'busy' | 'offline';
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const statusConfig = {
    // Delivery statuses
    pending: { label: 'ממתין', variant: 'warning' as const },
    assigned: { label: 'שובץ', variant: 'info' as const },
    delivered: { label: 'נמסר', variant: 'success' as const },
    cancelled: { label: 'בוטל', variant: 'error' as const },
    
    // Courier statuses
    available: { label: 'זמין', variant: 'success' as const },
    busy: { label: 'תפוס', variant: 'warning' as const },
    offline: { label: 'לא מחובר', variant: 'neutral' as const },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
};
