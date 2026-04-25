import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'md',
  hover = false,
  onClick
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div 
      className={`
        rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface
        ${paddingClasses[padding]}
        ${hover ? 'transition-shadow hover:shadow-[var(--app-shadow-panel)]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBg?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  label, 
  value,
  iconColor = 'text-app-info-text',
  iconBg = 'bg-app-info-subtle'
}) => {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-[var(--app-radius-sm)] p-2 ${iconBg}`}>
          <div className={iconColor}>{icon}</div>
        </div>
        <span className="text-sm text-app-text-secondary">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">
        {value}
      </div>
    </Card>
  );
};

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => {
  return (
    <Card padding="lg" className="text-center">
      <div className="flex justify-center mb-4 text-app-text-muted">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-app-text-secondary">
        {description}
      </p>
    </Card>
  );
};
